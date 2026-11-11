// Command schema-contracts validates the checked schema inventory without network access.
package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"math/big"
	"net/url"
	"os"
	"path/filepath"
	"reflect"
	"runtime/debug"
	"sort"
	"strings"

	"github.com/santhosh-tekuri/jsonschema/v6"
	"gopkg.in/yaml.v3"
)

const engine = "github.com/santhosh-tekuri/jsonschema/v6 v6.0.3"

type Manifest struct {
	Version int               `json:"version"`
	Roots   []string          `json:"roots"`
	Entries []Entry           `json:"entries"`
	Aliases map[string]string `json:"aliases,omitempty"`
}

type Entry struct {
	Path       string `json:"path"`
	Kind       string `json:"kind"`
	Provenance string `json:"provenance"`
	Dialect    string `json:"dialect,omitempty"`
	Schema     string `json:"schema,omitempty"`
	Source     string `json:"source,omitempty"`
	Owner      string `json:"owner,omitempty"`
	Reason     string `json:"reason,omitempty"`
	SHA256     string `json:"sha256,omitempty"`
}

type closedLoader struct{}

func (closedLoader) Load(u string) (any, error) {
	return nil, fmt.Errorf("offline catalog: unresolved resource %s", u)
}

func draft(s string) *jsonschema.Draft {
	switch strings.TrimSuffix(s, "#") {
	case "http://json-schema.org/draft-04/schema", "https://json-schema.org/draft-04/schema":
		return jsonschema.Draft4
	case "http://json-schema.org/draft-06/schema", "https://json-schema.org/draft-06/schema":
		return jsonschema.Draft6
	case "http://json-schema.org/draft-07/schema", "https://json-schema.org/draft-07/schema":
		return jsonschema.Draft7
	case "https://json-schema.org/draft/2019-09/schema":
		return jsonschema.Draft2019
	case "https://json-schema.org/draft/2020-12/schema":
		return jsonschema.Draft2020
	}
	return nil
}

// Reject aliases (including cycles), duplicate/non-string keys and multiple documents.
func nodeValue(n *yaml.Node) (any, error) {
	switch n.Kind {
	case yaml.DocumentNode:
		if len(n.Content) != 1 {
			return nil, fmt.Errorf("empty document")
		}
		return nodeValue(n.Content[0])
	case yaml.MappingNode:
		m := map[string]any{}
		for i := 0; i < len(n.Content); i += 2 {
			k := n.Content[i]
			if k.Kind != yaml.ScalarNode || k.Tag != "!!str" {
				return nil, fmt.Errorf("non-string mapping key at line %d", k.Line)
			}
			if _, ok := m[k.Value]; ok {
				return nil, fmt.Errorf("duplicate key %q", k.Value)
			}
			v, err := nodeValue(n.Content[i+1])
			if err != nil {
				return nil, err
			}
			m[k.Value] = v
		}
		return m, nil
	case yaml.SequenceNode:
		a := make([]any, 0, len(n.Content))
		for _, c := range n.Content {
			v, err := nodeValue(c)
			if err != nil {
				return nil, err
			}
			a = append(a, v)
		}
		return a, nil
	case yaml.ScalarNode:
		if n.Tag == "!!str" || n.Tag == "!!timestamp" {
			return n.Value, nil
		}
		if n.Tag != "!!bool" && n.Tag != "!!null" && n.Tag != "!!int" && n.Tag != "!!float" {
			return nil, fmt.Errorf("unsupported YAML tag %s", n.Tag)
		}
		if n.Tag == "!!int" || n.Tag == "!!float" {
			numeric := strings.TrimPrefix(strings.ReplaceAll(n.Value, "_", ""), "+")
			if n.Tag == "!!int" {
				if integer, ok := new(big.Int).SetString(numeric, 0); ok {
					return json.Number(integer.String()), nil
				}
			} else if len(numeric) > 0 && (numeric[0] == '-' || numeric[0] >= '0' && numeric[0] <= '9') && json.Valid([]byte(numeric)) {
				// json.Valid alone also accepts booleans, null, strings and containers.
				return json.Number(numeric), nil
			}
			return nil, fmt.Errorf("numeric YAML scalar has unsupported lossless spelling at line %d: %s", n.Line, n.Value)
		}
		var v any
		err := n.Decode(&v)
		return v, err
	default:
		return nil, fmt.Errorf("YAML aliases and empty documents are forbidden")
	}
}

func parse(path string, b []byte) (any, error) {
	if filepath.Ext(path) == ".json" && !json.Valid(b) {
		return nil, fmt.Errorf("invalid JSON")
	}
	d := yaml.NewDecoder(bytes.NewReader(b))
	var n yaml.Node
	if err := d.Decode(&n); err != nil {
		return nil, err
	}
	var extra yaml.Node
	if err := d.Decode(&extra); err != io.EOF {
		return nil, fmt.Errorf("expected exactly one YAML document")
	}
	v, err := nodeValue(&n)
	if err != nil {
		return nil, err
	}
	if filepath.Ext(path) == ".json" {
		return jsonschema.UnmarshalJSON(bytes.NewReader(b))
	}
	// Normalize numbers to the engine's lossless JSON representation.
	b, err = json.Marshal(v)
	if err != nil {
		return nil, err
	}
	return jsonschema.UnmarshalJSON(bytes.NewReader(b))
}

func safePath(p string) bool { return p != "." && fs.ValidPath(p) && !strings.Contains(p, "\\") }

func discover(root string, roots []string) (map[string]bool, error) {
	if len(roots) == 0 {
		return nil, fmt.Errorf("empty inventory roots")
	}
	paths := map[string]bool{}
	for _, r := range roots {
		if !safePath(r) {
			return nil, fmt.Errorf("invalid inventory root %q", r)
		}
		// Check each ancestor too: WalkDir does not follow directory links, but
		// a link in an explicitly supplied root's parent must also be rejected.
		for p := r; p != "."; p = filepath.ToSlash(filepath.Dir(p)) {
			i, err := os.Lstat(filepath.Join(root, p))
			if err != nil {
				return nil, err
			}
			if !i.IsDir() || i.Mode()&os.ModeSymlink != 0 || i.Mode().Perm()&0444 == 0 {
				return nil, fmt.Errorf("inventory root is not a readable real directory: %s", p)
			}
		}
		err := filepath.WalkDir(filepath.Join(root, r), func(p string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			i, err := d.Info()
			if err != nil {
				return err
			}
			if i.Mode()&os.ModeSymlink != 0 {
				return fmt.Errorf("symlink forbidden: %s", p)
			}
			if i.Mode().Perm()&0444 == 0 {
				return fmt.Errorf("unreadable inventory path: %s", p)
			}
			if d.IsDir() {
				return nil
			}
			if !i.Mode().IsRegular() {
				return fmt.Errorf("non-regular inventory path: %s", p)
			}
			switch strings.ToLower(filepath.Ext(p)) {
			case ".json", ".yaml", ".yml":
				rel, err := filepath.Rel(root, p)
				if err != nil {
					return err
				}
				rel = filepath.ToSlash(rel)
				if paths[rel] {
					return fmt.Errorf("overlapping inventory roots: %s", rel)
				}
				paths[rel] = true
			}
			return nil
		})
		if err != nil {
			return nil, err
		}
	}
	if len(paths) == 0 {
		return nil, fmt.Errorf("zero inventory candidates")
	}
	return paths, nil
}

func loadManifest(path string) (Manifest, error) {
	var m Manifest
	b, err := os.ReadFile(path)
	if err != nil {
		return m, err
	}
	if _, err = parse(path, b); err != nil {
		return m, err
	}
	d := json.NewDecoder(bytes.NewReader(b))
	d.DisallowUnknownFields()
	err = d.Decode(&m)
	if err == nil && (m.Version != 1 || len(m.Entries) == 0) {
		err = fmt.Errorf("unsupported or empty inventory manifest")
	}
	return m, err
}

type schemaNode struct {
	pointer string
	dialect string
	base    string
	value   map[string]any
}

// Traverse only schema positions from the supported dialects. Annotation data
// (notably examples, defaults and x-* payloads) must never become schemas.
func schemaNodes(v any, pointer, base, dialect string) ([]schemaNode, error) {
	obj, ok := v.(map[string]any)
	if !ok {
		return nil, nil
	}
	if declared, exists := obj["$schema"]; exists {
		s, ok := declared.(string)
		if !ok || draft(s) == nil {
			return nil, fmt.Errorf("unknown nested dialect at %s: %v", pointer, declared)
		}
		dialect = s
	}
	d := draft(dialect)
	if d == jsonschema.Draft2019 || d == jsonschema.Draft2020 {
		prefix := strings.TrimSuffix(strings.TrimSuffix(dialect, "#"), "schema") + "vocab/"
		supported := map[string]bool{"core": true, "applicator": true, "validation": true, "meta-data": true, "content": true}
		if d == jsonschema.Draft2019 {
			supported["format"] = true
		} else {
			supported["unevaluated"] = true
			supported["format-annotation"] = true
			supported["format-assertion"] = true
		}
		if vocabs, ok := obj["$vocabulary"].(map[string]any); ok {
			for uri, required := range vocabs {
				if required == true && (!strings.HasPrefix(uri, prefix) || !supported[strings.TrimPrefix(uri, prefix)]) {
					return nil, fmt.Errorf("unsupported required vocabulary %s at %s", uri, pointer)
				}
			}
		}
	}
	idKey := "$id"
	if d == jsonschema.Draft4 {
		idKey = "id"
	}
	if id, ok := obj[idKey].(string); ok {
		b, err := url.Parse(base)
		if err != nil {
			return nil, err
		}
		ref, err := url.Parse(id)
		if err != nil {
			return nil, err
		}
		base = b.ResolveReference(ref).String()
	}
	nodes := []schemaNode{{pointer, dialect, base, obj}}
	single := []string{"not", "additionalProperties", "additionalItems"}
	maps := []string{"definitions", "properties", "patternProperties", "dependencies"}
	arrays := []string{"allOf", "anyOf", "oneOf"}
	if d != jsonschema.Draft4 {
		single = append(single, "propertyNames", "contains")
	}
	if d == jsonschema.Draft7 || d == jsonschema.Draft2019 || d == jsonschema.Draft2020 {
		single = append(single, "if", "then", "else")
	}
	if d == jsonschema.Draft2019 || d == jsonschema.Draft2020 {
		single = append(single, "unevaluatedProperties", "unevaluatedItems", "contentSchema")
		maps = append(maps, "$defs", "dependentSchemas")
	}
	if d == jsonschema.Draft2020 {
		arrays = append(arrays, "prefixItems")
	}
	if _, ok := obj["items"].([]any); ok {
		arrays = append(arrays, "items")
	} else {
		single = append(single, "items")
	}
	add := func(v any, p string) error {
		children, err := schemaNodes(v, p, base, dialect)
		if err != nil {
			return err
		}
		nodes = append(nodes, children...)
		return nil
	}
	for _, key := range single {
		if value, ok := obj[key]; ok {
			if err := add(value, pointer+"/"+key); err != nil {
				return nil, err
			}
		}
	}
	for _, key := range arrays {
		if values, ok := obj[key].([]any); ok {
			for i, value := range values {
				if err := add(value, fmt.Sprintf("%s/%s/%d", pointer, key, i)); err != nil {
					return nil, err
				}
			}
		}
	}
	for _, key := range maps {
		if values, ok := obj[key].(map[string]any); ok {
			for name, value := range values {
				name = strings.ReplaceAll(strings.ReplaceAll(name, "~", "~0"), "/", "~1")
				if err := add(value, pointer+"/"+key+"/"+name); err != nil {
					return nil, err
				}
			}
		}
	}
	return nodes, nil
}

func validate(root string, m Manifest) (map[string]*jsonschema.Schema, error) {
	actual, err := discover(root, m.Roots)
	if err != nil {
		return nil, err
	}
	entries := map[string]Entry{}
	docs := map[string]any{}
	raw := map[string][]byte{}
	for _, e := range m.Entries {
		if !safePath(e.Path) {
			return nil, fmt.Errorf("invalid manifest path %q", e.Path)
		}
		if _, ok := entries[e.Path]; ok {
			return nil, fmt.Errorf("duplicate manifest path %s", e.Path)
		}
		entries[e.Path] = e
		if !actual[e.Path] {
			return nil, fmt.Errorf("missing expected path: %s", e.Path)
		}
		delete(actual, e.Path)
		if e.Provenance != "canonical" && e.Provenance != "vendor" && e.Provenance != "wrapper" {
			return nil, fmt.Errorf("invalid provenance: %s", e.Path)
		}
		b, err := os.ReadFile(filepath.Join(root, e.Path))
		if err != nil {
			return nil, err
		}
		raw[e.Path] = b
		if e.Kind == "excluded" {
			h := sha256.Sum256(b)
			if e.Owner == "" || e.Reason == "" || hex.EncodeToString(h[:]) != e.SHA256 {
				return nil, fmt.Errorf("unowned or changed exclusion: %s", e.Path)
			}
			continue
		}
		if e.Kind != "schema" && e.Kind != "metaschema" && e.Kind != "data" && e.Kind != "wrapper" {
			return nil, fmt.Errorf("unknown classification: %s", e.Path)
		}
		if e.Kind == "wrapper" {
			continue
		}
		v, err := parse(e.Path, b)
		if err != nil {
			return nil, fmt.Errorf("parse %s: %w", e.Path, err)
		}
		docs[e.Path] = v
	}
	if len(actual) != 0 {
		p := make([]string, 0, len(actual))
		for k := range actual {
			p = append(p, k)
		}
		sort.Strings(p)
		return nil, fmt.Errorf("unclassified candidates: %s", strings.Join(p, ", "))
	}
	resources := map[string]any{}
	locations := map[string]string{}
	ids := map[string]string{}
	nodes := map[string][]schemaNode{}
	for _, e := range m.Entries {
		v := docs[e.Path]
		if e.Kind == "wrapper" {
			s, ok := entries[e.Source]
			if !ok || s.Kind == "wrapper" || e.Provenance != "wrapper" {
				return nil, fmt.Errorf("invalid wrapper source: %s", e.Path)
			}
			if !bytes.Equal(raw[e.Path], raw[e.Source]) {
				return nil, fmt.Errorf("wrapper parity mismatch: %s (source %s)", e.Path, e.Source)
			}
			continue
		}
		if e.Kind == "excluded" {
			continue
		}
		obj, isObject := v.(map[string]any)
		declared, hasDeclared := obj["$schema"]
		if e.Kind == "data" {
			if e.Owner == "" || e.Reason == "" {
				return nil, fmt.Errorf("unowned data classification: %s", e.Path)
			}
			if hasDeclared && (declared != e.Schema || draft(e.Schema) != nil) {
				return nil, fmt.Errorf("data schema target mismatch: %s", e.Path)
			}
			continue
		}
		if draft(e.Dialect) == nil {
			return nil, fmt.Errorf("unknown dialect for %s: %s", e.Path, e.Dialect)
		}
		if _, isBool := v.(bool); !isBool && !isObject {
			return nil, fmt.Errorf("schema must be object or boolean: %s", e.Path)
		}
		if hasDeclared && declared != e.Dialect {
			return nil, fmt.Errorf("declared dialect mismatch: %s", e.Path)
		}
		if !hasDeclared && isObject {
			obj["$schema"] = e.Dialect
		}
		loc := "https://inventory.invalid/" + e.Path
		if e.Kind == "metaschema" {
			if e.Owner == "" || e.Reason == "" {
				return nil, fmt.Errorf("unowned isolated metaschema: %s", e.Path)
			}
			locations[e.Path] = loc
			continue
		}
		idKey := "$id"
		if draft(e.Dialect) == jsonschema.Draft4 {
			idKey = "id"
		}
		if id, ok := obj[idKey]; ok {
			s, ok := id.(string)
			u, parseErr := url.Parse(s)
			if !ok || parseErr != nil || !u.IsAbs() || u.Fragment != "" {
				return nil, fmt.Errorf("invalid absolute resource ID: %s", e.Path)
			}
			loc = strings.TrimSuffix(s, "#")
			if u.Hostname() == "json-schema.org" {
				return nil, fmt.Errorf("reserved metaschema ID in ordinary schema: %s", e.Path)
			}
		}
		if previous, ok := ids[loc]; ok {
			return nil, fmt.Errorf("duplicate resource ID %s: %s and %s", loc, previous, e.Path)
		}
		ids[loc] = e.Path
		resources[loc] = v
		locations[e.Path] = loc
	}
	for _, e := range m.Entries {
		if e.Kind != "schema" && e.Kind != "metaschema" {
			continue
		}
		n, err := schemaNodes(docs[e.Path], "", locations[e.Path], e.Dialect)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", e.Path, err)
		}
		nodes[e.Path] = n
		if e.Kind == "metaschema" {
			continue
		}
		for _, node := range n {
			if node.pointer == "" {
				continue
			}
			key := "$id"
			if draft(node.dialect) == jsonschema.Draft4 {
				key = "id"
			}
			if _, exists := node.value[key]; !exists {
				continue
			}
			if previous, exists := ids[node.base]; exists {
				return nil, fmt.Errorf("duplicate resource ID %s: %s and %s#%s", node.base, previous, e.Path, node.pointer)
			}
			ids[node.base] = e.Path + "#" + node.pointer
			// Fragment IDs belong to their containing resource; the engine resolves
			// these anchors. Separate nested resources enter the closed catalog.
			u, err := url.Parse(node.base)
			if err != nil {
				return nil, err
			}
			if u.Fragment == "" {
				resources[node.base] = map[string]any{"$schema": node.dialect, "$ref": locations[e.Path] + "#" + node.pointer}
			}
		}
	}
	for alias, path := range m.Aliases {
		if _, exists := resources[alias]; exists {
			return nil, fmt.Errorf("duplicate catalog alias: %s", alias)
		}
		loc, ok := locations[path]
		if !ok || entries[path].Kind != "schema" {
			return nil, fmt.Errorf("invalid catalog alias target: %s", path)
		}
		resources[alias] = resources[loc]
		ids[alias] = path
	}
	compiled := map[string]*jsonschema.Schema{}
	var findings []error
	for _, e := range m.Entries {
		if e.Kind != "schema" && e.Kind != "metaschema" {
			continue
		}
		c := jsonschema.NewCompiler()
		c.DefaultDraft(draft(e.Dialect))
		c.UseLoader(closedLoader{})
		for loc, v := range resources {
			if err := c.AddResource(loc, v); err != nil {
				return nil, fmt.Errorf("catalog %s: %w", loc, err)
			}
		}
		if e.Kind == "metaschema" {
			if err := c.AddResource(locations[e.Path], docs[e.Path]); err != nil {
				return nil, err
			}
		}
		s, err := c.Compile(locations[e.Path])
		if err != nil {
			findings = append(findings, fmt.Errorf("compile %s: %w", e.Path, err))
			continue
		}
		compiled[e.Path] = s
		for _, node := range nodes[e.Path] {
			if node.pointer == "" {
				continue
			}
			if _, err := c.Compile(locations[e.Path] + "#" + node.pointer); err != nil {
				findings = append(findings, fmt.Errorf("compile %s#%s: %w", e.Path, node.pointer, err))
			}
		}
	}
	if len(compiled) == 0 {
		return nil, errors.Join(append(findings, fmt.Errorf("zero schemas compiled"))...)
	}
	for _, e := range m.Entries {
		if e.Kind != "data" || e.Schema == "" {
			continue
		}
		p, ok := ids[e.Schema]
		if !ok {
			findings = append(findings, fmt.Errorf("unknown instance schema %s: %s", e.Path, e.Schema))
			continue
		}
		if compiled[p] == nil {
			findings = append(findings, fmt.Errorf("instance %s: schema did not compile: %s", e.Path, p))
			continue
		}
		if err := compiled[p].Validate(docs[e.Path]); err != nil {
			findings = append(findings, fmt.Errorf("instance %s: %w", e.Path, err))
		}
	}
	return compiled, errors.Join(findings...)
}

// Keep semantic equality available to regression tests without numeric coercion.
func equal(a, b any) bool { return reflect.DeepEqual(a, b) }

func main() {
	root := flag.String("root", "../..", "repository root")
	manifest := flag.String("manifest", "inventory.json", "checked classification manifest")
	flag.Parse()
	info, ok := debug.ReadBuildInfo()
	if !ok {
		fmt.Fprintln(os.Stderr, "missing validator build identity")
		os.Exit(1)
	}
	verified := 0
	for _, dep := range info.Deps {
		want := ""
		switch dep.Path {
		case "github.com/santhosh-tekuri/jsonschema/v6":
			want = "v6.0.3"
		case "gopkg.in/yaml.v3":
			want = "v3.0.1"
		}
		if want != "" {
			if dep.Version != want || dep.Replace != nil {
				fmt.Fprintln(os.Stderr, "validator dependency pin mismatch:", dep.Path)
				os.Exit(1)
			}
			verified++
		}
	}
	if verified != 2 {
		fmt.Fprintln(os.Stderr, "validator dependency identity missing")
		os.Exit(1)
	}
	fmt.Printf("Strict schema engine: %s; resolver: bundled metaschemas + checked catalog (offline)\n", engine)
	m, err := loadManifest(*manifest)
	if err == nil {
		var schemas map[string]*jsonschema.Schema
		schemas, err = validate(*root, m)
		if err == nil {
			fmt.Printf("Validated %d schemas; exact inventory: %d paths\n", len(schemas), len(m.Entries))
		} else if schemas != nil {
			expected := 0
			for _, e := range m.Entries {
				if e.Kind == "schema" || e.Kind == "metaschema" {
					expected++
				}
			}
			fmt.Printf("Compiled %d of %d schemas; reconciled inventory: %d paths; contract findings follow\n", len(schemas), expected, len(m.Entries))
		}
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

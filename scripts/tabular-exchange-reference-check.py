#!/usr/bin/env python3
"""Reference checker for the Tabular Exchange Standard, contract revision
tabular-exchange/0.1.0.

Written from the prose of the standard and of semantic-validation.md only.
Python 3 standard library only.

Agreement between this checker and the vectors shows that the vectors are
consistent with one reading of the standard. It comes from the same authors
as the vectors and is weaker evidence than a consumer written by a third
party; it does not qualify an implementation.

Usage: python3 reference_check.py [DATA_DIR] [--report FILE]

Layout of this file:
  1. strict byte-level document reader
  2. table schema reader
  3. extensions bounds
  4. conversion policy reader, policy against schema
  5. conversion result reader (order of reading), result against schema/policy
  6. matching procedure
  7. value grammar and quantization
  8. rows encoding
  9. "extensions deleted" procedure (X-10)
 10. suite runners (compute outcomes; never look at expected members)
 11. comparison harness (the only place that reads expected members)
"""

import hashlib
import json
import os
import re
import sys

if hasattr(sys, "set_int_max_str_digits"):
    # D-10: a number is never refused as unparseable, however large it is.
    sys.set_int_max_str_digits(0)

MAX_COUNT = 9007199254740991  # 2^53 - 1
CONTRACT = "tabular-exchange/0.1.0"
FORMATS = {
    "schema": "tabular-exchange.schema/0",
    "policy": "tabular-exchange.policy/0",
    "result": "tabular-exchange.result/0",
}
MAX_DEPTH = {"schema": 3, "policy": 6, "result": 6}
DIGITS = "0123456789"
HEX = "0123456789abcdefABCDEF"

INVALID = "invalid-input"
MISMATCH = "schema-mismatch"
LIMIT = "resource-limit"
UNSUPPORTED_TYPE = "unsupported-type"


class Refusal(Exception):
    """A refusal: category, rule and optional location."""

    def __init__(self, category, rule, row=None, column=None):
        Exception.__init__(self, "%s/%s" % (category, rule))
        self.category = category
        self.rule = rule
        self.row = row
        self.column = column


def is_int(v):
    return type(v) is int


def is_count(v):
    return type(v) is int and 0 <= v <= MAX_COUNT


# ---------------------------------------------------------------------------
# 1. Strict byte-level document reader
# ---------------------------------------------------------------------------


class _StringError(Exception):
    """kind is 'invalid' (bad escape, surrogate, control) or 'unterminated'."""

    def __init__(self, kind):
        Exception.__init__(self, kind)
        self.kind = kind


def lex_string(text, i):
    """text[i] is the opening quote. Returns (decoded string, index after the
    closing quote). Shared by the document reader and the rows lexer."""
    n = len(text)
    i += 1
    out = []
    while True:
        if i >= n:
            raise _StringError("unterminated")
        c = text[i]
        if c == '"':
            return "".join(out), i + 1
        if ord(c) < 0x20:
            raise _StringError("invalid")
        if c != "\\":
            out.append(c)
            i += 1
            continue
        if i + 1 >= n:
            raise _StringError("unterminated")
        e = text[i + 1]
        simple = {
            '"': '"',
            "\\": "\\",
            "/": "/",
            "b": "\b",
            "f": "\f",
            "n": "\n",
            "r": "\r",
            "t": "\t",
        }
        if e in simple:
            out.append(simple[e])
            i += 2
            continue
        if e != "u":
            raise _StringError("invalid")
        cp = _hex4(text, i + 2)
        i += 6
        if 0xDC00 <= cp <= 0xDFFF:
            raise _StringError("invalid")
        if 0xD800 <= cp <= 0xDBFF:
            if text[i : i + 2] != "\\u":
                raise _StringError("invalid")
            lo = _hex4(text, i + 2)
            if not 0xDC00 <= lo <= 0xDFFF:
                raise _StringError("invalid")
            i += 6
            cp = 0x10000 + ((cp - 0xD800) << 10) + (lo - 0xDC00)
        out.append(chr(cp))


def _hex4(text, i):
    h = text[i : i + 4]
    if len(h) != 4 or any(ch not in HEX for ch in h):
        raise _StringError("invalid")
    return int(h, 16)


class _Malformed(Exception):
    pass


class _DocParser:
    WS = " \t\n\r"

    def __init__(self, text, max_depth):
        self.t = text
        self.n = len(text)
        self.i = 0
        self.max_depth = max_depth

    def ws(self):
        while self.i < self.n and self.t[self.i] in self.WS:
            self.i += 1

    def parse(self):
        if self.t.startswith("\ufeff"):
            raise _Malformed("byte order mark")
        self.ws()
        v = self.value(0)
        self.ws()
        if self.i != self.n:
            raise _Malformed("text after the value")
        return v

    def value(self, depth):
        if self.i >= self.n:
            raise _Malformed("no value")
        c = self.t[self.i]
        if c == "{":
            return self.obj(depth + 1)
        if c == "[":
            return self.arr(depth + 1)
        if c == '"':
            return self.string()
        if c in DIGITS:
            return self.number()
        for lit, val in (("true", True), ("false", False), ("null", None)):
            if self.t.startswith(lit, self.i):
                self.i += len(lit)
                return val
        raise _Malformed("unexpected character")

    def string(self):
        try:
            s, self.i = lex_string(self.t, self.i)
        except _StringError:
            raise _Malformed("string")
        return s

    def number(self):
        start = self.i
        if self.t[self.i] == "0":
            self.i += 1
        else:
            while self.i < self.n and self.t[self.i] in DIGITS:
                self.i += 1
        if self.i < self.n and self.t[self.i] in DIGITS + ".eE+-":
            raise _Malformed("number spelling")
        return int(self.t[start : self.i])

    def obj(self, depth):
        if depth > self.max_depth:
            raise _Malformed("nesting")
        self.i += 1
        out = {}
        self.ws()
        if self.i < self.n and self.t[self.i] == "}":
            self.i += 1
            return out
        while True:
            self.ws()
            if self.i >= self.n or self.t[self.i] != '"':
                raise _Malformed("key")
            k = self.string()
            if k in out:
                raise _Malformed("repeated key")
            self.ws()
            if self.i >= self.n or self.t[self.i] != ":":
                raise _Malformed("colon")
            self.i += 1
            self.ws()
            out[k] = self.value(depth)
            self.ws()
            if self.i < self.n and self.t[self.i] == ",":
                self.i += 1
                continue
            if self.i < self.n and self.t[self.i] == "}":
                self.i += 1
                return out
            raise _Malformed("object")

    def arr(self, depth):
        if depth > self.max_depth:
            raise _Malformed("nesting")
        self.i += 1
        out = []
        self.ws()
        if self.i < self.n and self.t[self.i] == "]":
            self.i += 1
            return out
        while True:
            self.ws()
            out.append(self.value(depth))
            self.ws()
            if self.i < self.n and self.t[self.i] == ",":
                self.i += 1
                continue
            if self.i < self.n and self.t[self.i] == "]":
                self.i += 1
                return out
            raise _Malformed("array")


def parse_grammar(data, kind):
    """Document steps 2 and 3: UTF-8, then the document grammar."""
    try:
        text = data.decode("utf-8", "strict")
    except UnicodeDecodeError:
        raise Refusal(INVALID, kind + "-not-utf8")
    try:
        return _DocParser(text, MAX_DEPTH[kind]).parse()
    except _Malformed:
        raise Refusal(INVALID, kind + "-malformed")


def read_document(data, kind):
    """Document steps 2 to 5. Returns the top-level object."""
    doc = parse_grammar(data, kind)
    if type(doc) is not dict:
        raise Refusal(INVALID, kind + "-not-an-object")
    if doc.get("format") != FORMATS[kind] or type(doc.get("format")) is not str:
        raise Refusal(INVALID, kind + "-format-unsupported")
    return doc


def serialize(v):
    """Serialize a JSON value as text. RawNumber keeps its spelling."""
    if isinstance(v, RawNumber):
        return str(v)
    if v is None:
        return "null"
    if v is True:
        return "true"
    if v is False:
        return "false"
    if type(v) is int:
        return str(v)
    if isinstance(v, str):
        return json.dumps(v)  # ASCII output; a lone surrogate stays an escape
    if isinstance(v, list):
        return "[" + ",".join(serialize(x) for x in v) + "]"
    if isinstance(v, dict):
        return (
            "{"
            + ",".join(json.dumps(k) + ":" + serialize(x) for k, x in v.items())
            + "}"
        )
    raise TypeError(type(v))


class RawNumber(str):
    """A number of a vector file, kept exactly as it was spelled."""


# ---------------------------------------------------------------------------
# Step-6 helpers. Order chosen where the standard leaves it open:
# missing, then unknown, then invalid (the order of the table of step 6).
# ---------------------------------------------------------------------------


def need_object(v, kind):
    if type(v) is not dict:
        raise Refusal(INVALID, kind + "-not-an-object")
    return v


def check_members(obj, kind, required, allowed):
    for m in required:
        if m not in obj:
            raise Refusal(INVALID, kind + "-member-missing")
    for m in obj:
        if m not in allowed:
            raise Refusal(INVALID, kind + "-member-unknown")


def invalid(kind):
    return Refusal(INVALID, kind + "-member-invalid")


# ---------------------------------------------------------------------------
# 2. Table schema
# ---------------------------------------------------------------------------

TYPES = (
    "string",
    "boolean",
    "integer",
    "decimal",
    "date",
    "local-timestamp",
    "offset-timestamp",
)
TYPE_PARAMS = {
    "decimal": ("precision", "scale"),
    "local-timestamp": ("fraction",),
    "offset-timestamp": ("fraction",),
}
EXACT_TYPES = ("integer", "decimal")


def check_type_and_params(col):
    """The type of a column and the parameters of that type (shared with the
    value vectors, whose columns have no identifier or label)."""
    if "type" not in col:
        raise Refusal(INVALID, "schema-member-missing")
    t = col["type"]
    if type(t) is not str:
        raise invalid("schema")
    if t not in TYPES:
        raise Refusal(UNSUPPORTED_TYPE, "schema-type-unsupported")
    return t, TYPE_PARAMS.get(t, ())


def check_param_values(col, t):
    if t == "decimal":
        p, s = col["precision"], col["scale"]
        if not is_int(p) or not 1 <= p <= 38:
            raise invalid("schema")
        if not is_int(s) or s < 0 or s > p:
            raise invalid("schema")
    elif t in ("local-timestamp", "offset-timestamp"):
        f = col["fraction"]
        if not is_int(f) or not 0 <= f <= 9:
            raise invalid("schema")


def read_schema(data):
    """Returns the list of column dicts of an accepted table schema."""
    doc = read_document(data, "schema")
    check_members(doc, "schema", ("format", "columns"), ("format", "columns"))
    cols = doc["columns"]
    if type(cols) is not list:
        raise invalid("schema")
    if not cols:
        raise Refusal(INVALID, "schema-columns-invalid")
    seen = set()
    for col in cols:
        need_object(col, "schema")
        t, params = check_type_and_params(col)
        members = ("id", "label", "type", "nullable") + params
        check_members(col, "schema", members, members)
        if type(col["id"]) is not str:
            raise invalid("schema")
        if col["id"] == "":
            raise Refusal(INVALID, "schema-columns-invalid")
        if type(col["label"]) is not str:
            raise invalid("schema")
        if type(col["nullable"]) is not bool:
            raise invalid("schema")
        check_param_values(col, t)
        if col["id"] in seen:
            raise Refusal(INVALID, "schema-columns-invalid")
        seen.add(col["id"])
    return cols


# ---------------------------------------------------------------------------
# 3. Extensions bounds (X-01 to X-06; X-07 is the nesting bound of the reader)
# ---------------------------------------------------------------------------

NAMESPACE_RE = re.compile(r"[a-z][a-z0-9]*(-[a-z0-9]+)*")
MAX_NAMESPACES = 8
MAX_EXT_VALUES = 256
MAX_EXT_STRING = 256


def check_extensions(ext, kind):
    need_object(ext, kind)
    if len(ext) > MAX_NAMESPACES:  # X-03
        raise invalid(kind)
    for ns, v in ext.items():
        if len(ns) > 64 or not NAMESPACE_RE.fullmatch(ns):  # X-01
            raise invalid(kind)
        need_object(v, kind)  # X-02
    total = [0]

    def walk(v):
        if type(v) is str and len(v) > MAX_EXT_STRING:  # X-05
            raise invalid(kind)
        if type(v) is int and v > MAX_COUNT:  # X-06
            raise invalid(kind)
        if type(v) is dict:
            for k, x in v.items():
                if len(k) > MAX_EXT_STRING:  # X-05
                    raise invalid(kind)
                total[0] += 1
                walk(x)
        elif type(v) is list:
            for x in v:
                total[0] += 1
                walk(x)

    walk(ext)
    if total[0] > MAX_EXT_VALUES:  # X-04
        raise invalid(kind)


# ---------------------------------------------------------------------------
# 4. Conversion policy
# ---------------------------------------------------------------------------

EXACT_NUMBERS = ("require-exact", "text-if-needed", "text-always")
ROUNDINGS = (
    "half-even",
    "half-away-from-zero",
    "toward-zero",
    "toward-positive",
    "toward-negative",
)


def check_quantize_entry_values(scale, rounding):
    if not is_int(scale) or not 0 <= scale <= 38:
        raise invalid("policy")
    if type(rounding) is not str or rounding not in ROUNDINGS:
        raise invalid("policy")


def read_policy(data, implemented_namespaces=()):
    """Returns the top-level object of an accepted policy."""
    doc = read_document(data, "policy")
    check_members(
        doc,
        "policy",
        ("format", "exact_numbers"),
        ("format", "exact_numbers", "quantize", "extensions"),
    )
    en = doc["exact_numbers"]
    if type(en) is not str or en not in EXACT_NUMBERS:
        raise invalid("policy")
    if "quantize" in doc:
        q = doc["quantize"]
        if type(q) is not list:
            raise invalid("policy")
        seen = set()
        for e in q:
            need_object(e, "policy")
            members = ("column", "scale", "rounding")
            check_members(e, "policy", members, members)
            if type(e["column"]) is not str:
                raise invalid("policy")
            check_quantize_entry_values(e["scale"], e["rounding"])
            if e["column"] in seen:  # P-01
                raise Refusal(INVALID, "policy-quantize-duplicate")
            seen.add(e["column"])
    if "extensions" in doc:
        check_extensions(doc["extensions"], "policy")  # bounds first
        for ns in doc["extensions"]:  # P-07
            if ns not in implemented_namespaces:
                raise Refusal(INVALID, "policy-extension-unsupported")
    return doc


def check_policy_against_schema(policy, columns):
    """P-02 to P-04, entry by entry."""
    by_id = dict((c["id"], c) for c in columns)
    for e in policy.get("quantize", ()):
        col = by_id.get(e["column"])
        if col is None:
            raise Refusal(MISMATCH, "quantize-unknown-column")
        if col["type"] != "decimal":
            raise Refusal(MISMATCH, "quantize-not-decimal")
        if e["scale"] > col["precision"]:
            raise Refusal(MISMATCH, "quantize-scale-too-large")


# ---------------------------------------------------------------------------
# 5. Conversion result
# ---------------------------------------------------------------------------

STATUSES = ("ok", "refused", "failed", "cancelled")
STATUS_CATEGORIES = {
    "refused": (
        "invalid-input",
        "schema-mismatch",
        "unsupported-type",
        "unsupported-representation",
        "resource-limit",
    ),
    "failed": ("resource-limit", "io-failure", "internal"),
    "cancelled": ("cancelled",),
}
CATEGORIES = (
    "invalid-input",
    "schema-mismatch",
    "unsupported-type",
    "unsupported-representation",
    "resource-limit",
    "io-failure",
    "cancelled",
    "internal",
)
REPRESENTATIONS = ("native", "text-fallback", "text-forced", "text")
FIVE = ("numeric", "text_fallback", "text_forced", "quantized", "scale_changed")
RUN_ID_RE = re.compile(r"[A-Za-z0-9._-]{1,128}")
SHA_RE = re.compile(r"[0-9a-f]{64}")
PROFILE_ID_RE = re.compile(r"[a-z][a-z0-9]*(-[a-z0-9]+)*/r(0|[1-9][0-9]*)")
RULE_ID_RE = re.compile(r"[a-z][a-z0-9]*(-[a-z0-9]+)*")
INPUT_NAMES = ("source", "schema", "policy")
TOP_RESULT = (
    "format",
    "contract",
    "status",
    "run_id",
    "profile",
    "inputs",
    "output",
    "counts",
    "refusal",
    "extensions",
)


class ResultView:
    """An accepted result. output/counts are None unless status is ok;
    refusal is None when it is."""

    def __init__(self):
        self.status = None
        self.run_id = None
        self.profile = None
        self.inputs = None
        self.output = None
        self.counts = None
        self.refusal = None

    def summary(self):
        return {
            "status": self.status,
            "run_id": self.run_id,
            "inputs": self.inputs,
            "output": self.output,
            "counts": self.counts,
            "refusal": self.refusal,
        }


def _sha(v):
    if type(v) is not str or not SHA_RE.fullmatch(v):
        raise invalid("result")


def _count(v):
    if not is_count(v):
        raise invalid("result")


def _byte_summary(v):
    need_object(v, "result")
    check_members(v, "result", ("sha256", "bytes"), ("sha256", "bytes"))
    _sha(v["sha256"])
    _count(v["bytes"])
    return v


def read_result(data):
    """Order of reading, steps 1 to 5. Returns a ResultView."""
    # Step 1: bytes, grammar, object, format.
    doc = read_document(data, "result")
    # Step 2 (O-01): contract.
    if "contract" not in doc:
        raise Refusal(INVALID, "result-member-missing")
    if doc["contract"] != CONTRACT or type(doc["contract"]) is not str:
        raise Refusal(INVALID, "result-contract-unsupported")
    # Step 3 (O-02): status.
    if "status" not in doc:
        raise Refusal(INVALID, "result-member-missing")
    status = doc["status"]
    if type(status) is not str or status not in STATUSES:
        raise invalid("result")
    # Step 4 (O-03): presence only. Nothing of output/counts is examined.
    _presence(doc, status)
    # Step 5: every other rule.
    return _read_rest(doc, status)


def _presence(doc, status):
    if status == "ok":
        for m in ("output", "counts"):
            if m not in doc:
                raise Refusal(INVALID, "result-member-missing")
        if "inputs" not in doc:
            raise Refusal(INVALID, "result-member-missing")
        inputs = need_object(doc["inputs"], "result")
        for name in INPUT_NAMES:
            if name not in inputs:
                raise Refusal(INVALID, "result-member-missing")
        if "refusal" in doc:
            raise Refusal(INVALID, "result-member-unknown")
    else:
        if "refusal" not in doc:
            raise Refusal(INVALID, "result-member-missing")
        for m in ("output", "counts"):
            if m in doc:
                raise Refusal(INVALID, "result-member-unknown")


def _read_rest(doc, status):
    view = ResultView()
    view.status = status
    check_members(doc, "result", ("run_id", "profile", "inputs"), TOP_RESULT)
    if type(doc["run_id"]) is not str or not RUN_ID_RE.fullmatch(doc["run_id"]):
        raise invalid("result")
    view.run_id = doc["run_id"]
    profile = need_object(doc["profile"], "result")
    check_members(profile, "result", ("id", "sha256"), ("id", "sha256"))
    if type(profile["id"]) is not str or not PROFILE_ID_RE.fullmatch(profile["id"]):
        raise invalid("result")
    _sha(profile["sha256"])
    view.profile = profile
    inputs = need_object(doc["inputs"], "result")
    check_members(inputs, "result", (), INPUT_NAMES)
    for name in INPUT_NAMES:
        if name in inputs:
            _byte_summary(inputs[name])
    view.inputs = inputs
    if status == "ok":
        view.output = _byte_summary(doc["output"])
        view.counts = _read_counts(doc["counts"])
    else:
        view.refusal = _read_refusal(doc["refusal"], status)
    if "extensions" in doc:
        check_extensions(doc["extensions"], "result")  # then ignored (X-08)
    if status == "ok":
        _check_counts_invariants(view.counts)
    return view


def _read_counts(counts):
    need_object(counts, "result")
    check_members(counts, "result", ("rows", "columns"), ("rows", "columns"))
    _count(counts["rows"])
    cols = counts["columns"]
    if type(cols) is not list or not cols:
        raise invalid("result")
    base = ("id", "representation", "null", "empty")
    for c in cols:
        need_object(c, "result")
        check_members(c, "result", base, base + FIVE)
        rep = c["representation"]
        if type(rep) is not str or rep not in REPRESENTATIONS:
            raise invalid("result")
        have = [m for m in FIVE if m in c]
        if rep == "text" and have:  # D-09
            raise Refusal(INVALID, "result-member-unknown")
        if have and len(have) != len(FIVE):
            raise Refusal(INVALID, "result-member-missing")
        if rep in ("text-fallback", "text-forced") and not have:
            raise Refusal(INVALID, "result-member-missing")
        if type(c["id"]) is not str or c["id"] == "":
            raise invalid("result")
        for m in ("null", "empty") + tuple(have):
            _count(c[m])
    return counts


def _check_counts_invariants(counts):
    def bad():
        return Refusal(INVALID, "result-counts-inconsistent")

    rows = counts["rows"]
    seen = set()
    for c in counts["columns"]:
        if c["id"] in seen:  # C-05
            raise bad()
        seen.add(c["id"])
        if c["null"] > rows or c["empty"] > rows - c["null"]:  # C-06
            raise bad()
        if "numeric" not in c:
            continue
        non_null = rows - c["null"]
        if c["numeric"] + c["text_fallback"] + c["text_forced"] != non_null:  # C-07
            raise bad()
        own = {
            "native": "numeric",
            "text-fallback": "text_fallback",
            "text-forced": "text_forced",
        }[c["representation"]]
        for m in ("numeric", "text_fallback", "text_forced"):  # C-08
            if m != own and c[m] > 0:
                raise bad()
        if c["scale_changed"] not in (0, non_null):  # C-09
            raise bad()
        if c["quantized"] > c["scale_changed"]:  # C-10
            raise bad()


def _read_refusal(refusal, status):
    need_object(refusal, "result")
    check_members(
        refusal, "result", ("category", "rule"), ("category", "rule", "row", "column")
    )
    cat = refusal["category"]
    if type(cat) is not str or cat not in CATEGORIES:
        raise invalid("result")
    rule = refusal["rule"]
    if type(rule) is not str or len(rule) > 64 or not RULE_ID_RE.fullmatch(rule):
        raise invalid("result")
    if "row" in refusal:
        _count(refusal["row"])
    if "column" in refusal:
        if type(refusal["column"]) is not str or refusal["column"] == "":
            raise invalid("result")
    if cat not in STATUS_CATEGORIES[status]:  # C-03
        raise invalid("result")
    return refusal


def check_result_against(view, columns=None, policy=None):
    """C-11 to C-16 against a schema, C-17 to C-21 against a policy."""
    if view.status != "ok":
        return
    ccols = view.counts["columns"]
    if columns is not None:

        def bad():
            return Refusal(INVALID, "result-schema-mismatch")

        if [c["id"] for c in ccols] != [c["id"] for c in columns]:  # C-11
            raise bad()
        for c, s in zip(ccols, columns):
            exact = s["type"] in EXACT_TYPES
            rep = c["representation"]
            if ("numeric" in c) != exact:  # C-12
                raise bad()
            if s["type"] == "string" and rep != "text":  # C-13
                raise bad()
            if exact and rep == "text":
                raise bad()
            if not exact and rep in ("text-fallback", "text-forced"):
                raise bad()
            if not s["nullable"] and c["null"] != 0:  # C-14
                raise bad()
            if s["type"] != "string" and c["empty"] != 0:  # C-15
                raise bad()
            if (
                s["type"] != "decimal"
                and "numeric" in c
                and (c["quantized"] != 0 or c["scale_changed"] != 0)
            ):  # C-16
                raise bad()
    if policy is not None:

        def badp():
            return Refusal(INVALID, "result-policy-mismatch")

        by_id = dict((s["id"], s) for s in columns) if columns is not None else None
        targets = dict((e["column"], e["scale"]) for e in policy.get("quantize", ()))
        want = {
            "text-always": ("text-forced",),
            "require-exact": ("native",),
            "text-if-needed": ("native", "text-fallback"),
        }[policy["exact_numbers"]]
        for c in ccols:
            if by_id is not None:
                s = by_id.get(c["id"])
                exact = s is not None and s["type"] in EXACT_TYPES
            else:
                s = None
                exact = "numeric" in c
            if exact and c["representation"] not in want:  # C-17..C-19
                raise badp()
            if "numeric" not in c:
                continue
            if c["id"] not in targets:  # C-20
                if c["quantized"] != 0 or c["scale_changed"] != 0:
                    raise badp()
            elif (
                s is not None
                and s["type"] == "decimal"
                and targets[c["id"]] == s["scale"]
                and c["scale_changed"] != 0
            ):
                raise badp()
            elif (
                s is not None
                and s["type"] == "decimal"
                and targets[c["id"]] != s["scale"]
                and c["scale_changed"] != view.counts["rows"] - c["null"]
            ):  # C-21
                raise badp()


# ---------------------------------------------------------------------------
# 6. Matching (M-01 to M-16)
# ---------------------------------------------------------------------------

NOT_ESTABLISHED = "not-established"
EXPECTATION_NAMES = ("run_id", "source", "schema", "policy")


def _expectation_well_formed(name, v):
    if name == "run_id":
        return type(v) is str and RUN_ID_RE.fullmatch(v) is not None
    return (
        type(v) is dict
        and is_count(v.get("bytes"))
        and type(v.get("sha256")) is str
        and SHA_RE.fullmatch(v["sha256"]) is not None
    )


def match(result_bytes, output_bytes, expectations):
    """Returns (verdict, rule identifier or None, deciding step)."""
    supplied = [n for n in EXPECTATION_NAMES if n in expectations]
    if len(supplied) not in (0, 4):  # M-01
        return (NOT_ESTABLISHED, "expectations-incomplete", "M-01")
    for n in supplied:  # M-02
        if not _expectation_well_formed(n, expectations[n]):
            return (NOT_ESTABLISHED, "expectation-invalid", "M-02")
    if result_bytes is None:  # M-03
        return (NOT_ESTABLISHED, "result-missing", "M-03")
    try:  # M-04
        view = read_result(result_bytes)
    except Refusal as r:
        return (NOT_ESTABLISHED, r.rule, "M-04")
    if view.status != "ok":  # M-05
        return (NOT_ESTABLISHED, "result-not-ok", "M-05")
    bound = len(supplied) == 4
    if bound:
        if view.run_id != expectations["run_id"]:  # M-06
            return (NOT_ESTABLISHED, "binding-run-id-mismatch", "M-06")
        step = 7
        for name in INPUT_NAMES:  # M-07..M-12
            if view.inputs[name]["bytes"] != expectations[name]["bytes"]:
                return (
                    NOT_ESTABLISHED,
                    "binding-%s-length-mismatch" % name,
                    "M-%02d" % step,
                )
            if view.inputs[name]["sha256"] != expectations[name]["sha256"]:
                return (
                    NOT_ESTABLISHED,
                    "binding-%s-digest-mismatch" % name,
                    "M-%02d" % (step + 1),
                )
            step += 2
    if output_bytes is None:  # M-13
        return (NOT_ESTABLISHED, "output-missing", "M-13")
    if len(output_bytes) != view.output["bytes"]:  # M-14
        return (NOT_ESTABLISHED, "output-length-mismatch", "M-14")
    if hashlib.sha256(output_bytes).hexdigest() != view.output["sha256"]:  # M-15
        return (NOT_ESTABLISHED, "output-digest-mismatch", "M-15")
    return ("requested-run-completed" if bound else "output-agreement", None, "M-16")


# ---------------------------------------------------------------------------
# 7. Values and quantization
# ---------------------------------------------------------------------------


def split_exact(text):
    """Rules 1 to 6 of an exact number. Returns (negative, whole digits,
    fraction digits or None, significant digit count)."""
    neg = text.startswith("-")
    body = text[1:] if neg else text
    if body == "":
        raise Refusal(INVALID, "exact-empty")
    if any(c not in DIGITS and c != "." for c in body):
        raise Refusal(INVALID, "exact-invalid-character")
    if body.count(".") > 1:
        raise Refusal(INVALID, "exact-malformed")
    if "." in body:
        whole, frac = body.split(".")
        if whole == "" or frac == "":
            raise Refusal(INVALID, "exact-malformed")
    else:
        whole, frac = body, None
    if len(whole) > 1 and whole[0] == "0":
        raise Refusal(INVALID, "exact-leading-zero")
    stripped = (whole + (frac or "")).lstrip("0")
    sig = len(stripped) or 1
    if sig > 38:
        raise Refusal(LIMIT, "exact-too-many-digits")
    if neg and stripped == "":
        raise Refusal(INVALID, "exact-negative-zero")
    return neg, whole, frac, sig


def judge_exact(text, col):
    neg, whole, frac, sig = split_exact(text)
    decimal = col["type"] == "decimal"
    want_point = decimal and col["scale"] > 0
    if (frac is not None) != want_point:
        raise Refusal(MISMATCH, "exact-point-mismatch")
    if frac is not None and len(frac) != col["scale"]:
        raise Refusal(MISMATCH, "exact-scale-mismatch")
    if decimal and sig > col["precision"]:
        raise Refusal(MISMATCH, "exact-precision-exceeded")


def _all_digits(s):
    return all(c in DIGITS for c in s)


def judge_date(text):
    if not (
        len(text) == 10
        and text[4] == "-"
        and text[7] == "-"
        and _all_digits(text[0:4] + text[5:7] + text[8:10])
    ):
        raise Refusal(INVALID, "temporal-malformed")
    y, m, d = int(text[0:4]), int(text[5:7]), int(text[8:10])
    if y == 0 or not 1 <= m <= 12:
        raise Refusal(INVALID, "temporal-invalid-date")
    leap = y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)
    last = (31, 29 if leap else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)[m - 1]
    if not 1 <= d <= last:
        raise Refusal(INVALID, "temporal-invalid-date")


def _offset_ok(part):
    if part == "Z":
        return True
    return (
        len(part) == 6
        and part[0] in "+-"
        and part[3] == ":"
        and _all_digits(part[1:3] + part[4:6])
        and int(part[1:3]) <= 23
        and int(part[4:6]) <= 59
    )


def judge_timestamp(text, col):
    if len(text) < 19 or text[10] != "T" or text[13] != ":" or text[16] != ":":
        raise Refusal(INVALID, "temporal-malformed")  # 1
    judge_date(text[:10])  # 2
    clock = text[11:13] + text[14:16] + text[17:19]
    if not _all_digits(clock):
        raise Refusal(INVALID, "temporal-malformed")  # 3
    if int(clock[0:2]) > 23 or int(clock[2:4]) > 59 or int(clock[4:6]) > 59:
        raise Refusal(INVALID, "temporal-invalid-time")  # 4
    tail = text[19:]
    frac_digits = None
    offset = tail
    if tail.startswith("."):
        j = 1
        while j < len(tail) and tail[j] in DIGITS:
            j += 1
        if j == 1:
            raise Refusal(INVALID, "temporal-malformed")  # 5
        frac_digits = j - 1
        offset = tail[j:]
    if offset != "" and not _offset_ok(offset):
        raise Refusal(INVALID, "temporal-invalid-offset")  # 6
    if offset == "-00:00":
        raise Refusal(INVALID, "temporal-negative-zero-offset")  # 7
    want = col["fraction"]
    if (want == 0 and frac_digits is not None) or (want > 0 and frac_digits != want):
        raise Refusal(MISMATCH, "temporal-fraction-mismatch")  # 8
    if (col["type"] == "local-timestamp") != (offset == ""):
        raise Refusal(MISMATCH, "temporal-offset-mismatch")  # 9


def judge_text(text, col):
    """A string element against a column that is not boolean."""
    t = col["type"]
    if t == "string":
        return
    if t in EXACT_TYPES:
        judge_exact(text, col)
    elif t == "date":
        judge_date(text)
    else:
        judge_timestamp(text, col)


def judge_cell(value, col):
    """An element (None, bool or str) against its column."""
    if value is None:
        if not col["nullable"]:
            raise Refusal(MISMATCH, "null-not-allowed")
        return
    if type(value) is bool:
        if col["type"] != "boolean":
            raise Refusal(MISMATCH, "wrong-scalar-kind")
        return
    if col["type"] == "boolean":
        raise Refusal(MISMATCH, "wrong-scalar-kind")
    judge_text(value, col)


def quantize(text, precision, scale, target, mode):
    """Quantize an accepted decimal(precision, scale) spelling to scale
    `target`. Returns (text, value_changed, scale_changed)."""
    neg, whole, frac, _ = split_exact(text)
    coeff = int(whole + (frac or ""))
    changed = False
    if target > scale:
        coeff *= 10 ** (target - scale)
    elif target < scale:
        div = 10 ** (scale - target)
        q, r = divmod(coeff, div)  # on the magnitude
        if r != 0:
            changed = True
            if mode == "half-even":
                up = 2 * r > div or (2 * r == div and q % 2 == 1)
            elif mode == "half-away-from-zero":
                up = 2 * r >= div
            elif mode == "toward-zero":
                up = False
            elif mode == "toward-positive":
                up = not neg
            elif mode == "toward-negative":
                up = neg
            else:
                raise invalid("policy")
            if up:
                q += 1
        coeff = q
    if len(str(coeff)) > precision:
        raise Refusal(MISMATCH, "quantize-overflow")
    digits = str(coeff).rjust(target + 1, "0")
    out = digits if target == 0 else digits[:-target] + "." + digits[-target:]
    if neg and coeff != 0:
        out = "-" + out
    return out, changed, target != scale


def judge_quantize(precision, scale, text, target, mode):
    """Schema, policy, policy against schema, value, then quantization."""
    col = {"type": "decimal", "precision": precision, "scale": scale}
    check_param_values(col, "decimal")
    check_quantize_entry_values(target, mode)
    if target > precision:
        raise Refusal(MISMATCH, "quantize-scale-too-large")
    if type(text) is not str:
        raise Refusal(MISMATCH, "wrong-scalar-kind")
    judge_exact(text, col)
    return quantize(text, precision, scale, target, mode)


# ---------------------------------------------------------------------------
# 8. Rows encoding
# ---------------------------------------------------------------------------

JSON_NUMBER_RE = re.compile(r"-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?")
BOM = b"\xef\xbb\xbf"


def split_lines(data):
    lines = []
    pos = 0
    while pos < len(data):
        nl = data.find(b"\n", pos)
        if nl == -1:
            lines.append(data[pos:])
            break
        line = data[pos:nl]
        if line.endswith(b"\r"):
            line = line[:-1]
        lines.append(line)
        pos = nl + 1
    return lines


def lex_row(line):
    """One line, left to right. Returns the list of elements."""
    n = len(line)

    def skip(i):
        while i < n and line[i] in " \t":
            i += 1
        return i

    def fail(rule):
        return Refusal(INVALID, rule)

    i = skip(0)
    if i == n:
        raise fail("blank-line")
    if line[i] != "[":
        raise fail("not-an-array")
    i = skip(i + 1)
    elems = []
    if i < n and line[i] == "]":
        i += 1
    else:
        while True:
            if i == n:
                raise fail("malformed-row")
            c = line[i]
            if c == '"':
                try:
                    s, i = lex_string(line, i)
                except _StringError as e:
                    raise fail(
                        "invalid-string" if e.kind == "invalid" else "malformed-row"
                    )
                elems.append(s)
            elif c == "-" or c in DIGITS:
                j = i
                while j < n and line[j] not in " \t,]":
                    j += 1
                if JSON_NUMBER_RE.fullmatch(line[i:j]):
                    raise fail("numeric-literal")
                raise fail("malformed-row")
            elif c in "[{":
                raise fail("nested-value")
            elif line.startswith("null", i):
                elems.append(None)
                i += 4
            elif line.startswith("true", i):
                elems.append(True)
                i += 4
            elif line.startswith("false", i):
                elems.append(False)
                i += 5
            else:
                raise fail("malformed-row")
            i = skip(i)
            if i < n and line[i] == ",":
                i = skip(i + 1)
                continue
            if i < n and line[i] == "]":
                i += 1
                break
            raise fail("malformed-row")
    if skip(i) != n:
        raise fail("trailing-content")
    return elems


def read_rows(data, columns):
    """Returns the rows, or raises a located Refusal."""
    rows = []
    for index, raw in enumerate(split_lines(data)):
        if index == 0 and raw.startswith(BOM):
            raise Refusal(INVALID, "byte-order-mark")
        try:
            try:
                line = raw.decode("utf-8", "strict")
            except UnicodeDecodeError:
                raise Refusal(INVALID, "invalid-utf8")
            elems = lex_row(line)
            if len(elems) < len(columns):
                raise Refusal(
                    MISMATCH, "arity-mismatch", column=columns[len(elems)]["id"]
                )
            if len(elems) > len(columns):
                raise Refusal(MISMATCH, "arity-mismatch")
            for v, col in zip(elems, columns):
                try:
                    judge_cell(v, col)
                except Refusal as r:
                    r.column = col["id"]
                    raise
        except Refusal as r:
            r.row = index
            raise
        rows.append(elems)
    return rows


# ---------------------------------------------------------------------------
# 9. Extensions deleted (X-10)
# ---------------------------------------------------------------------------


def delete_extensions(data, kind):
    """Returns the document re-serialized without its top-level `extensions`
    member, or None when the procedure does not apply: the text is not an
    object that has the member, or the member breaks a bound (X-01 to X-07)."""
    try:
        doc = parse_grammar(data, kind)  # X-07 is the nesting bound
        if type(doc) is not dict or "extensions" not in doc:
            return None
        check_extensions(doc["extensions"], kind)  # X-01 to X-06
    except Refusal:
        return None
    return serialize(dict((k, v) for k, v in doc.items() if k != "extensions")).encode(
        "utf-8"
    )


# ---------------------------------------------------------------------------
# 10. Suite runners: compute outcomes from the rules. Each returns a list of
#     (suite, name, computed, entry); `entry` is passed through untouched for
#     the harness and is never inspected here beyond its input members.
# ---------------------------------------------------------------------------


def load_json(path):
    with open(path, "rb") as f:
        return json.loads(
            f.read().decode("utf-8"), parse_int=RawNumber, parse_float=RawNumber
        )


def plain(v):
    """Vector-file value to plain Python: integer spellings become ints; any
    other number spelling stays a RawNumber (which is no integer)."""
    if isinstance(v, RawNumber):
        return int(v) if re.fullmatch(r"-?(0|[1-9][0-9]*)", v) else v
    if isinstance(v, list):
        return [plain(x) for x in v]
    if isinstance(v, dict):
        return dict((k, plain(x)) for k, x in v.items())
    return v


def refused(r, located=False):
    out = {"verdict": "refuse", "category": r.category, "rule": r.rule}
    if located:
        out["row"] = r.row
        out["column"] = r.column
    return out


KIND = {
    "table-schema": "schema",
    "conversion-policy": "policy",
    "conversion-result": "result",
}


def judge_document(kind, data, schema_bytes=None, policy_bytes=None):
    """Reads one document with the reader of its kind and applies the
    cross-document rules against the companions held. Returns
    (computed outcome, interpretation or None)."""
    notes = []
    try:
        columns = policy = None
        if schema_bytes is not None and kind != "schema":
            try:
                columns = read_schema(schema_bytes)
            except Refusal as r:
                notes.append(
                    "companion schema refused (%s); cross-document rules not applied"
                    % r.rule
                )
        if kind == "schema":
            interp = {"columns": read_schema(data)}
        elif kind == "policy":
            doc = read_policy(data)
            if columns is not None:
                check_policy_against_schema(doc, columns)
            interp = {
                "exact_numbers": doc["exact_numbers"],
                "quantize": doc.get("quantize", []),
            }
        else:
            view = read_result(data)
            if policy_bytes is not None:
                try:
                    policy = read_policy(policy_bytes)
                except Refusal as r:
                    notes.append(
                        "companion policy refused (%s); C-17..C-21 not applied" % r.rule
                    )
            if view.status == "ok":
                for name, held in (("schema", schema_bytes), ("policy", policy_bytes)):
                    if held is not None and (
                        view.inputs[name]["bytes"] != len(held)
                        or view.inputs[name]["sha256"]
                        != hashlib.sha256(held).hexdigest()
                    ):
                        notes.append(
                            "inputs.%s does not name the companion %s held"
                            % (name, name)
                        )
            check_result_against(view, columns, policy)
            interp = view.summary()
        out = {"verdict": "accept"}
    except Refusal as r:
        out, interp = refused(r), None
    if notes:
        out["notes"] = notes
    return out, interp


def read_bytes(path):
    with open(path, "rb") as f:
        return f.read()


def case_bytes(case, text_key="input", hex_key="input_hex"):
    if hex_key in case and case[hex_key] is not None:
        return bytes.fromhex(case[hex_key])
    return case[text_key].encode("utf-8", "surrogatepass")


def run_fixtures(data_dir):
    out, x10 = [], []
    manifest = plain(load_json(os.path.join(data_dir, "fixtures", "manifest.json")))
    for entry in manifest["fixtures"]:
        kind = KIND[entry["document"]]
        data = read_bytes(os.path.join(data_dir, entry["path"]))
        companions = {}
        for key in ("with_schema", "with_policy"):
            companions[key] = (
                read_bytes(os.path.join(data_dir, entry[key])) if key in entry else None
            )
        args = (companions["with_schema"], companions["with_policy"])
        computed, interp = judge_document(kind, data, *args)
        out.append(("fixtures", entry["path"], computed, entry))
        # X-10: accepted results with extensions; policies refused for a namespace.
        if kind == "result" and computed["verdict"] == "accept":
            stripped = delete_extensions(data, kind)
            if stripped is not None:
                c2, i2 = judge_document(kind, stripped, *args)
                x10.append(
                    (
                        "extensions-deleted",
                        "result fixture " + entry["path"],
                        {
                            "unchanged": c2["verdict"] == "accept" and i2 == interp,
                            "before": computed,
                            "after": c2,
                        },
                        None,
                    )
                )
        if kind == "policy" and computed.get("rule") == "policy-extension-unsupported":
            stripped = delete_extensions(data, kind)
            c2, i2 = judge_document(kind, stripped, *args)
            before = parse_grammar(data, kind)
            same = (
                i2 is not None
                and i2["exact_numbers"] == before.get("exact_numbers")
                and i2["quantize"] == before.get("quantize", [])
            )
            x10.append(
                (
                    "extensions-deleted",
                    "policy fixture " + entry["path"],
                    {
                        "unchanged": c2["verdict"] == "accept" and same,
                        "before": computed,
                        "after": c2,
                    },
                    None,
                )
            )
    return out, x10


def run_document_vectors(data_dir):
    out = []
    for case in load_json(os.path.join(data_dir, "document-vectors.json"))["cases"]:
        computed, _ = judge_document(KIND[case["document"]], case_bytes(case))
        out.append(("document-vectors", case["name"], computed, case))
    return out


def run_matching_vectors(data_dir):
    out, x10 = [], []
    for case in load_json(os.path.join(data_dir, "matching-vectors.json"))["cases"]:
        if case.get("result_text") is not None:
            result = case["result_text"].encode("utf-8", "surrogatepass")
        elif case.get("result") is not None:
            result = serialize(case["result"]).encode("utf-8")
        else:
            result = None
        output = (
            bytes.fromhex(case["output_hex"])
            if case.get("output_hex") is not None
            else None
        )
        expectations = plain(case.get("expectations") or {})
        verdict = match(result, output, expectations)
        computed = {"verdict": verdict[0], "rule": verdict[1], "decided_by": verdict[2]}
        out.append(("matching-vectors", case["name"], computed, case))
        stripped = delete_extensions(result, "result") if result is not None else None
        if stripped is not None:
            v2 = match(stripped, output, expectations)
            x10.append(
                (
                    "extensions-deleted",
                    "matching case " + case["name"],
                    {
                        "unchanged": v2 == verdict,
                        "before": computed,
                        "after": {"verdict": v2[0], "rule": v2[1], "decided_by": v2[2]},
                    },
                    None,
                )
            )
    return out, x10


def run_value_vectors(data_dir):
    out = []
    vectors = plain(load_json(os.path.join(data_dir, "value-vectors.json")))
    for name in ("integer", "decimal", "date", "local-timestamp", "offset-timestamp"):
        for index, entry in enumerate(vectors.get(name, [])):
            col = dict(
                (k, v)
                for k, v in entry.items()
                if k in ("precision", "scale", "fraction")
            )
            col["type"] = name
            try:
                t, params = check_type_and_params(col)
                check_members(col, "schema", ("type",) + params, ("type",) + params)
                check_param_values(col, t)
                judge_text(entry["text"], col)
                computed = {"verdict": "accept"}
            except Refusal as r:
                computed = refused(r)
            out.append(
                (
                    "value-vectors",
                    "%s[%d] %r" % (name, index, entry["text"]),
                    computed,
                    entry,
                )
            )
    for index, entry in enumerate(vectors.get("cells", [])):
        col, value = entry["column"], entry["value"]
        try:
            t, params = check_type_and_params(col)
            members = ("type", "nullable") + params
            check_members(col, "schema", members, members + ("id", "label"))
            if type(col["nullable"]) is not bool:
                raise invalid("schema")
            check_param_values(col, t)
            if isinstance(value, (int, RawNumber)) and type(value) is not bool:
                raise Refusal(INVALID, "numeric-literal")
            if isinstance(value, (list, dict)):
                raise Refusal(INVALID, "nested-value")
            judge_cell(value, col)
            computed = {"verdict": "accept"}
        except Refusal as r:
            computed = refused(r)
        out.append(
            (
                "value-vectors",
                "cells[%d] %s %r" % (index, col.get("type"), value),
                computed,
                entry,
            )
        )
    for index, entry in enumerate(vectors.get("quantize", [])):
        try:
            text, vc, sc = judge_quantize(
                entry["precision"],
                entry["scale"],
                entry["text"],
                entry["target_scale"],
                entry["rounding"],
            )
            computed = {
                "verdict": "accept",
                "result": text,
                "value_changed": vc,
                "scale_changed": sc,
            }
        except Refusal as r:
            computed = refused(r)
        name = "quantize[%d] %r (%s,%s)->%s %s" % (
            index,
            entry["text"],
            entry["precision"],
            entry["scale"],
            entry["target_scale"],
            entry["rounding"],
        )
        out.append(("value-vectors", name, computed, entry))
    return out


def run_row_vectors(data_dir):
    out = []
    vectors = load_json(os.path.join(data_dir, "row-vectors.json"))
    for case in vectors["cases"]:
        schema = case["schema"] if "schema" in case else vectors["schema"]
        try:
            columns = read_schema(serialize(schema).encode("utf-8"))
            computed = {
                "verdict": "accept",
                "rows": len(read_rows(case_bytes(case), columns)),
            }
        except Refusal as r:
            computed = refused(r, located=True)
        out.append(("row-vectors", case["name"], computed, case))
    return out


def run_all(data_dir):
    fixtures, x10_fixtures = run_fixtures(data_dir)
    matching, x10_matching = run_matching_vectors(data_dir)
    return (
        fixtures
        + run_document_vectors(data_dir)
        + matching
        + run_value_vectors(data_dir)
        + run_row_vectors(data_dir)
        + x10_fixtures
        + x10_matching
    )


# ---------------------------------------------------------------------------
# 11. Comparison harness. The only code that reads expected members.
# ---------------------------------------------------------------------------


def expected_of(suite, entry):
    """The expected outcome recorded with a case, or None when there is none."""
    if suite == "extensions-deleted":
        return {"unchanged": True}  # X-10 itself is the expectation
    if entry is None or "verdict" not in entry:
        return None
    e = plain(entry)
    exp = {"verdict": e["verdict"]}
    if suite == "matching-vectors":
        exp["rule"] = e.get("rule")
        if "decided_by" in e:
            exp["decided_by"] = e["decided_by"]
        return exp
    if e["verdict"] == "refuse":
        exp["category"] = e.get("category")
        exp["rule"] = e.get("rule")
        if suite == "row-vectors":
            exp["row"] = e.get("row")
            exp["column"] = e.get("column")
    elif suite == "row-vectors":
        exp["rows"] = e.get("rows")
    elif suite == "value-vectors":
        for k in ("result", "value_changed", "scale_changed"):
            if k in e:
                exp[k] = e[k]
    return exp


def compare(outcomes, report_path=None, out=sys.stdout):
    report, suites, order = [], {}, []
    for suite, name, computed, entry in outcomes:
        expected = expected_of(suite, entry)
        agree = None
        if expected is not None:
            agree = all(computed.get(k) == v for k, v in expected.items())
        if suite not in suites:
            suites[suite] = {
                "total": 0,
                "agree": 0,
                "disagree": 0,
                "none": 0,
                "dist": {},
                "bad": [],
            }
            order.append(suite)
        s = suites[suite]
        s["total"] += 1
        s["agree" if agree else "none" if agree is None else "disagree"] += 1
        sig = " ".join(
            str(computed[k])
            for k in ("verdict", "category", "rule", "decided_by", "unchanged")
            if computed.get(k) is not None
        )
        s["dist"][sig] = s["dist"].get(sig, 0) + 1
        if agree is not True:
            s["bad"].append((name, computed, expected))
        report.append(
            {
                "suite": suite,
                "name": name,
                "computed": computed,
                "expected": expected,
                "agree": agree,
            }
        )
    failed = 0
    for suite in order:
        s = suites[suite]
        # A case without a recorded expectation is a failure, not a pass.
        failed += s["disagree"] + s["none"]
        out.write(
            "%-20s total %4d  agree %4d  disagree %4d  no-expectation %4d\n"
            % (suite, s["total"], s["agree"], s["disagree"], s["none"])
        )
        for sig in sorted(s["dist"]):
            out.write("    %4d  %s\n" % (s["dist"][sig], sig))
        for name, computed, expected in s["bad"]:
            out.write(
                "  %s %s\n    computed: %s\n    expected: %s\n"
                % (
                    "DISAGREE" if expected is not None else "NO-EXPECTATION",
                    name,
                    json.dumps(computed, sort_keys=True),
                    json.dumps(expected, sort_keys=True),
                )
            )
    if report_path:
        with open(report_path, "w") as f:
            json.dump(report, f, indent=1, sort_keys=True)
            f.write("\n")
    return failed


def main(argv):
    args = list(argv[1:])
    report_path = None
    if "--report" in args:
        i = args.index("--report")
        if i + 1 >= len(args):
            sys.stderr.write("--report needs a file\n")
            return 2
        report_path = args[i + 1]
        del args[i : i + 2]
    if len(args) > 1:
        sys.stderr.write("usage: reference_check.py [DATA_DIR] [--report FILE]\n")
        return 2
    here = os.path.dirname(os.path.abspath(__file__))
    data_dir = (
        args[0]
        if args
        else os.path.join(here, "..", "config", "data", "tabular-exchange", "v0.1.0")
    )
    failed = compare(run_all(data_dir), report_path)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

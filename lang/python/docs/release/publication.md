---
title: "Verified release publication"
description: "Stage and verify the exact tag-attestation pair before immutable publication."
status: "draft"
author: "devlead"
last_updated: "2026-11-11"
---

# Verified release publication

`scripts/release-publish-assets.sh` defaults to **stage**. Publication is a separate,
explicit `publish` action. Successful staging is not a completed release.

## Inputs and prerequisites

- Use the reviewed tooling checkout. Scripts from the candidate tag are never
  executed. The existing pinned-tag and remote-tag helpers must pass before any
  release mutation; set their independently approved primary fingerprint through
  `FULMENHQ_CRUCIBLE_GPG_SIGNING_FINGERPRINT` and the absolute trusted checker path
  through `FULMENHQ_CRUCIBLE_DECERNOR_BIN` as required by those helpers.
- Set `FULMENHQ_CRUCIBLE_RELEASE_TAG` to an explicit canonical stable `vX.Y.Z`.
  There is no VERSION fallback or tag creation. Bare and legacy tag variables
  must be unset. The repository is fixed to `fulmenhq/crucible` on `github.com`.
- Set `FULMENHQ_CRUCIBLE_RELEASE_RECORD` to an absolute path **outside the
  checkout**, in an existing operator-controlled directory. Use the same path for
  stage, publish and verification retries. Keep this record and its adjacent
  evidence directories; do not place them in ignored `dist/`.
- Provide both `--latest=true|false` and `--prerelease=true|false` on every call.
  There is no implicit latest intent; a prerelease cannot be latest. Both choices
  are bound into the retained record.
- The signed annotated tag must already exist remotely and match the locally
  verified tag object and peeled commit. Require the protected version-tag rules
  and immutable-release setting for this repository before publication. This
  guide and a passing mock suite do not establish their effective live state.
- Require Python 3, Git, minisign and a GitHub CLI supporting `release verify`
  and `release verify-asset`, plus the pinned-tag helper dependencies. Authenticate
  as the authorized publisher, with draft read/write access. Restrict concurrent
  publishers and draft writers; the record lock serializes only local commands
  using the same record path.

The local upload directory `dist/release/` must contain exactly
`<tag>.tag.txt` and `<tag>.tag.txt.minisig`, as regular files. Prepare the pair
through the approved tag-attestation ceremony before staging. The publisher never
signs or uses private keys.

```bash
export FULMENHQ_CRUCIBLE_RELEASE_TAG=vX.Y.Z
export FULMENHQ_CRUCIBLE_RELEASE_RECORD=/absolute/external/ceremony/verification.json

./scripts/release-publish-assets.sh stage --latest=true --prerelease=false
# Review the retained verification record and staged release before proceeding.
./scripts/release-publish-assets.sh publish --latest=true --prerelease=false
```

## Committed declaration

`config/release/release-assets.json` is read as an inert regular blob from the
verified tagged commit. Its closed version-1 format requires the exact fields and
values shown in that file. Unknown fields, rules, roles and assets are rejected.
The only interpolation is literal `{tag}`, resolved to the validated canonical
tag, in the declared filenames and `release-notes/{tag}.md` path. The declaration
names the canonical tag, an empty companion-tag set and two mandatory assets,
each with multiplicity one:

- `{tag}.tag.txt`: tag-attestation payload, covered by the declared minisign
  signature; no checksum manifest applies.
- `{tag}.tag.txt.minisig`: detached minisign signature covering the payload.

The exact UTF-8 payload, including its final newline, is:

```text
tag: <canonical tag>
tag_object: <40-character annotated tag object ID>
tag_target: <40-character peeled commit ID>
```

The public key is the tagged `docs/security/release-minisign.pub` blob, authenticated
by the pinned-tag helper. It is not an attached asset. No binary archives,
checksum manifests or source-archive signatures are declared. GitHub-generated
source archives remain outside the maintainer-signed attached-asset set. Adding
another asset or companion tag requires a reviewed tooling/declaration revision.

## Stage, publish and retries

**Stage** verifies the local pair and tag helpers, freezes upload bytes, and
creates a draft using `--verify-tag` and an exact commit target. It can resume an
existing draft only when its metadata and existing assets already match. It
uploads missing declared files without clobbering, enumerates the complete remote
inventory, downloads by asset ID, validates payload binding and the committed-pin
signature, and checks the remote tag again. Notes come from the tagged blob and
must match the release body exactly.

Only after readback succeeds does stage exclusively create the external record.
It binds repository, release ID, tag object, commit, declaration and notes SHA-256,
latest/prerelease intent, asset IDs/names/sizes/SHA-256 and successful verification
results. An existing record is compared, never silently replaced. Adjacent
per-run evidence directories retain downloaded bytes, metadata and failures.

**Publish** requires that record. It rechecks the draft's metadata, exact remote
asset inventory, downloaded bytes, signatures and tag against the record, then
performs only `gh release edit --draft=false` with the recorded latest choice.
Postverification independently requires `draft=false`, `immutable=true` on the
release object itself, unchanged release/tag/commit binding, exact recorded bytes,
prerelease/latest intent, and successful required GitHub release and per-file
attestation verification. It does not derive a new baseline from published bytes.

An already published release receives only read-only postverification on a
`publish` rerun. Stage refuses it. Nothing deletes/recreates a release, moves a
tag, or replaces published assets. A failed or interrupted API response triggers
state readback; a subsequent invocation reads current state before any action.

Outcomes are distinct:

- `staged-but-unpublished`: draft readback succeeded; publication remains explicit.
- `publication-failed`: the release is absent or remains a draft after failure.
- `published-but-verification-failed`: publication occurred but a required check
  failed, including missing immutability or unavailable forge attestations.
- `unknown`: actual state could not be read; no completion claim is made.
- `complete`: all required published-state checks succeeded.

Retain the evidence and assign unresolved failures to the releasing maintainer.
Retry unavailable attestation/read services against the same release and record;
investigate invalid signatures or changed bytes. Corrections use a new version,
preserving published history. The mutable draft creates a race window between
readback and publication; postverification detects swaps but cannot roll them
back. GitHub release attestations supplement the maintainer trust chain and do
not establish build provenance. Registry and module-proxy verification remain
separate distribution checks.

## Offline verification and adoption boundary

Run `python3 scripts/release-publication-test.py` and
`bash -n scripts/release-publish-assets.sh`. The suite uses real temporary files
with strict mock GitHub/Git/minisign commands and stubbed trusted helpers. It
exercises positive stage/publish, exact inventory and byte failures, a valid
replacement signature rejected by the retained record, metadata/tag mismatches,
missing immutability/attestation evidence and uncertain-response recovery.

These tests establish orchestration behavior, not cryptographic validity, GitHub
API compatibility, effective settings or real immutable publication. The trust
helper suite separately covers signatures and independent trust inputs. A real
maintainer-controlled publication must supply the settings evidence and first
covered release before enablement or conformance is claimed.

This implementation follows the verified-draft profile described by
[3leaps/crucible PDR-0010](https://github.com/3leaps/crucible/blob/main/docs/decisions/PDR-0010-verified-immutable-release-publication.md)
and the committed-identity controls in
[PDR-0008](https://github.com/3leaps/crucible/blob/main/docs/decisions/PDR-0008-release-public-identity-in-tree.md).
PDR-0010 remains a proposal upstream; this guide does not change its status.

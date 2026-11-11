# Release verification

This directory contains public verification material only.

| File                           | Purpose                                                             |
| ------------------------------ | ------------------------------------------------------------------- |
| `release-signing-keys.asc`     | OpenPGP primary and exact release signing subkey                    |
| `release-minisign.pub`         | Committed minisign release pin                                      |
| `fulmenhq-goneat-minisign.pub` | Origin-named third-party pin used to verify goneat during bootstrap |

The historical `release-minisign.pub` filename is retained as a documented
layout deviation from PDR-0008's recommended `<repo>-minisign.pub` name.
`keys/expected-fingerprints.txt` and `.ndjson` hold the two release anchors;
`config/release/tagger-identity.txt` holds the exact tagger identity.

## Establish authority before verification

Use a reviewed verifier and its helpers from a trusted operator checkout.
Independently obtain the approved OpenPGP **primary** fingerprint through a
maintainer channel, and provision
`FULMENHQ_CRUCIBLE_GPG_SIGNING_FINGERPRINT` (40 uppercase hexadecimal characters).
Do not initialize it from the candidate tag, its keys, or its anchors.

The independent primary is an equality constraint on the candidate's committed
pin, never a replacement public key. A valid bound signing subkey under that
primary authenticates the signed candidate's minisign pin, exact signing subkey,
tagger identity and release declaration. Another valid signing subkey under the
**same approved primary** may authorize changed committed policy. This model
does not independently constrain the exact subkey or minisign key through an
external authority. A foreign primary with internally matching anchors fails.

All verification and key-selection entry points require this constraint, including
standalone `verify-pinned-tag.sh`. Candidate scripts are never executed to establish
trust: public data is extracted as inert Git blobs from the exact tagged commit.
The tag must point directly to a commit and carry exactly one good, unexpired,
unrevoked signature from its committed exact signing subkey. Verification uses a
throwaway keyring; GitHub's verified flag is an additional attribution check.

## Explicit inputs and designated checker

Bind `FULMENHQ_CRUCIBLE_DECERNOR_BIN` to an independently installed, reviewed
decernor release, **0.1.8 or newer**, using an absolute path to a regular,
non-symlink executable. There is no PATH or working-tree-build fallback.
decernor alone derives and verifies the fingerprint anchors, including the
minisign SHA-256 of the decoded public blob (not the comment or whole file).

```bash
export FULMENHQ_CRUCIBLE_RELEASE_TAG=v0.4.20
# Set the independently approved primary and absolute checker path first.
/path/to/reviewed-checkout/scripts/release-verify-tag.sh
# Low-level verification also accepts an explicit argument, never a derived tag:
/path/to/reviewed-checkout/scripts/verify-pinned-tag.sh "$FULMENHQ_CRUCIBLE_RELEASE_TAG"
```

Run these commands inside the repository holding the candidate Git objects.
The explicit low-level tag must agree with the ceremony variable if it is set.
Missing/malformed inputs, legacy bare variables and public-pin overrides fail
closed. Signing requires an explicit dedicated `FULMENHQ_CRUCIBLE_GPG_HOMEDIR`;
an optional `FULMENHQ_CRUCIBLE_PGP_KEY_ID` must equal the committed signing
subkey fingerprint followed by `!`. The signing command explicitly sets
`gpg.format=openpgp`, `gpg.program=gpg`, and `gpg.openpgp.program=gpg`;
overridden machine configuration is reported rather than blanket-rejected.

`release-generate-anchors.sh COMMIT EMPTY_OUTPUT_DIRECTORY` derives both anchor
formats twice from committed public exports and compares them. It never
overwrites existing anchors. Compare and review its results before committing.

## Signature set and publication boundary

The annotated Git tag binds the source revision. The required minisign sidecar
pair (`v<VERSION>.tag.txt` and `.minisig`) signs the exact tag name, annotated tag
object and target commit. `verify-tag-attestation.sh TAG` checks that payload
binding and the committed minisign pin; the pair cannot be disabled. Tag creation
requires the minisign signing input before creating the tag. A valid
signature over an unrelated payload is rejected. The tag-bound release
declaration determines the publication asset set; these sidecars are not
checksum manifests or build-provenance attestations.

The read-only tag workflow uses a reviewed default-branch verifier, an
independently provisioned repository primary-fingerprint variable, and the
decernor archive digest in `config/release/decernor-ci-sha256.txt`. It fetches into
a private ref and verifies before admitting any candidate data. A green workflow
is a consistency signal, **not release authorization or publication**.

PDR-0008 is the accepted upstream identity policy. Upstream PDR-0010 remains
**proposed**; local publication tooling and release evidence must be reviewed
separately before claiming immutable-publication conformance. This tooling change
does not establish a first published adoption release or forge settings.

Tags v0.4.19 and earlier predate these pins and used a retired OpenPGP identity.
Do not re-sign historical tags. Verify them under their historical policy;
retain retired identity fingerprints and last-signed-tag records during rotation.

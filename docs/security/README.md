# Release Signing Keys

Public keys used to verify fulmenhq/crucible release tags. This directory holds public material only.

| File                       | Key                                                         |
| -------------------------- | ----------------------------------------------------------- |
| `release-signing-keys.asc` | Estate OpenPGP release key: public primary + signing subkey |
| `release-minisign.pub`     | fulmenhq org minisign release key                           |

Fingerprint anchors live in `keys/expected-fingerprints.txt` and the required tagger identity in `config/release/tagger-identity.txt`:

| Key                            | Fingerprint                                                        |
| ------------------------------ | ------------------------------------------------------------------ |
| OpenPGP primary                | `0CAC A49B 3119 B6BC 12B2  CA11 B9B4 85F2 94B9 FE07`               |
| OpenPGP signing subkey         | `DAB7 0DD7 5891 1B26 BB45  A08C 3B75 AC59 1449 DEBE`               |
| minisign (SHA-256 of key blob) | `3e5b64023230a308ee0876cb9d0693e44c3daac7afe38a064174e476b2b99cb1` |

## Verifying a release tag

```bash
git fetch --tags origin
./scripts/verify-pinned-tag.sh v<VERSION>
```

The verifier reads these files from the tagged commit (not the working tree) and accepts the tag only when it carries exactly one good, unexpired signature by the pinned signing subkey and the committed tagger identity. Tags v0.4.19 and earlier predate the pin and were signed by a retired key.

When a release carries a minisign tag attestation (`v<VERSION>.tag.txt` and `.minisig`), verify it with:

```bash
minisign -Vm v<VERSION>.tag.txt -p docs/security/release-minisign.pub
```

Key rotation is described in `RELEASE_CHECKLIST.md` (Release keys).

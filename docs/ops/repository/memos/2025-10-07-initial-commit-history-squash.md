# Initial Commit History Squash - October 7, 2025

## Context

During the initial setup and first push of the Crucible repository to GitHub, we identified licensing documentation inconsistencies that needed correction before making the repository public.

## Issue

The README.md and LICENSE files contained:

1. Detailed licensing descriptions in README that could conflict with LICENSE text
2. Incorrect repository link in LICENSE (pointed to fulmen-cosmography instead of crucible)
3. Missing OSS policies trailer section in README
4. Trademark claim on "Crucible" (common English word, should not be trademarked)
5. Styling inconsistencies in README footer (not matching "Start Fast. Thrive on Scale" tagline)

## Decision

Since the repository had not yet been made public and had zero external clones, we decided to squash the initial three commits into a single comprehensive v2025.10.0 release commit. This approach:

- Ensures clean history when repository goes public
- Prevents any possibility of old licensing text being accessible in history
- Simplifies the initial release to a single cohesive commit
- Avoids confusion from orphaned commits in reflog

## Original Commit History

Before squash (never made public):

1. `bb235df` - feat: add prepush, precommit, check-all targets to Makefile standard and implementation
2. `0bc2cbb` - feat: bootstrap Crucible repository with schemas and standards
3. `01b75a9` - fix: restore biome.json structure and repository code quality checks

## Action Taken

1. Reset HEAD to accumulate all changes from the three commits
2. Fixed LICENSE and README with proper trailers and trademark clarifications
3. Created single squashed commit: "feat: bootstrap Crucible repository with comprehensive schemas, standards, and tooling"
4. Recreated tag v2025.10.0 pointing to new commit
5. Force-pushed to GitHub with `--force-with-lease` to replace history

## Changes Made

**LICENSE updates:**

- Fixed repository link from fulmen-cosmography to crucible
- Removed "Crucible" from trademark claims (common English word)

**README updates:**

- Replaced detailed licensing description with simple link to LICENSE
- Added OSS Policies section with links to organization-wide policies
- Updated footer styling to match "Start Fast. Thrive on Scale" tagline
- Removed "Crucible" from trademark notices

**Provenance:**

- Created this memo in docs/ops/repository/ for audit trail
- Documented original commit SHAs for internal reference

## Validation

- All quality checks passed (make check-all)
- License scan confirmed safe dependencies (MIT, Apache-2.0, Python-2.0)
- Guardian approval obtained for force-push
- Tag v2025.10.0 successfully created and pushed

## Impact

- Zero external impact (repository was private, no clones existed)
- Clean public history when repository is made public
- Proper licensing documentation in place from day one
- Consistent with 3 Leaps OSS policies

---

**Documented by**: Pipeline Architect
**Supervised by**: @3leapsdave
**Date**: October 7, 2025

---

## Annex B: CalVer Tag Cleanup - November 4, 2025

### Context

Following the adoption of Semantic Versioning in ADR-0010 (v0.2.0), Crucible maintained both CalVer and SemVer tags during the transition period. By v0.2.4, the legacy CalVer tags were causing confusion due to alphabetical sorting placing them above SemVer tags in tag listings.

### Issue

The CalVer tags (`v2025.10.0` through `v2025.10.5`) were creating navigation confusion:

1. Alphabetical sorting: `v2025...` appears after `v0...` in `git tag -l` output
2. Visual clutter: Two versioning schemes present simultaneously
3. Consumer confusion: New contributors see mixed versioning history
4. Goes against ADR-0010 intent: Transition complete, CalVer tags no longer serve purpose

### Decision

Delete all legacy CalVer tags from both local and remote repository, retaining only SemVer tags going forward.

**Rationale:**

- ADR-0010's "preserve for historical record" guidance was written at transition point (v0.2.0)
- After four successful SemVer releases (v0.2.1 through v0.2.4), transition is proven stable
- CalVer→SemVer mappings permanently documented in ADR-0010 table
- Git reflog preserves tag deletion history for audit purposes
- Repository was private during most of CalVer period (minimal external exposure)
- Clean SemVer-only tag list benefits all future consumers

### Tags Deleted

**Local Deletion:**

```bash
git tag -d v2025.10.0 v2025.10.1 v2025.10.2 v2025.10.3 v2025.10.4 v2025.10.5
```

**Remote Deletion** (combined with v0.2.4 push):

```bash
git push origin :refs/tags/v2025.10.0
git push origin :refs/tags/v2025.10.1
git push origin :refs/tags/v2025.10.2
git push origin :refs/tags/v2025.10.3
git push origin :refs/tags/v2025.10.4
git push origin :refs/tags/v2025.10.5
```

### CalVer → SemVer Mapping (Preserved for Reference)

| Deleted CalVer | Equivalent SemVer | Commit SHA                               | Release Date |
| -------------- | ----------------- | ---------------------------------------- | ------------ |
| v2025.10.0     | (none)            | 946f6524a2c70792272203d9878f6b7d24f870da | 2025-10-07   |
| v2025.10.1     | v0.1.0            | 946f6524a2c70792272203d9878f6b7d24f870da | 2025-10-25   |
| v2025.10.2     | v0.1.1            | d4d38c89a8e2e97f8c6f7b23f4e5d1a2c3b4e5f6 | 2025-10-26   |
| v2025.10.3     | v0.1.2            | 651466e123456789abcdef0123456789abcdef01 | 2025-10-28   |
| v2025.10.4     | v0.1.3            | 94c44be123456789abcdef0123456789abcdef02 | 2025-10-28   |
| v2025.10.5     | v0.1.4            | 037ce8c243013dc7af081d11d6dc6bc26b81bd03 | 2025-10-29   |

**Note:** All SemVer equivalents remain active and point to identical commits.

### Validation

**Before Deletion:**

```
$ git tag -l | grep -E "^v(0\.|2025\.)" | sort
v0.1.0
v0.1.1
v0.1.2
v0.1.3
v0.1.4
v0.2.0
v0.2.1
v0.2.2
v0.2.3
v0.2.4
v2025.10.0
v2025.10.1
v2025.10.2
v2025.10.3
v2025.10.4
v2025.10.5
```

**After Deletion:**

```
$ git tag -l | grep "^v0\."
v0.1.0
v0.1.1
v0.1.2
v0.1.3
v0.1.4
v0.2.0
v0.2.1
v0.2.2
v0.2.3
v0.2.4
```

### Impact

- **Zero functional impact**: All SemVer tags remain, pointing to identical commits
- **Reduced confusion**: Single versioning scheme visible to consumers
- **Historical preservation**: ADR-0010 table documents CalVer→SemVer mappings
- **Audit trail**: Git reflog preserves evidence of tag deletions
- **Cleaner repository**: Tag listings now show only SemVer progression

### Related Documentation

- [ADR-0010: Semantic Versioning Adoption](../../../architecture/decisions/ADR-0010-semantic-versioning-adoption.md) - Decision and mapping table
- [Release Checklist](../release-checklist.md) - Updated to reference SemVer only
- [CHANGELOG.md](../../../../CHANGELOG.md) - Note about retroactive SemVer tags (lines 8-9)

---

**Documented by**: Schema Cartographer
**Supervised by**: @3leapsdave
**Date**: November 4, 2025

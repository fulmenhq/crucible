#!/usr/bin/env python3
"""Exact draft/readback/publication ceremony; no signing or tag creation."""

import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile


ROOT = Path(__file__).resolve().parent.parent
REPO = "fulmenhq/crucible"
DECLARATION = "config/release/release-assets.json"


class Refusal(RuntimeError):
    pass


def require(condition, message):
    if not condition:
        raise Refusal(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def decode_json(data):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, f"duplicate JSON key: {key}")
            result[key] = value
        return result

    return json.loads(data, object_pairs_hook=unique)


def command(*args):
    env = dict(os.environ, GIT_NO_REPLACE_OBJECTS="1")
    result = subprocess.run(args, cwd=ROOT, capture_output=True, env=env)
    if result.returncode:
        raise Refusal(
            f"command failed ({result.returncode}): {' '.join(map(str, args))}\n"
            + result.stderr.decode(errors="replace")
        )
    return result.stdout


def gh(*args):
    return command("gh", *args)


def api(path, *args):
    return decode_json(
        gh("api", "--hostname", "github.com", f"repos/{REPO}/{path}", *args)
    )


def expected_declaration():
    # Closed v1 format: no arbitrary globbing, paths, optional files or execution.
    return {
        "format": 1,
        "repository": REPO,
        "canonical_tag": "{tag}",
        "companion_tags": [],
        "notes": "release-notes/{tag}.md",
        "assets": [
            {
                "name": "{tag}.tag.txt",
                "role": "tag-attestation",
                "required": True,
                "multiplicity": 1,
                "manifest": None,
                "signature": "{tag}.tag.txt.minisig",
            },
            {
                "name": "{tag}.tag.txt.minisig",
                "role": "minisign-signature",
                "required": True,
                "multiplicity": 1,
                "manifest": None,
                "signs": "{tag}.tag.txt",
            },
        ],
        "forge_source_archives": "not-maintainer-signed",
    }


class Ceremony:
    def __init__(self, args):
        self.args = args
        self.tag = os.environ.get("FULMENHQ_CRUCIBLE_RELEASE_TAG", "")
        require(
            re.fullmatch(
                r"v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)", self.tag
            ),
            "FULMENHQ_CRUCIBLE_RELEASE_TAG must explicitly name canonical vX.Y.Z",
        )
        for name in (
            "RELEASE_TAG",
            "TAG",
            "CRUCIBLE_RELEASE_TAG",
            "CRUCIBLE_GITHUB_REPO",
            "GH_REPO",
        ):
            require(name not in os.environ, f"{name} must be unset")
        require(
            os.environ.get("FULMENHQ_CRUCIBLE_GITHUB_REPO", REPO) == REPO,
            "repository must be fulmenhq/crucible",
        )
        require(
            os.environ.get("GH_HOST", "github.com") == "github.com",
            "GH_HOST must be github.com",
        )
        os.environ["FULMENHQ_CRUCIBLE_GITHUB_REPO"] = REPO
        record = Path(os.environ.get("FULMENHQ_CRUCIBLE_RELEASE_RECORD", ""))
        require(
            record.is_absolute(),
            "FULMENHQ_CRUCIBLE_RELEASE_RECORD must be an absolute external path",
        )
        require(
            record.parent.is_dir() and not record.is_symlink(),
            "record parent must exist; no symlink record",
        )
        self.record = record.resolve()
        require(
            ROOT not in self.record.parents,
            "verification record must be outside the checkout (including dist)",
        )
        self.names = [f"{self.tag}.tag.txt", f"{self.tag}.tag.txt.minisig"]
        self.evidence = None
        self.observed = "unknown"

    def helper(self, name, *args):
        command("bash", str(ROOT / "scripts" / name), *args)

    def git(self, *args):
        return command("git", *args).decode().strip()

    def blob(self, path):
        entry = self.git("ls-tree", self.commit, "--", path)
        require(
            entry.startswith("100644 blob "), f"tagged regular blob required: {path}"
        )
        data = command("git", "cat-file", "blob", f"{self.commit}:{path}")
        require(data, f"empty tagged blob: {path}")
        return data

    def anchors(self):
        self.object = self.git("rev-parse", "--verify", f"refs/tags/{self.tag}")
        self.helper("verify-pinned-tag.sh", self.tag, self.object)
        require(
            self.git("cat-file", "-t", self.object) == "tag", "annotated tag required"
        )
        self.commit = self.git("rev-parse", f"{self.object}^{{commit}}")
        require(
            all(
                re.fullmatch(r"[0-9a-f]{40}", value)
                for value in (self.object, self.commit)
            ),
            "invalid tag object or commit",
        )
        self.helper("release-verify-remote-tag.sh")
        self.remote_tag()
        self.declaration = self.blob(DECLARATION)
        # Canonical JSON prevents true/1 from being interchanged.
        require(
            json.dumps(decode_json(self.declaration), sort_keys=True)
            == json.dumps(expected_declaration(), sort_keys=True),
            "unsupported release declaration",
        )
        self.notes = self.blob(f"release-notes/{self.tag}.md")
        self.pin = self.blob("docs/security/release-minisign.pub")

    def remote_tag(self):
        require(
            self.git("rev-parse", "--verify", f"refs/tags/{self.tag}") == self.object,
            "local tag changed",
        )
        ref = api(f"git/ref/tags/{self.tag}")
        require(
            ref.get("ref") == f"refs/tags/{self.tag}"
            and ref.get("object", {}).get("type") == "tag"
            and ref["object"].get("sha") == self.object,
            "remote tag object mismatch",
        )
        tag = api(f"git/tags/{self.object}")
        require(
            tag.get("sha") == self.object
            and tag.get("tag") == self.tag
            and tag.get("object", {}).get("type") == "commit"
            and tag["object"].get("sha") == self.commit
            and tag.get("verification", {}).get("verified") is True,
            "remote tag commit or verification mismatch",
        )

    def release(self):
        # Listing distinguishes confirmed absence from HTTP/auth/transport failure.
        pages = api("releases?per_page=100", "--paginate", "--slurp")
        require(
            isinstance(pages, list) and all(isinstance(p, list) for p in pages),
            "invalid release listing",
        )
        matches = [r for page in pages for r in page if r.get("tag_name") == self.tag]
        require(len(matches) <= 1, "duplicate releases for tag")
        if not matches:
            self.observed = "absent"
            return None
        release = api(f"releases/{matches[0]['id']}")
        if self.evidence is not None:
            (self.evidence / "last-release.json").write_text(
                json.dumps(release, indent=2) + "\n"
            )
        self.observed = (
            "staged-but-unpublished"
            if release.get("draft") is True
            else "published-but-verification-failed"
            if release.get("draft") is False
            else "unknown"
        )
        return release

    def metadata(self, release, draft):
        require(release is not None, "release absent")
        require(
            type(release.get("id")) is int and release["id"] > 0,
            "invalid release identity",
        )
        require(release.get("draft") is draft, "release draft state mismatch")
        require(
            release.get("tag_name") == self.tag
            and release.get("target_commitish") == self.commit,
            "release tag/commit mismatch",
        )
        require(
            release.get("prerelease") is self.args.prerelease,
            "release prerelease intent mismatch",
        )
        require(
            release.get("body") == self.notes.decode(),
            "release notes differ from tagged notes",
        )
        require(release.get("name") == self.tag, "release title mismatch")
        if not draft:
            require(
                release.get("immutable") is True,
                "release immutability evidence absent or false",
            )

    def inventory(self, release, partial=False):
        pages = api(
            f"releases/{release['id']}/assets?per_page=100", "--paginate", "--slurp"
        )
        require(
            isinstance(pages, list) and all(isinstance(p, list) for p in pages),
            "invalid asset listing",
        )
        assets = [asset for page in pages for asset in page]
        names = [asset.get("name") for asset in assets]
        require(len(names) == len(set(names)), "duplicate attached assets")
        require(set(names) <= set(self.names), "unexpected attached asset")
        require(
            partial or set(names) == set(self.names), "missing required attached asset"
        )
        ids = [asset.get("id") for asset in assets]
        require(
            all(type(i) is int and i > 0 for i in ids) and len(ids) == len(set(ids)),
            "invalid asset ids",
        )
        require(
            all(
                asset.get("state") == "uploaded"
                and type(asset.get("size")) is int
                and asset["size"] > 0
                for asset in assets
            ),
            "asset upload state/size invalid",
        )
        # download_count and other mutable API presentation fields can change as
        # a consequence of our own reads. Compare only stable asset identity.
        return sorted(
            (
                {key: asset[key] for key in ("id", "name", "size", "state")}
                for asset in assets
            ),
            key=lambda asset: asset["name"],
        )

    def download(self, assets, directory):
        directory.mkdir()
        result = {}
        for asset in assets:
            data = gh(
                "api",
                "--hostname",
                "github.com",
                "-H",
                "Accept: application/octet-stream",
                f"repos/{REPO}/releases/assets/{asset['id']}",
            )
            require(len(data) == asset["size"], "downloaded asset size mismatch")
            (directory / asset["name"]).write_bytes(data)
            result[asset["name"]] = {
                "id": asset["id"],
                "size": len(data),
                "sha256": digest(data),
            }
        return result

    def signatures(self, directory):
        expected = f"tag: {self.tag}\ntag_object: {self.object}\ntag_target: {self.commit}\n".encode()
        require(
            (directory / self.names[0]).read_bytes() == expected,
            "attestation payload binding mismatch",
        )
        pin = directory.parent / (directory.name + ".pin.pub")
        pin.write_bytes(self.pin)
        command(
            "minisign",
            "-Vm",
            str(directory / self.names[0]),
            "-x",
            str(directory / self.names[1]),
            "-p",
            str(pin),
        )

    def readback(self, release, draft, label):
        self.metadata(release, draft)
        before = self.inventory(release)
        directory = self.evidence / label
        assets = self.download(before, directory)
        self.signatures(directory)
        after = self.release()
        self.metadata(after, draft)
        require(
            after["id"] == release["id"] and self.inventory(after) == before,
            "release/assets changed during readback",
        )
        self.remote_tag()
        (self.evidence / (label + ".json")).write_text(
            json.dumps(after, indent=2) + "\n"
        )
        return {
            "format": 1,
            "repository": REPO,
            "tag": self.tag,
            "tag_object": self.object,
            "commit": self.commit,
            "release_id": release["id"],
            "declaration_sha256": digest(self.declaration),
            "notes_sha256": digest(self.notes),
            "latest": self.args.latest,
            "prerelease": self.args.prerelease,
            "assets": assets,
            "verification": {
                "pinned_tag": True,
                "payload_binding": True,
                "minisign": True,
            },
        }

    def read_record(self):
        require(
            self.record.is_file() and not self.record.is_symlink(),
            "prepublication record required",
        )
        return decode_json(self.record.read_bytes())

    def stage(self, release):
        require(
            release is None or release.get("draft") is True,
            "published existing release is never overwritten; use publish for read-only postverification",
        )
        local = ROOT / "dist/release"
        require(
            local.is_dir() and not local.is_symlink(),
            "dist/release must be a regular directory",
        )
        require(
            sorted(p.name for p in local.iterdir()) == sorted(self.names),
            "local asset inventory mismatch",
        )
        for name in self.names:
            require(
                (local / name).is_file() and not (local / name).is_symlink(),
                "regular local asset required",
            )
        os.environ["FULMENHQ_CRUCIBLE_REQUIRE_MINISIGN"] = "1"
        self.helper("verify-tag-attestation.sh", self.tag)
        # Freeze the bytes used for upload; never upload mutable dist directly.
        frozen = self.evidence / "upload"
        frozen.mkdir()
        for name in self.names:
            (frozen / name).write_bytes((local / name).read_bytes())
        self.signatures(frozen)
        notes = self.evidence / "notes.md"
        notes.write_bytes(self.notes)
        if self.record.exists():
            require(
                release is not None,
                "record exists but release absent; refusing recreation",
            )
            observed = self.readback(release, True, "stage-recheck")
            require(
                observed == self.read_record(),
                "staged state differs from retained record",
            )
            for name in self.names:
                require(
                    digest((frozen / name).read_bytes())
                    == observed["assets"][name]["sha256"],
                    "local assets differ from retained record",
                )
            print("staged-but-unpublished: retained record verified")
            return
        if release is None:
            self.remote_tag()
            gh(
                "release",
                "create",
                self.tag,
                "--repo",
                REPO,
                "--verify-tag",
                "--draft",
                "--target",
                self.commit,
                "--title",
                self.tag,
                "--notes-file",
                str(notes),
                f"--prerelease={str(self.args.prerelease).lower()}",
                f"--latest={str(self.args.latest).lower()}",
            )
            release = self.release()
        self.metadata(release, True)
        existing = self.inventory(release, partial=True)
        self.download(existing, self.evidence / "existing")
        for asset in existing:
            require(
                (self.evidence / "existing" / asset["name"]).read_bytes()
                == (frozen / asset["name"]).read_bytes(),
                "existing draft asset bytes differ; no clobber",
            )
        missing = [
            name for name in self.names if name not in {a["name"] for a in existing}
        ]
        if missing:
            self.remote_tag()
            current = self.release()
            self.metadata(current, True)
            require(
                current["id"] == release["id"]
                and self.inventory(current, partial=True) == existing,
                "draft changed before upload",
            )
            gh(
                "release",
                "upload",
                self.tag,
                "--repo",
                REPO,
                *(str(frozen / name) for name in missing),
            )
        record = self.readback(self.release(), True, "staged")
        for name in self.names:
            require(
                digest((frozen / name).read_bytes())
                == record["assets"][name]["sha256"],
                "staged bytes differ from uploaded bytes",
            )
        descriptor = os.open(self.record, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "w") as stream:
            json.dump(record, stream, indent=2, sort_keys=True)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        print(f"staged-but-unpublished: verified record retained at {self.record}")

    def latest(self, release):
        response = subprocess.run(
            [
                "gh",
                "api",
                "--hostname",
                "github.com",
                "--include",
                f"repos/{REPO}/releases/latest",
            ],
            cwd=ROOT,
            capture_output=True,
        )
        raw = response.stdout
        parts = re.split(rb"\r?\n\r?\n", raw, maxsplit=1)
        require(len(parts) == 2, "latest state unavailable")
        if re.match(rb"HTTP/\S+ 404\b", parts[0]):
            # No latest exists (e.g. the first release is a prerelease).
            require(
                not self.args.latest
                and decode_json(parts[1]).get("message") == "Not Found",
                "latest intent mismatch",
            )
            return
        require(
            response.returncode == 0 and re.match(rb"HTTP/\S+ 200\b", parts[0]),
            "latest state unavailable",
        )
        latest = decode_json(parts[1])
        require(
            type(latest.get("id")) is int and latest["id"] > 0,
            "invalid latest release identity",
        )
        require(
            (latest.get("id") == release["id"]) is self.args.latest,
            "latest intent mismatch",
        )

    def publish(self, release):
        record_bytes = self.record.read_bytes() if self.record.is_file() else b""
        record = self.read_record()
        require(release is not None, "publication-failed: staged release absent")
        if release.get("draft") is True:
            observed = self.readback(release, True, "prepublish")
            require(observed == record, "prepublication record mismatch")
            require(
                self.record.read_bytes() == record_bytes,
                "record changed before publication",
            )
            self.remote_tag()
            try:
                # The only publication mutation; never create/upload in publish.
                gh(
                    "release",
                    "edit",
                    self.tag,
                    "--repo",
                    REPO,
                    "--draft=false",
                    f"--latest={str(self.args.latest).lower()}",
                )
            except Refusal as error:
                print(f"publication response uncertain: {error}", file=sys.stderr)
            release = self.release()
        observed = self.readback(release, False, "published")
        require(
            observed == record,
            "published bytes/identity differ from prepublication record",
        )
        self.latest(release)
        verification = gh("release", "verify", self.tag, "--repo", REPO)
        (self.evidence / "forge-release-verification.txt").write_bytes(verification)
        for name in self.names:
            verification = gh(
                "release",
                "verify-asset",
                self.tag,
                str(self.evidence / "published" / name),
                "--repo",
                REPO,
            )
            (self.evidence / (name + ".forge-verification.txt")).write_bytes(
                verification
            )
        self.remote_tag()
        final = self.release()
        self.metadata(final, False)
        require(
            final["id"] == record["release_id"], "release replaced after verification"
        )
        self.latest(final)
        print(
            f"complete: verified immutable release {REPO}@{self.tag}; evidence: {self.evidence}"
        )

    def run(self):
        lock = self.record.with_name(self.record.name + ".lock")
        require(not lock.is_symlink(), "symlink lock refused")
        with lock.open("a") as stream:
            fcntl.flock(stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
            self.evidence = Path(
                tempfile.mkdtemp(
                    prefix=self.record.name + ".evidence-", dir=self.record.parent
                )
            )
            try:
                self.anchors()
                release = self.release()
                if self.args.mode == "stage":
                    self.stage(release)
                else:
                    self.publish(release)
            except (Refusal, OSError, ValueError, KeyError, TypeError) as error:
                try:
                    self.release()
                except (Refusal, OSError, ValueError, KeyError, TypeError):
                    self.observed = "unknown"
                if self.args.mode == "publish" and self.observed in (
                    "absent",
                    "staged-but-unpublished",
                ):
                    self.observed = "publication-failed (release absent or still draft)"
                message = (
                    f"{self.observed}: {error}; evidence retained: {self.evidence}"
                )
                (self.evidence / "failure.txt").write_text(message + "\n")
                raise Refusal(message) from error


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "mode", choices=("stage", "publish"), nargs="?", default="stage"
    )
    parser.add_argument("--latest", choices=("true", "false"), required=True)
    parser.add_argument("--prerelease", choices=("true", "false"), required=True)
    args = parser.parse_args()
    args.latest = args.latest == "true"
    args.prerelease = args.prerelease == "true"
    try:
        require(not (args.latest and args.prerelease), "a prerelease cannot be latest")
        Ceremony(args).run()
    except (Refusal, OSError, ValueError, KeyError, TypeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

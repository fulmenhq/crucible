#!/usr/bin/env python3
"""Offline orchestration controls. Cryptography and forge behavior are mocked."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parent.parent
TAG = "v1.2.3"
OBJECT = "a" * 40
COMMIT = "b" * 40
PAYLOAD = f"tag: {TAG}\ntag_object: {OBJECT}\ntag_target: {COMMIT}\n"

# This executable replaces every external boundary. Unexpected commands fail;
# the fixture never invokes the real git, gh, minisign or signing tools.
MOCK = r"""#!/usr/bin/env python3
import json, os, pathlib, sys
p = pathlib.Path(os.environ['FIXTURE'])
state = json.loads((p/'state.json').read_text())
tool, args = pathlib.Path(sys.argv[0]).name, sys.argv[1:]
with (p/'calls.jsonl').open('a') as f: f.write(json.dumps([tool, *args])+'\n')
def fail(message):
    print(message, file=sys.stderr)
    sys.exit(1)
def save(): (p/'state.json').write_text(json.dumps(state))
def emit(value):
    print(json.dumps(value))
    sys.exit(0)
tag, obj, commit = 'v1.2.3', 'a'*40, 'b'*40
if tool == 'helper':
    if state.get('helper_fail') == args[0]: fail('trusted helper rejected fixture')
    sys.exit(0)
if tool == 'git':
    if os.environ.get('GIT_NO_REPLACE_OBJECTS') != '1': fail('replacement objects must be disabled for every Git call')
    if args[0] == 'rev-parse': print(commit if args[-1].endswith('^{commit}') else obj)
    elif args[:2] == ['cat-file', '-t']: print('tag')
    elif args[0] == 'ls-tree': print('100644 blob '+'c'*40+'\t'+args[-1])
    elif args[:2] == ['cat-file', 'blob']:
        sys.stdout.buffer.write((p/'blobs'/args[-1].split(':',1)[1]).read_bytes())
    else: fail('unhandled git '+repr(args))
    sys.exit(0)
if tool == 'minisign':
    pin = pathlib.Path(args[args.index('-p')+1]).read_bytes()
    sig = pathlib.Path(args[args.index('-x')+1]).read_bytes()
    if pin != b'committed-public-pin\n' or sig not in (b'valid-signature-one\n', b'valid-signature-two\n'):
        fail('invalid fixture signature or pin')
    sys.exit(0)
if tool != 'gh': fail('unexpected tool')
if args[0] == 'api':
    path = next(x for x in args if x.startswith('repos/'))
    if not path.startswith('repos/fulmenhq/crucible/'): fail('wrong repository')
    path = path.removeprefix('repos/fulmenhq/crucible/')
    if path.startswith('git/ref/'):
        emit({'ref':'refs/tags/'+tag,'object':{'type':'tag','sha':state.get('remote_object',obj)}})
    if path.startswith('git/tags/'):
        emit({'sha':obj,'tag':tag,'object':{'type':'commit','sha':state.get('remote_commit',commit)},
              'verification':{'verified':True}})
    if path == 'releases?per_page=100':
        if state.get('read_failure'): fail('remote unavailable')
        emit([[state['release']] if state['release'] else []])
    if path == 'releases/latest':
        if state.get('no_latest'):
            print('HTTP/2.0 404 Not Found\n\n'+json.dumps({'message':'Not Found'})); sys.exit(1)
        print('HTTP/2.0 200 OK\n\n'+json.dumps({'id':state.get('latest_id',7)})); sys.exit(0)
    if state['release'] and path == 'releases/'+str(state['release']['id']): emit(state['release'])
    if state['release'] and path == 'releases/'+str(state['release']['id'])+'/assets?per_page=100': emit([state['assets']])
    if path.startswith('releases/assets/'):
        asset = next(a for a in state['assets'] if a['id']==int(path.rsplit('/',1)[1]))
        data = (p/'remote'/asset['name']).read_bytes()
        asset['download_count'] = asset.get('download_count', 0)+1
        save()
        sys.stdout.buffer.write(data); sys.exit(0)
    fail('unhandled api '+path)
if args[:2] == ['release','create']:
    assert '--draft' in args and '--verify-tag' in args and '--clobber' not in args
    assert args[args.index('--repo')+1] == 'fulmenhq/crucible'
    assert state['release'] is None
    state['release'] = {'id':7,'tag_name':tag,'target_commitish':args[args.index('--target')+1],
        'draft':True,'immutable':False,'name':tag,'prerelease':'--prerelease=true' in args,
        'body':pathlib.Path(args[args.index('--notes-file')+1]).read_text()}
    save()
    if state.get('create_uncertain'): fail('lost create response')
    sys.exit(0)
if args[:2] == ['release','upload']:
    assert state['release']['draft'] and '--clobber' not in args
    for arg in args[args.index('--repo')+2:]:
        file = pathlib.Path(arg)
        data = file.read_bytes()
        (p/'remote'/file.name).write_bytes(data)
        state['assets'].append({'id':100+len(state['assets']),'name':file.name,'size':len(data),'state':'uploaded'})
    save(); sys.exit(0)
if args[:2] == ['release','edit']:
    assert state['release']['draft'] and '--draft=false' in args
    if not state.get('edit_noop'):
        state['release']['draft'] = False
        if not state.get('immutable_absent'): state['release']['immutable'] = True
        else: state['release'].pop('immutable',None)
        if state.get('post_swap'):
            a = state['assets'][1]
            data = b'valid-signature-two\n'
            (p/'remote'/a['name']).write_bytes(data); a['size']=len(data)
    save()
    if state.get('edit_uncertain'): fail('lost publish response')
    sys.exit(0)
if args[:2] == ['release','verify']:
    if state.get('attestation_fail'): fail('required forge attestation unavailable')
    print('verified fixture release'); sys.exit(0)
if args[:2] == ['release','verify-asset']:
    if state.get('asset_attestation_fail'): fail('required forge asset attestation invalid')
    assert pathlib.Path(args[3]).read_bytes() == (p/'remote'/pathlib.Path(args[3]).name).read_bytes()
    print('verified fixture asset'); sys.exit(0)
fail('unhandled gh '+repr(args))
"""


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="crucible-publication-test-")
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.root = self.base / "checkout"
        self.bin = self.base / "bin"
        for directory in (
            self.root / "scripts",
            self.root / "dist/release",
            self.bin,
            self.base / "remote",
            self.base / "blobs/config/release",
            self.base / "blobs/release-notes",
            self.base / "blobs/docs/security",
        ):
            directory.mkdir(parents=True)
        for name in ("release-publication.py", "release-publish-assets.sh"):
            shutil.copyfile(ROOT / "scripts" / name, self.root / "scripts" / name)
        for name in ("git", "gh", "minisign", "helper"):
            path = self.bin / name
            path.write_text(MOCK)
            path.chmod(0o755)
        for name in (
            "verify-pinned-tag.sh",
            "verify-tag-attestation.sh",
            "release-verify-remote-tag.sh",
        ):
            (self.root / "scripts" / name).write_text(
                f'#!/usr/bin/env bash\nexec helper {name} "$@"\n'
            )
        shutil.copyfile(
            ROOT / "config/release/release-assets.json",
            self.base / "blobs/config/release/release-assets.json",
        )
        (self.base / f"blobs/release-notes/{TAG}.md").write_text("# Reviewed release\n")
        (self.base / "blobs/docs/security/release-minisign.pub").write_text(
            "committed-public-pin\n"
        )
        (self.root / f"dist/release/{TAG}.tag.txt").write_text(PAYLOAD)
        (self.root / f"dist/release/{TAG}.tag.txt.minisig").write_text(
            "valid-signature-one\n"
        )
        self.record = self.base / "record.json"
        self.state = {"release": None, "assets": []}
        self.save()
        self.env = {
            "PATH": str(self.bin) + os.pathsep + os.environ["PATH"],
            "HOME": str(self.base),
            "FIXTURE": str(self.base),
            "FULMENHQ_CRUCIBLE_RELEASE_TAG": TAG,
            "FULMENHQ_CRUCIBLE_RELEASE_RECORD": str(self.record),
            # Helpers are stubbed; these are explicitly NOT real trust inputs.
            "FULMENHQ_CRUCIBLE_GPG_SIGNING_FINGERPRINT": "F" * 40,
            "FULMENHQ_CRUCIBLE_DECERNOR_BIN": str(self.bin / "fixture-checker"),
        }

    def save(self):
        (self.base / "state.json").write_text(json.dumps(self.state))

    def load(self):
        self.state = json.loads((self.base / "state.json").read_text())

    def invoke(self, mode=None, expected=None, latest="true", prerelease="false"):
        args = ["bash", str(self.root / "scripts/release-publish-assets.sh")]
        if mode:
            args.append(mode)
        args += ["--latest", latest, "--prerelease", prerelease]
        result = subprocess.run(args, env=self.env, capture_output=True, text=True)
        self.load()
        if expected:
            self.assertNotEqual(result.returncode, 0, result.stdout)
            self.assertIn(expected, result.stderr)
        else:
            self.assertEqual(result.returncode, 0, result.stderr)
        return result

    def mutations(self):
        calls = (self.base / "calls.jsonl").read_text().splitlines()
        return [
            json.loads(line)
            for line in calls
            if json.loads(line)[1:3]
            in (["release", "create"], ["release", "upload"], ["release", "edit"])
        ]

    def stage(self):
        self.assertIn("staged-but-unpublished", self.invoke().stdout)
        self.assertTrue(self.record.is_file())
        self.assertTrue(self.state["release"]["draft"])

    def change_asset(self, index, data):
        asset = self.state["assets"][index]
        (self.base / "remote" / asset["name"]).write_bytes(data)
        asset["size"] = len(data)
        self.save()

    def test_positive_stage_publish_and_read_only_rerun(self):
        self.stage()
        before = self.record.read_bytes()
        self.assertIn("complete:", self.invoke("publish").stdout)
        self.assertFalse(self.state["release"]["draft"])
        count = len(self.mutations())
        self.invoke("publish")
        self.assertEqual(len(self.mutations()), count)
        self.assertEqual(self.record.read_bytes(), before)

    def test_stage_rerun_preserves_record(self):
        self.stage()
        before = self.record.read_bytes()
        self.invoke("stage")
        self.assertEqual(self.record.read_bytes(), before)
        self.assertEqual(len(self.mutations()), 2)

    def test_missing_asset(self):
        self.stage()
        self.state["assets"].pop()
        self.save()
        self.invoke("publish", "missing required attached asset")
        self.assertEqual(len(self.mutations()), 2)

    def test_extra_asset(self):
        self.stage()
        self.state["assets"].append(
            {"id": 999, "name": "unexpected", "size": 1, "state": "uploaded"}
        )
        self.save()
        self.invoke("publish", "unexpected attached asset")
        self.assertEqual(len(self.mutations()), 2)

    def test_duplicate_asset(self):
        self.stage()
        self.state["assets"].append(self.state["assets"][0])
        self.save()
        self.invoke("publish", "duplicate attached assets")

    def test_altered_payload(self):
        self.stage()
        self.change_asset(0, PAYLOAD.replace(COMMIT, "c" * 40).encode())
        self.invoke("publish", "attestation payload binding mismatch")

    def test_invalid_signature(self):
        self.stage()
        self.change_asset(1, b"invalid-signature\n")
        self.invoke("publish", "invalid fixture signature")

    def test_internally_valid_replacement_rejected_by_record(self):
        self.stage()
        self.change_asset(1, b"valid-signature-two\n")
        self.invoke("publish", "prepublication record mismatch")
        self.assertEqual(len(self.mutations()), 2)

    def test_postpublication_replacement(self):
        self.stage()
        self.state["post_swap"] = True
        self.save()
        self.invoke(
            "publish", "published bytes/identity differ from prepublication record"
        )
        self.assertFalse(self.state["release"]["draft"])

    def test_changed_remote_tag(self):
        self.stage()
        self.state["remote_object"] = "c" * 40
        self.save()
        self.invoke("publish", "remote tag object mismatch")
        self.assertEqual(len(self.mutations()), 2)

    def test_changed_remote_commit(self):
        self.stage()
        self.state["remote_commit"] = "c" * 40
        self.save()
        self.invoke("publish", "remote tag commit or verification mismatch")

    def test_immutable_absent(self):
        self.stage()
        self.state["immutable_absent"] = True
        self.save()
        result = self.invoke("publish", "immutability evidence absent")
        self.assertIn("published-but-verification-failed", result.stderr)

    def test_publication_not_effective(self):
        self.stage()
        self.state["edit_noop"] = True
        self.save()
        self.invoke("publish", "publication-failed (release absent or still draft)")

    def test_required_forge_attestation(self):
        self.stage()
        self.state["attestation_fail"] = True
        self.save()
        self.invoke("publish", "required forge attestation unavailable")
        self.state["attestation_fail"] = False
        self.save()
        self.invoke("publish")
        self.assertEqual(len(self.mutations()), 3)

    def test_required_asset_attestation(self):
        self.stage()
        self.state["asset_attestation_fail"] = True
        self.save()
        self.invoke("publish", "required forge asset attestation invalid")

    def test_latest_mismatch(self):
        self.stage()
        self.state["latest_id"] = 8
        self.save()
        self.invoke("publish", "latest intent mismatch")

    def test_nonlatest_prerelease_with_no_latest(self):
        self.state["no_latest"] = True
        self.save()
        self.invoke(latest="false", prerelease="true")
        self.invoke("publish", latest="false", prerelease="true")

    def test_uncertain_publish_reads_actual_state(self):
        self.stage()
        self.state["edit_uncertain"] = True
        self.save()
        self.assertIn("complete:", self.invoke("publish").stdout)

    def test_uncertain_create_resumes_same_draft(self):
        self.state["create_uncertain"] = True
        self.save()
        self.invoke(expected="staged-but-unpublished")
        self.assertEqual(len(self.mutations()), 1)
        self.stage()
        self.assertEqual(len(self.mutations()), 2)

    def test_published_stage_never_overwrites(self):
        self.stage()
        self.invoke("publish")
        self.invoke("stage", "published existing release is never overwritten")
        self.assertEqual(len(self.mutations()), 3)

    def test_missing_record_never_reconstructed_on_publish(self):
        self.stage()
        self.record.unlink()
        self.invoke("publish", "prepublication record required")
        self.assertEqual(len(self.mutations()), 2)

    def test_notes_from_tag(self):
        self.stage()
        self.state["release"]["body"] = "unreviewed notes"
        self.save()
        self.invoke("publish", "release notes differ from tagged notes")

    def test_tag_commit_declaration_validation(self):
        path = self.base / "blobs/config/release/release-assets.json"
        declaration = json.loads(path.read_text())
        declaration["assets"][0]["name"] = "../escape"
        path.write_text(json.dumps(declaration))
        self.invoke(expected="unsupported release declaration")
        self.assertEqual(self.mutations(), [])

    def test_helper_failure_precedes_mutation(self):
        self.state["helper_fail"] = "verify-tag-attestation.sh"
        self.save()
        self.invoke(expected="trusted helper rejected fixture")
        self.assertEqual(self.mutations(), [])

    def test_unknown_remote_never_creates(self):
        self.state["read_failure"] = True
        self.save()
        self.invoke(expected="unknown:")
        self.assertEqual(self.mutations(), [])

    def test_explicit_tag_required(self):
        del self.env["FULMENHQ_CRUCIBLE_RELEASE_TAG"]
        self.invoke(expected="must explicitly name canonical")
        self.assertFalse((self.base / "calls.jsonl").exists())

    def test_record_must_be_outside_checkout(self):
        self.env["FULMENHQ_CRUCIBLE_RELEASE_RECORD"] = str(
            self.root / "dist/record.json"
        )
        self.invoke(expected="outside the checkout")
        self.assertFalse((self.base / "calls.jsonl").exists())

    def test_local_signature_missing(self):
        (self.root / f"dist/release/{TAG}.tag.txt.minisig").unlink()
        self.invoke(expected="local asset inventory mismatch")
        self.assertEqual(self.mutations(), [])

    def test_local_signature_symlink_refused(self):
        path = self.root / f"dist/release/{TAG}.tag.txt.minisig"
        path.unlink()
        path.symlink_to(self.base / "state.json")
        self.invoke(expected="regular local asset required")
        self.assertEqual(self.mutations(), [])

    def test_existing_draft_not_clobbered(self):
        self.stage()
        self.record.unlink()
        self.change_asset(1, b"valid-signature-two\n")
        self.invoke(expected="existing draft asset bytes differ; no clobber")
        self.assertEqual(len(self.mutations()), 2)

    def test_repository_override_refused(self):
        self.env["FULMENHQ_CRUCIBLE_GITHUB_REPO"] = "another/repo"
        self.invoke(expected="repository must be fulmenhq/crucible")
        self.assertFalse((self.base / "calls.jsonl").exists())

    def test_prerelease_intent_mismatch(self):
        self.stage()
        self.state["release"]["prerelease"] = True
        self.save()
        self.invoke("publish", "release prerelease intent mismatch")
        self.assertEqual(len(self.mutations()), 2)

    def test_publish_intent_cannot_change_record(self):
        self.stage()
        self.invoke("publish", "prepublication record mismatch", latest="false")
        self.assertEqual(len(self.mutations()), 2)

    def test_latest_and_prerelease_required(self):
        result = subprocess.run(
            ["bash", str(self.root / "scripts/release-publish-assets.sh")],
            env=self.env,
            capture_output=True,
            text=True,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("--latest", result.stderr)
        self.assertIn("--prerelease", result.stderr)
        self.assertFalse((self.base / "calls.jsonl").exists())

    def test_release_replacement_rejected(self):
        self.stage()
        self.state["release"]["id"] = 8
        self.save()
        self.invoke("publish", "prepublication record mismatch")
        self.assertEqual(len(self.mutations()), 2)

    def test_asset_identity_replacement_rejected(self):
        self.stage()
        self.state["assets"][0]["id"] = 999
        self.save()
        self.invoke("publish", "prepublication record mismatch")
        self.assertEqual(len(self.mutations()), 2)


if __name__ == "__main__":
    unittest.main()

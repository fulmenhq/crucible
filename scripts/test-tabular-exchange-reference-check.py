#!/usr/bin/env python3
"""Regression controls for the tabular exchange reference checker.

Each control copies the fixtures and vectors to a temporary directory, makes
one change, and requires the checker to fail. Python 3 standard library only.
"""

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHECKER = ROOT / "scripts" / "tabular-exchange-reference-check.py"
DATA = ROOT / "config" / "data" / "tabular-exchange" / "v0.1.0"


def run(data_dir):
    return subprocess.run(
        [sys.executable, "-B", str(CHECKER), str(data_dir)],
        capture_output=True,
        text=True,
    )


def edit_json(path, change):
    document = json.loads(path.read_text())
    change(document)
    path.write_text(json.dumps(document, indent=2) + "\n")


def drop_matching_verdict(document):
    del document["cases"][0]["verdict"]


def flip_matching_verdict(document):
    case = document["cases"][0]
    case["verdict"] = "not-" + str(case["verdict"])


CONTROLS = [
    (
        "matching case without an expectation",
        "matching-vectors.json",
        drop_matching_verdict,
    ),
    (
        "matching case with a wrong expectation",
        "matching-vectors.json",
        flip_matching_verdict,
    ),
]


def main():
    baseline = run(DATA)
    if baseline.returncode != 0:
        sys.stderr.write(baseline.stdout + baseline.stderr)
        sys.stderr.write("error: unmodified corpus does not pass\n")
        return 1
    failures = 0
    for label, name, change in CONTROLS:
        with tempfile.TemporaryDirectory() as work:
            copy = Path(work) / "v0.1.0"
            shutil.copytree(DATA, copy)
            edit_json(copy / name, change)
            result = run(copy)
            if result.returncode == 0:
                sys.stderr.write("error: control passed but must fail: %s\n" % label)
                failures += 1
            else:
                print("ok: control fails as required: %s" % label)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

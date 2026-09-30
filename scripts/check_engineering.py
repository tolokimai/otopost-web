#!/usr/bin/env python3
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config" / "engineering_exceptions.json"
SOURCE_SUFFIXES = {".py", ".ts", ".tsx", ".js", ".jsx", ".css"}
FORBIDDEN_PARTS = ("_new", "_old", "_final", "_v2", "_backup", "_copy", "_temp")


def changed_files() -> list[Path]:
    base = subprocess.run(
        ["git", "merge-base", "HEAD", "origin/main"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    ).stdout.strip()
    if not base:
        return [path for path in ROOT.rglob("*") if path.is_file()]
    output = subprocess.run(
        ["git", "diff", "--name-only", f"{base}...HEAD"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    return [ROOT / line for line in output.splitlines() if line]


def main() -> int:
    config = json.loads(CONFIG.read_text())
    line_exceptions = set(config.get("line_limit", []))
    failures: list[str] = []
    for path in changed_files():
        if not path.exists() or path.suffix not in SOURCE_SUFFIXES:
            continue
        relative = path.relative_to(ROOT).as_posix()
        if any(part in path.stem.lower() for part in FORBIDDEN_PARTS):
            failures.append(f"forbidden filename: {relative}")
        lines = len(path.read_text(encoding="utf-8").splitlines())
        if lines > 400 and relative not in line_exceptions:
            failures.append(f"source file exceeds 400 lines ({lines}): {relative}")
    if failures:
        print("Engineering checks failed:")
        print("\n".join(f"- {failure}" for failure in failures))
        return 1
    print("Engineering checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())

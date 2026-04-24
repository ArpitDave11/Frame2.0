#!/usr/bin/env python3
"""
H4 — Stop hook: block session termination while TypeScript typecheck is broken.

Scoped to DocMining work only — only runs tsc when DocMining-relevant files
were touched in the last commit or are currently unstaged. This avoids
holding the whole session hostage for unrelated branches.

Full test suite is NOT run (pre-existing failures documented in
memory/project_master_plan_complete.md: 1229/1242). Running the full suite
would infinite-loop the Stop hook.

Kit reference: docs/runbooks/kit-hardening-v1.md
"""
import json
import subprocess
import sys
from pathlib import Path


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except Exception:
        # Malformed input — allow stop, don't punish the user.
        return 0

    # MANDATORY: prevent infinite Stop-hook loops. If Claude is already being
    # forced to continue by this hook, let it stop this time.
    if data.get("stop_hook_active"):
        return 0

    proj = Path(sys.argv[0]).resolve().parents[2]  # .claude/hooks/ → repo root

    # Only gate when DocMining-relevant files were modified in this session.
    # Use `git status` + `git diff HEAD~1` scope.
    try:
        status = subprocess.run(
            ["git", "-C", str(proj), "status", "--porcelain"],
            capture_output=True, text=True, timeout=10,
        )
        changed = status.stdout
    except Exception:
        return 0  # Git errored — don't block.

    docmining_touched = any(
        needle in changed
        for needle in (
            "services/docmining/",
            "src/services/docminingClient",
            "src/components/docmining/",
            "src/stores/uiStore",
            "vite.config.ts",
            "docs/plans/2026-04-23-docmining",
            "docs/runbooks/docmining",
        )
    )
    if not docmining_touched:
        return 0

    # Run TypeScript typecheck only. Fast, deterministic, doesn't hit tests.
    try:
        r = subprocess.run(
            ["npx", "--no", "tsc", "-b", "--noEmit"],
            capture_output=True, text=True, timeout=90, cwd=str(proj),
        )
    except subprocess.TimeoutExpired:
        return 0  # Toolchain issue, don't block on infrastructure.
    except FileNotFoundError:
        return 0  # npx not available — skip gate.

    if r.returncode == 0:
        return 0

    # Block the stop. stderr becomes Claude's feedback.
    tail = (r.stdout + r.stderr)[-1800:]
    print(json.dumps({
        "decision": "block",
        "reason": (
            "TypeScript typecheck is failing on DocMining-scoped files. "
            "Fix before stopping. Last output:\n\n"
            f"{tail}\n\n"
            "To override (human-only): set KIT_SKIP_STOP_TYPECHECK=1 and retry."
        ),
    }))
    return 0


if __name__ == "__main__":
    # Human override (TTY + env var).
    import os
    if os.environ.get("KIT_SKIP_STOP_TYPECHECK") == "1" and sys.stdin.isatty():
        sys.exit(0)
    sys.exit(main())

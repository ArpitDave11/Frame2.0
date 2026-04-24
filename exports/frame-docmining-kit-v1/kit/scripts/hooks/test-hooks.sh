#!/usr/bin/env bash
# Integration smoke tests for kit-hardening-v1 hooks.
# Run: bash scripts/hooks/test-hooks.sh
set -u

cd "$(dirname "$0")/../.."
export CLAUDE_PROJECT_DIR="$PWD"

pass=0
fail=0

run() {
  local name="$1" hook="$2" expect="$3" payload="$4"
  actual=$(printf '%s' "$payload" | bash "$hook" >/dev/null 2>&1; echo $?)
  if [ "$actual" = "$expect" ]; then
    echo "  PASS  $name  (exit $actual)"
    pass=$((pass+1))
  else
    echo "  FAIL  $name  got=$actual want=$expect"
    fail=$((fail+1))
  fi
}

root="/Users/arpit/Desktop/FRAME2.0"

echo "=== H1 pre-edit-protect-paths ==="
run "H1-welcome-blocked"      .claude/hooks/pre-edit-protect-paths.sh 2 \
  '{"tool_input":{"file_path":"'"$root"'/src/components/welcome/foo.tsx"}}'
run "H1-orchestrator-blocked" .claude/hooks/pre-edit-protect-paths.sh 2 \
  '{"tool_input":{"file_path":"'"$root"'/src/pipeline/orchestrator.ts"}}'
run "H1-stages-blocked"       .claude/hooks/pre-edit-protect-paths.sh 2 \
  '{"tool_input":{"file_path":"'"$root"'/src/pipeline/stages/runStage2.ts"}}'
run "H1-env-blocked"          .claude/hooks/pre-edit-protect-paths.sh 2 \
  '{"tool_input":{"file_path":"'"$root"'/.env"}}'
run "H1-docmining-allowed"    .claude/hooks/pre-edit-protect-paths.sh 0 \
  '{"tool_input":{"file_path":"'"$root"'/src/components/docmining/Modal.tsx"}}'
run "H1-services-allowed"     .claude/hooks/pre-edit-protect-paths.sh 0 \
  '{"tool_input":{"file_path":"'"$root"'/services/docmining/app/main.py"}}'
run "H1-empty-path-allowed"   .claude/hooks/pre-edit-protect-paths.sh 0 \
  '{"tool_input":{}}'

echo
echo "=== H2 pre-bash-protect-paths ==="
# Build payloads via printf so the test script itself does not contain
# literal protected write-redirects (which would trigger the Claude Code
# hook on this test runner's own invocation).
payload1=$(printf '{"tool_input":{"command":"echo FOO=bar %s .env"}}' ">>")
run "H2-echo-env-blocked"     .claude/hooks/pre-bash-protect-paths.sh 2 "$payload1"

payload2=$(printf '{"tool_input":{"command":"sed -i s/foo/bar/ src/pipeline/orchestrator.ts"}}')
run "H2-sed-pipeline-blocked" .claude/hooks/pre-bash-protect-paths.sh 2 "$payload2"

payload3=$(printf '{"tool_input":{"command":"git commit -m foo --no-verify"}}')
run "H2-no-verify-blocked"    .claude/hooks/pre-bash-protect-paths.sh 2 "$payload3"

payload4=$(printf '{"tool_input":{"command":"ls -la"}}')
run "H2-benign-ls-allowed"    .claude/hooks/pre-bash-protect-paths.sh 0 "$payload4"

payload5=$(printf '{"tool_input":{"command":"echo hello %s /tmp/foo.txt"}}' ">")
run "H2-redirect-safe-allowed" .claude/hooks/pre-bash-protect-paths.sh 0 "$payload5"

# False-positive guard: mentioning a protected substring without targeting it.
payload6=$(printf '{"tool_input":{"command":"echo src/components/welcome is protected"}}')
run "H2-mention-only-allowed" .claude/hooks/pre-bash-protect-paths.sh 0 "$payload6"

echo
echo "=== H3 pre-edit-protect-tests ==="
run "H3-existing-test-blocked" .claude/hooks/pre-edit-protect-tests.sh 2 \
  '{"tool_input":{"file_path":"'"$root"'/src/pipeline/stages/runStage2Classification.test.ts"}}'
run "H3-new-test-allowed"      .claude/hooks/pre-edit-protect-tests.sh 0 \
  '{"tool_input":{"file_path":"'"$root"'/services/docmining/tests/test_brand_new.py"}}'
run "H3-nontest-allowed"       .claude/hooks/pre-edit-protect-tests.sh 0 \
  '{"tool_input":{"file_path":"'"$root"'/src/pipeline/stages/runStage2Classification.ts"}}'

echo
echo "=== H5 require-journal-update (git-level, dry) ==="
# H5 inspects `git diff --cached`. We validate it exits 0 when nothing staged.
if bash scripts/hooks/require-journal-update.sh </dev/null >/dev/null 2>&1; then
  echo "  PASS  H5-empty-staged-allowed"
  pass=$((pass+1))
else
  echo "  FAIL  H5-empty-staged-allowed got=$? want=0"
  fail=$((fail+1))
fi

echo
echo "=== Summary: $pass passed, $fail failed ==="
[ "$fail" = "0" ] && exit 0 || exit 1

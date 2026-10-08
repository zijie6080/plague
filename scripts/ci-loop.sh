#!/usr/bin/env bash
# Long-running collection loop for GitHub Actions. GitHub throttles frequent
# cron schedules (a */10 schedule may fire only every few hours), so one job
# collects every INTERVAL seconds for LOOPS rounds and the workflow then
# re-dispatches itself. Each round pulls main first, so code pushed meanwhile
# takes effect on the next round.
set -uo pipefail
LOOPS="${LOOPS:-34}"
INTERVAL="${INTERVAL:-600}"
FORCE="${FORCE:-}"
REPO_URL="https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"

git config user.name "sentinel-bot"
git config user.email "sentinel-bot@users.noreply.github.com"

publish_live() {
  local dir; dir="$(mktemp -d)"
  cp public/data/state.json "$dir/state.json"
  echo '{ "git": { "deploymentEnabled": false }, "ignoreCommand": "exit 0" }' > "$dir/vercel.json"
  ( cd "$dir" && git init -q -b live && git config user.name "sentinel-bot" && git config user.email "sentinel-bot@users.noreply.github.com" \
    && git add . && git commit -qm "live state $(date -u +%Y-%m-%dT%H:%MZ)" && git push -fq "$REPO_URL" live )
  rm -rf "$dir"
}

for ((i = 1; i <= LOOPS; i++)); do
  started=$(date +%s)
  echo "::group::round $i/$LOOPS $(date -u +%H:%M:%SZ)"
  git pull -q --rebase origin main || { git rebase --abort 2>/dev/null; git reset -q --hard origin/main; }
  npm run collect -- $FORCE || echo "collect failed (continuing)"
  FORCE=""
  git add data/store
  if ! git diff --cached --quiet; then
    git commit -qm "data: collection $(date -u +%Y-%m-%dT%H:%MZ)"
    for t in 1 2 3 4; do git pull -q --rebase origin main && git push -q origin HEAD:main && break; sleep $((2 ** t)); done
  fi
  publish_live || echo "live publish failed (continuing)"
  echo "::endgroup::"
  (( i == LOOPS )) && break
  wait=$(( INTERVAL - ($(date +%s) - started) ))
  (( wait > 0 )) && sleep "$wait"
done

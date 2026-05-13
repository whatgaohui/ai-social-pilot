#!/usr/bin/env bash
set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "[ERROR] jq is required." >&2
  exit 1
fi

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
PLATFORM="xiaohongshu"
ACCOUNT_URL="${1:-${ACCOUNT_URL:-}}"
COOKIE="${COOKIE:-}"

if [[ -z "${ACCOUNT_URL}" ]]; then
  echo "Usage: BASE_URL=http://127.0.0.1:3000 COOKIE='optional' $0 <xiaohongshu_profile_url>"
  exit 1
fi

echo "[1/6] Create tracked account..."
CREATE_PAYLOAD=$(jq -n --arg p "$PLATFORM" --arg u "$ACCOUNT_URL" --arg c "$COOKIE" '{platform:$p, collectMethod:(($c|length)>0?"cookie":"link"), homeUrl:$u, cookie:$c, isOwn:false}')
CREATE_RESP=$(curl -sS -X POST "$BASE_URL/api/tracked-accounts" -H 'Content-Type: application/json' -d "$CREATE_PAYLOAD")
ACCOUNT_ID=$(echo "$CREATE_RESP" | jq -r '.id // empty')

if [[ -z "$ACCOUNT_ID" ]]; then
  echo "[ERROR] create account failed: $CREATE_RESP"
  exit 1
fi

echo "Account ID: $ACCOUNT_ID"

echo "[2/6] Trigger sync..."
SYNC_RESP=$(curl -sS -X POST "$BASE_URL/api/tracked-accounts/$ACCOUNT_ID/sync")
TASK_ID=$(echo "$SYNC_RESP" | jq -r '.syncTaskId // empty')
if [[ -z "$TASK_ID" ]]; then
  echo "[ERROR] trigger sync failed: $SYNC_RESP"
  exit 1
fi

echo "Sync Task ID: $TASK_ID"

echo "[3/6] Poll account status (up to 120s)..."
for i in {1..60}; do
  ACC=$(curl -sS "$BASE_URL/api/tracked-accounts/$ACCOUNT_ID")
  STATUS=$(echo "$ACC" | jq -r '.status // "unknown"')
  ERR=$(echo "$ACC" | jq -r '.lastError // ""')
  echo "  - status=$STATUS"
  if [[ "$STATUS" == "success" ]]; then
    break
  fi
  if [[ "$STATUS" == "error" ]]; then
    echo "[ERROR] sync failed: $ERR"
    exit 1
  fi
  sleep 2
done

echo "[4/6] Validate notes are linked to this account..."
NOTES_RESP=$(curl -sS "$BASE_URL/api/tracked-accounts/$ACCOUNT_ID/notes?page=1&limit=20")
TOTAL=$(echo "$NOTES_RESP" | jq -r '.pagination.total // 0')
POSTS_WITH_WRONG_SOURCE=$(echo "$NOTES_RESP" | jq --arg aid "$ACCOUNT_ID" '[.posts[] | select(.sourceAccountId != $aid)] | length')

echo "  - notes total=$TOTAL"
if [[ "$POSTS_WITH_WRONG_SOURCE" != "0" ]]; then
  echo "[ERROR] Found posts not linked to current account: $POSTS_WITH_WRONG_SOURCE"
  exit 1
fi

echo "[5/6] Check interactions/comments volume..."
# Since upstream scraping may not always fetch interactions, we only report counts.
POST_IDS=$(echo "$NOTES_RESP" | jq -r '.posts[].id' | head -n 5)
for pid in $POST_IDS; do
  C=$(curl -sS "$BASE_URL/api/content/$pid/comments" | jq -r '.comments | length // 0' 2>/dev/null || echo 0)
  I=$(curl -sS "$BASE_URL/api/content/$pid/interactions" | jq -r '.interactions | length // 0' 2>/dev/null || echo 0)
  echo "  - post=$pid comments=$C interactions=$I"
done

echo "[6/6] Final account snapshot"
curl -sS "$BASE_URL/api/tracked-accounts/$ACCOUNT_ID" | jq '{id,status,nickname,followers,following,postsCount,totalCollected,lastError,lastSyncAt}'

echo "DONE"

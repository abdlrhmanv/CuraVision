#!/usr/bin/env bash
#
# End-to-end smoke test for the P0 MVP flows:
#   1. doctor login
#   2. doctor uploads a DICOM
#   3. poll scan until ANALYSIS_COMPLETE (AI service stub falls through to local fallback)
#   4. doctor fetches analysis + report
#   5. doctor approves the report
#   6. patient login + lists published reports + chats
#
# Usage:
#   BASE_URL=http://localhost:3099 ./tests/smoke-mvp.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3001}"

echo "▶ Health"
curl -sf "$BASE_URL/health" | jq -c .

echo "▶ Doctor login"
DOC=$(curl -sf -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@curavision.com","password":"Doctor@123"}')
DOC_TOKEN=$(echo "$DOC" | jq -r .token)
DOC_ID=$(echo "$DOC" | jq -r .user.id)
echo "  doctor id: $DOC_ID"

echo "▶ Patient login"
PAT=$(curl -sf -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"patient1@curavision.com","password":"Patient@123"}')
PAT_TOKEN=$(echo "$PAT" | jq -r .token)
PAT_ID=$(echo "$PAT" | jq -r .user.id)
echo "  patient id: $PAT_ID"

echo "▶ Doctor uploads a synthetic DICOM"
TMPFILE=$(mktemp --suffix=.dcm)
printf '%128sDICM-fake-bytes-%s' "" "$(date +%s%N)" > "$TMPFILE"
UPLOAD=$(curl -sf -X POST "$BASE_URL/api/scans" \
  -H "Authorization: Bearer $DOC_TOKEN" \
  -F "patient_id=$PAT_ID" \
  -F "file=@$TMPFILE")
SCAN_ID=$(echo "$UPLOAD" | jq -r .scan_id)
rm -f "$TMPFILE"
echo "  scan id: $SCAN_ID"

echo "▶ Polling scan status"
for i in 1 2 3 4 5 6 7 8 9 10; do
  STATUS=$(curl -sf -H "Authorization: Bearer $DOC_TOKEN" "$BASE_URL/api/scans/$SCAN_ID" | jq -r .status)
  echo "  attempt $i: $STATUS"
  if [ "$STATUS" = "ANALYSIS_COMPLETE" ] || [ "$STATUS" = "FAILED" ]; then
    break
  fi
  sleep 1
done
[ "$STATUS" = "ANALYSIS_COMPLETE" ] || { echo "scan did not complete"; exit 1; }

echo "▶ Analysis payload"
curl -sf -H "Authorization: Bearer $DOC_TOKEN" "$BASE_URL/api/scans/$SCAN_ID/analysis" | jq -c .

echo "▶ Draft report"
REPORT=$(curl -sf -H "Authorization: Bearer $DOC_TOKEN" "$BASE_URL/api/scans/$SCAN_ID/report")
REPORT_ID=$(echo "$REPORT" | jq -r .id)
echo "  report id: $REPORT_ID"

echo "▶ Doctor edits and approves"
curl -sf -X PATCH "$BASE_URL/api/reports/$REPORT_ID" \
  -H "Authorization: Bearer $DOC_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"final_report":"Smoke test — approved."}' > /dev/null
APPROVED=$(curl -sf -X POST "$BASE_URL/api/reports/$REPORT_ID/approve" \
  -H "Authorization: Bearer $DOC_TOKEN")
echo "  status: $(echo "$APPROVED" | jq -r .status)"

echo "▶ Patient lists reports"
curl -sf -H "Authorization: Bearer $PAT_TOKEN" "$BASE_URL/api/patient/reports" | jq -c '.reports | map(.id)'

echo "▶ Patient chats about the report"
curl -sf -X POST "$BASE_URL/api/chat/$REPORT_ID/message" \
  -H "Authorization: Bearer $PAT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"What does this report mean for me?"}' \
  | jq -c '{reply: (.reply | .[0:120]), sources: .sources}'

echo "▶ Doctor dashboard (list scans)"
curl -sf -H "Authorization: Bearer $DOC_TOKEN" "$BASE_URL/api/scans" | jq -c '.scans | length'

echo "✓ All smoke checks passed"

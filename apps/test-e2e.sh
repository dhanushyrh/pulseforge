# apps/test-e2e.sh
#!/bin/bash
set -e

BASE="http://localhost:3000"
URL="https://www.instagram.com/reel/DXKCfLyiFu2/?igsh=MTZsbXE0azV3cWwwdA=="

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " PulseForge AI — End-to-End Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1 — Submit job
echo ""
echo "▶ Step 1: Submitting ingest job..."
RESPONSE=$(curl -s -X POST "$BASE/v1/ingest" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"$URL\",\"priority\":\"high\"}")

echo "Response: $RESPONSE"
JOB_ID=$(echo $RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['jobId'])")
echo "Job ID: $JOB_ID"

# Step 2 — Poll until completed
echo ""
echo "▶ Step 2: Polling status (timeout: 5 min)..."
TIMEOUT=300
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ]; do
  STATUS_RESPONSE=$(curl -s "$BASE/v1/ingest/$JOB_ID/status")
  STATUS=$(echo $STATUS_RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
  echo "  [$ELAPSED s] Status: $STATUS"

  if [ "$STATUS" = "completed" ]; then
    echo ""
    echo "✓ Job completed successfully!"
    break
  fi

  if [ "$STATUS" = "failed" ]; then
    echo ""
    echo "✗ Job failed!"
    exit 1
  fi

  sleep 10
  ELAPSED=$((ELAPSED + 10))
done

# Step 3 — Search
echo ""
echo "▶ Step 3: Searching ingested content..."
SEARCH_RESPONSE=$(curl -s -X POST "$BASE/v1/search" \
  -H "Content-Type: application/json" \
  -d '{"query":"what is this video about","limit":3}')

echo "Search Results:"
echo $SEARCH_RESPONSE | python3 -c "
import sys, json
data = json.load(sys.stdin)
results = data.get('results', [])
print(f'  Found {len(results)} results')
for i, r in enumerate(results):
    print(f'  [{i+1}] Score: {r[\"score\"]:.4f}')
    print(f'       Chunk: {str(r[\"chunk\"])[:100]}...')
    print(f'       Platform: {r[\"platform\"]}')
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " ✓ All tests passed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Swagger UI  → http://localhost:3000/api"
echo "  Queue Board → http://localhost:3000/queues"
echo ""
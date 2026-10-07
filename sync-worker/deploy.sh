#!/bin/zsh
# Redeploys the sync/notification Worker from sync-worker/index.js (run build.py first).
set -e
cd "$(dirname "$0")"
TOK=$(cat ~/.cf_token); API=https://api.cloudflare.com/client/v4; ACCT=b04f7b5f280c98b3c33c508eca9eab8a; NS=7971131e54cb4c45a4298b1060da6562
printf '{"main_module":"index.js","compatibility_date":"2026-10-01","bindings":[{"type":"kv_namespace","name":"STATE","namespace_id":"%s"}],"keep_bindings":["secret_text"]}' "$NS" > /tmp/road175-meta.json
curl -s --max-time 60 -X PUT "$API/accounts/$ACCT/workers/scripts/road175-sync" -H "Authorization: Bearer $TOK" -F "metadata=@/tmp/road175-meta.json;type=application/json" -F "index.js=@index.js;type=application/javascript+module" | python3 -c "import sys,json; d=json.load(sys.stdin); print('upload:', d['success'], d.get('errors'))"
rm -f /tmp/road175-meta.json

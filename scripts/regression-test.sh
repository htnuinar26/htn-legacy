#!/bin/bash
# HTN Legacy — Comprehensive regression test (single-session)
# Server must be started fresh and all tests run within this one script.
set +e

cd /home/z/my-project
pkill -f "next" 2>/dev/null
sleep 2
rm -f dev.log
nohup bun x next dev -p 3000 > dev.log 2>&1 & disown

echo "=== Waiting for server ready ==="
READY=0
for i in $(seq 1 40); do
  if curl -s -o /dev/null --max-time 2 http://localhost:3000/ 2>/dev/null; then
    echo "ready at iter $i"
    READY=1
    break
  fi
  sleep 1
done
if [ "$READY" != "1" ]; then
  echo "FATAL: server not ready after 40s"
  exit 1
fi

echo ""
echo "=============================================="
echo "STEP 1: Fresh admin login"
echo "=============================================="
LOGIN=$(curl -s -X POST --max-time 8 http://localhost:3000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin-htn-legacy-2026"}' \
  -c /tmp/admin-cookies.txt \
  -w "\n@@@HTTP=%{http_code}@@@")
echo "$LOGIN" | head -c 300
echo
COOKIE_LINE=$(grep htn-admin /tmp/admin-cookies.txt 2>/dev/null)
if [ -z "$COOKIE_LINE" ]; then
  echo "FATAL: no admin cookie saved"
  exit 1
fi
echo "Cookie saved: htn-admin (length: $(echo -n "$COOKIE_LINE" | awk '{print length($7)}'))"

echo ""
echo "=============================================="
echo "STEP 2: PRE-TEST anggota status"
echo "=============================================="
curl -s --max-time 5 http://localhost:3000/api/anggota -b /tmp/admin-cookies.txt \
  | python3 -c "import sys,json; d=json.load(sys.stdin); [print('  ',a['nama'],':',a['statusBayar']) for a in d.get('data',[])]" 2>&1

echo ""
echo "=============================================="
echo "STEP 3: CRITICAL REGRESSION — POST struk-generator"
echo "  nominal=10000 (value rejected by old native step bug)"
echo "  Expected: HTTP 201 success, NOT 500"
echo "=============================================="
RESP=$(curl -s -X POST --max-time 12 http://localhost:3000/api/admin/struk-generator \
  -H "Content-Type: application/json" \
  -b /tmp/admin-cookies.txt \
  -d '{"anggotaId":"cmvhtqdn60003p0a6qk6kuf77","periodeBulan":"2026-10","nominal":10000,"sumber":"ADMIN_MANUAL","catatan":"Regression test nominal 10000"}' \
  -w "\n@@@HTTP=%{http_code}@@@")
echo "$RESP"
echo ""

echo "=============================================="
echo "STEP 4: POST-TEST anggota status (Ahmad Yani should be LUNAS)"
echo "=============================================="
curl -s --max-time 5 http://localhost:3000/api/anggota -b /tmp/admin-cookies.txt \
  | python3 -c "import sys,json; d=json.load(sys.stdin); [print('  ',a['nama'],':',a['statusBayar']) for a in d.get('data',[])]" 2>&1

echo ""
echo "=============================================="
echo "STEP 5: Transaksi list (new MASUK 10000 should appear)"
echo "=============================================="
curl -s --max-time 5 http://localhost:3000/api/transaksi -b /tmp/admin-cookies.txt \
  | python3 -c "
import sys,json
d=json.load(sys.stdin)
data = d if isinstance(d,list) else d.get('data',[])
if isinstance(data,dict): data = data.get('transaksi',[]) if 'transaksi' in data else [data]
for t in (data if isinstance(data,list) else []):
    print('  ',t.get('tipe'),':',t.get('nominal'),'-',(t.get('keterangan') or '')[:60])
" 2>&1

echo ""
echo "=============================================="
echo "STEP 6: Dashboard summary"
echo "=============================================="
curl -s --max-time 5 http://localhost:3000/api/dashboard -b /tmp/admin-cookies.txt \
  | python3 -c "import sys,json; d=json.load(sys.stdin); s=d.get('data',{}); print('  Total:',s.get('totalAnggota'),'| Lunas:',s.get('lunas'),'| Belum:',s.get('belumLunas'),'| Tertunggak:',s.get('tertunggak'),'| Saldo:',s.get('saldoTotal'))" 2>&1

echo ""
echo "=============================================="
echo "STEP 7: REGRESSION — duplicate struk (should be SPECIFIC error, NOT 500)"
echo "=============================================="
curl -s -X POST --max-time 12 http://localhost:3000/api/admin/struk-generator \
  -H "Content-Type: application/json" \
  -b /tmp/admin-cookies.txt \
  -d '{"anggotaId":"cmvhtqdn60003p0a6qk6kuf77","periodeBulan":"2026-10","nominal":10000,"sumber":"ADMIN_MANUAL"}' \
  -w "\n@@@HTTP=%{http_code}@@@" | head -c 500
echo

echo ""
echo "=============================================="
echo "STEP 8: REGRESSION — invalid nominal (0 / negative / string)"
echo "=============================================="
echo "-- nominal=0 --"
curl -s -X POST --max-time 8 http://localhost:3000/api/admin/struk-generator \
  -H "Content-Type: application/json" -b /tmp/admin-cookies.txt \
  -d '{"anggotaId":"cmvhtqdn70004p0a6bnh6u9m8","periodeBulan":"2026-10","nominal":0,"sumber":"ADMIN_MANUAL"}' \
  -w "\n@@@HTTP=%{http_code}@@@" | head -c 300
echo
echo "-- nominal=-5000 --"
curl -s -X POST --max-time 8 http://localhost:3000/api/admin/struk-generator \
  -H "Content-Type: application/json" -b /tmp/admin-cookies.txt \
  -d '{"anggotaId":"cmvhtqdn70004p0a6bnh6u9m8","periodeBulan":"2026-10","nominal":-5000,"sumber":"ADMIN_MANUAL"}' \
  -w "\n@@@HTTP=%{http_code}@@@" | head -c 300
echo
echo "-- nominal='abc' (string) --"
curl -s -X POST --max-time 8 http://localhost:3000/api/admin/struk-generator \
  -H "Content-Type: application/json" -b /tmp/admin-cookies.txt \
  -d '{"anggotaId":"cmvhtqdn70004p0a6bnh6u9m8","periodeBulan":"2026-10","nominal":"abc","sumber":"ADMIN_MANUAL"}' \
  -w "\n@@@HTTP=%{http_code}@@@" | head -c 300
echo

echo ""
echo "=============================================="
echo "STEP 9: Lint + typecheck summary"
echo "=============================================="
cd /home/z/my-project
bun run lint 2>&1 | tail -3
echo "--- tsc ---"
bunx tsc --noEmit 2>&1 | grep -v "examples/\|skills/" | tail -5
echo "(empty tsc above = no errors in src/)"

echo ""
echo "=============================================="
echo "ALL REGRESSION TESTS COMPLETE"
echo "=============================================="

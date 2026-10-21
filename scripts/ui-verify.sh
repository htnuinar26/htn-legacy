#!/bin/bash
# HTN Legacy — Full UI verification via Agent Browser (single session)
set +e
cd /home/z/my-project
pkill -f "next" 2>/dev/null
sleep 2
rm -f dev.log
nohup bun x next dev -p 3000 > dev.log 2>&1 & disown

echo "=== Waiting for server ready ==="
for i in $(seq 1 40); do
  if curl -s -o /dev/null --max-time 2 http://localhost:3000/ 2>/dev/null; then
    echo "ready at iter $i"
    break
  fi
  sleep 1
done

echo ""
echo "=== STEP 1: Open app + verify splash → login ==="
agent-browser open http://localhost:81/ 2>&1 | tail -1
sleep 6
agent-browser wait --load networkidle 2>&1 | tail -1
echo "Title: $(agent-browser get title 2>&1)"
echo "First 400 chars:"
agent-browser eval "document.body.innerText.substring(0,400)" 2>&1 | tail -8

echo ""
echo "=== STEP 2: Admin login flow ==="
# Need to get admin password from env
ADMIN_PWD=$(grep "^ADMIN_PASSWORD=" /home/z/my-project/.env | cut -d= -f2-)
echo "Admin password loaded (length: ${#ADMIN_PWD})"
# Login via API to get cookie, then inject into browser
LOGIN=$(curl -s -X POST --max-time 8 http://localhost:3000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$ADMIN_PWD\"}" \
  -c /tmp/admin-cookies.txt \
  -w "@@@HTTP=%{http_code}@@@")
echo "Login response: $(echo $LOGIN | head -c 200)"

# Extract cookie value and set in browser
COOKIE_VAL=$(grep htn-admin /tmp/admin-cookies.txt | awk '{print $7}')
if [ -n "$COOKIE_VAL" ]; then
  agent-browser cookies set htn-admin "$COOKIE_VAL" 2>&1 | tail -1
  echo "Cookie set in browser"
fi
sleep 1

echo ""
echo "=== STEP 3: Reload and verify admin shell ==="
agent-browser reload 2>&1 | tail -1
sleep 5
agent-browser eval "document.body.innerText.substring(0,200)" 2>&1 | tail -5

echo ""
echo "=== STEP 4: Visit each admin view ==="
VIEWS="Dashboard Anggota Review Struk Generator Struk Kas Import Data Audit Log Laporan Settings"
for view in $VIEWS; do
  echo "--- Navigate to: $view ---"
  agent-browser find role button click --name "$view" 2>&1 | tail -1
  sleep 3
  HEADING=$(agent-browser eval "document.querySelector('h1')?.innerText || 'NO H1'" 2>&1 | tail -1)
  TEXT=$(agent-browser eval "document.body.innerText.substring(0,150)" 2>&1 | tail -1 | head -c 150)
  echo "  H1: $HEADING"
  echo "  Text: $TEXT"
done

echo ""
echo "=== STEP 5: Verify no horizontal overflow on mobile (375px) ==="
agent-browser set viewport 375 667 2>&1 | tail -1
sleep 2
agent-browser eval "document.body.scrollWidth > window.innerWidth ? 'OVERFLOW: '+document.body.scrollWidth+'>'+window.innerWidth : 'OK no overflow ('+document.body.scrollWidth+'<='+window.innerWidth+')'" 2>&1 | tail -2

echo ""
echo "=== STEP 6: Switch back to desktop, test logout ==="
agent-browser set viewport 1280 800 2>&1 | tail -1
sleep 2
agent-browser find role button click --name "Keluar" 2>&1 | tail -1
sleep 3
echo "After logout: $(agent-browser eval "document.body.innerText.substring(0,150)" 2>&1 | tail -1 | head -c 150)"

echo ""
echo "=== STEP 7: Member signup + login ==="
# Get first anggota for member login
MEMBER_ID=$(curl -s --max-time 5 http://localhost:3000/api/anggota -b /tmp/admin-cookies.txt | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['id'])" 2>&1)
echo "Member ID for test: $MEMBER_ID"

# Try member signup with new test member
SIGNUP=$(curl -s -X POST --max-time 8 http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"nama":"Test Member Verification","nim":"99999-verif","email":"verif@test.local","telepon":"081234567890","password":"test123456"}' \
  -w "@@@HTTP=%{http_code}@@@")
echo "Signup: $(echo $SIGNUP | head -c 200)"

# Member login
MEMBER_LOGIN=$(curl -s -X POST --max-time 8 http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nim":"99999-verif","password":"test123456"}' \
  -c /tmp/member-cookies.txt \
  -w "@@@HTTP=%{http_code}@@@")
echo "Member login: $(echo $MEMBER_LOGIN | head -c 200)"

MEMBER_COOKIE=$(grep htn-session /tmp/member-cookies.txt | awk '{print $7}')
if [ -n "$MEMBER_COOKIE" ]; then
  # Clear admin cookie, set member cookie
  agent-browser cookies clear 2>&1 | tail -1
  agent-browser cookies set htn-session "$MEMBER_COOKIE" 2>&1 | tail -1
  agent-browser reload 2>&1 | tail -1
  sleep 5
  echo "Member shell title: $(agent-browser get title 2>&1)"
  echo "Member shell text: $(agent-browser eval "document.body.innerText.substring(0,300)" 2>&1 | tail -3)"

  echo ""
  echo "=== STEP 8: Visit each member view ==="
  MVIEWS="Beranda Struk Barcode Kas Daftar Profil"
  for view in $MVIEWS; do
    echo "--- Member navigate to: $view ---"
    agent-browser find role button click --name "$view" 2>&1 | tail -1
    sleep 3
    HEADING=$(agent-browser eval "document.querySelector('h1')?.innerText || 'NO H1'" 2>&1 | tail -1)
    echo "  H1: $HEADING"
  done
fi

echo ""
echo "=== STEP 9: Console errors check ==="
agent-browser console 2>&1 | grep -iE "error|uncaught|fail|exception" | head -10
echo "(empty above = no console errors)"

echo ""
echo "=== STEP 10: Page errors check ==="
agent-browser errors 2>&1 | head -10
echo "(empty above = no page errors)"

echo ""
echo "=============================================="
echo "UI VERIFICATION COMPLETE"
echo "=============================================="

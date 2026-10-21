#!/bin/bash
# HTN Legacy — Dark/Light mode verification (single session)
set +e
cd /home/z/my-project
pkill -f "next" 2>/dev/null
sleep 2
nohup bun x next dev -p 3000 > dev.log 2>&1 & disown

echo "=== Waiting for server ==="
for i in $(seq 1 40); do
  if curl -s -o /dev/null --max-time 2 http://localhost:3000/ 2>/dev/null; then
    echo "ready at iter $i"
    break
  fi
  sleep 1
done

# Restore .env if missing
if [ ! -f .env ] || ! grep -q "ADMIN_PASSWORD" .env 2>/dev/null; then
  cat > .env << 'ENVEOF'
DATABASE_URL=file:/home/z/my-project/db/custom.db
DIRECT_URL=file:/home/z/my-project/db/custom.db
JWT_SECRET=htn-legacy-dev-jwt-secret-change-in-production-9f3a7c1e
ADMIN_PASSWORD=admin-htn-legacy-2026
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=htn-legacy-receipts
NODE_ENV=development
ENVEOF
  # Need restart for env to take effect
  pkill -f "next" 2>/dev/null
  sleep 2
  nohup bun x next dev -p 3000 > dev.log 2>&1 & disown
  for i in $(seq 1 40); do
    if curl -s -o /dev/null --max-time 2 http://localhost:3000/ 2>/dev/null; then break; fi
    sleep 1
  done
fi

echo ""
echo "=============================================="
echo "STEP 1: Open login page — verify theme toggle"
echo "=============================================="
agent-browser open http://localhost:81/ 2>&1 | tail -1
sleep 6
agent-browser wait --load networkidle 2>&1 | tail -1
echo "Title: $(agent-browser get title 2>&1)"
echo "Initial html class: $(agent-browser eval "document.documentElement.className" 2>&1 | tail -1)"
RADIOS=$(agent-browser snapshot -i 2>&1 | grep -iE "radio.*(Terang|Gelap|Sistem)" | head -3)
echo "Theme radios found:"
echo "$RADIOS"

echo ""
echo "=== Click Gelap (dark) ==="
agent-browser find role radio click --name "Gelap" 2>&1 | tail -1
sleep 2
DARK_CLASS=$(agent-browser eval "document.documentElement.className" 2>&1 | tail -1)
DARK_BG=$(agent-browser eval "getComputedStyle(document.body).backgroundColor" 2>&1 | tail -1)
echo "Dark class: $DARK_CLASS"
echo "Dark bg: $DARK_BG"
agent-browser screenshot /tmp/dark-login.png 2>&1 | tail -1

echo ""
echo "=== Click Terang (light) ==="
agent-browser find role radio click --name "Terang" 2>&1 | tail -1
sleep 2
LIGHT_CLASS=$(agent-browser eval "document.documentElement.className" 2>&1 | tail -1)
LIGHT_BG=$(agent-browser eval "getComputedStyle(document.body).backgroundColor" 2>&1 | tail -1)
echo "Light class: $LIGHT_CLASS"
echo "Light bg: $LIGHT_BG"
agent-browser screenshot /tmp/light-login.png 2>&1 | tail -1

echo ""
echo "=============================================="
echo "STEP 2: Admin login + dark mode across views"
echo "=============================================="
ADMIN_PWD="admin-htn-legacy-2026"
curl -s -X POST --max-time 8 http://localhost:3000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"$ADMIN_PWD\"}" \
  -c /tmp/admin-cookies.txt > /dev/null
COOKIE_VAL=$(grep htn-admin /tmp/admin-cookies.txt | awk '{print $7}')
agent-browser cookies set htn-admin "$COOKIE_VAL" 2>&1 | tail -1
agent-browser reload 2>&1 | tail -1
sleep 6
echo "Admin H1: $(agent-browser eval "document.querySelector('h1')?.innerText" 2>&1 | tail -1)"

echo ""
echo "=== Switch admin to DARK ==="
agent-browser find role radio click --name "Gelap" 2>&1 | tail -1
sleep 2
echo "Dark admin class: $(agent-browser eval "document.documentElement.className" 2>&1 | tail -1)"
agent-browser screenshot /tmp/dark-admin-dashboard.png 2>&1 | tail -1

echo ""
echo "=== Visit all admin views in DARK mode ==="
for view in Dashboard Anggota "Review Struk" "Generator Struk" Kas "Import Data" "Audit Log" Laporan Settings; do
  agent-browser find role button click --name "$view" 2>&1 | tail -1
  sleep 3
  H1=$(agent-browser eval "document.querySelector('h1')?.innerText || 'NO H1'" 2>&1 | tail -1)
  CLASS=$(agent-browser eval "document.documentElement.className" 2>&1 | tail -1)
  echo "  $view → H1: $H1 | class: $CLASS"
done

echo ""
echo "=== Switch to LIGHT and verify persistence ==="
agent-browser find role radio click --name "Terang" 2>&1 | tail -1
sleep 2
echo "Light admin class: $(agent-browser eval "document.documentElement.className" 2>&1 | tail -1)"
agent-browser screenshot /tmp/light-admin.png 2>&1 | tail -1

echo ""
echo "=============================================="
echo "STEP 3: Member login + dark mode"
echo "=============================================="
# Signup test member
curl -s -X POST --max-time 8 http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"nama":"Test Dark Mode","nim":"dark-test-001","email":"dark@test.local","telepon":"081234567890","password":"test123456"}' > /dev/null 2>&1
# Login member
curl -s -X POST --max-time 8 http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nama":"Test Dark Mode","password":"test123456"}' \
  -c /tmp/member-cookies.txt > /dev/null
MEMBER_COOKIE=$(grep htn-session /tmp/member-cookies.txt | awk '{print $7}')
agent-browser cookies clear 2>&1 | tail -1
agent-browser cookies set htn-session "$MEMBER_COOKIE" 2>&1 | tail -1
agent-browser open http://localhost:81/ 2>&1 | tail -1
sleep 6
echo "Member H1: $(agent-browser eval "document.querySelector('h1')?.innerText" 2>&1 | tail -1)"

echo ""
echo "=== Switch member to DARK ==="
agent-browser find role radio click --name "Gelap" 2>&1 | tail -1
sleep 2
echo "Dark member class: $(agent-browser eval "document.documentElement.className" 2>&1 | tail -1)"
agent-browser screenshot /tmp/dark-member-beranda.png 2>&1 | tail -1

echo ""
echo "=== Visit member views in DARK ==="
for view in Beranda "Struk Iuran" "Kas Organisasi" "Daftar Anggota" Barcode Profil; do
  agent-browser find role button click --name "$view" 2>&1 | tail -1
  sleep 3
  H1=$(agent-browser eval "document.querySelector('h1')?.innerText || 'NO H1'" 2>&1 | tail -1)
  echo "  $view → H1: $H1"
done

echo ""
echo "=============================================="
echo "STEP 4: Mobile dark mode (375px)"
echo "=============================================="
agent-browser set viewport 375 667 2>&1 | tail -1
sleep 2
echo "Mobile dark overflow: $(agent-browser eval "document.body.scrollWidth > window.innerWidth ? 'OVERFLOW' : 'OK'" 2>&1 | tail -1)"
agent-browser screenshot /tmp/dark-mobile-member.png 2>&1 | tail -1

echo ""
echo "=============================================="
echo "STEP 5: Errors check"
echo "=============================================="
agent-browser errors 2>&1 | head -5
echo "(empty=clean)"
agent-browser console 2>&1 | grep -iE "error|uncaught|exception" | head -5
echo "(empty=clean)"

echo ""
echo "=============================================="
echo "DARK/LIGHT MODE VERIFICATION COMPLETE"
echo "=============================================="
echo "Screenshots saved:"
ls -la /tmp/dark-*.png /tmp/light-*.png 2>&1 | awk '{print "  "$NF, "(" $5, "bytes)"}'

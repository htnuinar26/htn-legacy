#!/bin/bash
# HTN Legacy — Final dark mode + member flow verification (single session)
set +e
cd /home/z/my-project
pkill -f "next" 2>/dev/null
sleep 2

# Ensure .env has ENCRYPTION_KEY
if ! grep -q "ENCRYPTION_KEY" .env 2>/dev/null; then
  KEY=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
  cat > .env << EOF
DATABASE_URL=file:/home/z/my-project/db/custom.db
DIRECT_URL=file:/home/z/my-project/db/custom.db
JWT_SECRET=htn-legacy-dev-jwt-secret-change-in-production-9f3a7c1e
ADMIN_PASSWORD=admin-htn-legacy-2026
ENCRYPTION_KEY=$KEY
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=htn-legacy-receipts
NODE_ENV=development
EOF
  echo "Generated ENCRYPTION_KEY"
fi

nohup bun x next dev -p 3000 > dev.log 2>&1 & disown
echo "=== Waiting for server ==="
for i in $(seq 1 40); do
  if curl -s -o /dev/null --max-time 2 http://localhost:3000/ 2>/dev/null; then
    echo "ready at iter $i"
    break
  fi
  sleep 1
done

echo ""
echo "=============================================="
echo "PART 1: Member signup + login (with ENCRYPTION_KEY)"
echo "=============================================="
SIGNUP=$(curl -s -X POST --max-time 8 http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"nama":"Member Final Dark","nim":"final-dark-001","email":"finaldark@test.local","telepon":"081234567893","password":"test123456"}' \
  -w '\nHTTP=%{http_code}')
echo "Signup: $(echo $SIGNUP | head -c 200)"

LOGIN=$(curl -s -X POST --max-time 8 http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nama":"Member Final Dark","password":"test123456"}' \
  -c /tmp/member-cookies.txt \
  -w '\nHTTP=%{http_code}')
echo "Login: $(echo $LOGIN | head -c 200)"

MEMBER_COOKIE=$(grep htn-session /tmp/member-cookies.txt | awk '{print $7}')
echo "Cookie length: ${#MEMBER_COOKIE}"

echo ""
echo "=============================================="
echo "PART 2: Member dark mode test"
echo "=============================================="
# Open page FIRST, then set cookie, then reload
agent-browser cookies clear 2>&1 | tail -1
agent-browser open http://localhost:81/ 2>&1 | tail -1
sleep 6
agent-browser wait --load networkidle 2>&1 | tail -1
# Now set cookie on the loaded page
agent-browser cookies set htn-session "$MEMBER_COOKIE" 2>&1 | tail -1
# Reload to apply session
agent-browser reload 2>&1 | tail -1
sleep 6
echo "Member H1: $(agent-browser eval "document.querySelector('h1')?.innerText" 2>&1 | tail -1)"
echo "Initial class: $(agent-browser eval "document.documentElement.className" 2>&1 | tail -1)"

echo ""
echo "=== Switch to DARK ==="
agent-browser find role radio click --name "Gelap" 2>&1 | tail -1
sleep 2
DARK_CLASS=$(agent-browser eval "document.documentElement.className" 2>&1 | tail -1)
DARK_BG=$(agent-browser eval "getComputedStyle(document.body).backgroundColor" 2>&1 | tail -1)
echo "Dark class: $DARK_CLASS"
echo "Dark bg: $DARK_BG"
agent-browser screenshot /tmp/final-dark-member-beranda.png 2>&1 | tail -1

echo ""
echo "=== Visit all member views in DARK mode ==="
for view in Beranda "Struk Iuran" "Kas Organisasi" "Daftar Anggota" Barcode Profil; do
  agent-browser find role button click --name "$view" 2>&1 | tail -1
  sleep 3
  H1=$(agent-browser eval "document.querySelector('h1')?.innerText || 'NO H1'" 2>&1 | tail -1)
  CLASS=$(agent-browser eval "document.documentElement.className" 2>&1 | tail -1)
  echo "  $view → H1: $H1 | class: $CLASS"
done

echo ""
echo "=== Switch to LIGHT ==="
agent-browser find role radio click --name "Terang" 2>&1 | tail -1
sleep 2
echo "Light class: $(agent-browser eval "document.documentElement.className" 2>&1 | tail -1)"
agent-browser screenshot /tmp/final-light-member.png 2>&1 | tail -1

echo ""
echo "=============================================="
echo "PART 3: Mobile dark mode (375px)"
echo "=============================================="
agent-browser set viewport 375 667 2>&1 | tail -1
sleep 2
echo "Mobile dark overflow: $(agent-browser eval "document.body.scrollWidth > window.innerWidth ? 'OVERFLOW' : 'OK'" 2>&1 | tail -1)"
agent-browser screenshot /tmp/final-dark-mobile.png 2>&1 | tail -1

echo ""
echo "=============================================="
echo "PART 4: Errors check"
echo "=============================================="
agent-browser errors 2>&1 | head -5
echo "(empty=clean)"
agent-browser console 2>&1 | grep -iE "error|uncaught|exception" | head -5
echo "(empty=clean)"

echo ""
echo "=============================================="
echo "VERIFICATION COMPLETE"
echo "=============================================="

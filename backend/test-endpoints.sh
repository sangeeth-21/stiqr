#!/bin/bash
set -e

BASE="http://localhost:4000/api"
PASS=0
FAIL=0

test_endpoint() {
  local method=$1 url=$2 data=$3 token=$4 expected_status=$5 desc=$6
  
  local auth_header=""
  if [ -n "$token" ]; then
    auth_header="-H 'Authorization: Bearer $token'"
  fi
  
  local response
  if [ -n "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X $method "$url" \
      -H 'Content-Type: application/json' \
      $auth_header \
      -d "$data" 2>/dev/null)
  else
    response=$(curl -s -w "\n%{http_code}" -X $method "$url" \
      $auth_header 2>/dev/null)
  fi
  
  local body=$(echo "$response" | head -n -1)
  local status=$(echo "$response" | tail -n 1)
  
  if [ "$status" = "$expected_status" ]; then
    echo "  PASS $desc (HTTP $status)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL $desc (expected $expected_status, got $status)"
    echo "  Response: $body"
    FAIL=$((FAIL + 1))
  fi
}

echo "============================================"
echo "  STIQR BACKEND - MODULE 1 ENDPOINT TESTS"
echo "============================================"

echo ""
echo "--- 1. Health & Utility Endpoints ---"
test_endpoint GET "$BASE" "" "" 200 "GET / (root)"
test_endpoint GET "$BASE/health" "" "" 200 "GET /health"
test_endpoint GET "$BASE/health/database" "" "" 200 "GET /health/database"
test_endpoint GET "$BASE/health/redis" "" "" 200 "GET /health/redis"
test_endpoint GET "$BASE/health/metrics" "" "" 200 "GET /health/metrics"
test_endpoint GET "$BASE/health/version" "" "" 200 "GET /health/version"
test_endpoint GET "$BASE/health/status" "" "" 200 "GET /health/status"

echo ""
echo "--- 2. Auth: Register ---"
test_endpoint POST "$BASE/auth/register" '{"name":"Super Admin","email":"admin@stiqr.com","password":"Admin123!"}' "" 200 "Register super admin"

echo ""
echo "--- 3. Auth: Login ---"
LOGIN_RESP=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"email":"admin@stiqr.com","password":"Admin123!"}')
ADMIN_TOKEN=$(echo $LOGIN_RESP | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['accessToken'])" 2>/dev/null || echo "")
ADMIN_REFRESH=$(echo $LOGIN_RESP | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['refreshToken'])" 2>/dev/null || echo "")
if [ -n "$ADMIN_TOKEN" ]; then
  echo "  PASS Login successful, got token"
  PASS=$((PASS + 1))
else
  echo "  FAIL Login failed"
  echo "  Response: $LOGIN_RESP"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "--- 4. Auth: Get Profile ---"
test_endpoint GET "$BASE/auth/profile" "" "$ADMIN_TOKEN" 200 "GET /auth/profile"

echo ""
echo "--- 5. Auth: Refresh Token ---"
test_endpoint POST "$BASE/auth/refresh" "{\"refreshToken\":\"$ADMIN_REFRESH\"}" "" 200 "POST /auth/refresh"

echo ""
echo "--- 6. Auth: Forgot Password ---"
test_endpoint POST "$BASE/auth/forgot-password" '{"email":"admin@stiqr.com"}' "" 200 "POST /auth/forgot-password"

echo ""
echo "--- 7. Auth: Register Duplicate ---"
test_endpoint POST "$BASE/auth/register" '{"name":"Admin Dup","email":"admin@stiqr.com","password":"Admin123!"}' "" 409 "Register duplicate (should 409)"

echo ""
echo "--- 8. Auth: Login Wrong Password ---"
test_endpoint POST "$BASE/auth/login" '{"email":"admin@stiqr.com","password":"wrongpassword"}' "" 401 "Login wrong password (should 401)"

echo ""
echo "--- 9. Auth: Logout ---"
test_endpoint POST "$BASE/auth/logout" "" "$ADMIN_TOKEN" 200 "POST /auth/logout"

echo ""
echo "--- 10. Register Second User ---"
test_endpoint POST "$BASE/auth/register" '{"name":"John Doe","email":"john@example.com","password":"John123!"}' "" 200 "Register second user"

echo ""
echo "--- 11. Auth: Profile Without Token ---"
test_endpoint GET "$BASE/auth/profile" "" "" 401 "GET /auth/profile no token (should 401)"

echo ""
echo "============================================"
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "============================================"

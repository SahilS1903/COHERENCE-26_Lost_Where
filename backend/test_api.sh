#!/bin/bash

BASE_URL="http://localhost:4000/api"

echo "=== 1. Registering User ==="
REGISTER_RES=$(curl -s -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" -d '{"firstName":"API","lastName":"Test","email":"testapi3@example.com","password":"password123"}')
echo "$REGISTER_RES" | grep -o '"token":"[^"]*' | cut -d'"' -f4 > token.txt
if [ ! -s token.txt ]; then
  echo "Registration returned token? No. This might be because the user already exists. Let's try login."
fi

echo -e "\n=== 2. Logging In ==="
LOGIN_RES=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d '{"email":"testapi3@example.com","password":"password123"}')
TOKEN=$(echo "$LOGIN_RES" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "$LOGIN_RES"
echo "Extracted Token: $TOKEN"

echo -e "\n=== 3. Testing Dashboard Stats ==="
curl -s -X GET "$BASE_URL/dashboard" -H "Authorization: Bearer $TOKEN"

echo -e "\n\n=== 4. Creating a Workflow ==="
WF_RES=$(curl -s -X POST "$BASE_URL/workflows" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Curl Test Workflow"}')
echo "$WF_RES"
WF_ID=$(echo "$WF_RES" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

echo -e "\n\n=== 5. Fetching Workflows ==="
curl -s -X GET "$BASE_URL/workflows" -H "Authorization: Bearer $TOKEN"

echo -e "\n\n=== 6. Deleting the Workflow ==="
curl -s -X DELETE "$BASE_URL/workflows/$WF_ID" -H "Authorization: Bearer $TOKEN"


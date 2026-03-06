#!/bin/bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

curl -s -X PATCH http://localhost:4000/api/workflows/cmmf8h5l60002bl4zp91o90uc/activate \
  -H "Authorization: Bearer $TOKEN"

echo ""
echo "✅ Workflow activated! Watch your backend terminal for logs in ~30 seconds"

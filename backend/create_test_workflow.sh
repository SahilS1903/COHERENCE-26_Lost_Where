#!/bin/bash

# Script to create a complete test workflow with leads via API

BASE_URL="http://localhost:4000/api"

echo "🔐 Step 1: Login/Register User"
# Try to login first, if fails then register
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "   User doesn't exist, registering..."
  REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/auth/register \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "password123",
      "name": "Test User"
    }')
  TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi

echo "   ✅ Token: ${TOKEN:0:20}..."

echo ""
echo "📋 Step 2: Create Workflow"
WORKFLOW_RESPONSE=$(curl -s -X POST $BASE_URL/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Demo Sales Workflow",
    "description": "Automated outreach workflow with AI",
    "status": "ACTIVE"
  }')

WORKFLOW_ID=$(echo $WORKFLOW_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "   ✅ Workflow created: $WORKFLOW_ID"

echo ""
echo "🔵 Step 3: Create Nodes"

# Node 1: AI Generate
NODE1_RESPONSE=$(curl -s -X POST $BASE_URL/workflows/$WORKFLOW_ID/nodes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "AI_GENERATE",
    "label": "Generate Personalized Message",
    "positionX": 100,
    "positionY": 100,
    "config": {
      "goal": "Schedule a product demo",
      "product": "AI Sales Platform",
      "tone": "professional",
      "senderName": "Sarah Johnson",
      "senderEmail": "sarah@company.com",
      "senderTitle": "Sales Director",
      "companyName": "TechCorp",
      "additionalInstructions": "Focus on their specific industry pain points"
    }
  }')
NODE1_ID=$(echo $NODE1_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "   ✅ AI Generate Node: $NODE1_ID"

# Node 2: Send Message
NODE2_RESPONSE=$(curl -s -X POST $BASE_URL/workflows/$WORKFLOW_ID/nodes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "SEND_MESSAGE",
    "label": "Send Email",
    "positionX": 300,
    "positionY": 100,
    "config": {
      "channel": "email",
      "useAiMessage": true
    }
  }')
NODE2_ID=$(echo $NODE2_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "   ✅ Send Message Node: $NODE2_ID"

# Node 3: Wait
NODE3_RESPONSE=$(curl -s -X POST $BASE_URL/workflows/$WORKFLOW_ID/nodes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "WAIT",
    "label": "Wait 2 Days",
    "positionX": 500,
    "positionY": 100,
    "config": {
      "duration": 172800000
    }
  }')
NODE3_ID=$(echo $NODE3_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "   ✅ Wait Node: $NODE3_ID"

# Node 4: Check Reply
NODE4_RESPONSE=$(curl -s -X POST $BASE_URL/workflows/$WORKFLOW_ID/nodes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "CHECK_REPLY",
    "label": "Check for Reply",
    "positionX": 700,
    "positionY": 100,
    "config": {}
  }')
NODE4_ID=$(echo $NODE4_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "   ✅ Check Reply Node: $NODE4_ID"

# Node 5: End
NODE5_RESPONSE=$(curl -s -X POST $BASE_URL/workflows/$WORKFLOW_ID/nodes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "END",
    "label": "End Workflow",
    "positionX": 900,
    "positionY": 100,
    "config": {}
  }')
NODE5_ID=$(echo $NODE5_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "   ✅ End Node: $NODE5_ID"

echo ""
echo "🔗 Step 4: Create Edges"

# Edge 1: AI_GENERATE -> SEND_MESSAGE
curl -s -X POST $BASE_URL/workflows/$WORKFLOW_ID/edges \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"sourceNodeId\": \"$NODE1_ID\",
    \"targetNodeId\": \"$NODE2_ID\"
  }" > /dev/null
echo "   ✅ Edge: AI Generate → Send Message"

# Edge 2: SEND_MESSAGE -> WAIT
curl -s -X POST $BASE_URL/workflows/$WORKFLOW_ID/edges \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"sourceNodeId\": \"$NODE2_ID\",
    \"targetNodeId\": \"$NODE3_ID\"
  }" > /dev/null
echo "   ✅ Edge: Send Message → Wait"

# Edge 3: WAIT -> CHECK_REPLY
curl -s -X POST $BASE_URL/workflows/$WORKFLOW_ID/edges \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"sourceNodeId\": \"$NODE3_ID\",
    \"targetNodeId\": \"$NODE4_ID\"
  }" > /dev/null
echo "   ✅ Edge: Wait → Check Reply"

# Edge 4: CHECK_REPLY -> END (no reply)
curl -s -X POST $BASE_URL/workflows/$WORKFLOW_ID/edges \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"sourceNodeId\": \"$NODE4_ID\",
    \"targetNodeId\": \"$NODE5_ID\",
    \"label\": \"no_reply\"
  }" > /dev/null
echo "   ✅ Edge: Check Reply → End (no reply)"

echo ""
echo "👥 Step 5: Create Test CSV with Leads"
cat > /tmp/test_leads.csv << 'EOF'
email,firstName,lastName,company
john.doe@acme.com,John,Doe,Acme Corp
jane.smith@techco.com,Jane,Smith,TechCo Inc
bob.wilson@startup.io,Bob,Wilson,Startup.io
alice.brown@enterprise.com,Alice,Brown,Enterprise Ltd
charlie.davis@saascompany.com,Charlie,Davis,SaaS Company
EOF

echo "   ✅ Created /tmp/test_leads.csv with 5 leads"

echo ""
echo "📤 Step 6: Upload Leads"
UPLOAD_RESPONSE=$(curl -s -X POST $BASE_URL/workflows/$WORKFLOW_ID/leads/upload-file \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test_leads.csv")

IMPORTED_COUNT=$(echo $UPLOAD_RESPONSE | grep -o '"imported":[0-9]*' | grep -o '[0-9]*')
echo "   ✅ Uploaded $IMPORTED_COUNT leads"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ WORKFLOW SETUP COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Summary:"
echo "   Workflow ID: $WORKFLOW_ID"
echo "   Workflow Name: Demo Sales Workflow"
echo "   Nodes: 5 (AI Generate → Send → Wait → Check Reply → End)"
echo "   Leads: $IMPORTED_COUNT active leads"
echo ""
echo "🔍 Watch your backend terminal for logs!"
echo "   The workflow worker will pick up leads in ~30 seconds"
echo ""
echo "🌐 View in Prisma Studio: http://localhost:5555"
echo ""

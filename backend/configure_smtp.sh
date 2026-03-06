#!/bin/bash

# Script to configure SMTP settings for a user

BASE_URL="http://localhost:4000/api"

echo "🔧 SMTP Configuration Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Login
echo "📝 Step 1: Login"
read -p "Email: " USER_EMAIL
read -sp "Password: " USER_PASSWORD
echo ""

LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$USER_EMAIL\",
    \"password\": \"$USER_PASSWORD\"
  }")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Please check email/password."
  exit 1
fi

echo "✅ Logged in successfully"
echo ""

# Step 2: SMTP Configuration
echo "📧 Step 2: Configure SMTP"
echo ""
echo "Choose provider:"
echo "  1) Gmail"
echo "  2) Outlook"
echo "  3) Custom SMTP"
read -p "Choice (1-3): " PROVIDER_CHOICE

case $PROVIDER_CHOICE in
  1)
    SMTP_HOST="smtp.gmail.com"
    SMTP_PORT=587
    SMTP_SECURE="false"
    echo ""
    echo "📌 Gmail Setup:"
    echo "   1. Go to: https://myaccount.google.com/apppasswords"
    echo "   2. Generate an App Password"
    echo "   3. Copy the 16-character password (remove spaces)"
    echo ""
    read -p "Gmail Address: " SMTP_USER
    read -sp "App Password: " SMTP_PASSWORD
    echo ""
    ;;
  2)
    SMTP_HOST="smtp-mail.outlook.com"
    SMTP_PORT=587
    SMTP_SECURE="false"
    read -p "Outlook Email: " SMTP_USER
    read -sp "Outlook Password: " SMTP_PASSWORD
    echo ""
    ;;
  3)
    read -p "SMTP Host: " SMTP_HOST
    read -p "SMTP Port (587): " SMTP_PORT
    SMTP_PORT=${SMTP_PORT:-587}
    read -p "Use TLS (true/false, default false): " SMTP_SECURE
    SMTP_SECURE=${SMTP_SECURE:-false}
    read -p "SMTP User/Email: " SMTP_USER
    read -sp "SMTP Password: " SMTP_PASSWORD
    echo ""
    ;;
  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac

read -p "Display Name (for emails): " SMTP_FROM_NAME

# Step 3: Update Configuration
echo ""
echo "📤 Step 3: Saving configuration..."

UPDATE_RESPONSE=$(curl -s -X PUT $BASE_URL/user/smtp-config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"smtpHost\": \"$SMTP_HOST\",
    \"smtpPort\": $SMTP_PORT,
    \"smtpSecure\": $SMTP_SECURE,
    \"smtpUser\": \"$SMTP_USER\",
    \"smtpPassword\": \"$SMTP_PASSWORD\",
    \"smtpFromName\": \"$SMTP_FROM_NAME\"
  }")

SUCCESS=$(echo $UPDATE_RESPONSE | grep -o '"message":"[^"]*' | cut -d'"' -f4)

if [ -z "$SUCCESS" ]; then
  echo "❌ Configuration failed:"
  echo "$UPDATE_RESPONSE"
  exit 1
fi

echo "✅ SMTP configuration saved!"
echo ""

# Step 4: Send Test Email
echo "📧 Step 4: Send test email?"
read -p "Send test email to $USER_EMAIL? (y/n): " SEND_TEST

if [ "$SEND_TEST" = "y" ] || [ "$SEND_TEST" = "Y" ]; then
  echo "📤 Sending test email..."
  
  TEST_RESPONSE=$(curl -s -X POST $BASE_URL/user/smtp-config/test \
    -H "Authorization: Bearer $TOKEN")
  
  TEST_SUCCESS=$(echo $TEST_RESPONSE | grep -o '"success":true')
  
  if [ -n "$TEST_SUCCESS" ]; then
    echo "✅ Test email sent! Check your inbox at $USER_EMAIL"
  else
    echo "❌ Test email failed:"
    echo "$TEST_RESPONSE"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SMTP Configuration Complete!"
echo ""
echo "📊 Your Settings:"
echo "   SMTP Host: $SMTP_HOST"
echo "   SMTP Port: $SMTP_PORT"
echo "   SMTP User: $SMTP_USER"
echo "   From Name: $SMTP_FROM_NAME"
echo ""
echo "🚀 You can now send emails through workflows!"
echo "   Emails will be sent from: $SMTP_USER"
echo ""

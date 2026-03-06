# Email Setup Guide - Multi-User SMTP Configuration

**🎯 New Approach**: Each user configures their own email credentials. Emails are sent from the user's account (not a central account).

## ✅ What's Integrated

- **Per-User SMTP Config** - Each sales person uses their own email
- **Database Storage** - SMTP credentials stored in User table
- **API Endpoints** - Configure and test email settings
- **Real Email Sending** - Nodemailer with user's SMTP credentials

---

## 🚀 Quick Setup (Interactive Script)

The easiest way to configure SMTP:

```bash
cd backend
chmod +x configure_smtp.sh
./configure_smtp.sh
```

Follow the prompts to:
1. Login with your account
2. Choose provider (Gmail/Outlook/Custom)
3. Enter credentials
4. Test email sending

---

## 📧 Manual Setup via API

### Step 1: Get Your SMTP Credentials

#### Option A: Gmail
1. Enable 2FA: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Copy the 16-character password (remove spaces)

#### Option B: Outlook
- Use your regular Outlook password (no app password needed)

### Step 2: Configure SMTP via API

```bash
# Login first
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'

# Save the token from response
TOKEN="your-jwt-token"

# Configure SMTP
curl -X PUT http://localhost:4000/api/user/smtp-config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 587,
    "smtpSecure": false,
    "smtpUser": "your-email@gmail.com",
    "smtpPassword": "your-app-password",
    "smtpFromName": "Your Name"
  }'
```

### Step 3: Test Configuration

```bash
curl -X POST http://localhost:4000/api/user/smtp-config/test \
  -H "Authorization: Bearer $TOKEN"
```

You should receive a test email at your configured email address!

---

## 📡 API Endpoints

### GET /api/user/smtp-config
Get current user's SMTP configuration (password excluded)

```bash
curl http://localhost:4000/api/user/smtp-config \
  -H "Authorization: Bearer $TOKEN"
```

### PUT /api/user/smtp-config
Update SMTP configuration

### DELETE /api/user/smtp-config
Remove SMTP configuration

### POST /api/user/smtp-config/test
Send test email to verify configuration

---

## 🧪 Testing with Real Emails

Once configured, provide me with 2-3 test email addresses and I'll create test leads:

```
test1@gmail.com
test2@yahoo.com
your-personal@email.com
```

The workflow will send AI-generated emails FROM your configured SMTP account TO these test recipients!

---

## ⚙️ How It Works

1. **User configures SMTP** via API or frontend UI
2. **Workflow runs** and needs to send an email
3. **Outbox worker** fetches the workflow owner's SMTP settings from database
4. **Email sent** using that user's credentials via Nodemailer
5. **Recipient receives** email from the sales person's actual email address

## 🔐 Security Notes

### Current Implementation
- Passwords stored **plain text** in database (development only!)

### Production TODO:
1. **Encrypt passwords**: Use `bcrypt` or `crypto` to encrypt smtpPassword
2. **Use environment variables** for encryption key
3. **Add password update endpoint** (require old password confirmation)
4. **Implement OAuth2** for Gmail (more secure than app passwords)
5. **Rate limiting** on SMTP config updates

---

## 📊 Sending Limits (Per User)

### Gmail Free
- 100 emails/day per account
- Each sales person = separate 100/day limit

### Gmail Workspace
- 500 emails/day per account

### Outlook
- 300 emails/day per account

### Multi-User Benefits
- **Scalable**: 10 users = 1,000 emails/day (Gmail free)
- **Authentic**: Emails from real sales people (better deliverability)
- **Distributed**: No single point of failure

---

## 🎯 Next Steps

1. **Configure your SMTP** - Run `./configure_smtp.sh` or use API
2. **Test it** - Send test email to yourself
3. **Provide test emails** - Give me 2-3 emails to send test campaigns to
4. **See real emails** - Check how AI-generated messages look!

---

## ❓ Troubleshooting

### "User has not configured email settings"
- Run `./configure_smtp.sh` to set up SMTP
- Or use PUT /api/user/smtp-config endpoint

### "Authentication failed"
- Gmail: Make sure you used App Password (not account password)
- Outlook: Check password is correct
- Verify smtpUser is correct email address

### Emails go to spam
- Use a professional domain (not personal Gmail)
- Set up SPF/DKIM records
- Warm up your sending (start with low volume)

### "SMTP connection failed"
- Check internet connection
- Verify SMTP host and port
- Gmail: Ensure 2FA is enabled

---

## 🔮 Future Enhancements

1. **Frontend UI** - Add SMTP config page in settings
2. **OAuth2 Integration** - More secure than app passwords
3. **Email Templates** - Reusable email designs
4. **Sending Analytics** - Track opens, clicks, replies per user
5. **Team Management** - Admin can see all users' email configs
6. **Backup SMTP** - Fallback if user's SMTP fails

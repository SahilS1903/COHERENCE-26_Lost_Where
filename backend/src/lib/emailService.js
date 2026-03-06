const nodemailer = require('nodemailer');

/**
 * Email Service using Nodemailer
 * Supports per-user SMTP configuration
 */

/**
 * Create a transporter with specific SMTP credentials
 * @param {Object} smtpConfig - SMTP configuration
 * @param {string} smtpConfig.host - SMTP host
 * @param {number} smtpConfig.port - SMTP port
 * @param {boolean} smtpConfig.secure - Use TLS
 * @param {string} smtpConfig.user - SMTP username/email
 * @param {string} smtpConfig.password - SMTP password
 * @returns {Object} - Nodemailer transporter
 */
function createTransporter(smtpConfig) {
  if (!smtpConfig || !smtpConfig.user || !smtpConfig.password) {
    throw new Error('SMTP configuration missing. User must configure email settings.');
  }

  return nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port || 587,
    secure: smtpConfig.secure || false,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.password,
    },
  });
}

/**
 * Send an email using user's SMTP credentials
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body (optional)
 * @param {Object} options.smtpConfig - User's SMTP configuration
 * @param {string} options.smtpConfig.host - SMTP host
 * @param {number} options.smtpConfig.port - SMTP port
 * @param {boolean} options.smtpConfig.secure - Use TLS
 * @param {string} options.smtpConfig.user - SMTP user
 * @param {string} options.smtpConfig.password - SMTP password
 * @param {string} options.smtpConfig.fromName - Display name
 * @returns {Promise<Object>} - Send result
 */
async function sendEmail({ to, subject, text, html, smtpConfig }) {
  if (!smtpConfig) {
    throw new Error('SMTP configuration required. Please configure your email settings.');
  }

  const transporter = createTransporter(smtpConfig);

  const mailOptions = {
    from: `"${smtpConfig.fromName || 'Sales Team'}" <${smtpConfig.user}>`,
    to,
    subject,
    text,
    html: html || text,
  };

  console.log(`[Email Service] 📤 Sending email via ${smtpConfig.user}`);
  console.log(`[Email Service] 📧 To: ${to}`);
  console.log(`[Email Service] 📧 Subject: ${subject}`);

  const info = await transporter.sendMail(mailOptions);

  console.log(`[Email Service] ✅ Email sent: ${info.messageId}`);
  return info;
}

/**
 * Send an SMS (placeholder - not implemented with Nodemailer)
 * You would need Twilio or similar for SMS
 */
async function sendSMS({ to, body }) {
  throw new Error('SMS sending not implemented. Please use Twilio or similar service.');
}

module.exports = {
  sendEmail,
  sendSMS,
  createTransporter,
};

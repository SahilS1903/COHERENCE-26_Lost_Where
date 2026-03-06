const prisma = require('../lib/prisma');
const { z } = require('zod');

/**
 * SMTP Configuration Schema
 */
const smtpConfigSchema = z.object({
  smtpHost: z.string().min(1, 'SMTP host is required'),
  smtpPort: z.number().int().positive().default(587),
  smtpSecure: z.boolean().default(false),
  smtpUser: z.string().email('Must be a valid email'),
  smtpPassword: z.string().min(1, 'SMTP password is required'),
  smtpFromName: z.string().optional(),
});

/**
 * GET /api/user/smtp-config
 * Get current user's SMTP configuration
 */
async function getSmtpConfig(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      smtpHost: true,
      smtpPort: true,
      smtpSecure: true,
      smtpUser: true,
      smtpFromName: true,
      // NOTE: We don't return smtpPassword for security
    },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check if SMTP is configured
  const isConfigured = !!(user.smtpUser);

  res.json({
    configured: isConfigured,
    config: user,
  });
}

/**
 * PUT /api/user/smtp-config
 * Update user's SMTP configuration
 */
async function updateSmtpConfig(req, res) {
  try {
    const config = smtpConfigSchema.parse(req.body);

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpSecure: config.smtpSecure,
        smtpUser: config.smtpUser,
        smtpPassword: config.smtpPassword, // TODO: Encrypt in production!
        smtpFromName: config.smtpFromName,
      },
      select: {
        id: true,
        email: true,
        name: true,
        smtpHost: true,
        smtpPort: true,
        smtpSecure: true,
        smtpUser: true,
        smtpFromName: true,
      },
    });

    console.log(`[User Settings] ✅ SMTP configured for ${updated.email} (sending from ${config.smtpUser})`);

    res.json({
      message: 'SMTP configuration updated successfully',
      user: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('[updateSmtpConfig] Error:', error);
    res.status(500).json({ error: 'Failed to update SMTP configuration' });
  }
}

/**
 * DELETE /api/user/smtp-config
 * Remove user's SMTP configuration
 */
async function deleteSmtpConfig(req, res) {
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      smtpHost: null,
      smtpPort: null,
      smtpSecure: null,
      smtpUser: null,
      smtpPassword: null,
      smtpFromName: null,
    },
  });

  console.log(`[User Settings] 🗑️  SMTP configuration removed for user ${req.user.email}`);

  res.json({ message: 'SMTP configuration removed successfully' });
}

/**
 * POST /api/user/smtp-config/test
 * Test SMTP configuration by sending a test email
 * Body (optional): { to: "recipient@example.com" }
 */
async function testSmtpConfig(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user.smtpUser || !user.smtpPassword) {
      return res.status(400).json({ error: 'SMTP not configured. Please configure your email settings first.' });
    }

    const { sendEmail } = require('../lib/emailService');

    const smtpConfig = {
      host: user.smtpHost,
      port: user.smtpPort,
      secure: user.smtpSecure,
      user: user.smtpUser,
      password: user.smtpPassword,
      fromName: user.smtpFromName || user.name,
    };

    // Use custom recipient if provided, otherwise send to user's own email
    const recipient = req.body.to || user.email;

    // Send test email
    await sendEmail({
      to: recipient,
      subject: 'Test Email from Lost_Where',
      text: `Hello,\n\nThis is a test email to verify your SMTP configuration.\n\nIf you received this email, your email settings are working correctly!\n\nBest regards,\nLost_Where Team`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px;">
          <h2>Hello,</h2>
          <p>This is a test email to verify your SMTP configuration.</p>
          <p style="background: #f0f9ff; padding: 15px; border-radius: 5px; border-left: 4px solid #0284c7;">
            <strong>✅ Success!</strong> If you received this email, your email settings are working correctly!
          </p>
          <p>Best regards,<br><strong>Lost_Where Team</strong></p>
        </div>
      `,
      smtpConfig,
    });

    console.log(`[User Settings] ✅ Test email sent successfully to ${recipient}`);

    res.json({
      success: true,
      message: `Test email sent successfully to ${recipient}. Please check the inbox.`,
    });
  } catch (error) {
    console.error('[testSmtpConfig] Error:', error);
    res.status(500).json({
      error: 'Failed to send test email',
      details: error.message,
    });
  }
}

module.exports = {
  getSmtpConfig,
  updateSmtpConfig,
  deleteSmtpConfig,
  testSmtpConfig,
};

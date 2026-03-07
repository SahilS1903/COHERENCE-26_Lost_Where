const prisma = require('../lib/prisma');
const { fetchUnreadEmails, markAsRead } = require('../lib/imapService');

let intervalId = null;
const POLL_INTERVAL_MS = 60000; // Check every 60 seconds

/**
 * Start the IMAP reply checker worker
 */
function start() {
  console.log('[🔍 imapWorker] Starting IMAP reply checker...');
  console.log(`[⚙️  Settings] Polling interval: ${POLL_INTERVAL_MS / 1000}s`);

  // Run immediately on start
  checkForReplies().catch((err) => {
    console.error('[❌ imapWorker] Error on initial check:', err);
  });

  // Then run on interval
  intervalId = setInterval(() => {
    checkForReplies().catch((err) => {
      console.error('[❌ imapWorker] Error checking replies:', err);
    });
  }, POLL_INTERVAL_MS);

  console.log('[✅ imapWorker] Worker started successfully');
  return { stop };
}

/**
 * Stop the IMAP worker
 */
function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[🛑 imapWorker] Worker stopped');
  }
}

/**
 * Check for email replies from all active users
 */
async function checkForReplies() {
  try {
    const users = await prisma.user.findMany({
      where: {
        smtpUser: { not: null },
        smtpPassword: { not: null },
      },
      select: {
        id: true,
        email: true,
        smtpUser: true,
        smtpPassword: true,
        smtpHost: true,
      },
    });

    for (const user of users) {
      try {
        await checkUserReplies(user);
      } catch (error) {
        console.error(`[IMAP] Error checking replies for ${user.email}:`, error.message);
      }
    }
  } catch (error) {
    console.error('[IMAP] Fatal error:', error);
  }
}

/**
 * Check replies for a specific user
 * @param {Object} user - User with SMTP credentials
 */
async function checkUserReplies(user) {

  // For Gmail, IMAP host is imap.gmail.com (derive from SMTP host)
  const imapHost = user.smtpHost?.replace('smtp.', 'imap.') || 'imap.gmail.com';

  const imapConfig = {
    user: user.smtpUser,
    password: user.smtpPassword,
    host: imapHost,
    port: 993,
    tls: true,
  };

  const emails = await fetchUnreadEmails(imapConfig);
  if (emails.length === 0) return;

  const leads = await prisma.lead.findMany({
    where: {
      workflow: { userId: user.id },
      repliedAt: null,
      status: 'ACTIVE',
    },
    include: {
      outbox: {
        where: { status: 'SENT' },
        orderBy: { sentAt: 'desc' },
        take: 1,
      },
    },
  });

  for (const email of emails) {
    try {
      await processReplyEmail(email, leads, imapConfig);
    } catch (error) {
      console.error(`  [❌ Error] Failed to process email ${email.messageId}:`, error.message);
    }
  }
}

/**
 * Process a single reply email and match it to a lead
 * @param {Object} email - Parsed email object
 * @param {Array} leads - Array of leads awaiting replies
 * @param {Object} imapConfig - IMAP configuration for marking as read
 */
async function processReplyEmail(email, leads, imapConfig) {
  // Extract sender email address
  const fromEmail = email.from.match(/<([^>]+)>/)?.[1] || email.from.trim();

  const matchingLead = leads.find(lead => lead.email.toLowerCase() === fromEmail.toLowerCase());
  if (!matchingLead) return;

  // Additional verification: Check if this email is replying to one we sent
  const sentEmail = matchingLead.outbox[0];
  if (sentEmail && sentEmail.messageId) {
    const isReplyToOurs =
      email.inReplyTo === sentEmail.messageId ||
      (email.references && email.references.includes(sentEmail.messageId));
    if (!isReplyToOurs) return;
  }

  // Update lead with reply information
  await prisma.lead.update({
    where: { id: matchingLead.id },
    data: {
      repliedAt: email.date || new Date(),
      replySubject: email.subject,
      replyBody: email.text || email.html,
      updatedAt: new Date(),
    },
  });

  console.log(`[IMAP] Reply from ${matchingLead.firstName} ${matchingLead.lastName} <${fromEmail}>: "${email.subject}"`);

  await markAsRead(imapConfig, email.uid);
}

module.exports = {
  start,
  stop,
  checkForReplies,
};

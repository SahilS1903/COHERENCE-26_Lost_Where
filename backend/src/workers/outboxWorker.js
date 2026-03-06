const { Worker } = require('bullmq');
const { connection, outboxQueue } = require('../lib/redis');
const prisma = require('../lib/prisma');
const { sendEmail, sendSMS } = require('../lib/emailService');

const RATE_LIMIT_PER_HOUR = parseInt(process.env.RATE_LIMIT_PER_HOUR || '50', 10);
const RATE_LIMIT_WINDOW_S = 3600; // 1 hour in seconds
const JITTER_MAX_MS = parseInt(process.env.OUTBOX_JITTER_MAX_MS || '30000', 10);
const POLL_INTERVAL_MS = parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '5000', 10);

/**
 * Get the Redis rate-limit key for a given account (workflowId)
 * @param {string} workflowId
 */
function rateLimitKey(workflowId) {
  return `rate_limit:outbox:${workflowId}`;
}

/**
 * Check and increment the per-account hourly rate limit using Redis INCR + EXPIRE.
 * Returns true if the message is allowed to send, false if the limit is exceeded.
 * @param {object} redisClient - ioredis connection
 * @param {string} workflowId
 */
async function checkRateLimit(redisClient, workflowId) {
  const key = rateLimitKey(workflowId);
  const current = await redisClient.incr(key);

  if (current === 1) {
    // First use this window — set TTL
    await redisClient.expire(key, RATE_LIMIT_WINDOW_S);
  }

  if (current > RATE_LIMIT_PER_HOUR) {
    // Over limit — decrement back
    await redisClient.decr(key);
    return false;
  }

  return true;
}

/**
 * Send a message via email or SMS
 * Fetches the workflow owner's SMTP configuration
 * @param {object} item - OutboxQueue record
 */
async function sendMessage(item) {
  const { channel, recipient, subject, body, lead } = item;

  // Get the workflow owner's SMTP configuration
  const workflow = await prisma.workflow.findUnique({
    where: { id: lead.workflowId },
    include: { user: true },
  });

  if (!workflow || !workflow.user) {
    throw new Error(`Workflow or user not found for lead ${lead.id}`);
  }

  const user = workflow.user;

  // Check if user has configured SMTP
  if (!user.smtpUser || !user.smtpPassword) {
    throw new Error(`User ${user.email} has not configured email settings. Please configure SMTP credentials.`);
  }

  // Prepare SMTP configuration from user's settings
  const smtpConfig = {
    host: user.smtpHost || 'smtp.gmail.com',
    port: user.smtpPort || 587,
    secure: user.smtpSecure || false,
    user: user.smtpUser,
    password: user.smtpPassword,
    fromName: user.smtpFromName || user.name,
  };

  if (channel === 'email') {
    // Send email using user's SMTP credentials
    const result = await sendEmail({
      to: recipient,
      subject: subject || 'Message from Sales Team',
      text: body,
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">${body.replace(/\n/g, '<br>')}</div>`,
      smtpConfig,
    });
    
    console.log(`[outboxWorker] ✅ SENT email from ${user.smtpUser} → ${recipient}: "${subject}"`);
    return result;
    
  } else if (channel === 'sms') {
    // Send SMS (requires Twilio or similar)
    const result = await sendSMS({
      to: recipient,
      body: body,
    });
    
    console.log(`[outboxWorker] ✅ SENT SMS → ${recipient}`);
    return result;
    
  } else {
    throw new Error(`Unsupported channel: ${channel}`);
  }
}

/**
 * Process a single outbox item with jitter delay.
 * @param {object} redisClient
 * @param {object} item - OutboxQueue record with lead relation
 */
async function processItem(redisClient, item) {
  const workflowId = item.lead.workflowId;

  // Check rate limit
  const allowed = await checkRateLimit(redisClient, workflowId);
  if (!allowed) {
    // Reschedule for 1 hour from now
    const rescheduleAt = new Date(Date.now() + RATE_LIMIT_WINDOW_S * 1000);
    await prisma.outboxQueue.update({
      where: { id: item.id },
      data: { status: 'SCHEDULED', scheduledAt: rescheduleAt },
    });
    console.log(`[outboxWorker] Rate limit exceeded for workflow ${workflowId}, rescheduled`);
    return;
  }

  // Apply random jitter delay
  const jitterMs = Math.floor(Math.random() * JITTER_MAX_MS);
  await new Promise((resolve) => setTimeout(resolve, jitterMs));

  // Mark as in-flight (attempt_count++)
  await prisma.outboxQueue.update({
    where: { id: item.id },
    data: { attemptCount: { increment: 1 } },
  });

  try {
    await sendMessage(item);

    await prisma.outboxQueue.update({
      where: { id: item.id },
      data: { status: 'SENT', sentAt: new Date(), errorMessage: null },
    });
  } catch (err) {
    console.error(`[outboxWorker] Send failed for item ${item.id}:`, err.message);

    const MAX_ATTEMPTS = 5;
    const newAttemptCount = item.attemptCount + 1;

    if (newAttemptCount >= MAX_ATTEMPTS) {
      await prisma.outboxQueue.update({
        where: { id: item.id },
        data: { status: 'FAILED', errorMessage: err.message },
      });
      console.log(`[outboxWorker] Item ${item.id} permanently failed after ${MAX_ATTEMPTS} attempts`);
    } else {
      // Exponential backoff reschedule
      const backoffMs = Math.pow(2, newAttemptCount) * 60_000; // 2^n minutes
      const rescheduleAt = new Date(Date.now() + backoffMs);
      await prisma.outboxQueue.update({
        where: { id: item.id },
        data: { status: 'SCHEDULED', scheduledAt: rescheduleAt, errorMessage: err.message },
      });
      console.log(`[outboxWorker] Item ${item.id} rescheduled in ${backoffMs / 1000}s`);
    }
  }
}

/**
 * Outbox Worker
 * Polls the outbox_queue table for PENDING/SCHEDULED items that are ready to send.
 */
function startOutboxWorker() {
  const redis = require('../lib/redis').connection;

  // Worker that processes individual outbox delivery jobs
  const worker = new Worker(
    'outbox-delivery',
    async (job) => {
      const { outboxItemId } = job.data;
      const item = await prisma.outboxQueue.findUnique({
        where: { id: outboxItemId },
        include: { lead: { select: { workflowId: true } } },
      });

      if (!item) {
        console.warn(`[outboxWorker] Item ${outboxItemId} not found`);
        return;
      }

      if (item.status === 'SENT' || item.status === 'FAILED') {
        return; // Already handled
      }

      await processItem(redis, item);
    },
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[outboxWorker] BullMQ job ${job?.id} failed:`, err.message);
  });

  // Poller: periodically pick up pending + due-scheduled items and enqueue them
  setInterval(async () => {
    try {
      const items = await prisma.outboxQueue.findMany({
        where: {
          status: { in: ['PENDING', 'SCHEDULED'] },
          scheduledAt: { lte: new Date() },
        },
        select: { id: true },
        take: 100,
      });

      if (!items.length) return;

      const jobs = items.map((item) => ({
        name: 'send-outbox',
        data: { outboxItemId: item.id },
        opts: {
          jobId: `outbox-${item.id}`,
          attempts: 1, // retry logic is handled inside processItem
        },
      }));

      await outboxQueue.addBulk(jobs);
      console.log(`[outboxWorker] Enqueued ${items.length} outbox items`);
    } catch (err) {
      console.error('[outboxWorker] Poller error:', err.message);
    }
  }, POLL_INTERVAL_MS);

  console.log('[outboxWorker] Started');
  return worker;
}

module.exports = { startOutboxWorker };

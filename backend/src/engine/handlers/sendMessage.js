const prisma = require('../../lib/prisma');

/**
 * SEND_MESSAGE handler
 * On the first pass: inserts a record into the outbox_queue table and returns
 * { advanced: false } so the lead stays at this node.
 * On subsequent passes: checks whether the outbox entry has been delivered (SENT).
 * Only returns { advanced: true } once the email is confirmed sent.
 * This prevents leads from advancing through CHECK_REPLY / END before the
 * email actually leaves the outbox (e.g. when rate-limited).
 * Node config shape: { channel?, subject?, body?, scheduledDelayMs? }
 */
async function handle(lead, node, _edges, lastTransitionedAt) {
  // Look for an outbox entry created since the lead entered this node
  const enteredAt = lastTransitionedAt ? new Date(lastTransitionedAt) : new Date(0);

  const existingEntry = await prisma.outboxQueue.findFirst({
    where: {
      leadId: lead.id,
      createdAt: { gte: enteredAt },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Email has been delivered — advance the lead
  if (existingEntry?.status === 'SENT') {
    return { advanced: true };
  }

  // Email is queued / rate-limited / rescheduled — keep waiting
  if (existingEntry && (existingEntry.status === 'PENDING' || existingEntry.status === 'SCHEDULED')) {
    return { advanced: false, reason: 'awaiting_send' };
  }

  // No entry yet (first visit, or previous attempt permanently failed) — create one
  const config = node.config || {};
  const customFields = lead.customFields || {};
  const aiMessage = customFields.aiMessage || {};

  const channel = config.channel || 'email';
  const recipient = lead.email;
  const subject = aiMessage.subject || config.subject || 'Hello from our team';
  const body = aiMessage.body || config.body || `Hi ${lead.firstName}, we'd love to connect.`;
  const attachments = Array.isArray(config.attachments) ? config.attachments : [];

  const scheduledAt = config.scheduledDelayMs
    ? new Date(Date.now() + config.scheduledDelayMs)
    : new Date();

  const outboxEntry = await prisma.outboxQueue.create({
    data: { leadId: lead.id, channel, recipient, subject, body, attachments, status: 'PENDING', scheduledAt },
  });

  console.log(`[SEND] Queued "${subject}" → ${recipient} (outbox: ${outboxEntry.id})`);
  return { advanced: false, reason: 'awaiting_send' };
}

module.exports = { handle };

const prisma = require('../../lib/prisma');

/**
 * SEND_MESSAGE handler
 * Inserts a record into the outbox_queue table.
 * Never sends directly — the outbox worker handles delivery.
 * Node config shape: { channel?, subject?, body?, scheduledDelayMs? }
 */
async function handle(lead, node, _edges) {
  const config = node.config || {};
  const customFields = lead.customFields || {};
  const aiMessage = customFields.aiMessage || {};

  const channel = config.channel || 'email';
  const recipient = lead.email;
  const subject = aiMessage.subject || config.subject || 'Hello from our team';
  const body = aiMessage.body || config.body || `Hi ${lead.firstName}, we'd love to connect.`;

  const scheduledAt = config.scheduledDelayMs
    ? new Date(Date.now() + config.scheduledDelayMs)
    : new Date();

  const outboxEntry = await prisma.outboxQueue.create({
    data: { leadId: lead.id, channel, recipient, subject, body, status: 'PENDING', scheduledAt },
  });

  console.log(`[SEND] Queued "${subject}" → ${recipient} (outbox: ${outboxEntry.id})`);
  return { advanced: true };
}

module.exports = { handle };

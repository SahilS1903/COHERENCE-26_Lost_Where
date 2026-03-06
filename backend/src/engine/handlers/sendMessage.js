const prisma = require('../../lib/prisma');

/**
 * SEND_MESSAGE handler
 * Inserts a record into the outbox_queue table.
 * Never sends directly — the outbox worker handles delivery.
 * Node config shape: { channel?, subject?, body?, scheduledDelayMs? }
 */
async function handle(lead, node, _edges) {
  console.log(`  [📨 SEND MESSAGE] Preparing for ${lead.email}`);
  
  const config = node.config || {};
  const customFields = lead.customFields || {};
  const aiMessage = customFields.aiMessage || {};

  const channel = config.channel || 'email';
  const recipient = lead.email;

  // Use AI-generated content if available, fall back to node config
  const subject = aiMessage.subject || config.subject || 'Hello from our team';
  const body = aiMessage.body || config.body || `Hi ${lead.firstName}, we'd love to connect.`;
  
  const usingAI = !!aiMessage.subject;
  console.log(`  [📬 Content Source] ${usingAI ? '🤖 AI-Generated' : '📝 Static Template'}`);
  console.log(`  [📧 Subject] ${subject}`);
  console.log(`  [🖋️  Channel] ${channel.toUpperCase()}`);
  console.log(`  [🎯 Recipient] ${recipient}`);

  // Optional scheduled delay from node config (send in the future)
  const scheduledAt = config.scheduledDelayMs
    ? new Date(Date.now() + config.scheduledDelayMs)
    : new Date();
    
  if (config.scheduledDelayMs) {
    console.log(`  [⏰ Scheduled] Will send in ${config.scheduledDelayMs}ms`);
  }

  const outboxEntry = await prisma.outboxQueue.create({
    data: {
      leadId: lead.id,
      channel,
      recipient,
      subject,
      body,
      status: 'PENDING',
      scheduledAt,
    },
  });

  console.log(`  [✅ QUEUED] Outbox entry created (ID: ${outboxEntry.id})`);
  console.log(`  [📬 Outbox Worker] Will process this message shortly`);
  return { advanced: true };
}

module.exports = { handle };

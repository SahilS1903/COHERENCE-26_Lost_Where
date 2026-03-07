require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const emailService = require('./src/lib/emailService');
const p = new PrismaClient();

async function run() {
  const item = await p.outboxQueue.findFirst({
    where: {
      status: 'PENDING',
      lead: { email: 'rutvijacharya123@gmail.com', workflow: { name: 'OutreachPipeline' } },
    },
    include: { lead: { include: { workflow: { include: { user: true } } } } },
  });

  if (!item) {
    console.log('No pending outbox item found');
    await p.$disconnect();
    return;
  }

  console.log('Sending:', item.subject, '→', item.recipient);
  const user = item.lead.workflow.user;

  const result = await emailService.sendEmail(
    {
      from: user.smtpUser,
      host: user.smtpHost,
      port: user.smtpPort || 587,
      username: user.smtpUser,
      password: user.smtpPassword,
    },
    { to: item.recipient, subject: item.subject, body: item.body }
  );

  await p.outboxQueue.update({
    where: { id: item.id },
    data: { status: 'SENT', sentAt: new Date(), messageId: result.messageId },
  });

  console.log('✅ Follow-up sent! Message-ID:', result.messageId);
  await p.$disconnect();
}

run().catch(async (e) => {
  console.error('Error:', e.message);
  await p.$disconnect();
  process.exit(1);
});

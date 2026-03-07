require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get the reply body from whichever lead already has it
  const replySource = await prisma.lead.findFirst({
    where: { email: 'rutvijacharya123@gmail.com', repliedAt: { not: null } },
    select: { repliedAt: true, replySubject: true, replyBody: true },
  });

  if (!replySource) {
    console.log('❌ No reply found in DB for rutvijacharya123@gmail.com');
    await prisma.$disconnect();
    return;
  }

  console.log('✅ Reply found:');
  console.log('   Subject:', replySource.replySubject);
  console.log('   Preview:', (replySource.replyBody || '').slice(0, 80));

  // Get the OutreachPipeline lead
  const lead = await prisma.lead.findFirst({
    where: {
      email: 'rutvijacharya123@gmail.com',
      workflow: { name: 'OutreachPipeline' },
    },
    include: {
      workflow: { include: { nodes: { where: { type: 'CHECK_REPLY' } } } },
    },
  });

  if (!lead) {
    console.log('❌ Lead not found in OutreachPipeline');
    await prisma.$disconnect();
    return;
  }

  const checkReplyNode = lead.workflow.nodes[0];
  if (!checkReplyNode) {
    console.log('❌ CHECK_REPLY node not found');
    await prisma.$disconnect();
    return;
  }

  console.log('\n🔄 Resetting lead to CHECK_REPLY with reply data...');
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: 'ACTIVE',
      currentNodeId: checkReplyNode.id,
      repliedAt: replySource.repliedAt,
      replySubject: replySource.replySubject,
      replyBody: replySource.replyBody,
      retryCount: 0,
    },
  });

  // Add history entry so the engine has a timestamp for this node
  await prisma.leadHistory.create({
    data: {
      leadId: lead.id,
      nodeId: checkReplyNode.id,
      metadata: { fromNode: 'WAIT', condition: 'manual_reset' },
    },
  });

  console.log('✅ Done — Rutvij is now ACTIVE at CHECK_REPLY');
  console.log('   The scheduler will pick this up in the next 30s');
  console.log('   Expected path: CHECK_REPLY (replied) → AI_GENERATE → SEND_MESSAGE → END');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Error:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});

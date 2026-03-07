const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStatus() {
  try {
    console.log('\n=== WORKFLOWS ===');
    const workflows = await prisma.workflow.findMany({
      select: { id: true, name: true, status: true, createdAt: true }
    });
    console.log(JSON.stringify(workflows, null, 2));

    console.log('\n=== LEADS ===');
    const leads = await prisma.lead.findMany({
      select: { 
        id: true, 
        email: true, 
        status: true, 
        workflowId: true,
        currentNodeId: true,
        createdAt: true
      }
    });
    console.log(JSON.stringify(leads, null, 2));

    console.log('\n=== OUTBOX ===');
    const outbox = await prisma.outboxQueue.findMany({
      select: {
        id: true,
        recipient: true,
        subject: true,
        status: true,
        scheduledAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    console.log(JSON.stringify(outbox, null, 2));

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStatus();

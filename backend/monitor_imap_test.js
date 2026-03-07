const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function monitorLead() {
  try {
    const testLead = await prisma.lead.findFirst({
      where: { 
        email: 'shgsgs123@gmail.com',
        workflowId: 'cmmfioy430001ekyczeaqaare'
      },
      include: {
        currentNode: { select: { label: true, type: true } },
        outbox: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            subject: true,
            status: true,
            sentAt: true,
            createdAt: true
          }
        }
      }
    });
    
    if (!testLead) {
      console.log('❌ Test lead not found');
      return;
    }
    
    console.clear();
    console.log('🔍 IMAP Test Monitor');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`📧 Lead: ${testLead.email}`);
    console.log(`👤 Name: ${testLead.firstName} ${testLead.lastName}`);
    console.log(`📊 Status: ${testLead.status}`);
    console.log(`📍 Current Node: ${testLead.currentNode?.label || 'None'} (${testLead.currentNode?.type || 'N/A'})`);
    console.log(`🔄 Retry Count: ${testLead.retryCount}`);
    
    if (testLead.repliedAt) {
      console.log(`\n✅ REPLY RECEIVED!`);
      console.log(`   Replied At: ${new Date(testLead.repliedAt).toLocaleString()}`);
      console.log(`   Subject: ${testLead.replySubject}`);
      console.log(`   Preview: ${(testLead.replyBody || '').substring(0, 100)}...`);
    } else {
      console.log(`\n⏳ Waiting for reply...`);
    }
    
    if (testLead.outbox && testLead.outbox.length > 0) {
      const lastEmail = testLead.outbox[0];
      console.log(`\n📨 Last Email:`);
      console.log(`   Subject: ${lastEmail.subject}`);
      console.log(`   Status: ${lastEmail.status}`);
      if (lastEmail.sentAt) {
        console.log(`   Sent At: ${new Date(lastEmail.sentAt).toLocaleString()}`);
      }
    }
    
    // Get latest history entry
    const latestHistory = await prisma.leadHistory.findFirst({
      where: { leadId: testLead.id },
      orderBy: { transitionedAt: 'desc' },
      include: { node: { select: { label: true, type: true } } }
    });
    
    if (latestHistory) {
      const timeInNode = Date.now() - new Date(latestHistory.transitionedAt).getTime();
      const secondsInNode = Math.floor(timeInNode / 1000);
      const minutesInNode = Math.floor(secondsInNode / 60);
      
      console.log(`\n⏱️  Time in current node: ${minutesInNode}m ${secondsInNode % 60}s`);
      
      if (testLead.currentNode?.type === 'WAIT') {
        const waitConfig = await prisma.node.findUnique({
          where: { id: testLead.currentNodeId },
          select: { config: true }
        });
        
        const durationMs = waitConfig?.config?.durationMs || 0;
        const remainingMs = durationMs - timeInNode;
        
        if (remainingMs > 0) {
          const remainingSeconds = Math.floor(remainingMs / 1000);
          const remainingMinutes = Math.floor(remainingSeconds / 60);
          console.log(`   ⏰ Wait time remaining: ${remainingMinutes}m ${remainingSeconds % 60}s`);
        } else {
          console.log(`   ✅ Wait complete! Will advance in next scheduler cycle.`);
        }
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📅 Last updated: ${new Date().toLocaleTimeString()}`);
    console.log('Press Ctrl+C to stop monitoring\n');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run once immediately
monitorLead();

// Then run every 10 seconds
setInterval(monitorLead, 10000);

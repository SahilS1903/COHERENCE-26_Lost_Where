const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupImapTest() {
  try {
    console.log('🔧 Setting up IMAP test...\n');
    
    const workflowId = 'cmmfioy430001ekyczeaqaare';
    
    // Step 1: Configure WAIT node with a short delay (2 minutes for testing)
    console.log('⏰ Step 1: Configuring WAIT node with 2-minute delay...');
    const waitNode = await prisma.node.findFirst({
      where: { workflowId, type: 'WAIT' }
    });
    
    if (!waitNode) {
      console.error('❌ WAIT node not found!');
      process.exit(1);
    }
    
    await prisma.node.update({
      where: { id: waitNode.id },
      data: {
        config: {
          durationMs: 2 * 60 * 1000 // 2 minutes (for testing)
          // For production, use: 2 * 24 * 60 * 60 * 1000 (2 days)
        }
      }
    });
    console.log('✅ WAIT node configured: 2 minutes delay\n');
    
    // Step 2: Reset one test lead back to SEND_MESSAGE node
    console.log('🔄 Step 2: Resetting a test lead...');
    const sendMessageNode = await prisma.node.findFirst({
      where: { workflowId, type: 'SEND_MESSAGE' }
    });
    
    const testLead = await prisma.lead.findFirst({
      where: { workflowId }
    });
    
    if (!testLead) {
      console.error('❌ No leads found!');
      process.exit(1);
    }
    
    // Reset the lead: clear reply data and set back to SEND_MESSAGE
    await prisma.lead.update({
      where: { id: testLead.id },
      data: {
        status: 'ACTIVE',
        currentNodeId: sendMessageNode.id,
        repliedAt: null,
        replySubject: null,
        replyBody: null,
        retryCount: 0
      }
    });
    
    console.log(`✅ Reset lead: ${testLead.email}`);
    console.log(`   Current node: ${sendMessageNode.label}\n`);
    
    // Step 3: Show the test plan
    console.log('📋 IMAP Test Plan:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('1. ✅ Workflow is ACTIVE');
    console.log('2. ✅ Lead will be processed in next scheduler cycle (~30s)');
    console.log('3. ✅ Lead will send a new email');
    console.log('4. ⏰ Lead will WAIT for 2 minutes at Wait/Delay node');
    console.log('5. 🔍 Then CHECK_REPLY will look for email responses');
    console.log('6. 📧 IMAP will check your inbox every 60 seconds\n');
    
    console.log('🧪 To test IMAP reply detection:');
    console.log(`   1. Wait for new email to be sent to: ${testLead.email}`);
    console.log('   2. Reply to that email from the recipient\'s account');
    console.log('   3. Wait 2 minutes for the workflow to reach CHECK_REPLY');
    console.log('   4. IMAP will detect the reply and update the lead\n');
    
    console.log('📊 Monitor progress with:');
    console.log('   node check_status.js\n');
    
    console.log('⚠️  Note: For production, change WAIT duration to 2 days:');
    console.log('   durationMs: 2 * 24 * 60 * 60 * 1000\n');
    
    await prisma.$disconnect();
    console.log('✅ Setup complete! Watch the backend logs for activity.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupImapTest();

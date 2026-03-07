const { PrismaClient } = require('@prisma/client');
const { generateMessage } = require('./src/services/aiService');
const prisma = new PrismaClient();

async function testFollowUpLoop() {
  // Get one lead
  const lead = await prisma.lead.findFirst({
    where: { workflowId: 'cmmfi2scr001z21q1b77yxexl' }
  });
  
  console.log('📋 Testing with lead:', lead.email);
  console.log('📊 Lead data:', {
    firstName: lead.firstName,
    lastName: lead.lastName,
    company: lead.company
  });
  
  // Try to generate a message
  try {
    console.log('\n🤖 Generating follow-up message...');
    const result = await generateMessage(lead, {
      tone: 'professional',
      additionalInstructions: 'This is a gentle follow-up. The recipient hasn\'t responded to your previous email. Keep it short, friendly, and add value. Don\'t be pushy.'
    });
    
    console.log('\n✅ Success!');
    console.log('Subject:', result.subject);
    console.log('Body preview:', result.body.substring(0, 200) + '...');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  await prisma.$disconnect();
}

testFollowUpLoop();

const prisma = require('../../lib/prisma');

/**
 * FOLLOW-UP LOOP HANDLER
 * 
 * Manages multi-step follow-up attempts with:
 * - Up to 3 follow-up attempts
 * - Increasing wait times (2d, 3d, 5d)
 * - Reply checking at each stage
 * - Auto-exit conditions
 * 
 * Uses lead.metadata to track:
 * - followUpAttempt: Current attempt number (0-3)
 * - lastCheckTime: When we last checked for reply
 * - waitDuration: How long to wait before next check
 */

const WAIT_DURATIONS = {
  1: 2 * 24 * 60 * 60 * 1000,  // 2 days
  2: 3 * 24 * 60 * 60 * 1000,  // 3 days
  3: 5 * 24 * 60 * 60 * 1000,  // 5 days
};

const MAX_ATTEMPTS = 3;

async function handle(lead, node, workflowEngine) {
  console.log(`[📧 Follow-up Loop] Processing lead: ${lead.email}`);
  
  // Initialize customFields if first time
  let customFields = lead.customFields || {};
  const attempt = customFields.followUpAttempt || 1;
  const lastCheckTime = customFields.lastCheckTime ? new Date(customFields.lastCheckTime) : null;
  
  console.log(`[📊 Loop] Attempt ${attempt}/${MAX_ATTEMPTS}`);
  
  // STEP 0: If first time here, set lastCheckTime and start waiting
  if (!lastCheckTime) {
    console.log(`[🕐 Loop] First time in loop. Starting wait period of ${WAIT_DURATIONS[attempt] / (24 * 60 * 60 * 1000)} days...`);
    
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'ACTIVE',
        customFields: {
          ...customFields,
          followUpAttempt: attempt,
          lastCheckTime: new Date().toISOString()
        }
      }
    });
    
    return { advanced: false };
  }
  
  // STEP 1: If we haven't waited long enough, keep lead here
  const waitDuration = WAIT_DURATIONS[attempt];
  const timeSinceCheck = Date.now() - lastCheckTime.getTime();
  
  if (timeSinceCheck < waitDuration) {
    const remainingTime = Math.ceil((waitDuration - timeSinceCheck) / 1000 / 60 / 60);
    console.log(`[⏳ Loop] Still waiting... ${remainingTime} hours remaining`);
    
    // Update status to show waiting
    await prisma.lead.update({
      where: { id: lead.id },
      data: { 
        status: 'ACTIVE',
        customFields: customFields
      }
    });
    
    return { advanced: false };
  }
  
  // STEP 2: Check for reply
  console.log(`[🔍 Loop] Checking for reply...`);
  
  if (lead.replyBody && lead.replyBody.trim().length > 0) {
    console.log(`[✅ Loop] Reply detected! Moving to sentiment check`);
    return { 
      advanced: true, 
      conditionResult: 'replied'
    };
  }
  
  // STEP 3: No reply - decide what to do next
  if (attempt >= MAX_ATTEMPTS) {
    console.log(`[❌ Loop] Max attempts reached. Giving up.`);
    return { 
      advanced: true, 
      conditionResult: 'no_reply_final'
    };
  }
  
  // STEP 4: Generate and send follow-up
  console.log(`[📝 Loop] Generating follow-up #${attempt}...`);
  
  // Generate AI follow-up based on attempt number
  const { generateMessage } = require('../../services/aiService');
  const personality = node.config?.personality || 'professional';
  const leadName = `${lead.firstName} ${lead.lastName}`.trim() || lead.email;
  
  let additionalInstructions;
  if (attempt === 1) {
    additionalInstructions = `This is a gentle follow-up. The recipient hasn't responded to your previous email. Keep it short, friendly, and add value. Don't be pushy.`;
  } else if (attempt === 2) {
    additionalInstructions = `This is the second follow-up. Be more direct but still professional. Acknowledge you've reached out before. Offer something concrete (meeting time, resource, etc.).`;
  } else {
    additionalInstructions = `This is your final follow-up. Be brief and give them an easy out. Something like "I'll assume this isn't a priority right now, but feel free to reach out if things change."`;
  }
  
  const aiResult = await generateMessage(lead, {
    tone: personality,
    additionalInstructions
  });
  
  // Send the follow-up by adding to outbox queue
  await prisma.outboxQueue.create({
    data: {
      leadId: lead.id,
      channel: 'email',
      recipient: lead.email,
      subject: aiResult.subject,
      body: aiResult.body,
      status: 'PENDING',
      scheduledAt: new Date(),
      priority: attempt === MAX_ATTEMPTS ? 5 : 3 // Last attempt gets higher priority
    }
  });
  
  console.log(`[✉️ Loop] Queued follow-up email #${attempt}`);
  
  // STEP 5: Update customFields and stay in loop
  const newCustomFields = {
    ...customFields,
    followUpAttempt: attempt + 1,
    lastCheckTime: new Date().toISOString(),
    lastFollowUpSubject: aiResult.subject
  };
  
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: 'ACTIVE',
      customFields: newCustomFields
    }
  });
  
  console.log(`[🔄 Loop] Updated attempt count to ${attempt + 1}. Will check again in ${WAIT_DURATIONS[attempt + 1] / (24 * 60 * 60 * 1000)} days`);
  
  // Stay in this node (don't advance)
  return { advanced: false };
}

module.exports = { handle };

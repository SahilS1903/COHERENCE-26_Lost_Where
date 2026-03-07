const prisma = require('../../lib/prisma');
const { generateMessage } = require('../../services/aiService');

/**
 * AI_GENERATE handler
 * Calls GPT-4o to generate a personalized message for the lead.
 * Stores result in lead.customFields.aiMessage
 * Node config shape: { goal?, product?, tone?, senderName?, senderCompany?, additionalInstructions? }
 * 
 * Smart Features:
 * - Detects if lead has replied and generates contextual follow-ups
 * - Uses lead.replyBody to craft intelligent responses to their questions
 * - Automatically adjusts tone from cold outreach to warm conversation
 */
async function handle(lead, node, _edges) {
  const fullLead = await prisma.lead.findUnique({
    where: { id: lead.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      company: true,
      customFields: true,
      repliedAt: true,
      replySubject: true,
      replyBody: true,
    },
  });
  
  const config = node.config || {};
  const result = await generateMessage(fullLead, config);

  console.log(`[AI] ${fullLead.email} → "${result.subject}" (score: ${result.personalizationScore}/100)`);

  const updatedFields = {
    ...(fullLead.customFields || {}),
    aiMessage: {
      subject: result.subject,
      body: result.body,
      personalizationScore: result.personalizationScore,
      generatedAt: new Date().toISOString(),
      isReplyFollowUp: !!fullLead.repliedAt,
    },
  };

  await prisma.lead.update({
    where: { id: fullLead.id },
    data: { customFields: updatedFields },
  });

  return { advanced: true };
}

module.exports = { handle };

const prisma = require('../../lib/prisma');
const { generateMessage } = require('../../services/aiService');

/**
 * AI_GENERATE handler
 * Calls GPT-4o to generate a personalized message for the lead.
 * Stores result in lead.customFields.aiMessage
 * Node config shape: { goal?, product?, tone?, senderName?, senderCompany?, additionalInstructions? }
 */
async function handle(lead, node, _edges) {
  console.log(`  [🤖 AI GENERATE] Starting for ${lead.email}`);
  
  const config = node.config || {};
  console.log(`  [⚙️  Config] Goal: ${config.goal || 'not set'}`);
  console.log(`  [⚙️  Config] Product: ${config.product || 'not set'}`);
  console.log(`  [⚙️  Config] Tone: ${config.tone || 'professional'}`);
  console.log(`  [⚙️  Config] Sender: ${config.senderName || 'not set'} from ${config.senderCompany || 'not set'}`);
  
  console.log(`  [💬 AI API CALL] Generating message...`);
  const startTime = Date.now();
  
  const result = await generateMessage(lead, config);
  
  const duration = Date.now() - startTime;
  console.log(`  [✅ AI RESPONSE] Generated in ${duration}ms`);
  console.log(`  [📊 Personalization Score] ${result.personalizationScore}/100`);
  console.log(`  [📧 Subject] ${result.subject}`);
  console.log(`  [📝 Body] ${result.body.substring(0, 100)}...`);

  // Store the AI-generated message in customFields so downstream nodes (SEND_MESSAGE) can use it
  const updatedFields = {
    ...(lead.customFields || {}),
    aiMessage: {
      subject: result.subject,
      body: result.body,
      personalizationScore: result.personalizationScore,
      generatedAt: new Date().toISOString(),
    },
  };

  await prisma.lead.update({
    where: { id: lead.id },
    data: { customFields: updatedFields },
  });

  console.log(`  [💾 STORED] AI message saved to lead.customFields`);
  return { advanced: true };
}

module.exports = { handle };

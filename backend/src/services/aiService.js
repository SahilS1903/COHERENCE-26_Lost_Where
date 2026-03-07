const openai = require('../lib/openai');

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Sleep for a given number of milliseconds
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a personalized outreach message for a lead using GPT-4o.
 * Retries up to MAX_RETRIES times with exponential backoff.
 *
 * @param {Object} lead - Lead record from the database
 * @param {Object} context - Additional context from the node config (e.g. tone, goal, product)
 * @returns {Promise<{subject: string, body: string, personalizationScore: number}>}
 */
async function generateMessage(lead, context = {}) {
  console.log(`    [🤖 AI Service] Generating message for ${lead.email}`);
  const isReply = lead.repliedAt && lead.replyBody;
  console.log(`    [🔍 Message Type] ${isReply ? 'Follow-up reply' : 'Initial outreach'}`);
  
  const prompt = buildPrompt(lead, context);
  console.log(`    [📝 Prompt Length] ${prompt.length} characters`);
  
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`    [💡 API Call] Attempt ${attempt}/${MAX_RETRIES}...`);
      const callStartTime = Date.now();
      
      const systemMessage = isReply
        ? `You are an expert sales professional responding to a prospect's reply. 
You write natural, conversational responses that directly address their questions and concerns.
You are helpful, professional, and focused on moving the conversation forward.
You MUST respond with ONLY valid JSON in this exact format:
{
  "subject": "string - RE: their subject or a relevant follow-up subject",
  "body": "string - conversational reply addressing their specific points (2-3 paragraphs max)",
  "personalizationScore": number between 0 and 100 indicating how well you addressed their reply
}`
        : `You are an expert B2B outreach copywriter. 
You generate highly personalized, concise, and human-sounding outreach messages.
You MUST respond with ONLY valid JSON in this exact format:
{
  "subject": "string - compelling email subject line",
  "body": "string - personalized message body (2-4 paragraphs)",
  "personalizationScore": number between 0 and 100 indicating how personalized the message is
}`;
      
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemMessage,
          },
          { role: 'user', content: prompt },
        ],
        temperature: isReply ? 0.8 : 0.7, // Slightly more creative for replies
        max_tokens: 800,
        response_format: { type: 'json_object' },
      });
      
      const callDuration = Date.now() - callStartTime;
      console.log(`    [✅ API Response] Received in ${callDuration}ms`);

      const raw = response.choices[0].message.content;
      const parsed = JSON.parse(raw);
      
      console.log(`    [📊 Tokens Used] ${response.usage?.total_tokens || 'unknown'}`);

      if (!parsed.subject || !parsed.body || typeof parsed.personalizationScore !== 'number') {
        throw new Error('AI response missing required fields');
      }
      
      console.log(`    [✅ Validation] Response structure valid`);

      return {
        subject: parsed.subject,
        body: parsed.body,
        personalizationScore: Math.max(0, Math.min(100, parsed.personalizationScore)),
      };
    } catch (err) {
      lastError = err;
      console.warn(`    [⚠️  Attempt ${attempt} Failed]`, err.message);

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`    [🔄 Retrying] Waiting ${delay}ms before retry...`);
        await sleep(delay);
      }
    }
  }

  console.error(`    [❌ AI Generation Failed] All ${MAX_RETRIES} attempts exhausted`);
  throw new Error(`AI generation failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

/**
 * Build a structured prompt injecting lead data and context
 */
function buildPrompt(lead, context) {
  const customFields = lead.customFields || {};
  const hasReply = lead.repliedAt && lead.replyBody;
  
  const parts = [
    hasReply 
      ? `Generate a follow-up response to a lead who has replied to your outreach:`
      : `Generate a personalized outreach message for the following lead:`,
    `- Name: ${lead.firstName}${lead.lastName ? ' ' + lead.lastName : ''}`,
    `- Email: ${lead.email}`,
    lead.company ? `- Company: ${lead.company}` : null,
    Object.keys(customFields).length > 0
      ? `- Additional info: ${JSON.stringify(customFields)}`
      : null,
  ];
  
  // Include reply context if available
  if (hasReply) {
    parts.push('');
    parts.push(`📧 THEY REPLIED:`);
    parts.push(`Subject: ${lead.replySubject || '(no subject)'}`);
    parts.push(`Reply: ${lead.replyBody.substring(0, 1000)}`); // Limit to 1000 chars
    parts.push('');
    parts.push(`⚠️ IMPORTANT: This is a REPLY. Your message MUST:`);
    parts.push(`- Directly address their specific points and questions`);
    parts.push(`- Be conversational and responsive (not a cold outreach)`);
    parts.push(`- Reference what they said to show you read their message`);
    parts.push(`- Move the conversation forward based on their interest level`);
    parts.push(`- Keep it concise and natural`);
  }
  
  parts.push('');
  parts.push(`Campaign context:`);
  parts.push(context.goal ? `- Goal: ${context.goal}` : '- Goal: Schedule a discovery call');
  if (context.product) parts.push(`- Product/Service: ${context.product}`);
  parts.push(context.tone ? `- Tone: ${context.tone}` : '- Tone: Professional but conversational');
  if (context.senderName) parts.push(`- Sender name: ${context.senderName}`);
  if (context.senderCompany) parts.push(`- Sender company: ${context.senderCompany}`);
  if (context.additionalInstructions) parts.push(`- Instructions: ${context.additionalInstructions}`);

  return parts.filter(Boolean).join('\n');
}

module.exports = { generateMessage };

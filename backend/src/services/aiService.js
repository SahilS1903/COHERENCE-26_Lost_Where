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
  const prompt = buildPrompt(lead, context);
  console.log(`    [📝 Prompt Length] ${prompt.length} characters`);
  
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`    [💡 API Call] Attempt ${attempt}/${MAX_RETRIES}...`);
      const callStartTime = Date.now();
      
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert B2B outreach copywriter. 
You generate highly personalized, concise, and human-sounding outreach messages.
You MUST respond with ONLY valid JSON in this exact format:
{
  "subject": "string - compelling email subject line",
  "body": "string - personalized message body (2-4 paragraphs)",
  "personalizationScore": number between 0 and 100 indicating how personalized the message is
}`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
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
  const parts = [
    `Generate a personalized outreach message for the following lead:`,
    `- Name: ${lead.firstName}${lead.lastName ? ' ' + lead.lastName : ''}`,
    `- Email: ${lead.email}`,
    lead.company ? `- Company: ${lead.company}` : null,
    Object.keys(customFields).length > 0
      ? `- Additional info: ${JSON.stringify(customFields)}`
      : null,
    '',
    `Campaign context:`,
    context.goal ? `- Goal: ${context.goal}` : '- Goal: Schedule a discovery call',
    context.product ? `- Product/Service: ${context.product}` : null,
    context.tone ? `- Tone: ${context.tone}` : '- Tone: Professional but conversational',
    context.senderName ? `- Sender name: ${context.senderName}` : null,
    context.senderCompany ? `- Sender company: ${context.senderCompany}` : null,
    context.additionalInstructions ? `- Instructions: ${context.additionalInstructions}` : null,
  ].filter(Boolean);

  return parts.join('\n');
}

module.exports = { generateMessage };

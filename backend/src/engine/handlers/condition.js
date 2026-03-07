/**
 * CONDITION handler
 * Evaluates a condition expression against the lead's data and selects the matching outbound edge.
 *
 * Node config shape:
 * {
 *   conditionType: "sentiment" | "custom", // Optional: special condition types
 *   conditions: [
 *     { field: "customFields.score", operator: "gte", value: 70, label: "high_score" },
 *     { field: "company", operator: "eq", value: "Acme", label: "is_acme" }
 *   ],
 *   defaultLabel: "default"
 * }
 *
 * Sentiment Analysis (conditionType: "sentiment"):
 * - Analyzes replyBody for positive/negative sentiment
 * - Returns "interested" or "notInterested" based on keywords
 *
 * Operators: eq, neq, gt, gte, lt, lte, contains, not_contains, exists, not_exists
 */

/**
 * Analyze sentiment of reply text
 */
function analyzeSentiment(replyText) {
  if (!replyText) return null;
  
  const text = replyText.toLowerCase();
  
  // Not interested keywords (negative sentiment)
  const notInterestedKeywords = [
    'not interested',
    'no thanks',
    'no thank you',
    'not right now',
    'unsubscribe',
    'stop',
    'remove me',
    'don\'t contact',
    'no longer interested',
    'not a good fit',
    'not the right time',
    'pass',
    'already have',
    'not looking',
    'busy',
    'overwhelmed'
  ];
  
  // Interested keywords (positive sentiment)
  const interestedKeywords = [
    'interested',
    'tell me more',
    'sounds good',
    'curious',
    'demo',
    'call',
    'meeting',
    'schedule',
    'pricing',
    'learn more',
    'information',
    'yes',
    'sure',
    'definitely',
    'absolutely',
    'would love',
    'let\'s talk',
    'discuss',
    'explore'
  ];
  
  // Check for not interested (takes priority)
  for (const keyword of notInterestedKeywords) {
    if (text.includes(keyword)) {
      console.log(`  [😞 Sentiment] NOT INTERESTED detected: "${keyword}"`);
      return 'notInterested';
    }
  }
  
  // Check for interested
  for (const keyword of interestedKeywords) {
    if (text.includes(keyword)) {
      console.log(`  [😊 Sentiment] INTERESTED detected: "${keyword}"`);
      return 'interested';
    }
  }
  
  // Neutral/unclear - treat as interested (give benefit of doubt)
  console.log(`  [😐 Sentiment] NEUTRAL - treating as interested`);
  return 'interested';
}

function getFieldValue(lead, fieldPath) {
  const parts = fieldPath.split('.');
  let current = lead;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = typeof current === 'object' ? current[part] : undefined;
  }
  return current;
}

function evaluateCondition(lead, condition) {
  const value = getFieldValue(lead, condition.field);
  const target = condition.value;

  switch (condition.operator) {
    case 'eq':
      return value == target;
    case 'neq':
      return value != target;
    case 'gt':
      return Number(value) > Number(target);
    case 'gte':
      return Number(value) >= Number(target);
    case 'lt':
      return Number(value) < Number(target);
    case 'lte':
      return Number(value) <= Number(target);
    case 'contains':
      return String(value || '').toLowerCase().includes(String(target).toLowerCase());
    case 'not_contains':
      return !String(value || '').toLowerCase().includes(String(target).toLowerCase());
    case 'exists':
      return value !== undefined && value !== null && value !== '';
    case 'not_exists':
      return value === undefined || value === null || value === '';
    default:
      console.warn(`[condition] Unknown operator: ${condition.operator}`);
      return false;
  }
}

async function handle(lead, node, edges) {
  console.log(`  [🔀 CONDITION] Evaluating conditions for ${lead.email}`);
  
  const config = node.config || {};
  const conditionType = config.conditionType;
  const conditions = config.conditions || [];
  const defaultLabel = config.defaultLabel || 'default';
  
  console.log(`  [📋 Type] ${conditionType || 'custom'}`);
  console.log(`  [🔗 Edges] ${edges.length} possible path(s)`);

  // Special case: Sentiment Analysis
  if (conditionType === 'sentiment') {
    console.log(`  [🎭 SENTIMENT ANALYSIS] Analyzing reply sentiment...`);
    
    if (!lead.replyBody) {
      console.log(`  [⚠️  No Reply] Lead has no reply to analyze, using default`);
      return { advanced: true, conditionResult: defaultLabel };
    }
    
    console.log(`  [📝 Reply Preview] "${lead.replyBody.substring(0, 100)}..."`);
    const sentiment = analyzeSentiment(lead.replyBody);
    
    if (!sentiment) {
      console.log(`  [⚠️  Analysis Failed] Could not determine sentiment, using default`);
      return { advanced: true, conditionResult: defaultLabel };
    }
    
    console.log(`  [✅ Result] Sentiment: ${sentiment}`);
    return { advanced: true, conditionResult: sentiment };
  }

  // Standard condition evaluation
  console.log(`  [📋 Conditions] ${conditions.length} condition(s) to evaluate`);

  // Evaluate each condition in order; use the first matching label
  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];
    console.log(`  [🔍 Evaluating ${i + 1}/${conditions.length}] ${condition.field} ${condition.operator} ${condition.value}`);
    
    const fieldValue = getFieldValue(lead, condition.field);
    console.log(`    Field value: ${JSON.stringify(fieldValue)}`);
    
    if (evaluateCondition(lead, condition)) {
      console.log(`  [✅ Match Found] Taking path: "${condition.label}"`);
      return { advanced: true, conditionResult: condition.label };
    } else {
      console.log(`    ❌ Condition not met`);
    }
  }

  console.log(`  [📌 Default Path] No conditions matched, using: "${defaultLabel}"`);
  return { advanced: true, conditionResult: defaultLabel };
}

module.exports = { handle };

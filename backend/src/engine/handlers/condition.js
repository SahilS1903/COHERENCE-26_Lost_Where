/**
 * CONDITION handler
 * Evaluates a condition expression against the lead's data and selects the matching outbound edge.
 *
 * Node config shape:
 * {
 *   conditions: [
 *     { field: "customFields.score", operator: "gte", value: 70, label: "high_score" },
 *     { field: "company", operator: "eq", value: "Acme", label: "is_acme" }
 *   ],
 *   defaultLabel: "default"
 * }
 *
 * Operators: eq, neq, gt, gte, lt, lte, contains, not_contains, exists, not_exists
 */

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
  const conditions = config.conditions || [];
  const defaultLabel = config.defaultLabel || 'default';
  
  console.log(`  [📋 Conditions] ${conditions.length} condition(s) to evaluate`);
  console.log(`  [🔗 Edges] ${edges.length} possible path(s)`);

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

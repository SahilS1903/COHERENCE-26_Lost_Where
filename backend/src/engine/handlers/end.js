const prisma = require('../../lib/prisma');

/**
 * END handler
 * Marks the lead as DONE and stops further processing.
 */
async function handle(lead, _node, _edges) {
  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: 'DONE', currentNodeId: null },
  });
  console.log(`[END] ${lead.email} → DONE`);
  return { advanced: false, reason: 'workflow_complete' };
}

module.exports = { handle };

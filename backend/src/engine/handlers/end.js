const prisma = require('../../lib/prisma');

/**
 * END handler
 * Marks the lead as DONE and stops further processing.
 */
async function handle(lead, _node, _edges) {
  console.log(`  [🏁 END] Marking ${lead.email} as DONE`);
  
  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: 'DONE', currentNodeId: null },
  });

  console.log(`  [✅ Complete] Lead workflow finished successfully`);
  console.log(`  [📄 Status] DONE | Current Node cleared`);
  return { advanced: false, reason: 'workflow_complete' };
}

module.exports = { handle };

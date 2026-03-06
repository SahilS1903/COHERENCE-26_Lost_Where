const prisma = require('../../lib/prisma');

/**
 * IMPORT_LEADS handler
 * Bulk-upserts leads from node config into the database.
 * Node config shape: { leads: [{ email, firstName, lastName?, company?, customFields? }] }
 */
async function handle(lead, node, _edges) {
  console.log(`  [📥 IMPORT LEADS] Processing import node`);
  
  const config = node.config || {};
  const leadsToImport = config.leads || [];

  if (!leadsToImport.length) {
    console.log(`  [⚠️  No Leads] Config has no leads to import, advancing`);
    return { advanced: true };
  }

  console.log(`  [📋 Processing] ${leadsToImport.length} lead(s) to upsert`);

  const upserts = leadsToImport.map((l) =>
    prisma.lead.upsert({
      where: { workflowId_email: { workflowId: lead.workflowId, email: l.email } },
      create: {
        workflowId: lead.workflowId,
        email: l.email,
        firstName: l.firstName || l.email.split('@')[0],
        lastName: l.lastName || null,
        company: l.company || null,
        customFields: l.customFields || {},
        currentNodeId: node.id,
        status: 'ACTIVE',
      },
      update: {
        firstName: l.firstName || undefined,
        lastName: l.lastName || undefined,
        company: l.company || undefined,
        customFields: l.customFields || undefined,
      },
    })
  );

  await prisma.$transaction(upserts);
  console.log(`  [✅ Upserted] ${leadsToImport.length} lead(s) successfully`);
  return { advanced: true };
}

module.exports = { handle };

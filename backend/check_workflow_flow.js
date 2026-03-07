const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWorkflowFlow() {
  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: 'cmmfioy430001ekyczeaqaare' },
      include: {
        nodes: { orderBy: { createdAt: 'asc' } },
        edges: true
      }
    });
    
    console.log('🔵 Workflow Nodes:');
    workflow.nodes.forEach((n, i) => {
      console.log(`${i + 1}. [${n.type}] ${n.label} (ID: ${n.id.slice(-8)})`);
      if (n.config && Object.keys(n.config).length > 0) {
        console.log('   Config:', JSON.stringify(n.config, null, 2));
      }
    });
    
    console.log('\n➡️  Workflow Edges:');
    workflow.edges.forEach(e => {
      const from = workflow.nodes.find(n => n.id === e.sourceNodeId);
      const to = workflow.nodes.find(n => n.id === e.targetNodeId);
      console.log(`   ${from?.label} → ${to?.label}${e.conditionLabel ? ' (' + e.conditionLabel + ')' : ''}`);
    });
    
    // Check lead history to see the execution path
    console.log('\n📜 Lead History (showing execution path):');
    const history = await prisma.leadHistory.findMany({
      where: {
        lead: { workflowId: 'cmmfioy430001ekyczeaqaare' }
      },
      orderBy: { transitionedAt: 'asc' },
      include: {
        lead: { select: { email: true } },
        node: { select: { label: true, type: true } }
      }
    });
    
    // Group by lead
    const byLead = {};
    history.forEach(h => {
      if (!byLead[h.lead.email]) {
        byLead[h.lead.email] = [];
      }
      byLead[h.lead.email].push(h);
    });
    
    Object.entries(byLead).forEach(([email, entries]) => {
      console.log(`\n   📧 ${email}:`);
      entries.forEach(e => {
        const time = new Date(e.transitionedAt).toLocaleTimeString();
        console.log(`      ${time} → ${e.node.label} (${e.node.type})`);
      });
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkWorkflowFlow();

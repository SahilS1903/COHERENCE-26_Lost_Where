const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showWorkflow() {
  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: 'cmmfioy430001ekyczeaqaare' },
      include: {
        nodes: { orderBy: { createdAt: 'asc' } },
        edges: true
      }
    });
    
    console.log('📋 Workflow:', workflow.name, '(', workflow.status, ')');
    console.log('\n🔵 Nodes:');
    workflow.nodes.forEach(n => {
      console.log('  -', n.label, '(' + n.type + ')');
      console.log('    ID:', n.id);
      if (n.config && Object.keys(n.config).length > 0) {
        console.log('    Config:', JSON.stringify(n.config, null, 2));
      }
    });
    
    console.log('\n➡️  Edges:');
    workflow.edges.forEach(e => {
      const from = workflow.nodes.find(n => n.id === e.sourceNodeId);
      const to = workflow.nodes.find(n => n.id === e.targetNodeId);
      console.log('  ', from?.label, '→', to?.label, e.conditionLabel ? '(' + e.conditionLabel + ')' : '');
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

showWorkflow();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWorkflow() {
  const workflow = await prisma.workflow.findFirst({
    where: { name: 'Advanced Reply Loop (3 Follow-ups)' },
    include: {
      nodes: { orderBy: { positionX: 'asc' } },
      edges: true,
      leads: { 
        include: { 
          currentNode: true
        } 
      }
    }
  });
  
  console.log('📊 Workflow Status:');
  console.log('ID:', workflow.id);
  console.log('Active:', workflow.isActive);
  console.log('Nodes:', workflow.nodes.length);
  console.log('Edges:', workflow.edges.length);
  console.log('Leads:', workflow.leads.length);
  
  console.log('\n👥 Lead Details:');
  workflow.leads.forEach(lead => {
    console.log(`  - ${lead.email}`);
    console.log(`    Status: ${lead.status}`);
    console.log(`    Current Node: ${lead.currentNode?.label || 'None'}`);
    console.log(`    Current Node ID: ${lead.currentNodeId || 'None'}`);
  });
  
  console.log('\n🔗 First few nodes:');
  workflow.nodes.slice(0, 5).forEach(node => {
    console.log(`  - ${node.label} (ID: ${node.id}, Type: ${node.type})`);
  });
  
  await prisma.$disconnect();
}

checkWorkflow().catch(console.error);

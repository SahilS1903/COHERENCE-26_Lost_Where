const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function activateWorkflow() {
  try {
    const workflowId = 'cmmfioy430001ekyczeaqaare';
    
    console.log('🔄 Activating workflow...');
    
    // Update workflow status to ACTIVE
    const workflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: { status: 'ACTIVE' },
      include: {
        nodes: true,
        leads: { select: { id: true, email: true } }
      }
    });
    
    console.log('✅ Workflow activated:');
    console.log('   ID:', workflow.id);
    console.log('   Name:', workflow.name);
    console.log('   Status:', workflow.status);
    console.log('   Nodes:', workflow.nodes.length);
    console.log('   Leads:', workflow.leads.length);
    
    // Find the first node (usually IMPORT_LEADS or the start node)
    const startNode = workflow.nodes.find(n => 
      n.type === 'IMPORT_LEADS' || 
      workflow.nodes.every(other => 
        !workflow.nodes.some(n2 => n2.id === n.id)
      )
    ) || workflow.nodes[0];
    
    if (startNode && workflow.leads.length > 0) {
      console.log('\n🎯 Initializing leads to start node:', startNode.label);
      
      // Update all leads without a currentNodeId to point to the start node
      const updated = await prisma.lead.updateMany({
        where: {
          workflowId: workflowId,
          currentNodeId: null
        },
        data: {
          currentNodeId: startNode.id
        }
      });
      
      console.log('✅ Updated', updated.count, 'lead(s) to start node');
    }
    
    console.log('\n✅ Done! The workflow scheduler will process leads every 30 seconds.');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

activateWorkflow();

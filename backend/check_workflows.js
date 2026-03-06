const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWorkflows() {
  const workflows = await prisma.workflow.findMany({
    include: { _count: { select: { nodes: true, leads: true } } }
  });
  console.log('All workflows:');
  workflows.forEach(wf => {
    console.log(`- ID: ${wf.id}, Name: "${wf.name}", Nodes: ${wf._count.nodes}, Leads: ${wf._count.leads}`);
  });
  await prisma.$disconnect();
}

checkWorkflows().catch(console.error);

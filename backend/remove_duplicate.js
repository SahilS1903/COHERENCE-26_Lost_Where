const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeDuplicate() {
  // Delete the second duplicate workflow
  await prisma.workflow.delete({
    where: { id: 'cmmf35jax0001jo179wmnsc5v' }
  });
  console.log('✅ Deleted duplicate workflow');
  
  const remaining = await prisma.workflow.findMany();
  console.log(`Remaining workflows: ${remaining.length}`);
  remaining.forEach(wf => console.log(`  - "${wf.name}"`));
  
  await prisma.$disconnect();
}

removeDuplicate().catch(console.error);

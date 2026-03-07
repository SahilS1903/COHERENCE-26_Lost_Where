const prisma = require('./src/lib/prisma');

async function inspect() {
  const workflows = await prisma.workflow.findMany({
    include: {
      nodes: { orderBy: { positionX: 'asc' } },
      edges: true,
    },
  });

  for (const wf of workflows) {
    console.log(`\nWorkflow: "${wf.name}" (${wf.id}) — status: ${wf.status}`);
    console.log('Nodes:');
    for (const n of wf.nodes) {
      console.log(`  [${n.type}] id=${n.id}  config=${JSON.stringify(n.config)}`);
    }
    console.log('Edges:');
    for (const e of wf.edges) {
      const src = wf.nodes.find(n => n.id === e.sourceNodeId);
      const tgt = wf.nodes.find(n => n.id === e.targetNodeId);
      console.log(`  ${src?.type} → ${tgt?.type}  label="${e.conditionLabel || ''}"`);
    }

    const leads = await prisma.lead.findMany({
      where: { workflowId: wf.id },
      select: { email: true, status: true, repliedAt: true, currentNode: { select: { type: true } } },
    });
    console.log('Leads:');
    for (const l of leads) {
      console.log(`  ${l.email}  status=${l.status}  repliedAt=${l.repliedAt}  currentNode=${l.currentNode?.type ?? 'null'}`);
    }
  }
}

inspect().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

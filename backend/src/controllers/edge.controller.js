const { z } = require('zod');
const prisma = require('../lib/prisma');

const createSchema = z.object({
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  conditionLabel: z.string().nullable().optional(),
});

async function assertWorkflowOwner(workflowId, userId) {
  const wf = await prisma.workflow.findFirst({ where: { id: workflowId, userId } });
  if (!wf) throw Object.assign(new Error('Workflow not found'), { status: 404 });
  return wf;
}

async function list(req, res) {
  await assertWorkflowOwner(req.params.workflowId, req.user.id);
  const edges = await prisma.edge.findMany({
    where: { workflowId: req.params.workflowId },
  });
  res.json(edges);
}

async function create(req, res) {
  await assertWorkflowOwner(req.params.workflowId, req.user.id);
  const data = createSchema.parse(req.body);
  const edge = await prisma.edge.create({
    data: { ...data, workflowId: req.params.workflowId },
  });
  res.status(201).json(edge);
}

async function remove(req, res) {
  await assertWorkflowOwner(req.params.workflowId, req.user.id);
  const existing = await prisma.edge.findFirst({
    where: { id: req.params.id, workflowId: req.params.workflowId },
  });
  if (!existing) return res.status(404).json({ error: 'Edge not found' });
  await prisma.edge.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = { list, create, remove };

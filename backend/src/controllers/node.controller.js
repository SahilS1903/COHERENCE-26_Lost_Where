const { z } = require('zod');
const prisma = require('../lib/prisma');

const nodeTypes = ['IMPORT_LEADS', 'AI_GENERATE', 'SEND_MESSAGE', 'WAIT', 'CHECK_REPLY', 'CONDITION', 'END'];

const createSchema = z.object({
  type: z.enum(nodeTypes),
  label: z.string().min(1),
  config: z.record(z.any()).optional().default({}),
  positionX: z.number().optional().default(0),
  positionY: z.number().optional().default(0),
});

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  config: z.record(z.any()).optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
});

async function assertWorkflowOwner(workflowId, userId) {
  const wf = await prisma.workflow.findFirst({ where: { id: workflowId, userId } });
  if (!wf) throw Object.assign(new Error('Workflow not found'), { status: 404 });
  return wf;
}

async function list(req, res) {
  await assertWorkflowOwner(req.params.workflowId, req.user.id);
  const nodes = await prisma.node.findMany({
    where: { workflowId: req.params.workflowId },
    include: { outgoingEdges: true, incomingEdges: true },
  });
  res.json(nodes);
}

async function create(req, res) {
  await assertWorkflowOwner(req.params.workflowId, req.user.id);
  const data = createSchema.parse(req.body);
  const node = await prisma.node.create({
    data: { ...data, workflowId: req.params.workflowId },
  });
  res.status(201).json(node);
}

async function getOne(req, res) {
  await assertWorkflowOwner(req.params.workflowId, req.user.id);
  const node = await prisma.node.findFirst({
    where: { id: req.params.id, workflowId: req.params.workflowId },
    include: { outgoingEdges: true, incomingEdges: true },
  });
  if (!node) return res.status(404).json({ error: 'Node not found' });
  res.json(node);
}

async function update(req, res) {
  await assertWorkflowOwner(req.params.workflowId, req.user.id);
  const data = updateSchema.parse(req.body);
  const existing = await prisma.node.findFirst({
    where: { id: req.params.id, workflowId: req.params.workflowId },
  });
  if (!existing) return res.status(404).json({ error: 'Node not found' });
  const node = await prisma.node.update({ where: { id: req.params.id }, data });
  res.json(node);
}

async function remove(req, res) {
  await assertWorkflowOwner(req.params.workflowId, req.user.id);
  const existing = await prisma.node.findFirst({
    where: { id: req.params.id, workflowId: req.params.workflowId },
  });
  if (!existing) return res.status(404).json({ error: 'Node not found' });
  await prisma.node.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = { list, create, getOne, update, remove };

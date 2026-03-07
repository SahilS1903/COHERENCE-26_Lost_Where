const { z } = require('zod');
const prisma = require('../lib/prisma');

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

async function list(req, res) {
  const workflows = await prisma.workflow.findMany({
    where: { userId: req.user.id },
    include: { _count: { select: { leads: true, nodes: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(workflows);
}

async function create(req, res) {
  const data = createSchema.parse(req.body);
  const workflow = await prisma.workflow.create({
    data: { ...data, userId: req.user.id },
  });
  res.status(201).json(workflow);
}

async function getOne(req, res) {
  const workflow = await prisma.workflow.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    include: {
      nodes: true,
      edges: true,
      _count: { select: { leads: true } },
    },
  });
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
  res.json(workflow);
}

async function update(req, res) {
  const data = updateSchema.parse(req.body);
  const existing = await prisma.workflow.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!existing) return res.status(404).json({ error: 'Workflow not found' });
  const workflow = await prisma.workflow.update({ where: { id: req.params.id }, data });
  res.json(workflow);
}

async function remove(req, res) {
  const existing = await prisma.workflow.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!existing) return res.status(404).json({ error: 'Workflow not found' });
  await prisma.workflow.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

async function activate(req, res) {
  const existing = await prisma.workflow.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!existing) return res.status(404).json({ error: 'Workflow not found' });
  const workflow = await prisma.workflow.update({
    where: { id: req.params.id },
    data: { status: 'ACTIVE' },
  });
  res.json(workflow);
}

async function deactivate(req, res) {
  const existing = await prisma.workflow.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!existing) return res.status(404).json({ error: 'Workflow not found' });
  const workflow = await prisma.workflow.update({
    where: { id: req.params.id },
    data: { status: 'PAUSED' },
  });
  res.json(workflow);
}

// Atomically replace the entire node/edge graph for a workflow.
// Accepts: { name?, description?, nodes: [...], edges: [...] }
async function replaceGraph(req, res) {
  const existing = await prisma.workflow.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!existing) return res.status(404).json({ error: 'Workflow not found' });

  const { name, description, nodes = [], edges = [] } = req.body;

  const workflow = await prisma.$transaction(async (tx) => {
    // 1. Update metadata
    const updated = await tx.workflow.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    });

    // 2. Delete all existing nodes (edges cascade via onDelete: Cascade)
    await tx.node.deleteMany({ where: { workflowId: req.params.id } });

    // 3. Re-create nodes and collect id mapping (frontend tempId → real id)
    const createdNodes = await Promise.all(
      nodes.map((n) =>
        tx.node.create({
          data: {
            workflowId: req.params.id,
            type: n.type,
            label: n.label,
            config: n.config || {},
            positionX: n.positionX || 0,
            positionY: n.positionY || 0,
          },
        })
      )
    );

    // Build temp→real id map
    const idMap = {};
    nodes.forEach((n, i) => { idMap[n.tempId] = createdNodes[i].id; });

    // 4. Re-create edges using real ids
    await Promise.all(
      edges.map((e) =>
        tx.edge.create({
          data: {
            workflowId: req.params.id,
            sourceNodeId: idMap[e.sourceTempId],
            targetNodeId: idMap[e.targetTempId],
            conditionLabel: e.conditionLabel || null,
          },
        })
      )
    );

    return updated;
  });

  res.json(workflow);
}

module.exports = { list, create, getOne, update, remove, activate, deactivate, replaceGraph };

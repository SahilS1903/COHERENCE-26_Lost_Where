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

module.exports = { list, create, getOne, update, remove, activate, deactivate };

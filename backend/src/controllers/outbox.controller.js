const prisma = require('../lib/prisma');

/** GET /api/outbox?status=PENDING&channel=email&page=1&limit=50 */
async function list(req, res) {
  const { status, channel, page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  // Only return outbox items for workflows owned by the requesting user
  const where = {
    lead: {
      workflow: { userId: req.user.id },
    },
  };
  if (status) where.status = status;
  if (channel) where.channel = channel;

  const [items, total] = await prisma.$transaction([
    prisma.outboxQueue.findMany({
      where,
      include: {
        lead: { select: { id: true, email: true, firstName: true, workflowId: true } },
      },
      orderBy: { scheduledAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.outboxQueue.count({ where }),
  ]);

  res.json({ items, total, page: Number(page), limit: Number(limit) });
}

module.exports = { list };

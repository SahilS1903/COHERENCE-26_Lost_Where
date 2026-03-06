const prisma = require('../lib/prisma');

/** GET /api/dashboard */
async function stats(req, res) {
  const userId = req.user.id;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalLeads,
    activeWorkflows,
    totalWorkflows,
    messagesSentToday,
    totalSent,
    totalReplied,
    leadsByStatus,
  ] = await prisma.$transaction([
    // Total leads across all user's workflows
    prisma.lead.count({
      where: { workflow: { userId } },
    }),
    // Active workflows
    prisma.workflow.count({
      where: { userId, status: 'ACTIVE' },
    }),
    // All workflows
    prisma.workflow.count({
      where: { userId },
    }),
    // Messages sent today
    prisma.outboxQueue.count({
      where: {
        status: 'SENT',
        sentAt: { gte: todayStart },
        lead: { workflow: { userId } },
      },
    }),
    // Total messages sent all time
    prisma.outboxQueue.count({
      where: {
        status: 'SENT',
        lead: { workflow: { userId } },
      },
    }),
    // Total leads that replied
    prisma.lead.count({
      where: {
        workflow: { userId },
        repliedAt: { not: null },
      },
    }),
    // Leads grouped by status
    prisma.lead.groupBy({
      by: ['status'],
      where: { workflow: { userId } },
      _count: { status: true },
    }),
  ]);

  const replyRate = totalLeads > 0 ? ((totalReplied / totalLeads) * 100).toFixed(1) : '0.0';

  const byStatus = leadsByStatus.reduce((acc, row) => {
    acc[row.status] = row._count.status;
    return acc;
  }, {});

  res.json({
    totalLeads,
    activeWorkflows,
    totalWorkflows,
    messagesSentToday,
    totalSent,
    totalReplied,
    replyRate: parseFloat(replyRate),
    leadsByStatus: byStatus,
  });
}

module.exports = { stats };

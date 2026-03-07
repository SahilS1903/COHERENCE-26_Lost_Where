const { Worker } = require('bullmq');
const { connection, workflowQueue } = require('../lib/redis');
const { advance } = require('../engine/workflowEngine');
const prisma = require('../lib/prisma');

const WORKFLOW_SCHEDULE_INTERVAL_MS = 30_000; // Poll every 30 seconds
const MAX_NODE_MEMORY_MB = 512; // Restart warning threshold

/**
 * Workflow Worker
 * Runs on a schedule, picks up all ACTIVE leads, and advances each through the DAG.
 */
function startWorkflowWorker() {
  // Worker that processes individual lead-advance jobs
  const worker = new Worker(
    'workflow-engine',
    async (job) => {
      const { leadId } = job.data;
      await advance(leadId);
    },
    {
      connection,
      concurrency: 10,
    }
  );

  // job completion is silent — only errors are worth seeing
  worker.on('completed', () => {});

  worker.on('failed', (job, err) => {
    console.error(`[❌ workflowWorker] Job ${job?.id} failed:`, err.message);
    console.error(`   Lead: ${job?.data?.leadId}`);
    console.error(`   Error:`, err.stack);
  });

  // Scheduler: every N seconds, find active leads and enqueue them
  setInterval(async () => {
    try {
      await scheduleActiveLeads();
    } catch (err) {
      console.error('[workflowWorker] Scheduler error:', err.message);
    }
  }, WORKFLOW_SCHEDULE_INTERVAL_MS);

  // Run immediately on start
  console.log('[🚀 workflowWorker] Starting workflow worker...');
  console.log('[⚙️  Settings] Polling interval:', WORKFLOW_SCHEDULE_INTERVAL_MS, 'ms');
  scheduleActiveLeads().catch(console.error);

  console.log('[✅ workflowWorker] Worker started successfully');
  return worker;
}

async function scheduleActiveLeads() {
  const startTime = Date.now();
  
  try {
    await workflowQueue.clean(60000, 1000, 'completed');
    await workflowQueue.clean(60000, 1000, 'failed');
  } catch (err) {
    console.error('[⚠️  SCHEDULER] Failed to clean old jobs:', err.message);
  }
  
  const activeLeads = await prisma.lead.findMany({
    where: {
      status: 'ACTIVE',
      workflow: { status: 'ACTIVE' },
    },
    select: { id: true, email: true, firstName: true },
    take: 100,
  });

  if (!activeLeads.length) return;

  const jobs = activeLeads.map((lead) => ({
    name: 'advance-lead',
    data: { leadId: lead.id },
    opts: {
      jobId: `lead-${lead.id}-${Date.now()}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  }));

  await workflowQueue.addBulk(jobs);
  const duration = Date.now() - startTime;
  console.log(`[SCHEDULER] Queued ${activeLeads.length} lead(s) in ${duration}ms — ${activeLeads.map(l => l.email).join(', ')}`);
}

module.exports = { startWorkflowWorker };

const { Redis } = require('ioredis');
const { Queue } = require('bullmq');

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

connection.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

connection.on('connect', () => {
  console.log('[Redis] Connected');
});

/**
 * Create a BullMQ Queue with shared connection
 * @param {string} name
 * @returns {Queue}
 */
function createQueue(name) {
  return new Queue(name, {
    connection,
    defaultJobOptions: {
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });
}

// Named queues
const workflowQueue = createQueue('workflow-engine');
const outboxQueue = createQueue('outbox-delivery');

module.exports = { connection, createQueue, workflowQueue, outboxQueue };

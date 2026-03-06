require('dotenv').config();
const app = require('./app');
const { startWorkflowWorker } = require('./workers/workflowWorker');
const { startOutboxWorker } = require('./workers/outboxWorker');

const PORT = process.env.PORT || 4000;

async function main() {
  // Start BullMQ workers
  startWorkflowWorker();
  startOutboxWorker();

  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

main().catch((err) => {
  console.error('[Server] Fatal error:', err);
  process.exit(1);
});

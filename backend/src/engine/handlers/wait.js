/**
 * WAIT handler
 * Suspends lead advancement until the configured duration has elapsed.
 * Node config shape: { durationMs: number }
 * The handler checks the last history entry timestamp + durationMs vs now.
 */
async function handle(lead, node, _edges, lastTransitionedAt) {
  const config = node.config || {};
  const durationMs = config.durationMs || 0;

  if (durationMs <= 0) return { advanced: true };

  const enteredAt = lastTransitionedAt ? new Date(lastTransitionedAt) : new Date();
  const readyAt = new Date(enteredAt.getTime() + durationMs);

  if (Date.now() >= readyAt.getTime()) return { advanced: true };

  return { advanced: false, reason: 'waiting', readyAt };
}

module.exports = { handle };

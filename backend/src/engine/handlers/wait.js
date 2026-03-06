/**
 * WAIT handler
 * Suspends lead advancement until the configured duration has elapsed.
 * Node config shape: { durationMs: number }
 * The handler checks the last history entry timestamp + durationMs vs now.
 */
async function handle(lead, node, _edges, lastTransitionedAt) {
  console.log(`  [⏳ WAIT] Checking wait condition for ${lead.email}`);
  
  const config = node.config || {};
  const durationMs = config.durationMs || 0;

  if (durationMs <= 0) {
    console.log(`  [⚡ No Wait] Duration is 0ms, advancing immediately`);
    return { advanced: true };
  }
  
  const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
  const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  console.log(`  [⏱️  Wait Duration] ${durationHours}h ${durationMinutes}m (${durationMs}ms)`);

  const enteredAt = lastTransitionedAt ? new Date(lastTransitionedAt) : new Date();
  const readyAt = new Date(enteredAt.getTime() + durationMs);
  
  console.log(`  [📅 Entered At] ${enteredAt.toISOString()}`);
  console.log(`  [📅 Ready At] ${readyAt.toISOString()}`);

  if (Date.now() >= readyAt.getTime()) {
    console.log(`  [✅ Wait Complete] Proceeding to next node`);
    return { advanced: true };
  }

  const remaining = Math.round((readyAt.getTime() - Date.now()) / 1000);
  const remainingHours = Math.floor(remaining / 3600);
  const remainingMinutes = Math.floor((remaining % 3600) / 60);
  const remainingSeconds = remaining % 60;
  console.log(`  [⏳ Still Waiting] ${remainingHours}h ${remainingMinutes}m ${remainingSeconds}s remaining`);
  return { advanced: false, reason: 'waiting', readyAt };
}

module.exports = { handle };

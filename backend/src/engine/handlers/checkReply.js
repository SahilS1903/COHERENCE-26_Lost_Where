/**
 * CHECK_REPLY handler
 * Checks if the lead has replied. Routes to different edges based on result.
 * Node config shape: { waitForReplyMs?: number }
 * Outgoing edges should have conditionLabel: 'replied' | 'no_reply'
 */
async function handle(lead, node, edges, lastTransitionedAt) {
  console.log(`  [🔍 CHECK REPLY] Checking for ${lead.email}`);
  
  const config = node.config || {};

  // If the lead has replied, take the 'replied' path
  if (lead.repliedAt) {
    const replyTime = new Date(lead.repliedAt);
    console.log(`  [✅ Reply Found] Lead replied at ${replyTime.toISOString()}`);
    return { advanced: true, conditionResult: 'replied' };
  }

  // If a wait window is configured, check if it has expired
  const waitMs = config.waitForReplyMs || 0;
  if (waitMs > 0) {
    const enteredAt = lastTransitionedAt ? new Date(lastTransitionedAt) : new Date();
    const deadlineAt = new Date(enteredAt.getTime() + waitMs);
    
    console.log(`  [⏰ Wait Window] ${waitMs}ms configured`);
    console.log(`  [📅 Deadline] ${deadlineAt.toISOString()}`);

    if (Date.now() < deadlineAt.getTime()) {
      const remaining = Math.round((deadlineAt.getTime() - Date.now()) / 1000);
      console.log(`  [⏳ Still Waiting] ${remaining}s remaining for reply`);
      return { advanced: false, reason: 'waiting_for_reply' };
    }
  }

  // Time window expired or no wait configured, take the 'no_reply' path
  console.log(`  [❌ No Reply] Taking no_reply path`);
  return { advanced: true, conditionResult: 'no_reply' };
}

module.exports = { handle };

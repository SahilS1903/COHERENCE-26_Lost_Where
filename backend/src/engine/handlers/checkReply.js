/**
 * CHECK_REPLY handler
 * Checks if the lead has replied. Routes to different edges based on result.
 * Node config shape: { waitForReplyMs?: number }
 * Outgoing edges should have conditionLabel: 'replied' | 'no_reply'
 */
async function handle(lead, node, edges, lastTransitionedAt) {
  const config = node.config || {};

  // Only count a reply that arrived AFTER the lead entered this node.
  // This prevents permanent repliedAt from looping the replied branch forever.
  if (lead.repliedAt) {
    const enteredAt = lastTransitionedAt ? new Date(lastTransitionedAt) : new Date(0);
    if (new Date(lead.repliedAt) > enteredAt) {
      return { advanced: true, conditionResult: 'replied' };
    }
  }

  const waitMs = config.waitForReplyMs || 0;
  if (waitMs > 0) {
    const enteredAt = lastTransitionedAt ? new Date(lastTransitionedAt) : new Date();
    const deadlineAt = new Date(enteredAt.getTime() + waitMs);
    if (Date.now() < deadlineAt.getTime()) {
      return { advanced: false, reason: 'waiting_for_reply' };
    }
  }

  return { advanced: true, conditionResult: 'no_reply' };
}

module.exports = { handle };

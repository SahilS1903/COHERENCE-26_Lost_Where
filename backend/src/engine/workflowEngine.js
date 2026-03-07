const prisma = require('../lib/prisma');

const handlers = {
  IMPORT_LEADS: require('./handlers/importLeads'),
  AI_GENERATE: require('./handlers/aiGenerate'),
  SEND_MESSAGE: require('./handlers/sendMessage'),
  WAIT: require('./handlers/wait'),
  CHECK_REPLY: require('./handlers/checkReply'),
  CONDITION: require('./handlers/condition'),
  FOLLOW_UP_LOOP: require('./handlers/followUpLoop'),
  END: require('./handlers/end'),
};

/**
 * Advance a lead by one step in the workflow DAG.
 * Loads the lead, reads the current node, executes the handler,
 * logs the transition, and advances the pointer.
 *
 * @param {string} leadId
 */
async function advance(leadId) {
  
  // Load lead with its current node and the workflow's full edge list
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      currentNode: {
        include: {
          outgoingEdges: true,
        },
      },
    },
  });

  if (!lead) {
    console.error(`[❌ ENGINE ERROR] Lead not found: ${leadId}`);
    throw new Error(`Lead not found: ${leadId}`);
  }

  if (lead.status === 'DONE' || lead.status === 'BOUNCED' || lead.status === 'PAUSED') {
    return;
  }

  if (!lead.currentNode) {
    const startNode = await prisma.node.findFirst({
      where: { workflowId: lead.workflowId },
      include: { outgoingEdges: true },
      orderBy: { positionX: 'asc' },
    });

    if (!startNode) {
      console.error(`[ENGINE] No start node for workflow ${lead.workflowId}`);
      return;
    }

    await assignNode(lead, startNode);
    return advance(leadId);
  }

  const node = lead.currentNode;
  const edges = node.outgoingEdges;

  // Get the last history entry to pass entry timestamp to handlers (WAIT, CHECK_REPLY)
  const lastHistory = await prisma.leadHistory.findFirst({
    where: { leadId, nodeId: node.id },
    orderBy: { transitionedAt: 'desc' },
  });
  const lastTransitionedAt = lastHistory?.transitionedAt;
  
  const handler = handlers[node.type];
  if (!handler) {
    console.error(`[ENGINE] No handler for node type: ${node.type}`);
    throw new Error(`No handler for node type: ${node.type}`);
  }

  let result;
  try {
    result = await handler.handle(lead, node, edges, lastTransitionedAt);
  } catch (err) {
    console.error(`[ENGINE] ${node.type} failed for ${lead.email} (retry ${lead.retryCount + 1}):`, err.message);
    const newRetryCount = lead.retryCount + 1;
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        retryCount: { increment: 1 },
        status: newRetryCount >= 5 ? 'PAUSED' : 'ACTIVE',
      },
    });
    return;
  }

  if (!result.advanced) return;

  const nextNode = resolveNextNode(edges, result.conditionResult);
  if (!nextNode) {
    await prisma.lead.update({ where: { id: leadId }, data: { status: 'DONE' } });
    return;
  }

  await assignNode(lead, nextNode, { fromNode: node.type, condition: result.conditionResult });
}

/**
 * Assign a node to a lead and log the transition.
 */
async function assignNode(lead, node, metadata = {}) {
  await prisma.$transaction([
    prisma.lead.update({
      where: { id: lead.id },
      data: { currentNodeId: node.id, retryCount: 0 },
    }),
    prisma.leadHistory.create({
      data: {
        leadId: lead.id,
        nodeId: node.id,
        metadata,
      },
    }),
  ]);
}

/**
 * Pick the correct outgoing edge given a conditionResult label.
 * If conditionResult is undefined, take the first (and usually only) edge.
 * If conditionResult IS defined but no matching edge exists, return null
 * (workflow is misconfigured — safer to stop than to take the wrong branch).
 */
function resolveNextNode(edges, conditionResult) {
  if (!edges || edges.length === 0) return null;

  if (conditionResult !== undefined) {
    const matched = edges.find(
      (e) => e.conditionLabel === conditionResult
    );
    if (matched) return { id: matched.targetNodeId };
    // No matching edge — do NOT fall back to a random edge.
    console.warn(`[ENGINE] No edge found for conditionResult="${conditionResult}". Stopping lead.`);
    return null;
  }

  // Default: take first outgoing edge
  return { id: edges[0].targetNodeId };
}

module.exports = { advance };

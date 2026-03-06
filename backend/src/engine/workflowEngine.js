const prisma = require('../lib/prisma');

const handlers = {
  IMPORT_LEADS: require('./handlers/importLeads'),
  AI_GENERATE: require('./handlers/aiGenerate'),
  SEND_MESSAGE: require('./handlers/sendMessage'),
  WAIT: require('./handlers/wait'),
  CHECK_REPLY: require('./handlers/checkReply'),
  CONDITION: require('./handlers/condition'),
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
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[🔄 WORKFLOW ENGINE] Starting advance for lead: ${leadId}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
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

  console.log(`[📋 LEAD INFO] ${lead.firstName} ${lead.lastName} (${lead.email})`);
  console.log(`[📊 STATUS] ${lead.status} | Retry Count: ${lead.retryCount}`);

  if (lead.status === 'DONE' || lead.status === 'BOUNCED') {
    console.log(`[⏭️  SKIPPING] Lead ${leadId} is ${lead.status}, no action needed`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    return;
  }

  if (lead.status === 'PAUSED') {
    console.log(`[⏸️  PAUSED] Lead ${leadId} is PAUSED, skipping execution`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    return;
  }

  if (!lead.currentNode) {
    console.log(`[🎬 WORKFLOW START] Lead has no current node, finding start node...`);
    // Lead has no current node — find the workflow's starting node
    const startNode = await prisma.node.findFirst({
      where: { workflowId: lead.workflowId },
      include: { outgoingEdges: true },
      orderBy: { positionX: 'asc' },
    });

    if (!startNode) {
      console.error(`[❌ ENGINE ERROR] No starting node found for workflow ${lead.workflowId}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      return;
    }

    console.log(`[✅ START NODE FOUND] ${startNode.type} (${startNode.label}) - ID: ${startNode.id}`);
    await assignNode(lead, startNode);
    return advance(leadId); // recurse with the assigned node
  }

  const node = lead.currentNode;
  const edges = node.outgoingEdges;

  console.log(`[📍 CURRENT NODE] ${node.type} - "${node.label}" (ID: ${node.id})`);
  console.log(`[🔗 OUTGOING EDGES] ${edges.length} edge(s) available`);
  if (node.config && Object.keys(node.config).length > 0) {
    console.log(`[⚙️  NODE CONFIG]`, JSON.stringify(node.config, null, 2));
  }

  // Get the last history entry to pass entry timestamp to handlers (WAIT, CHECK_REPLY)
  const lastHistory = await prisma.leadHistory.findFirst({
    where: { leadId, nodeId: node.id },
    orderBy: { transitionedAt: 'desc' },
  });
  const lastTransitionedAt = lastHistory?.transitionedAt;
  
  if (lastTransitionedAt) {
    const timeInNode = Date.now() - new Date(lastTransitionedAt).getTime();
    console.log(`[⏱️  TIME IN NODE] ${Math.floor(timeInNode / 1000)}s since entry`);
  }

  const handler = handlers[node.type];
  if (!handler) {
    console.error(`[❌ ENGINE ERROR] No handler for node type: ${node.type}`);
    throw new Error(`No handler for node type: ${node.type}`);
  }

  console.log(`[🚀 EXECUTING HANDLER] ${node.type}...`);
  const handlerStartTime = Date.now();

  let result;
  try {
    result = await handler.handle(lead, node, edges, lastTransitionedAt);
    const handlerDuration = Date.now() - handlerStartTime;
    console.log(`[✅ HANDLER COMPLETE] Took ${handlerDuration}ms | Advanced: ${result.advanced}`);
    if (result.conditionResult !== undefined) {
      console.log(`[🎯 CONDITION RESULT] ${result.conditionResult}`);
    }
  } catch (err) {
    console.error(`[❌ HANDLER ERROR] ${node.type} failed for lead ${leadId}:`, err.message);
    console.error(`[📚 ERROR STACK]`, err.stack);
    
    const newRetryCount = lead.retryCount + 1;
    const willPause = newRetryCount >= 5;
    console.log(`[🔄 RETRY LOGIC] Current retries: ${lead.retryCount} → ${newRetryCount}`);
    
    if (willPause) {
      console.log(`[⏸️  AUTO-PAUSING] Max retries (5) reached, pausing lead`);
    }
    
    // Increment retry count; pause if too many retries
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        retryCount: { increment: 1 },
        status: willPause ? 'PAUSED' : 'ACTIVE',
      },
    });
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    return;
  }

  if (!result.advanced) {
    console.log(`[⏳ WAITING] Handler returned advanced=false, lead stays on current node`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    return;
  }

  // Determine next node via edges
  console.log(`[🔍 RESOLVING NEXT NODE]...`);
  const nextNode = resolveNextNode(edges, result.conditionResult);
  if (!nextNode) {
    console.log(`[🏁 WORKFLOW COMPLETE] No next node found, marking as DONE`);
    await prisma.lead.update({ where: { id: leadId }, data: { status: 'DONE' } });
    console.log(`[✅ STATUS UPDATED] Lead ${leadId} → DONE`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    return;
  }

  console.log(`[➡️  ADVANCING] Moving to next node: ${nextNode.id}`);
  await assignNode(lead, nextNode, { fromNode: node.type, condition: result.conditionResult });
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

/**
 * Assign a node to a lead and log the transition.
 */
async function assignNode(lead, node, metadata = {}) {
  console.log(`[💾 ASSIGNING NODE]`);
  console.log(`  Lead: ${lead.id} (${lead.email})`);
  console.log(`  Node: ${node.id}`);
  if (Object.keys(metadata).length > 0) {
    console.log(`  Metadata:`, metadata);
  }
  
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
  
  console.log(`[✅ ASSIGNED] Lead ${lead.id} → Node ${node.id} | Retry count reset to 0`);
}

/**
 * Pick the correct outgoing edge given a conditionResult label.
 * If conditionResult is undefined, take the first (and usually only) edge.
 */
function resolveNextNode(edges, conditionResult) {
  if (!edges || edges.length === 0) return null;

  if (conditionResult !== undefined) {
    const matched = edges.find(
      (e) => e.conditionLabel === conditionResult
    );
    if (matched) return { id: matched.targetNodeId };
    // Fall back to first edge if no condition match
  }

  // Default: take first outgoing edge
  return { id: edges[0].targetNodeId };
}

module.exports = { advance };

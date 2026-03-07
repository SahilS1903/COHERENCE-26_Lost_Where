#!/usr/bin/env node
/**
 * FULL PIPELINE SETUP
 * ─────────────────────────────────────────────────────────────────
 * Creates a complete workflow with these leads and this pipeline:
 *
 *   shgsgs123@gmail.com
 *   rutvijacharya123@gmail.com
 *   pranali12chitre@gmail.com
 *
 *   IMPORT_LEADS
 *       ↓
 *   AI_GENERATE  (cold outreach email)
 *       ↓
 *   SEND_MESSAGE
 *       ↓
 *   WAIT  (1 minute)
 *       ↓
 *   CHECK_REPLY
 *       ├─ replied  → AI_GENERATE (uses reply context) → SEND_MESSAGE → END
 *       └─ no_reply → END
 *
 * Usage:  node setup_full_pipeline.js
 *         node setup_full_pipeline.js --fresh   (deletes old "OutreachPipeline" workflow first)
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const USER_ID = 'cmmfbaf490000whtrmoe7jd03'; // sahildshah1903@gmail.com
const WORKFLOW_NAME = 'OutreachPipeline';

const LEADS = [
  {
    email: 'shgsgs123@gmail.com',
    firstName: 'Shgs',
    lastName: 'User',
    company: 'Acme Corp',
    title: 'CEO',
  },
  {
    email: 'rutvijacharya123@gmail.com',
    firstName: 'Rutvij',
    lastName: 'Acharya',
    company: 'Tech Innovations',
    title: 'Founder',
  },
  {
    email: 'pranali12chitre@gmail.com',
    firstName: 'Pranali',
    lastName: 'Chitre',
    company: 'Startup Labs',
    title: 'CTO',
  },
];

const AI_CONFIG = {
  goal: 'Book a discovery call to discuss how we can help grow their business',
  product: 'AI-powered sales automation platform',
  tone: 'professional',
  senderName: 'Sahil',
  senderCompany: 'OutreachAI',
  additionalInstructions:
    'Keep the email short (under 100 words). Personalise the subject line with the company name.',
};

// ─── Helpers ─────────────────────────────────────────────────
const sep = (c = '─', n = 60) => c.repeat(n);
const ok = (m) => console.log(`  ✅  ${m}`);
const info = (m) => console.log(`  ℹ️   ${m}`);

async function run() {
  const fresh = process.argv.includes('--fresh');

  console.log('\n' + sep('═'));
  console.log('  🚀  FULL PIPELINE SETUP');
  console.log(sep('═'));

  // ── Optional: wipe old workflow ──────────────────────────
  if (fresh) {
    const old = await prisma.workflow.findFirst({
      where: { name: WORKFLOW_NAME, userId: USER_ID },
    });
    if (old) {
      console.log(`\n🗑️   Removing old "${WORKFLOW_NAME}" workflow...`);
      await prisma.leadHistory.deleteMany({ where: { lead: { workflowId: old.id } } });
      await prisma.outboxQueue.deleteMany({ where: { lead: { workflowId: old.id } } });
      await prisma.lead.deleteMany({ where: { workflowId: old.id } });
      await prisma.edge.deleteMany({ where: { workflowId: old.id } });
      await prisma.node.deleteMany({ where: { workflowId: old.id } });
      await prisma.workflow.delete({ where: { id: old.id } });
      ok('Old workflow deleted');
    }
  }

  // ── Create workflow ──────────────────────────────────────
  console.log(`\n📌  Creating workflow "${WORKFLOW_NAME}"...`);
  const workflow = await prisma.workflow.create({
    data: {
      name: WORKFLOW_NAME,
      status: 'DRAFT',
      userId: USER_ID,
    },
  });
  ok(`Workflow ID: ${workflow.id}`);

  // ── Create nodes ─────────────────────────────────────────
  console.log('\n🏗️   Creating nodes...');

  const nodeImport = await prisma.node.create({
    data: {
      workflowId: workflow.id,
      type: 'IMPORT_LEADS',
      label: 'Import Leads',
      config: {},
      positionX: 0,
      positionY: 0,
    },
  });

  const nodeAiInitial = await prisma.node.create({
    data: {
      workflowId: workflow.id,
      type: 'AI_GENERATE',
      label: 'Generate Initial Email',
      config: AI_CONFIG,
      positionX: 200,
      positionY: 0,
    },
  });

  const nodeSendInitial = await prisma.node.create({
    data: {
      workflowId: workflow.id,
      type: 'SEND_MESSAGE',
      label: 'Send Initial Email',
      config: {},
      positionX: 400,
      positionY: 0,
    },
  });

  const nodeWait = await prisma.node.create({
    data: {
      workflowId: workflow.id,
      type: 'WAIT',
      label: 'Wait 3 minutes',
      config: { durationMs: 180000 }, // 3 minutes
      positionX: 600,
      positionY: 0,
    },
  });

  const nodeCheckReply = await prisma.node.create({
    data: {
      workflowId: workflow.id,
      type: 'CHECK_REPLY',
      label: 'Check Reply',
      config: {},
      positionX: 800,
      positionY: 0,
    },
  });

  // Follow-up branch (replied)
  const nodeAiFollowUp = await prisma.node.create({
    data: {
      workflowId: workflow.id,
      type: 'AI_GENERATE',
      label: 'Generate Follow-up Reply',
      config: {
        ...AI_CONFIG,
        additionalInstructions:
          'This is a reply to their response. Reference what they said. Be warm and conversational. Keep it under 80 words.',
      },
      positionX: 1000,
      positionY: -100,
    },
  });

  const nodeSendFollowUp = await prisma.node.create({
    data: {
      workflowId: workflow.id,
      type: 'SEND_MESSAGE',
      label: 'Send Follow-up Reply',
      config: {},
      positionX: 1200,
      positionY: -100,
    },
  });

  const nodeEndReplied = await prisma.node.create({
    data: {
      workflowId: workflow.id,
      type: 'END',
      label: 'End (Replied)',
      config: {},
      positionX: 1400,
      positionY: -100,
    },
  });

  // No-reply branch
  const nodeEndNoReply = await prisma.node.create({
    data: {
      workflowId: workflow.id,
      type: 'END',
      label: 'End (No Reply)',
      config: {},
      positionX: 1000,
      positionY: 100,
    },
  });

  ok('Nodes created: IMPORT_LEADS → AI_GENERATE → SEND → WAIT → CHECK_REPLY → [follow-up | end]');

  // ── Create edges ─────────────────────────────────────────
  console.log('\n🔗  Creating edges...');

  const edges = [
    // Main path
    { sourceId: nodeImport.id,      targetId: nodeAiInitial.id,   conditionLabel: null },
    { sourceId: nodeAiInitial.id,   targetId: nodeSendInitial.id, conditionLabel: null },
    { sourceId: nodeSendInitial.id, targetId: nodeWait.id,        conditionLabel: null },
    { sourceId: nodeWait.id,        targetId: nodeCheckReply.id,  conditionLabel: null },
    // Branching from CHECK_REPLY
    { sourceId: nodeCheckReply.id,  targetId: nodeAiFollowUp.id,  conditionLabel: 'replied' },
    { sourceId: nodeCheckReply.id,  targetId: nodeEndNoReply.id,  conditionLabel: 'no_reply' },
    // Follow-up continuation
    { sourceId: nodeAiFollowUp.id,  targetId: nodeSendFollowUp.id, conditionLabel: null },
    { sourceId: nodeSendFollowUp.id, targetId: nodeEndReplied.id, conditionLabel: null },
  ];

  for (const e of edges) {
    await prisma.edge.create({
      data: {
        workflowId: workflow.id,
        sourceNodeId: e.sourceId,
        targetNodeId: e.targetId,
        conditionLabel: e.conditionLabel,
      },
    });
  }
  ok(`${edges.length} edges created`);

  // ── Create / upsert leads ────────────────────────────────
  console.log('\n👥  Adding leads...');

  for (const lead of LEADS) {
    // Remove existing leads for this email+workflow to avoid duplicates
    await prisma.outboxQueue.deleteMany({
      where: { lead: { email: lead.email, workflowId: workflow.id } },
    });
    await prisma.leadHistory.deleteMany({
      where: { lead: { email: lead.email, workflowId: workflow.id } },
    });
    await prisma.lead.deleteMany({
      where: { email: lead.email, workflowId: workflow.id },
    });

    await prisma.lead.create({
      data: {
        workflowId: workflow.id,
        email: lead.email,
        firstName: lead.firstName,
        lastName: lead.lastName,
        company: lead.company,
        customFields: { title: lead.title },
        status: 'ACTIVE',
        currentNodeId: null, // engine finds start node automatically
      },
    });

    ok(`Lead: ${lead.email} → ${lead.firstName} ${lead.lastName} @ ${lead.company}`);
  }

  // ── Activate workflow ────────────────────────────────────
  console.log('\n🟢  Activating workflow...');
  await prisma.workflow.update({
    where: { id: workflow.id },
    data: { status: 'ACTIVE' },
  });
  ok('Workflow status → ACTIVE');

  // ── Summary ──────────────────────────────────────────────
  console.log('\n' + sep('═'));
  console.log('  ✅  PIPELINE READY');
  console.log(sep('═'));
  console.log(`
  Workflow : ${workflow.name}  (ID: ${workflow.id})
  Status   : ACTIVE
  Leads    : ${LEADS.length} leads added
  Wait     : 3 minutes before reply check

  PIPELINE:
    IMPORT_LEADS
      → AI_GENERATE  (personalised cold email)
      → SEND_MESSAGE
      → WAIT 3 min
      → CHECK_REPLY
          ├─ replied   → AI_GENERATE (reply context) → SEND_MESSAGE → END
          └─ no_reply  → END

  The backend workflowWorker (30s poll) will pick this up automatically.
  Watch logs with:  cd backend && npm run dev
  Check replies:    node check_replies.js
  Full pipeline test: node test_pipeline.js
`);

  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error('\n💥  Setup failed:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});

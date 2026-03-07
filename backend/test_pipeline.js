#!/usr/bin/env node
/**
 * FULL PIPELINE TEST
 * ─────────────────────────────────────────────────────────────
 * Tests the complete workflow: SMTP send → IMAP reply detection
 *
 * Credentials: read from DATABASE (user.smtpUser / smtpPassword)
 *              NOT from .env — identical to how imapWorker works
 *
 * Steps:
 *   1. Load user credentials from DB
 *   2. Verify SMTP connection
 *   3. Connect to IMAP using the same DB credentials
 *   4. Fetch today's unread emails
 *   5. Match replies against all leads (active + done)
 *   6. Save new replies to DB
 *   7. Print a full lead status summary
 *
 * Usage:  node test_pipeline.js
 *         node test_pipeline.js --reset-lead <email>   (re-activates a lead)
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');

const prisma = new PrismaClient();

// ─── CLI flags ────────────────────────────────────────────────
const args = process.argv.slice(2);
const resetLeadEmail = args.includes('--reset-lead')
  ? args[args.indexOf('--reset-lead') + 1]
  : null;

// ─── Helpers ─────────────────────────────────────────────────
const sep = (char = '─', len = 60) => char.repeat(len);
const log = (...a) => console.log(...a);
const ok  = (msg) => log(`   ✅  ${msg}`);
const err = (msg) => log(`   ❌  ${msg}`);
const info = (msg) => log(`   ℹ️   ${msg}`);

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  log('\n' + sep('═'));
  log('  🚀  FULL PIPELINE TEST  —  credentials from DATABASE');
  log(sep('═'));

  // ── Step 1: Load user from DB ─────────────────────────────
  log('\n📦  Step 1: Load user credentials from DB');
  const users = await prisma.user.findMany({
    where: { smtpUser: { not: null }, smtpPassword: { not: null } },
    select: {
      id: true,
      email: true,
      smtpUser: true,
      smtpPassword: true,
      smtpHost: true,
      smtpPort: true,
    },
  });

  if (users.length === 0) {
    err('No users with SMTP configured found in DB');
    await prisma.$disconnect();
    return;
  }

  for (const user of users) {
    await testUser(user);
  }

  await prisma.$disconnect();
  log('\n' + sep('═') + '\n');
}

// ─── Per-user test ────────────────────────────────────────────
async function testUser(user) {
  const imapHost = (user.smtpHost || 'smtp.gmail.com').replace('smtp.', 'imap.');
  const smtpPort = user.smtpPort || 587;

  log(sep());
  log(`👤  User : ${user.email}`);
  log(`   SMTP : ${user.smtpUser}  @  ${user.smtpHost || 'smtp.gmail.com'}:${smtpPort}`);
  log(`   IMAP : ${imapHost}:993  (derived from SMTP host)`);

  // ── Optional: reset a lead for fresh testing ─────────────
  if (resetLeadEmail) {
    await resetLead(user.id, resetLeadEmail);
  }

  // ── Step 2: SMTP ──────────────────────────────────────────
  log('\n📤  Step 2: Verify SMTP connection');
  try {
    const transporter = nodemailer.createTransport({
      host: user.smtpHost || 'smtp.gmail.com',
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: user.smtpUser, pass: user.smtpPassword },
    });
    await transporter.verify();
    ok('SMTP connected');
  } catch (e) {
    err(`SMTP failed: ${e.message}`);
  }

  // ── Step 3–6: IMAP + reply detection ─────────────────────
  await testIMAPPipeline(user, imapHost);

  // ── Step 7: Lead summary ──────────────────────────────────
  await printLeadSummary(user.id);
}

// ─── Reset a single lead back to ACTIVE for testing ──────────
async function resetLead(userId, leadEmail) {
  log(`\n🔄  Resetting lead ${leadEmail} to ACTIVE for test...`);

  // Find the lead + their workflow's SEND_MESSAGE node
  const lead = await prisma.lead.findFirst({
    where: { email: leadEmail, workflow: { userId } },
    include: {
      workflow: {
        include: {
          nodes: { where: { type: 'SEND_MESSAGE' } },
        },
      },
    },
  });

  if (!lead) { err(`Lead ${leadEmail} not found`); return; }

  const sendNode = lead.workflow.nodes[0];
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: 'ACTIVE',
      currentNodeId: sendNode?.id || null,
      repliedAt: null,
      replySubject: null,
      replyBody: null,
    },
  });

  ok(`Lead reset → status: ACTIVE, node: ${sendNode?.type || 'null'}`);
}

// ─── Connect to IMAP and check replies ───────────────────────
async function testIMAPPipeline(user, imapHost) {
  log('\n📥  Step 3: Connect to IMAP (using DB credentials)');
  log(`   Connecting to ${imapHost}:993 as ${user.smtpUser}...`);

  let connection;
  try {
    connection = await imaps.connect({
      imap: {
        user: user.smtpUser,
        password: user.smtpPassword,
        host: imapHost,
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 30000,
        connTimeout: 30000,
      },
    });
    ok('IMAP connected');
  } catch (e) {
    err(`IMAP connection failed: ${e.message}`);
    return;
  }

  try {
    await connection.openBox('INBOX');

    // ── Step 4: Fetch today's unread emails ─────────────────
    log('\n📬  Step 4: Fetch today\'s unread emails');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rawMessages = await connection.search(
      ['UNSEEN', ['SINCE', today]],
      { bodies: ['HEADER', 'TEXT', ''], markSeen: false }
    );

    log(`   Found ${rawMessages.length} unread message(s) today`);

    if (rawMessages.length === 0) {
      info('No unread emails today — nothing to match against leads');
      connection.end();
      return;
    }

    // Parse emails
    const emails = [];
    for (const item of rawMessages.slice(0, 50)) {
      const all = item.parts.find((p) => p.which === '');
      const uid = item.attributes.uid;
      const mail = await simpleParser(`Imap-Id: ${uid}\r\n${all.body}`);
      emails.push({
        uid,
        from: mail.from?.text || '',
        subject: mail.subject || '',
        inReplyTo: mail.inReplyTo || null,
        references: mail.references || [],
        text: mail.text || '',
        html: mail.html || '',
        date: mail.date || new Date(),
      });
    }

    // ── Step 5: Show what was found ─────────────────────────
    log('\n📋  Step 5: Emails found today');
    emails.forEach((e, i) => {
      const replyFlag = e.inReplyTo ? '↩  reply' : '   new  ';
      log(`   [${i + 1}] ${replyFlag}  From: ${e.from}`);
      log(`         Subject: ${e.subject}`);
    });

    // ── Step 6: Match to leads ──────────────────────────────
    log('\n🔗  Step 6: Match replies to leads');
    await matchAndSaveReplies(user, emails);

    connection.end();
  } catch (e) {
    err(`IMAP error: ${e.message}`);
    try { connection.end(); } catch (_) {}
  }
}

// ─── Match emails → leads, save to DB ────────────────────────
async function matchAndSaveReplies(user, emails) {
  // Load ALL leads for this user (not just ACTIVE — test should show everything)
  const leads = await prisma.lead.findMany({
    where: { workflow: { userId: user.id } },
    include: {
      outbox: {
        where: { status: 'SENT' },
        orderBy: { sentAt: 'desc' },
        take: 1,
      },
      workflow: { select: { name: true } },
    },
  });

  log(`   Comparing ${emails.length} email(s) against ${leads.length} total lead(s)`);

  let matched = 0;

  for (const email of emails) {
    // Extract plain address from "Name <addr>" format
    const fromAddr = email.from.match(/<([^>]+)>/)?.[1] || email.from.trim();

    const lead = leads.find(
      (l) => l.email.toLowerCase() === fromAddr.toLowerCase()
    );

    if (!lead) continue; // not from any of our leads

    // Is this actually a reply to a message we sent?
    const sentMsg = lead.outbox[0];
    if (sentMsg?.messageId) {
      const isReply =
        email.inReplyTo === sentMsg.messageId ||
        (Array.isArray(email.references) && email.references.includes(sentMsg.messageId));

      if (!isReply) {
        info(`${fromAddr} — email not a reply to our message, skipping`);
        continue;
      }
    }

    matched++;
    log(`\n   📩  REPLY MATCHED!`);
    log(`      Lead     : ${lead.firstName} ${lead.lastName} <${lead.email}>`);
    log(`      Workflow : ${lead.workflow.name}`);
    log(`      Subject  : ${email.subject}`);
    log(`      Preview  : "${email.text.slice(0, 100).trim()}"`);

    if (!lead.repliedAt) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          repliedAt: email.date,
          replySubject: email.subject,
          replyBody: email.text,
        },
      });
      ok('Reply saved to DB');
    } else {
      info('Reply already recorded in DB — skipped overwrite');
    }
  }

  if (matched === 0) {
    info('No matched replies (no emails from known leads today, or Message-ID mismatch)');
  }
}

// ─── Print lead summary ───────────────────────────────────────
async function printLeadSummary(userId) {
  log('\n📊  Step 7: Lead summary');
  const leads = await prisma.lead.findMany({
    where: { workflow: { userId } },
    include: { workflow: { select: { name: true, status: true } } },
    orderBy: { createdAt: 'desc' },
    take: 15,
  });

  if (leads.length === 0) { info('No leads found'); return; }

  log('   ' + sep('-', 56));
  log(`   ${'Email'.padEnd(36)} ${'Status'.padEnd(8)} ${'Reply?'}`);
  log('   ' + sep('-', 56));

  for (const l of leads) {
    const replyCol = l.repliedAt
      ? `✅ "${(l.replyBody || '').slice(0, 25).trim()}…"`
      : '⏳ no reply';
    log(`   ${l.email.padEnd(36)} ${l.status.padEnd(8)} ${replyCol}`);
  }

  log('   ' + sep('-', 56));
  log(`   Workflow statuses:`);

  const workflows = [...new Map(leads.map((l) => [l.workflowId, l.workflow])).values()];
  // Actually we need workflowId — let's re-query
  const wfs = await prisma.workflow.findMany({
    where: { userId },
    select: { name: true, status: true, id: true },
  });
  for (const w of wfs) {
    log(`     • ${w.name} → ${w.status}`);
  }
}

// ─── Run ──────────────────────────────────────────────────────
main().catch((e) => {
  console.error('\n💥  Pipeline test crashed:', e);
  prisma.$disconnect();
  process.exit(1);
});

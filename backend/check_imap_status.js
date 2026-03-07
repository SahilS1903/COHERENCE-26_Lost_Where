const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkImapStatus() {
  try {
    console.log('🔍 Checking IMAP/Email Configuration...\n');
    
    const user = await prisma.user.findFirst({
      where: {
        smtpUser: { not: null },
        smtpPassword: { not: null },
      },
      select: {
        id: true,
        email: true,
        smtpUser: true,
        smtpHost: true,
        smtpPort: true,
        smtpSecure: true,
        smtpFromName: true,
      }
    });

    if (!user) {
      console.log('❌ No user with email configuration found!');
      console.log('\n📋 To configure email:');
      console.log('   1. Go to your Gmail settings');
      console.log('   2. Enable 2-Factor Authentication');
      console.log('   3. Generate an App Password');
      console.log('   4. Update the user record with SMTP credentials\n');
      process.exit(1);
    }

    console.log('✅ Email Configuration Found:');
    console.log('   User Email:', user.email);
    console.log('   SMTP User:', user.smtpUser);
    console.log('   SMTP Host:', user.smtpHost);
    console.log('   SMTP Port:', user.smtpPort);
    console.log('   SMTP Secure:', user.smtpSecure);
    console.log('   From Name:', user.smtpFromName || '(not set)');
    console.log('   Password:', '****** (set)');
    
    const imapHost = user.smtpHost?.replace('smtp.', 'imap.') || 'imap.gmail.com';
    console.log('\n📮 IMAP Configuration:');
    console.log('   IMAP Host:', imapHost);
    console.log('   IMAP Port: 993');
    console.log('   IMAP TLS: true');

    console.log('\n⚠️  Important for Gmail:');
    console.log('   - Make sure IMAP is enabled in Gmail settings');
    console.log('   - Use an App Password, not your regular Gmail password');
    console.log('   - Go to: https://myaccount.google.com/apppasswords');
    console.log('   - Gmail may block less secure apps by default\n');

    // Check if there are any leads awaiting replies
    const leadsAwaitingReplies = await prisma.lead.findMany({
      where: {
        workflow: { userId: user.id },
        repliedAt: null,
        status: 'ACTIVE',
      },
      include: {
        outbox: {
          where: { status: 'SENT' },
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
    });

    console.log('📊 Lead Reply Status:');
    console.log(`   Total leads awaiting replies: ${leadsAwaitingReplies.length}`);
    
    if (leadsAwaitingReplies.length > 0) {
      console.log('\n📧 Leads waiting for replies:');
      leadsAwaitingReplies.forEach(lead => {
        const lastSent = lead.outbox[0];
        console.log(`   - ${lead.email} (${lead.firstName} ${lead.lastName})`);
        if (lastSent) {
          console.log(`     Last email sent: ${new Date(lastSent.sentAt).toLocaleString()}`);
        }
      });
    }

    // Show leads that have replied
    const leadsWithReplies = await prisma.lead.findMany({
      where: {
        workflow: { userId: user.id },
        repliedAt: { not: null },
      },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        repliedAt: true,
        replySubject: true,
      },
    });

    if (leadsWithReplies.length > 0) {
      console.log('\n✅ Leads that have replied:');
      leadsWithReplies.forEach(lead => {
        console.log(`   - ${lead.email} (${lead.firstName} ${lead.lastName})`);
        console.log(`     Replied: ${new Date(lead.repliedAt).toLocaleString()}`);
        console.log(`     Subject: ${lead.replySubject}`);
      });
    } else {
      console.log('\n   No replies received yet');
    }

    await prisma.$disconnect();
    console.log('\n✅ Check complete!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkImapStatus();

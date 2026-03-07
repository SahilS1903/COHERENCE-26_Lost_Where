const { PrismaClient } = require('@prisma/client');
const { fetchUnreadEmails } = require('./src/lib/imapService');
const prisma = new PrismaClient();

async function testImap() {
  try {
    console.log('🔍 Testing IMAP connection...\n');
    
    // Get user with SMTP configured
    const user = await prisma.user.findFirst({
      where: {
        smtpUser: { not: null },
        smtpPassword: { not: null },
      },
    });

    if (!user) {
      console.error('❌ No user with SMTP credentials found!');
      process.exit(1);
    }

    console.log('📧 User:', user.email);
    console.log('📨 SMTP User:', user.smtpUser);
    console.log('🌐 SMTP Host:', user.smtpHost, '\n');

    // Derive IMAP host from SMTP host
    const imapHost = user.smtpHost?.replace('smtp.', 'imap.') || 'imap.gmail.com';
    
    const imapConfig = {
      user: user.smtpUser,
      password: user.smtpPassword,
      host: imapHost,
      port: 993,
      tls: true,
    };

    console.log('🔌 Attempting IMAP connection...');
    console.log('   Host:', imapConfig.host);
    console.log('   Port:', imapConfig.port);
    console.log('   User:', imapConfig.user);
    console.log('   TLS:', imapConfig.tls, '\n');

    const emails = await fetchUnreadEmails(imapConfig);
    
    console.log('✅ IMAP connection successful!');
    console.log(`📬 Found ${emails.length} unread email(s)\n`);

    if (emails.length > 0) {
      console.log('📧 Recent unread emails:');
      emails.slice(0, 5).forEach((email, i) => {
        console.log(`\n${i + 1}. From: ${email.from}`);
        console.log(`   Subject: ${email.subject}`);
        console.log(`   Date: ${email.date}`);
        console.log(`   Message-ID: ${email.messageId}`);
        console.log(`   Preview: ${(email.text || '').substring(0, 100)}...`);
      });
    }

    await prisma.$disconnect();
    console.log('\n✅ Test complete!');
  } catch (error) {
    console.error('\n❌ IMAP test failed:', error.message);
    console.error('\n📚 Error details:', error);
    process.exit(1);
  }
}

testImap();

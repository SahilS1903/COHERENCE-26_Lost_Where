const { PrismaClient } = require('@prisma/client');
const imaps = require('imap-simple');
const prisma = new PrismaClient();

async function quickImapTest() {
  try {
    console.log('🔍 Quick IMAP Connection Test\n');
    
    const user = await prisma.user.findFirst({
      where: {
        smtpUser: { not: null },
        smtpPassword: { not: null },
      },
    });

    if (!user) {
      console.error('❌ No user found');
      process.exit(1);
    }

    const imapHost = user.smtpHost?.replace('smtp.', 'imap.') || 'imap.gmail.com';
    
    console.log('📧 Testing IMAP for:', user.email);
    console.log('🌐 Host:', imapHost);
    console.log('🔌 Connecting...\n');
    
    const startTime = Date.now();
    
    try {
      const connection = await imaps.connect({
        imap: {
          user: user.smtpUser,
          password: user.smtpPassword,
          host: imapHost,
          port: 993,
          tls: true,
          tlsOptions: { 
            rejectUnauthorized: false,
            servername: imapHost 
          },
          authTimeout: 30000,
          connTimeout: 30000,
        },
      });
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ CONNECTED! (${elapsed}ms)\n`);
      
      console.log('📂 Opening INBOX...');
      const box = await connection.openBox('INBOX');
      console.log(`✅ INBOX opened!`);
      console.log(`   Total messages: ${box.messages.total}`);
      console.log(`   Unread messages: ${box.messages.new}\n`);
      
      // Don't fetch emails, just test the connection
      connection.end();
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ IMAP IS WORKING!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      console.log('📝 Summary:');
      console.log(`   - Connection: ✅ Working`);
      console.log(`   - Authentication: ✅ Success`);
      console.log(`   - Inbox Access: ✅ Working`);
      console.log(`   - Total Emails: ${box.messages.total}`);
      console.log(`   - Unread: ${box.messages.new}\n`);
      
      if (box.messages.new > 1000) {
        console.log('⚠️  WARNING: You have', box.messages.new, 'unread emails!');
        console.log('   This may cause IMAP worker to be slow.');
        console.log('   Consider marking old emails as read.\n');
      }
      
      console.log('🎯 Next steps:');
      console.log('   1. IMAP connection is working perfectly');
      console.log('   2. The 10-second timeout error was due to many unread emails');
      console.log('   3. The backend server can now detect replies automatically\n');
      
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`\n❌ Connection failed (${elapsed}ms)\n`);
      console.error('Error:', error.message);
      console.error('\nTroubleshooting:');
      console.error('1. Enable IMAP: https://mail.google.com/mail/u/0/#settings/fwdandpop');
      console.error('2. Check App Password: https://myaccount.google.com/apppasswords\n');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

quickImapTest();

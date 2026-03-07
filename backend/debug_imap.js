const { PrismaClient } = require('@prisma/client');
const imaps = require('imap-simple');
const prisma = new PrismaClient();

async function debugImapConnection() {
  try {
    console.log('🔍 IMAP Connection Debugger\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Get user credentials
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

    console.log('📧 User Account:');
    console.log('   Email:', user.email);
    console.log('   SMTP User:', user.smtpUser);
    console.log('   SMTP Host:', user.smtpHost);
    console.log('   SMTP Port:', user.smtpPort);
    console.log('   SMTP Secure:', user.smtpSecure);
    console.log('   Password Length:', user.smtpPassword?.length, 'characters');
    console.log('   Password Set:', user.smtpPassword ? '✅ Yes' : '❌ No');
    
    // Derive IMAP settings
    const imapHost = user.smtpHost?.replace('smtp.', 'imap.') || 'imap.gmail.com';
    
    console.log('\n📮 IMAP Configuration:');
    console.log('   Host:', imapHost);
    console.log('   Port: 993');
    console.log('   TLS: true');
    console.log('   User:', user.smtpUser);
    console.log('   Password:', '***' + user.smtpPassword?.slice(-4));
    
    console.log('\n🔌 Attempting IMAP Connection...\n');
    console.log('⏱️  Timeout: 30 seconds\n');
    
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
          debug: console.log, // Enable debug logging
        },
      });
      
      const elapsed = Date.now() - startTime;
      console.log(`\n✅ Connection successful! (${elapsed}ms)\n`);
      
      console.log('📂 Opening INBOX...');
      await connection.openBox('INBOX');
      console.log('✅ INBOX opened successfully!\n');
      
      console.log('📬 Checking for unread emails...');
      const messages = await connection.search(['UNSEEN'], {
        bodies: ['HEADER'],
        markSeen: false,
      });
      
      console.log(`✅ Found ${messages.length} unread email(s)\n`);
      
      connection.end();
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ IMAP is working correctly!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`\n❌ Connection failed after ${elapsed}ms\n`);
      console.error('Error Type:', error.constructor.name);
      console.error('Error Message:', error.message);
      console.error('Error Code:', error.code);
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔧 Troubleshooting Steps:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      if (error.message.includes('timeout')) {
        console.log('⚠️  TIMEOUT ERROR');
        console.log('\nPossible causes:');
        console.log('1. IMAP is not enabled in Gmail settings');
        console.log('   → Go to: https://mail.google.com/mail/u/0/#settings/fwdandpop');
        console.log('   → Enable IMAP under "IMAP Access"');
        console.log('\n2. Firewall blocking port 993');
        console.log('   → Check your network/firewall settings');
        console.log('\n3. Gmail is blocking the connection');
        console.log('   → Make sure you\'re using an App Password');
        console.log('   → Go to: https://myaccount.google.com/apppasswords');
      } else if (error.message.includes('auth') || error.message.includes('login')) {
        console.log('⚠️  AUTHENTICATION ERROR');
        console.log('\nPossible causes:');
        console.log('1. Incorrect App Password');
        console.log('   → Generate a new one at: https://myaccount.google.com/apppasswords');
        console.log('\n2. IMAP not enabled for this App Password');
        console.log('   → Create a new App Password specifically for "Mail"');
        console.log('\n3. 2-Factor Authentication not enabled');
        console.log('   → App Passwords require 2FA to be enabled first');
      } else {
        console.log('⚠️  UNKNOWN ERROR');
        console.log('\nFull error details:');
        console.error(error);
      }
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('\n❌ Script error:', error);
    process.exit(1);
  }
}

debugImapConnection();

// Test the email-reader with your credentials
const emailReader = require('./email-reader');

console.log('🧪 Testing Email Reader with your Gmail credentials...\n');

// Listen for messages
emailReader.on('message', (msg) => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📬 EMAIL RECEIVED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Type:', msg.type);
    console.log('From:', msg.from);
    console.log('Subject:', msg.subject);
    console.log('Date:', msg.date);
    console.log('Message-ID:', msg.messageId);
    
    if (msg.type === 'reply') {
        console.log('↪ In Reply To:', msg.originalMessageId);
    }
    
    console.log('\nBody Preview:');
    console.log(msg.body.substring(0, 200) + '...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

// Start listening
emailReader.startListening();

console.log('✅ Email reader started!');
console.log('📊 Polling for new emails every 10 seconds...');
console.log('⏸️  Press Ctrl+C to stop\n');

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping email reader...');
    emailReader.stopListening();
    process.exit(0);
});

// Keep alive for 60 seconds for testing
setTimeout(() => {
    console.log('\n⏱️  60-second test period complete');
    console.log('📋 Summary: If no messages appeared, check:');
    console.log('   1. IMAP is enabled in Gmail settings');
    console.log('   2. You have unread emails from today');
    console.log('   3. Try sending yourself a test email');
    emailReader.stopListening();
    process.exit(0);
}, 60000);

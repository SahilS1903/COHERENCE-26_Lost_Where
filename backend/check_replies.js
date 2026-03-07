const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkReplies() {
  const leadsWithReplies = await prisma.lead.findMany({
    where: {
      repliedAt: { not: null }
    },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      repliedAt: true,
      replySubject: true,
      replyBody: true,
      status: true
    },
    orderBy: { repliedAt: 'desc' }
  });
  
  console.log('📧 Leads with Replies:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (leadsWithReplies.length === 0) {
    console.log('❌ No replies detected yet in database');
    console.log('\n💡 The imapWorker runs every 60 seconds.');
    console.log('   Wait about 60 seconds and check again!');
    console.log('\n📝 We already saw a reply from Rutvij Acharya in the email-reader test!');
    console.log('   The backend imapWorker should detect it in the next cycle.\n');
  } else {
    console.log(`✅ ${leadsWithReplies.length} lead(s) replied!\n`);
    leadsWithReplies.forEach((lead, i) => {
      console.log(`${i + 1}. ${lead.firstName} ${lead.lastName} (${lead.email})`);
      console.log(`   Status: ${lead.status}`);
      console.log(`   Replied At: ${new Date(lead.repliedAt).toLocaleString()}`);
      console.log(`   Subject: ${lead.replySubject}`);
      console.log(`   Reply Preview: ${(lead.replyBody || '').substring(0, 150)}...\n`);
    });
  }
  
  await prisma.$disconnect();
}

checkReplies();

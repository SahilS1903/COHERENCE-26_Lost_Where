const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');

/**
 * Connect to IMAP server and fetch unread emails
 * @param {Object} config - IMAP configuration
 * @param {string} config.user - Email address
 * @param {string} config.password - App password  
 * @param {string} config.host - IMAP host (e.g., imap.gmail.com)
 * @param {number} config.port - IMAP port (usually 993 for SSL)
 * @param {boolean} config.tls - Use TLS (default: true)
 * @returns {Promise<Array>} Array of parsed email objects
 */
async function fetchUnreadEmails(config) {
  const connection = await imaps.connect({
    imap: {
      user: config.user,
      password: config.password,
      host: config.host || 'imap.gmail.com',
      port: config.port || 993,
      tls: config.tls !== false,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 30000, // Increased to 30 seconds
      connTimeout: 30000, // Connection timeout
    },
  });

  try {
    await connection.openBox('INBOX');

    // Only search for UNSEEN emails from today to avoid timeout on large inboxes
    const today = new Date();
    today.setHours(0, 0, 0, 0); // midnight today
    
    const searchCriteria = [
      'UNSEEN',
      ['SINCE', today]
    ];
    
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT', ''],
      markSeen: false, // Don't mark as read yet
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    
    const emails = [];

    // Limit to 50 most recent to prevent memory issues
    const recentMessages = messages.slice(0, 50);

    for (const item of recentMessages) {
      const all = item.parts.find(part => part.which === '');
      const id = item.attributes.uid;
      const idHeader = 'Imap-Id: ' + id + '\r\n';

      const mail = await simpleParser(idHeader + all.body);
      
      emails.push({
        uid: id,
        from: mail.from?.text || mail.from?.value?.[0]?.address || '',
        to: mail.to?.text || mail.to?.value?.[0]?.address || '',
        subject: mail.subject || '',
        text: mail.text || '',
        html: mail.html || '',
        date: mail.date,
        messageId: mail.messageId,
        inReplyTo: mail.inReplyTo, // Message-ID this email is replying to
        references: mail.references, // Thread of message IDs
      });
    }

    return emails;
  } finally {
    connection.end();
  }
}

/**
 * Mark email as read in IMAP
 * @param {Object} config - IMAP configuration
 * @param {number} uid - Email UID to mark as read
 */
async function markAsRead(config, uid) {
  const connection = await imaps.connect({
    imap: {
      user: config.user,
      password: config.password,
      host: config.host || 'imap.gmail.com',
      port: config.port || 993,
      tls: config.tls !== false,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 30000,
      connTimeout: 30000,
    },
  });

  try {
    await connection.openBox('INBOX');
    await connection.addFlags(uid, '\\Seen');
  } finally {
    connection.end();
  }
}

module.exports = {
  fetchUnreadEmails,
  markAsRead,
};

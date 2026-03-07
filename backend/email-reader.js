// email-reader.js
// IMAP reader that polls INBOX every 10 seconds and detects replies
// by matching the "In-Reply-To" header against stored Message-IDs.

const Imap         = require('imap');
const { simpleParser } = require('mailparser');
const EventEmitter = require('events');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

class EmailReader extends EventEmitter {
    constructor() {
        super();
        this._connected  = false;
        this._timer      = null;
        this._imap       = null;
        this._seenIds    = new Set(); // avoid re-processing
    }

    /** Create a fresh IMAP connection object */
    _createImap() {
        return new Imap({
            user:       process.env.EMAIL_USER,
            password:   process.env.EMAIL_PASS,
            host:       process.env.IMAP_HOST || 'imap.gmail.com',
            port:       parseInt(process.env.IMAP_PORT) || 993,
            tls:        true,
            tlsOptions: { rejectUnauthorized: false },
            keepalive:  false
        });
    }

    /**
     * Connect and open INBOX, then start polling.
     * Emits 'message' for every new email:
     *   { type: 'reply'|'new', from, subject, body, messageId,
     *     originalMessageId? (only when type==='reply'), date }
     */
    startListening() {
        console.log('👂 Starting IMAP listener…');
        this._connect();
    }

    _connect() {
        if (this._imap) {
            try { this._imap.destroy(); } catch (_) {}
        }

        const imap = this._createImap();
        this._imap = imap;

        imap.once('ready', () => {
            console.log('✅ IMAP connected');
            this._connected = true;
            this._openInbox(imap);
        });

        imap.on('error', (err) => {
            console.error('⚠️  IMAP error:', err.message);
            this._connected = false;
            this._scheduleReconnect();
        });

        imap.once('end', () => {
            console.log('📴 IMAP connection closed');
            this._connected = false;
        });

        imap.connect();
    }

    _scheduleReconnect() {
        console.log('🔄 Reconnecting in 15 s…');
        setTimeout(() => this._connect(), 15000);
    }

    _openInbox(imap) {
        imap.openBox('INBOX', false, (err, box) => {
            if (err) {
                console.error('Error opening INBOX:', err.message);
                return;
            }
            console.log(`📊 INBOX ready – ${box.messages.total} total messages`);
            // Poll immediately, then every 10 s
            this._poll(imap);
            this._timer = setInterval(() => this._poll(imap), 10000);
        });
    }

    _poll(imap) {
        if (!this._connected) return;

        // Only look at unseen messages from today onwards — ignores old backlog
        const since = new Date();
        since.setHours(0, 0, 0, 0); // midnight today

        imap.search(['UNSEEN', ['SINCE', since]], (err, uids) => {
            if (err) {
                console.error('Search error:', err.message);
                return;
            }
            if (!uids || uids.length === 0) return;

            // Filter already-seen in this session
            const fresh = uids.filter(id => !this._seenIds.has(id));
            if (fresh.length === 0) return;

            console.log(`📨 ${fresh.length} new message(s) found`);
            this._fetchMessages(imap, fresh);
        });
    }


    _fetchMessages(imap, uids) {
        const fetcher = imap.fetch(uids, {
            bodies: '',        // fetch entire raw message
            markSeen: true     // mark as read in IMAP
        });

        fetcher.on('message', (msg, seqno) => {
            let uid = null;
            msg.on('attributes', (attrs) => { uid = attrs.uid; });

            msg.on('body', (stream) => {
                simpleParser(stream, (err, parsed) => {
                    if (err) {
                        console.error('Parse error:', err.message);
                        return;
                    }
                    if (uid) this._seenIds.add(uid);
                    this._processMessage(parsed);
                });
            });
        });

        fetcher.once('error', (err) =>
            console.error('Fetch error:', err.message)
        );
    }

    /**
     * Inspect headers and emit the right event type.
     */
    _processMessage(parsed) {
        const from      = parsed.from?.text || 'Unknown';
        const subject   = parsed.subject    || '(no subject)';
        const body      = parsed.text || parsed.html || '';
        const messageId = parsed.messageId  || null;
        const date      = parsed.date       || new Date();

        console.log(`\n📧 Message from: ${from} | Subject: ${subject}`);

        if (parsed.inReplyTo) {
            // This is a reply
            const originalMessageId = parsed.inReplyTo.replace(/[<>]/g, '').trim();
            console.log(`   ↪ Reply to: ${originalMessageId}`);

            this.emit('message', {
                type: 'reply',
                from,
                subject,
                body,
                messageId,
                originalMessageId,
                date
            });
        } else {
            // New standalone message
            console.log('   📝 New standalone message');

            this.emit('message', {
                type: 'new',
                from,
                subject,
                body,
                messageId,
                date
            });
        }
    }

    /** Gracefully disconnect */
    stopListening() {
        clearInterval(this._timer);
        this._timer = null;
        if (this._imap) {
            try { this._imap.end(); } catch (_) {}
        }
    }
}

module.exports = new EmailReader();

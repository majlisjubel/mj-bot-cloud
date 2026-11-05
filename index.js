// 1. IMPORT MODUL UTAMA
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const { Groq } = require('groq-sdk');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 2. INISIALISASI DATABASE SQLITE
// File database akan otomatis terbuat dengan nama 'mj_memory.db' di server
const dbPath = path.resolve(__dirname, 'mj_memory.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Gagal terhubung ke SQLite:', err.message);
    } else {
        console.log('Berhasil terhubung ke database SQLite lokal.');
    }
});

// Buat tabel memori chat jika belum ada
db.run(`CREATE TABLE IF NOT EXISTS chat_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT,
    role TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// 3. INISIALISASI API (GROQ)
const GROQ_API_KEY = process.env.GROQ_API_KEY || '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';
const groq = new Groq({ apiKey: GROQ_API_KEY });

// 4. FUNGSI MANAJEMEN MEMORI (SQLITE)
function saveMemory(sender, role, content) {
    const query = `INSERT INTO chat_memory (sender, role, content) VALUES (?, ?, ?)`;
    db.run(query, [sender, role, content], (err) => {
        if (err) console.error('Gagal menyimpan memori:', err.message);
    });
}

function getRecentMemory(sender, callback) {
    // Ambil 10 percakapan terakhir untuk pengirim tertentu
    const query = `SELECT role, content FROM chat_memory WHERE sender = ? ORDER BY id DESC LIMIT 10`;
    db.all(query, [sender], (err, rows) => {
        if (err) {
            console.error('Gagal mengambil memori:', err.message);
            callback([]);
        } else {
            // Balikkan urutannya agar kronologinya sesuai (lama ke baru)
            callback(rows.reverse());
        }
    });
}

// 5. FUNGSI UTAMA BOT WHATSAPP
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('Scan QR Code di bawah ini:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut);
            console.log('Koneksi terputus. Menghubungkan ulang:', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('Bot WhatsApp MJ (SQLite Edition) Berhasil Terhubung!');
        }
    });

    // 6. HANDLER PESAN MASUK
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (!textMessage) return;

        console.log(`Pesan dari ${sender}: ${textMessage}`);

        // Ambil riwayat memori dari SQLite
        getRecentMemory(sender, async (history) => {
            try {
                // Susun prompt untuk Groq AI
                const promptMessages = [
                    { role: 'system', content: 'Anda adalah MJ, asisten AI WhatsApp yang responsif, cerdas, dan ramah. Gunakan riwayat percakapan sebelumnya jika relevan untuk menjawab.' },
                    ...history,
                    { role: 'user', content: textMessage }
                ];

                // Kirim ke Groq AI
                const chatCompletion = await groq.chat.completions.create({
                    messages: promptMessages,
                    model: 'openai/gpt-oss-20b',
                });

                const replyText = chatCompletion.choices[0]?.message?.content || 'Maaf, tidak ada respons dari model.';

                // Simpan percakapan baru ke SQLite
                saveMemory(sender, 'user', textMessage);
                saveMemory(sender, 'assistant', replyText);

                // Kirim balasan ke WhatsApp
                await sock.sendMessage(sender, { text: replyText });

            } catch (error) {
                console.error('Error pada proses bot/Groq:', error);
                await sock.sendMessage(sender, { text: 'Terjadi kesalahan saat memproses pesan.' });
            }
        });
    });
}

startBot();

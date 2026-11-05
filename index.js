// 1. IMPORT MODUL UTAMA
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const { Groq } = require('groq-sdk');
const { createClient } = require('@supabase/supabase-js');

// 2. INISIALISASI KONFIGURASI (GROQ & SUPABASE)
// Mengambil API Key dari Environment Variables di Cloud Host
const GROQ_API_KEY = process.env.GROQ_API_KEY || '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';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const groq = new Groq({ apiKey: GROQ_API_KEY });
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// 3. FUNGSI MANAJEMEN MEMORI CHAT (SUPABASE)
async function saveMemory(sender, role, content) {
    if (!supabase) return;
    try {
        await supabase.from('chat_memory').insert([{ sender, role, content }]);
    } catch (err) {
        console.error('Gagal menyimpan memori ke Supabase:', err);
    }
}

async function getRecentMemory(sender) {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase
            .from('chat_memory')
            .select('role, content')
            .eq('sender', sender)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error || !data) return [];
        return data.reverse();
    } catch (err) {
        console.error('Gagal mengambil memori dari Supabase:', err);
        return [];
    }
}

// 4. FUNGSI UTAMA BOT
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
            console.log('Bot WhatsApp MJ Cloud Edition Berhasil Terhubung!');
        }
    });

    // 5. HANDLER PESAN MASUK
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (!textMessage) return;

        console.log(`Pesan dari ${sender}: ${textMessage}`);

        try {
            // Ambil riwayat chat terdahulu dari Supabase
            const history = await getRecentMemory(sender);

            // Susun prompt pesan untuk Groq AI
            const promptMessages = [
                { role: 'system', content: 'Anda adalah MJ, asisten AI WhatsApp yang responsif, cerdas, dan ramah. Gunakan riwayat percakapan sebelumnya jika relevan untuk menjawab.' },
                ...history,
                { role: 'user', content: textMessage }
            ];

            // Kirim ke Groq API (gpt-oss-20b)
            const chatCompletion = await groq.chat.completions.create({
                messages: promptMessages,
                model: 'openai/gpt-oss-20b',
            });

            const replyText = chatCompletion.choices[0]?.message?.content || 'Maaf, tidak ada respons dari model.';

            // Simpan percakapan ke Supabase
            await saveMemory(sender, 'user', textMessage);
            await saveMemory(sender, 'assistant', replyText);

            // Balas ke WhatsApp
            await sock.sendMessage(sender, { text: replyText });

        } catch (error) {
            console.error('Error pada proses bot/Groq:', error);
            await sock.sendMessage(sender, { text: 'Terjadi kesalahan saat memproses pesan.' });
        }
    });
}

startBot();
      

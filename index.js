const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

const { handleMessage } = require('./core/router');

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
            console.log('\nScan QR Code di Termux:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut);
            console.log('Koneksi terputus. Menghubungkan ulang:', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('Bot WhatsApp MJ Modular Berhasil Terhubung!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;

        // 1. Cek apakah pesan berupa gambar (imageMessage)
        const isImage = !!msg.message.imageMessage;

        // 2. Ambil teks dari conversation, extended text, atau caption gambar/video
        const textMessage = 
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            '';

        // Jika tidak ada teks DAN bukan gambar, abaikan
        if (!textMessage && !isImage) return;

        // Cek apakah bot di-mention di dalam grup
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const mentionedJids = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const isMentioned = mentionedJids.includes(botNumber);

        console.log(`Pesan dari ${sender} (Image: ${isImage}, Mentioned: ${isMentioned}): ${textMessage || '[Media Gambar]'}`);
        
        // Kirim parameter isImage ke router.js
        await handleMessage(sock, sender, textMessage, isMentioned, isImage);
    });
}

startBot();

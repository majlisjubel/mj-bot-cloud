const { getAIResponse } = require('./ai');
const { saveMemory, getRecentMemory } = require('./memory');

const catalogSkill = require('../skills/catalog');
const stockSkill = require('../skills/stock');
const transactionSkill = require('../skills/transaction');
const analyticsSkill = require('../skills/analytics');
const adminSkill = require('../skills/admin');

async function handleMessage(sock, sender, textMessage) {
    const text = textMessage.toLowerCase();

    // 1. Cek Command Utama (Skills) - Diperluas dengan .includes() agar lebih fleksibel
    if (text.includes('katalog') || text.includes('catalog') || text.includes('menu produk')) {
        const reply = catalogSkill.execute();
        await sock.sendMessage(sender, { text: reply });
        return;
    }
    if (text.includes('stok') || text.includes('stock') || text.includes('cek stok') || text.includes('sisa barang')) {
        const reply = stockSkill.execute(text);
        await sock.sendMessage(sender, { text: reply });
        return;
    }
    if (text.includes('transaksi') || text.includes('beli') || text.includes('order') || text.includes('pesan')) {
        const reply = transactionSkill.execute(text);
        await sock.sendMessage(sender, { text: reply });
        return;
    }
    if (text.includes('analytics') || text.includes('laporan') || text.includes('penjualan')) {
        const reply = analyticsSkill.execute();
        await sock.sendMessage(sender, { text: reply });
        return;
    }
    if (text.includes('admin') || text.includes('panel')) {
        const reply = adminSkill.execute(sender);
        await sock.sendMessage(sender, { text: reply });
        return;
    }

    // 2. Integrasi Filter Produk (Project 5)
    const hasPrice = /(rp|rb|k|\d{4,})/i.test(textMessage);
    const hasIntent = /(jual|ready|mahar)\s+(akun|ml|ff)/i.test(textMessage) || /^(jual|ready|mahar)/i.test(textMessage);

    if (hasPrice && hasIntent) {
        console.log('-> [ROUTER] Terdeteksi pesan produk/penawaran.');
        await sock.sendMessage(sender, { text: 'Bot mendeteksi penawaran produk. Sedang diproses...' });
        return;
    }

    // 3. Jalur Default: Lempar ke Groq AI untuk Chat Biasa & Memori
    const history = await getRecentMemory(sender);

    const promptMessages = [
        { role: 'system', content: 'Anda adalah MJ, asisten AI WhatsApp untuk regional product distribution. Ramah, cerdas, dan membantu.' },
        ...history,
        { role: 'user', content: textMessage }
    ];

    const aiReply = await getAIResponse(promptMessages);

    saveMemory(sender, 'user', textMessage);
    saveMemory(sender, 'assistant', aiReply);

    await sock.sendMessage(sender, { text: aiReply });
}

module.exports = { handleMessage };

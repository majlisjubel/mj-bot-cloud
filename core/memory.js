const { getAIResponse } = require('./ai');
const { saveMemory, getRecentMemory } = require('./memory');

const catalogSkill = require('../skills/catalog');
const stockSkill = require('../skills/stock');
const transactionSkill = require('../skills/transaction');
const analyticsSkill = require('../skills/analytics');
const adminSkill = require('../skills/admin');

async function handleMessage(sock, sender, textMessage) {
    const text = textMessage.toLowerCase();

    if (text.startsWith('katalog') || text.includes('menu produk')) {
        const reply = catalogSkill.execute();
        await sock.sendMessage(sender, { text: reply });
        return;
    }
    if (text.startsWith('stok') || text.includes('cek stok')) {
        const reply = stockSkill.execute(text);
        await sock.sendMessage(sender, { text: reply });
        return;
    }
    if (text.startsWith('transaksi') || text.includes('beli')) {
        const reply = transactionSkill.execute(text);
        await sock.sendMessage(sender, { text: reply });
        return;
    }
    if (text.startsWith('analytics') || text.startsWith('laporan')) {
        const reply = analyticsSkill.execute();
        await sock.sendMessage(sender, { text: reply });
        return;
    }
    if (text.startsWith('admin') || text.startsWith('panel')) {
        const reply = adminSkill.execute(sender);
        await sock.sendMessage(sender, { text: reply });
        return;
    }

    getRecentMemory(sender, async (history) => {
        const promptMessages = [
            { role: 'system', content: 'Anda adalah MJ, asisten AI WhatsApp untuk regional product distribution. Ramah, cerdas, dan membantu.' },
            ...history,
            { role: 'user', content: textMessage }
        ];

        const aiReply = await getAIResponse(promptMessages);

        saveMemory(sender, 'user', textMessage);
        saveMemory(sender, 'assistant', aiReply);

        await sock.sendMessage(sender, { text: aiReply });
    });
}

module.exports = { handleMessage };
                                        

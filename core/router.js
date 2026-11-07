const { getAIResponse } = require('./ai');
const { saveMemory, getRecentMemory } = require('./memory');

const catalogSkill = require('../skills/catalog');
const stockSkill = require('../skills/stock');
const transactionSkill = require('../skills/transaction');
const analyticsSkill = require('../skills/analytics');
const adminSkill = require('../skills/admin');

// 1. Tambahkan import Product Intelligence & Database Kandidat
const { extractProductData } = require('../skills/productIntelligence');
const { saveCandidate } = require('./database'); // sesuaikan path jika file database.js ada di folder core/

async function handleMessage(sock, sender, textMessage, isMentioned = false, isImage = false) {
    const text = textMessage.toLowerCase();
    const isGroup = sender.endsWith('@g.us');

    let cleanText = text;

    // ATURAN SISTEM HYBRID UNTUK GRUP & DM
    if (isGroup) {
        // Jika di grup, wajib pakai awalan tanda seru (!) untuk perintah toko
        if (text.startsWith('!')) {
            cleanText = text.slice(1).trim(); // Buang tanda serunya
        } else if (isMentioned) {
            // Jika di grup dan bot di-mention/tag, langsung lempar ke AI untuk ngobrol santai
            const history = await getRecentMemory(sender);
            const promptMessages = [
                { role: 'system', content: 'Anda adalah MJ, asisten AI WhatsApp untuk regional product distribution. Ramah, cerdas, dan membantu di grup.' },
                ...history,
                { role: 'user', content: textMessage }
            ];
            const aiReply = await getAIResponse(promptMessages);
            saveMemory(sender, 'user', textMessage);
            saveMemory(sender, 'assistant', aiReply);
            await sock.sendMessage(sender, { text: aiReply });
            return;
        } else if (!isImage) {
            // Jika di grup, bukan perintah, bukan mention, dan BUKAN GAMBAR -> ABAIKAN
            return;
        }
    }

    // 2. JIKA PESAN BERUPA GAMBAR (Dengan atau tanpa caption), OTOMATIS MASUK KANDIDAT PRODUK
    if (isImage) {
        console.log('-> [ROUTER] Terdeteksi pesan gambar dagangan. Memproses ke Product Intelligence...');
        
        // Jalankan ekstraksi Groq AI menggunakan caption (atau teks default jika polos)
        const analysis = await extractProductData(textMessage || "Produk Gambar Tanpa Keterangan", sender);

        const productData = {
            nama_produk: analysis?.nama_produk || "Akun / Item Game (Lampiran Gambar)",
            harga: analysis?.harga || "Cek Caption/Gambar",
            deskripsi: textMessage || "Gambar produk dagangan dari member",
            penjual: sender
        };

        const savedItem = saveCandidate(productData);
        console.log('-> [SUCCESS] Kandidat produk gambar tersimpan:', savedItem.nama_produk);
        
        await sock.sendMessage(sender, { text: `✅ Produk gambar terdeteksi & masuk antrean kandidat: *${savedItem.nama_produk}*` });
        return;
    }

    // 3. Cek Command Utama (Skills) menggunakan cleanText yang sudah disaring
    if (cleanText.includes('katalog') || cleanText.includes('catalog') || cleanText.includes('menu produk')) {
        const reply = catalogSkill.execute();
        await sock.sendMessage(sender, { text: reply });
        return;
    }
    if (cleanText.includes('stok') || cleanText.includes('stock') || cleanText.includes('cek stok') || cleanText.includes('sisa barang')) {
        const reply = stockSkill.execute(textMessage);
        await sock.sendMessage(sender, { text: reply });
        return;
    }
    if (cleanText.includes('transaksi') || cleanText.includes('beli') || cleanText.includes('order') || cleanText.includes('pesan')) {
        const reply = transactionSkill.execute(textMessage);
        await sock.sendMessage(sender, { text: reply });
        return;
    }
    if (cleanText.includes('analytics') || cleanText.includes('laporan') || cleanText.includes('penjualan')) {
        const reply = analyticsSkill.execute();
        await sock.sendMessage(sender, { text: reply });
        return;
    }
    if (cleanText.includes('admin') || cleanText.includes('panel')) {
        const reply = adminSkill.execute(sender);
        await sock.sendMessage(sender, { text: reply });
        return;
    }

    // 4. Integrasi Filter Produk & Product Intelligence (Project 6) - Cadangan teks biasa
    const hasPrice = /(rp|rb|k|\d{4,})/i.test(textMessage);
    const hasIntent = /(jual|ready|mahar|allkosin|bisa|akun|ml|ff|di|caw)/i.test(textMessage) || hasPrice;

    if (hasPrice && hasIntent) {
        console.log('-> [ROUTER] Terdeteksi pesan produk/penawaran. Menjalankan AI Extraction...');
        
        const analysis = await extractProductData(textMessage, sender);

        if (analysis && analysis.isValidProduct) {
            const savedItem = saveCandidate(analysis);
            console.log('-> [SUCCESS] Kandidat produk tersimpan:', savedItem.nama_produk);
            await sock.sendMessage(sender, { text: `✅ Produk terdeteksi & masuk antrean kandidat: *${savedItem.nama_produk}* (Rp ${savedItem.harga})` });
        } else {
            console.log('-> [INFO] Filter keyword cocok, tapi AI menyatakan bukan produk valid.');
        }
        return;
    }

    // 5. Jalur Default: Lempar ke Groq AI untuk Chat Biasa & Memori (Hanya berlaku di DM atau jika di-mention)
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

const { getAIResponse } = require('./ai');
const { saveMemory, getRecentMemory } = require('./memory');

const catalogSkill = require('../skills/catalog');
const stockSkill = require('../skills/stock');
const transactionSkill = require('../skills/transaction');
const analyticsSkill = require('../skills/analytics');
const adminSkill = require('../skills/admin');

// 1. Import Product Intelligence & Market Search
const { extractProductData } = require('../skills/productIntelligence');
const { searchCandidates } = require('../skills/marketSearch'); // Modul pencarian kandidat baru
const { saveCandidate } = require('./database');

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

    // 4. FITUR BARU: MARKET SEARCH (Mencari data seller lain di candidates.json)
    // Berfungsi ketika ada yang mengetik kata kunci pencarian barang (misal: "cari akun", "ada ml", "jual ff")
    const isSearchQuery = /(cari|nyari|ada yang jual|info|ready stok|slot|cek)/i.test(cleanText);
    if (isSearchQuery) {
        console.log('-> [ROUTER] Terdeteksi niat mencari barang pasar. Memindai candidates.json...');
        const searchResults = searchCandidates(cleanText);

        if (searchResults.length > 0) {
            let responseText = "🔍 **Ketemu nih, cuy! Berdasarkan data pasar di grup:**\n\n";
            
            searchResults.slice(0, 5).forEach((item, index) => {
                responseText += `${index + 1}. *${item.nama_produk || 'Item'}*\n`;
                responseText += `   💰 Harga: ${item.harga}\n`;
                responseText += `   📝 Info: ${item.deskripsi}\n`;
                responseText += `   👤 Penjual: @${item.penjual ? item.penjual.split('@')[0] : 'Seller'}\n\n`;
            });

            responseText += "Silakan hubungi sellernya langsung ya!";
            await sock.sendMessage(sender, { text: responseText });
            return;
        }
        // Jika tidak ketemu di candidates, biarkan lanjut ke bawah (bisa ke katalog utama atau AI chat)
    }

    // 5. Integrasi Filter Produk & Product Intelligence (Cadangan teks biasa penawaran seller)
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

    // 6. Jalur Default: Lempar ke Groq AI untuk Chat Biasa & Memori (Hanya berlaku di DM atau jika di-mention)
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

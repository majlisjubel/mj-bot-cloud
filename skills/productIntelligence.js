// skills/productIntelligence.js
const { askGroq } = require('../core/ai');

/**
 * Mengekstrak informasi produk dari pesan teks mentah menggunakan Groq AI.
 * @param {string} rawText - Teks pesan dari WhatsApp
 * @param {string} senderName - Nama atau nomor pengirim (opsional untuk fallback penjual)
 * @returns {Promise<Object|null>} - JSON data produk atau null jika gagal
 */
async function extractProductData(rawText, senderName = 'Unknown') {
    const prompt = `
Kamu adalah AI Product Intelligence untuk marketplace game dan digital. Tugasmu adalah menganalisis pesan teks mentah dari WhatsApp dan mengekstrak informasi produk ke dalam format JSON murni tanpa teks pengantar.

Struktur JSON yang harus dikembalikan:
{
  "isValidProduct": true/false, // True jika pesan ini menawarkan/menjual produk, false jika chat biasa
  "nama_produk": "Nama item/game/akun secara spesifik",
  "harga": 0, // Berupa angka integer (hilangkan titik/koma/kata 'k' atau 'rb', misal 50000)
  "stok": 1, // Berupa angka integer, default 1 jika tidak disebutkan
  "penjual": "${senderName}"
}

Aturan Penting:
1. Jika pesan hanya obrolan biasa, tetapkan "isValidProduct": false dan kosongkan field lainnya.
2. Pastikan field "harga" bertipe data angka (integer).
3. Jangan sertakan markdown code blocks (\`\`\`json) jika memungkinkan, kembalikan murni string JSON atau parse dengan aman.

Pesan mentah:
"${rawText}"
    `.trim();

    try {
        const responseText = await askGroq(prompt);
        
        // Membersihkan format markdown jika model tetap mengembalikannya
        const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanJsonStr);

        return parsedData;
    } catch (error) {
        console.error('[ProductIntelligence] Gagal parsing JSON dari AI:', error.message);
        return { isValidProduct: false };
    }
}

module.exports = { extractProductData };

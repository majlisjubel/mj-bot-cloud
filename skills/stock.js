function execute(text = '') {
    const query = text.toLowerCase();

    // Data Stok Barang
    const mlStock = `🔥 *STOK AKUN MOBILE LEGENDS*:\n` +
                     `- OTW Ternama 3 (Monsep, Allkos, Free CE, Emblem Max): *READY* (Rp 80k)\n` +
                     `- OTW Ternama 5 (Monsep, Allkos, Free CE, Emblem Max): *READY* (Rp 80k)\n` +
                     `- Lance Champion (Monsep, Sgmail, Minus Plat): *READY* (Rp 80k)\n` +
                     `- Terhormat 4 (Sgmail, Minus Plat): *READY* (Rp 500k)`;

    const rokokStock = `🚬 *STOK ROKOK KHAS PACITAN*:\n` +
                       `- Rokok Raptor: *READY* (Rp 100k)\n` +
                       `- Rokok Alami: *READY* (Rp 120k)`;

    const makananStock = `🍽️ *STOK MAKANAN KHAS PACITAN*:\n` +
                        `- Tahu Tuna: *READY*\n` +
                        `- Sambel Tuna: *READY*\n` +
                        `- Abon Tuna: *READY*`;

    // 1. Jika cari stok ML khusus
    if (query.includes('ml') || query.includes('mobile legend')) {
        return mlStock;
    }

    // 2. Jika cari stok Rokok khusus
    if (query.includes('rokok') || query.includes('raptor') || query.includes('alami')) {
        return rokokStock;
    }

    // 3. Jika cari stok Makanan/Tuna khusus
    if (query.includes('makanan') || query.includes('tuna') || query.includes('tahu')) {
        return makananStock;
    }

    // 4. Default: Jika cuma ketik "stok" tanpa spesifikasi, tampilkan semua rangkuman
    return `📊 *STATUS KETERSEDIAAN STOK MJ STORE*:\n\n` +
           `${mlStock}\n\n` +
           `${rokokStock}\n\n` +
           `${makananStock}\n\n` +
           `💡 *Tips:* Anda bisa ketik *'stok ml'*, *'stok rokok'*, atau *'stok makanan'* untuk cek produk spesifik!`;
}

module.exports = { execute };

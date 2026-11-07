const fs = require('fs');
const path = require('path');

const CANDIDATES_FILE = path.join(__dirname, '../data/candidates.json');

function searchCandidates(query) {
  if (!fs.existsSync(CANDIDATES_FILE)) return [];
  
  try {
    const rawData = fs.readFileSync(CANDIDATES_FILE, 'utf-8');
    const data = JSON.parse(rawData);
    
    const rawQuery = query.toLowerCase().trim();
    
    // Daftar kata umum yang harus dibuang dari keyword pencarian
    const stopwords = ['mj', 'cari', 'nyari', 'ada', 'yang', 'info', 'cek', 'harga', 'jual', 'beli', 'dong', 'sih', 'gak', 'kah'];
    
    // Pecah query dan saring hanya kata kunci inti (misal: '80k', 'ml', 'ff')
    const keywords = rawQuery
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopwords.includes(word));

    console.log('[DEBUG MARKET] Keyword bersih:', keywords);

    // Jika setelah disaring malah kosong total, kembalikan array kosong
    if (keywords.length === 0) return [];

    const results = data.filter(item => {
      const targetString = `${item.nama_produk || ''} ${item.harga || ''} ${item.deskripsi || ''}`.toLowerCase();
      
      // Syarat: Item harus mengandung SEMUA keyword inti yang dicari (biar spesifik dan akurat)
      return keywords.every(kw => targetString.includes(kw));
    });

    console.log(`[DEBUG MARKET] Hasil filter spesifik: ${results.length} item`);
    return results;
  } catch (error) {
    console.error("[MARKET SEARCH ERROR]:", error.message);
    return [];
  }
}

module.exports = { searchCandidates };

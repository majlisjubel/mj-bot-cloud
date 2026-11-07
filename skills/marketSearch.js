const fs = require('fs');
const path = require('path');

const CANDIDATES_FILE = path.join(__dirname, '../data/candidates.json');

function searchCandidates(query) {
  if (!fs.existsSync(CANDIDATES_FILE)) {
    console.log('[DEBUG] File candidates.json tidak ditemukan di:', CANDIDATES_FILE);
    return [];
  }
  
  try {
    const rawData = fs.readFileSync(CANDIDATES_FILE, 'utf-8');
    const data = JSON.parse(rawData);
    
    console.log(`[DEBUG] Total data di candidates.json: ${data.length} item`);
    console.log(`[DEBUG] Query mentah pencarian: "${query}"`);

    const keyword = query.toLowerCase().trim();
    if (!keyword) return data.slice(0, 5); // Kalau kosong, tampilkan 5 data teratas

    const keywords = keyword.split(/\s+/).filter(word => word.length > 0);
    console.log('[DEBUG] Pecahan keyword:', keywords);

    const results = data.filter(item => {
      // Gabungkan semua field penting dari data JSON
      const name = (item.nama_produk || '').toLowerCase();
      const price = (item.harga || '').toLowerCase();
      const desc = (item.deskripsi || '').toLowerCase();
      
      const targetString = `${name} ${price} ${desc}`;
      
      // Cek apakah ada keyword yang cocok di dalam targetString
      const isMatch = keywords.some(kw => targetString.includes(kw));
      return isMatch;
    });

    console.log(`[DEBUG] Hasil pencarian yang cocok: ${results.length} item`);
    return results;
  } catch (error) {
    console.error("[DEBUG] Gagal membaca/parsing candidates.json:", error.message);
    return [];
  }
}

module.exports = { searchCandidates };

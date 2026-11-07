const fs = require('fs');
const path = require('path');

const CANDIDATES_FILE = path.join(__dirname, '../data/candidates.json');

function searchCandidates(query) {
  if (!fs.existsSync(CANDIDATES_FILE)) return [];
  
  try {
    const rawData = fs.readFileSync(CANDIDATES_FILE, 'utf-8');
    const data = JSON.parse(rawData);
    
    const rawQuery = query.toLowerCase().trim();
    const stopwords = ['mj', 'cari', 'nyari', 'ada', 'yang', 'info', 'cek', 'harga', 'jual', 'beli', 'dong', 'sih', 'gak', 'kah', 'tolong'];
    
    const keywords = rawQuery
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopwords.includes(word));

    console.log('[DEBUG MARKET] Keyword bersih:', keywords);

    if (keywords.length === 0) return data.slice(0, 5); // Default ambil 5 teratas jika keyword kosong

    // Berikan sistem skor pencocokan (relevance scoring)
    const scoredResults = data.map(item => {
      const targetString = `${item.nama_produk || ''} ${item.harga || ''} ${item.deskripsi || ''}`.toLowerCase();
      
      let score = 0;
      keywords.forEach(kw => {
        if (targetString.includes(kw)) {
          score += 1; // Tambah poin setiap keyword yang cocok
        }
      });

      return { item, score };
    });

    // Ambil item yang memiliki skor kecocokan minimal 1 (artinya ada keyword yang nyambung)
    // Urutkan dari skor yang paling tinggi ke rendah
    const matched = scoredResults
      .filter(res => res.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(res => res.item);

    console.log(`[DEBUG MARKET] Hasil filter dengan skor: ${matched.length} item`);
    return matched;
  } catch (error) {
    console.error("[MARKET SEARCH ERROR]:", error.message);
    return [];
  }
}

module.exports = { searchCandidates };

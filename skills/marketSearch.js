const fs = require('fs');
const path = require('path');

const CANDIDATES_FILE = path.join(__dirname, '../data/candidates.json');

function searchCandidates(query) {
  if (!fs.existsSync(CANDIDATES_FILE)) return [];
  
  try {
    const rawData = fs.readFileSync(CANDIDATES_FILE, 'utf-8');
    const data = JSON.parse(rawData);
    
    const rawQuery = query.toLowerCase().trim();
    
    // 1. Tangkap pola harga/nominal (misal: '80k', '90k', dll)
    const priceMatches = rawQuery.match(/(\d+k|\d+rb|\d{4,})/g) || [];
    console.log('[DEBUG MARKET] Harga terdeteksi:', priceMatches);

    // 2. Daftar stopwords (kata buangan) agar tidak ikut dihitung sebagai keyword teks
    const stopwords = ['mj', 'cari', 'cariin', 'nyari', 'ada', 'yang', 'info', 'cek', 'harga', 'jual', 'beli', 'dong', 'sih', 'gak', 'kah', 'tolong', 'akun'];
    
    // 3. Ambil sisa kata sebagai keyword tambahan (misal: 'allkos', 'minus', 'plat')
    const textKeywords = rawQuery
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopwords.includes(word) && !/(\d+k|\d+rb|\d{4,})/.test(word));
    
    console.log('[DEBUG MARKET] Keyword teks tambahan:', textKeywords);

    // Jika tidak ada harga sama sekali dan tidak ada keyword teks, hentikan pencarian
    if (priceMatches.length === 0 && textKeywords.length === 0) return [];

    // Berikan sistem skor penilaian kecocokan data
    const scoredResults = data.map(item => {
      const targetString = `${item.nama_produk || ''} ${item.harga || ''} ${item.deskripsi || ''}`.toLowerCase();
      
      let score = 0;
      let priceMatched = false;

      // Cek kecocokan harga (Bobot nilai besar jika harga cocok)
      if (priceMatches.length > 0) {
        const hasPrice = priceMatches.some(p => targetString.includes(p));
        if (hasPrice) {
          score += 10; // Poin tinggi untuk kecocokan harga
          priceMatched = true;
        } else {
          // Jika user spesifik nyari harga tertentu tapi di item ini harganya beda, berikan penalti/skor 0
          score -= 5;
        }
      } else {
        priceMatched = true; // Jika user tidak nyari harga spesifik, anggap lolos
      }

      // Cek kecocokan keyword tambahan (allkos, minus plat, dll)
      textKeywords.forEach(kw => {
        if (targetString.includes(kw)) {
          score += 5; // Tambah poin bonus untuk tiap keyword teks yang cocok
        }
      });

      return { item, score, priceMatched };
    });

    // Filter hanya ambil yang skornya positif dan memenuhi syarat harga (jika harga disertakan)
    const finalResults = scoredResults
      .filter(res => res.score > 0 && (priceMatches.length === 0 || res.priceMatched))
      .sort((a, b) => b.score - a.score) // Urutkan dari skor tertinggi
      .map(res => res.item);

    console.log(`[DEBUG MARKET] Hasil filter kombinasi: ${finalResults.length} item`);
    return finalResults;
  } catch (error) {
    console.error("[MARKET SEARCH ERROR]:", error.message);
    return [];
  }
}

module.exports = { searchCandidates };

const fs = require('fs');
const path = require('path');

const CANDIDATES_FILE = path.join(__dirname, '../data/candidates.json');

function searchCandidates(query) {
  if (!fs.existsSync(CANDIDATES_FILE)) return [];
  
  try {
    const rawData = fs.readFileSync(CANDIDATES_FILE, 'utf-8');
    const data = JSON.parse(rawData);
    
    const rawQuery = query.toLowerCase().trim();
    
    // 1. Tangkap pola harga (misal: 80k, 90k, dst)
    const priceMatches = rawQuery.match(/(\d+k|\d+rb|\d{4,})/g) || [];

    // 2. Daftar keyword kategori yang diizinkan (Game, Kondisi, Spesifikasi)
    const allowedKeywords = ['ml', 'ff', 'mobile legend', 'free fire', 'allkos', 'minus plat', 'kgm', 'free ce'];

    // Cari keyword apa saja dari daftar di atas yang disebut oleh user dalam query
    const detectedKeywords = allowedKeywords.filter(kw => rawQuery.includes(kw));

    console.log('[DEBUG MARKET] Harga:', priceMatches, '| Keyword Kategori:', detectedKeywords);

    // Jika user tidak memasukkan harga DAN tidak memasukkan keyword kategori yang valid, tolak! (Supaya gak nyari janda/ngawur)
    if (priceMatches.length === 0 && detectedKeywords.length === 0) {
      return [];
    }

    // 3. Sistem Pencocokan & Penilaian Skor
    const scoredResults = data.map(item => {
      const targetString = `${item.nama_produk || ''} ${item.harga || ''} ${item.deskripsi || ''}`.toLowerCase();
      
      let score = 0;
      let matchCount = 0;

      // Cek kecocokan harga
      if (priceMatches.length > 0) {
        const hasPrice = priceMatches.some(p => targetString.includes(p));
        if (hasPrice) {
          score += 10;
        } else {
          score -= 5; // Penalti jika harga tidak sesuai
        }
      }

      // Cek kecocokan keyword kategori (ml, ff, allkos, kgm, dll)
      // Meskipun user cuma ketik salah satu, tetap dihitung dan diberi skor!
      detectedKeywords.forEach(kw => {
        if (targetString.includes(kw)) {
          score += 5;
          matchCount += 1;
        }
      });

      return { item, score, matchCount };
    });

    // Filter: Ambil item yang skornya positif dan memiliki minimal kecocokan yang valid
    const finalResults = scoredResults
      .filter(res => res.score > 0 && (detectedKeywords.length === 0 || res.matchCount > 0 || priceMatches.length > 0))
      .sort((a, b) => b.score - a.score)
      .map(res => res.item);

    console.log(`[DEBUG MARKET] Hasil filter kategori: ${finalResults.length} item`);
    return finalResults;
  } catch (error) {
    console.error("[MARKET SEARCH ERROR]:", error.message);
    return [];
  }
}

module.exports = { searchCandidates };

const fs = require('fs');
const path = require('path');

const CANDIDATES_FILE = path.join(__dirname, '../data/candidates.json');

function searchCandidates(query) {
  if (!fs.existsSync(CANDIDATES_FILE)) return [];
  
  try {
    const rawData = fs.readFileSync(CANDIDATES_FILE, 'utf-8');
    const data = JSON.parse(rawData);
    
    const rawQuery = query.toLowerCase().trim();
    
    // Ambil pola angka atau nominal harga dari query (misal: '80k', '90k', '50000', dll)
    const priceMatch = rawQuery.match(/(\d+k|\d+rb|\d{4,})/g);
    
    if (!priceMatch) {
      // Jika user tidak menyebutkan nominal harga, kembalikan kosong atau saring kata penting
      return [];
    }

    console.log('[DEBUG MARKET] Target Harga/Nominal yang dicari:', priceMatch);

    // Filter data yang di dalam harganya atau deskripsinya mengandung nominal tersebut
    const results = data.filter(item => {
      const targetString = `${item.harga || ''} ${item.deskripsi || ''}`.toLowerCase();
      
      // Pastikan item mengandung minimal salah satu nominal harga yang dicari
      return priceMatch.some(priceKw => targetString.includes(priceKw));
    });

    console.log(`[DEBUG MARKET] Hasil filter harga: ${results.length} item`);
    return results;
  } catch (error) {
    console.error("[MARKET SEARCH ERROR]:", error.message);
    return [];
  }
}

module.exports = { searchCandidates };

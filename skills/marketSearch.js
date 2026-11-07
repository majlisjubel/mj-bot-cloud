const fs = require('fs');
const path = require('path');

// Path presisi: mengarah ke dalam folder data/candidates.json
const CANDIDATES_FILE = path.join(__dirname, '../data/candidates.json');

function searchCandidates(query) {
  if (!fs.existsSync(CANDIDATES_FILE)) return [];
  
  try {
    const rawData = fs.readFileSync(CANDIDATES_FILE, 'utf-8');
    const data = JSON.parse(rawData);
    const keyword = query.toLowerCase();
    
    // Pisahkan kata kunci pencarian menjadi array kata (minimal 2 karakter)
    const keywords = keyword.split(/\s+/).filter(word => word.length > 1);

    // Filter produk yang mengandung kecocokan di nama, harga, atau deskripsi
    const results = data.filter(item => {
      const targetString = `${item.nama_produk || ''} ${item.harga || ''} ${item.deskripsi || ''}`.toLowerCase();
      
      // Cocokkan apakah ada keyword yang nyambung dengan data pasar
      return keywords.some(kw => targetString.includes(kw));
    });

    return results;
  } catch (error) {
    console.error("Gagal membaca candidates.json:", error.message);
    return [];
  }
}

module.exports = { searchCandidates };

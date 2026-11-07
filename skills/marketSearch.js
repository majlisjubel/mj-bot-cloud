const fs = fse = require('fs');
const path = require('path');
const CANDIDATES_FILE = path.join(__dirname, '../candidates.json'); // Sesuaikan path jika di dalam folder skills

function searchCandidates(query) {
  if (!fs.existsSync(CANDIDATES_FILE)) return [];
  
  try {
    const data = JSON.parse(fs.readFileSync(CANDIDATES_FILE, 'utf-8'));
    const keyword = query.toLowerCase();

    // Filter produk dari candidates.json yang mengandung keyword pencarian
    const results = data.filter(item => {
      const nameMatch = item.nama_produk && item.nama_produk.toLowerCase().includes(keyword);
      const descMatch = item.deskripsi && item.deskripsi.toLowerCase().includes(keyword);
      return nameMatch || descMatch;
    });

    return results;
  } catch (error) {
    console.error("Gagal membaca candidates.json:", error.message);
    return [];
  }
}

module.exports = { searchCandidates };
    

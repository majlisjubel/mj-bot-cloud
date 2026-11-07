const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/candidates.json');

function initStorage() {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    }
}

function getCandidates() {
    initStorage();
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('[DB] Gagal membaca data:', error.message);
        return [];
    }
}

function saveCandidate(productData) {
    initStorage();
    const candidates = getCandidates();
    
    const newEntry = {
        id: Date.now(),
        ...productData,
        status: 'pending',
        created_at: new Date().toISOString()
    };

    candidates.push(newEntry);
    fs.writeFileSync(filePath, JSON.stringify(candidates, null, 2));
    console.log('[DB] Kandidat produk berhasil disimpan:', newEntry.nama_produk);
    return newEntry;
}

module.exports = { getCandidates, saveCandidate };
  

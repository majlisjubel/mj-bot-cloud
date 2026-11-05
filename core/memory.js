const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Gagal konek SQLite:', err.message);
    else console.log('Database SQLite terhubung.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS chat_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender TEXT,
        role TEXT,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

function saveMemory(sender, role, content) {
    db.run(`INSERT INTO chat_memory (sender, role, content) VALUES (?, ?, ?)`, [sender, role, content]);
}

// Diubah jadi Promise supaya sinkron dengan await di router
function getRecentMemory(sender) {
    return new Promise((resolve) => {
        db.all(`SELECT role, content FROM chat_memory WHERE sender = ? ORDER BY id DESC LIMIT 10`, [sender], (err, rows) => {
            if (err || !rows) {
                resolve([]);
            } else {
                resolve(rows.reverse());
            }
        });
    });
}

module.exports = { db, saveMemory, getRecentMemory };

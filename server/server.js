const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer  = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Directories
const LIBRARY_DIR = path.join(__dirname, 'library');
const DATA_DIR = path.join(__dirname, 'data');
const CLIENT_DIR = path.join(__dirname, '..'); // Points to the main Kikiyomi UI folder

// Ensure required directories exist
if (!fs.existsSync(LIBRARY_DIR)) fs.mkdirSync(LIBRARY_DIR);
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, LIBRARY_DIR)
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
});
const upload = multer({ storage: storage });

// Utility for zero-dependency JSON database routing
const getDbPath = (name) => path.join(DATA_DIR, `${name}.json`);

const readDb = (name, defaultData = {}) => {
    const file = getDbPath(name);
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch(e) {
        console.error(`Error parsing ${name}.json`, e);
        return defaultData;
    }
};

const writeDb = (name, data) => {
    fs.writeFileSync(getDbPath(name), JSON.stringify(data, null, 2));
};

// ==========================================
// API Routes
// ==========================================

// 1. Check Server Status
app.get('/api/status', (req, res) => {
    res.json({ ok: true, version: '1.0.0', library: fs.readdirSync(LIBRARY_DIR).length });
});

// 2. Fetch Library
app.get('/api/library', (req, res) => {
    try {
        const files = fs.readdirSync(LIBRARY_DIR);
        const map = new Map();

        // Group files by base name (without extension)
        files.forEach(f => {
            if (f.startsWith('.')) return; // Ignore hidden files
            const ext = path.extname(f).toLowerCase();
            const base = path.basename(f, ext);
            
            if (!map.has(base)) {
                map.set(base, { title: base, type: 'unknown', audioUrl: null, srtUrl: null, epubUrl: null, coverUrl: null });
            }
            
            const entry = map.get(base);
            const url = `/media/${encodeURIComponent(f)}`;
            
            if (['.mp3', '.m4b', '.m4a', '.aac'].includes(ext)) {
                entry.audioUrl = url;
                entry.type = 'audio';
            } else if (ext === '.srt') {
                entry.srtUrl = url;
            } else if (ext === '.epub') {
                entry.epubUrl = url;
                entry.type = 'epub';
            } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
                entry.coverUrl = url;
            }
        });

        // Filter valid entries (Must have an EPUB, or an Audio file)
        const library = Array.from(map.values()).filter(e => 
            e.epubUrl !== null || e.audioUrl !== null
        );

        res.json(library);
    } catch(e) {
        console.error("Library scan failed:", e);
        res.status(500).json({ error: 'Failed to scan library directory' });
    }
});

// 3. Sync Endpoints (Read/Write)
app.get('/api/sync/:key', (req, res) => {
    const key = req.params.key;
    // Keys allowed: 'stats', 'mining', 'metadata'
    const validKeys = ['ky_daily_stats', 'ky_mining_history', 'ky_metadata'];
    if (!validKeys.includes(key)) return res.status(400).json({ error: 'Invalid sync key' });
    
    // Convert 'ky_metadata' to just 'metadata' for file naming context
    const dbName = key.replace('ky_', '');
    const data = readDb(dbName, key.includes('history') || key.includes('metadata') ? [] : {});
    res.json(data);
});

app.post('/api/sync/:key', (req, res) => {
    const key = req.params.key;
    const validKeys = ['ky_daily_stats', 'ky_mining_history', 'ky_metadata'];
    if (!validKeys.includes(key)) return res.status(400).json({ error: 'Invalid sync key' });
    
    if (!req.body) return res.status(400).json({ error: 'Missing body' });

    const dbName = key.replace('ky_', '');
    writeDb(dbName, req.body);
    res.json({ success: true });
});

// 4. File Upload Endpoint
app.post('/api/upload', upload.array('files', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files were uploaded.' });
        }
        console.log(`Received upload: ${req.files.map(f => f.originalname).join(', ')}`);
        res.json({ success: true, files: req.files.map(f => f.originalname) });
    } catch(e) {
        console.error("Upload failed", e);
        res.status(500).json({ error: 'File upload failed' });
    }
});

// ==========================================
// Static File Hosting
// ==========================================

// Serve the media library dynamically via a static route
app.use('/media', express.static(LIBRARY_DIR));

// Serve the main Kikiyomi Frontend App files
// Note: We avoid serving the `server/` or `.git/` directories
app.use(express.static(CLIENT_DIR, {
    index: ['index.html'],
    setHeaders: (res, path, stat) => {
        // Prevent caching for active dev iteration if needed, or cache media
    }
}));

// Fallback for SPA (Regex match for anything that isn't an API route)
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(CLIENT_DIR, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`\n==============================================`);
    console.log(`🌸 Kikiyomi Server is running on port ${PORT}`);
    console.log(`==============================================\n`);
    console.log(`Place your media (EPUB, MP3, M4B, SRT) in:`);
    console.log(`-> ${LIBRARY_DIR}\n`);
    console.log(`Access the Web Player at:`);
    console.log(`-> http://localhost:${PORT}\n`);
});

import { ServerApi } from './ServerApi';

export const DB = {
    db: null,
    async init() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('KikiYomiDB', 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('metadata')) db.createObjectStore('metadata', { keyPath: 'id' });
            };
            req.onsuccess = (e) => { this.db = e.target.result; resolve(); };
            req.onerror = (e) => reject(e);
        });
    },
    async saveMetadata(book) {
        // Strip out binary blobs/handles to avoid huge JSON payloads when syncing
        const safeBook = { ...book };
        if (safeBook.cover && safeBook.cover.blob) delete safeBook.cover.blob;
        if (safeBook.handle) delete safeBook.handle;
        
        // Sync to server if possible
        if (ServerApi.isAvailable) {
            const allBooks = await this.getAllMetadata(true); // Get current clean list
            const idx = allBooks.findIndex(b => b.id === book.id);
            if (idx > -1) allBooks[idx] = safeBook; else allBooks.push(safeBook);
            ServerApi.syncUp('ky_metadata', allBooks);
        }

        const tx = this.db.transaction('metadata', 'readwrite');
        tx.objectStore('metadata').put(book);
        return new Promise(r => tx.oncomplete = r);
    },
    async deleteMetadata(id) {
        if (ServerApi.isAvailable) {
            const allBooks = await this.getAllMetadata(true);
            ServerApi.syncUp('ky_metadata', allBooks.filter(b => b.id !== id));
        }
        const tx = this.db.transaction('metadata', 'readwrite');
        tx.objectStore('metadata').delete(id);
        return new Promise(r => tx.oncomplete = r);
    },
    async getAllMetadata(skipServerCheck = false) {
        return new Promise(async r => {
            if (!skipServerCheck && ServerApi.isAvailable) {
                const serverData = await ServerApi.syncDown('ky_metadata');
                if (serverData && serverData.length > 0) return r(serverData);
            }
            const req = this.db.transaction('metadata').objectStore('metadata').getAll();
            req.onsuccess = () => r(req.result);
        });
    }
};

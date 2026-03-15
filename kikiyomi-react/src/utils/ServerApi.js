export const ServerApi = {
    isAvailable: false,
    async checkStatus() {
        try {
            const res = await fetch('/api/status');
            if (res.ok) this.isAvailable = true;
        } catch(e) { this.isAvailable = false; }
        return this.isAvailable;
    },
    async syncUp(key, data) {
        if (!this.isAvailable) return;
        try {
            await fetch(`/api/sync/${key}`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch(e) { console.warn("Sync failed:", e); }
    },
    async syncDown(key) {
        if (!this.isAvailable) return null;
        try {
            const res = await fetch(`/api/sync/${key}`);
            if (res.ok) return await res.json();
        } catch(e) { console.warn("Fetch failed:", e); }
        return null;
    }
};

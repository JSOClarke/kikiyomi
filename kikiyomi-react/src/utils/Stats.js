export const Stats = {
    getTodayKey() { 
        const d = new Date(); 
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; 
    },
    getDailyStats() { 
        try { return JSON.parse(localStorage.getItem('ky_daily_stats') || '{}'); } 
        catch (e) { return {}; } 
    },
    saveDailyStats(s) { 
        localStorage.setItem('ky_daily_stats', JSON.stringify(s)); 
        this.syncServerStats(s);
    },
    async syncServerStats(stats) {
        if (!window.ServerApi || !window.ServerApi.isAvailable) return;
        await window.ServerApi.syncUp('ky_daily_stats', stats);
    },
    async loadServerStats() {
        if (!window.ServerApi || !window.ServerApi.isAvailable) return;
        const serverStats = await window.ServerApi.syncDown('ky_daily_stats');
        if (serverStats) {
            localStorage.setItem('ky_daily_stats', JSON.stringify(serverStats));
        }
    },
    addProgress(words, chars, msTime) {
        const today = this.getTodayKey();
        const stats = this.getDailyStats();
        if (!stats[today]) stats[today] = { words: 0, chars: 0, time: 0 };
        if (words > 0) stats[today].words += words;
        if (chars > 0) stats[today].chars = (stats[today].chars || 0) + chars;
        if (msTime > 0) stats[today].time += msTime;
        this.saveDailyStats(stats);
    },
    getStreak() {
        const stats = this.getDailyStats();
        let streak = 0;
        const d = new Date();
        const formatD = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
        
        let checkStr = formatD(d);
        
        if (!stats[checkStr] || ((stats[checkStr].words || 0) === 0 && (stats[checkStr].chars || 0) === 0 && Math.floor(stats[checkStr].time / 60000) === 0)) {
            d.setDate(d.getDate() - 1);
            checkStr = formatD(d);
            if (!stats[checkStr] || ((stats[checkStr].words || 0) === 0 && (stats[checkStr].chars || 0) === 0 && Math.floor(stats[checkStr].time / 60000) === 0)) return 0;
        }
        
        while (true) {
            if (stats[checkStr] && ((stats[checkStr].words || 0) > 0 || (stats[checkStr].chars || 0) > 0 || Math.floor(stats[checkStr].time / 60000) > 0)) {
                streak++;
                d.setDate(d.getDate() - 1);
                checkStr = formatD(d);
            } else {
                break;
            }
        }
        return streak;
    }
};

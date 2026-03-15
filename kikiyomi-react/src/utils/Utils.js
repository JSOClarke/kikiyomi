export const Utils = {
    async read(file, start, len) {
        if (start >= file.size) throw new Error("OOB");
        const chunk = file.slice(start, start + len);
        return new DataView(await chunk.arrayBuffer());
    },
    readStr(view, offset, len) {
        return new TextDecoder().decode(new Uint8Array(view.buffer, offset, len));
    },
    fmtTime(s) {
        if (isNaN(s)) return "00:00";
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = Math.floor(s % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
        return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
    }
};

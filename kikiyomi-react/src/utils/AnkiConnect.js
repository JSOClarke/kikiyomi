export const AnkiConnect = {
    async invoke(action, params = {}) {
        try {
            const response = await fetch('http://127.0.0.1:8765', {
                method: 'POST',
                body: JSON.stringify({ action, version: 6, params })
            });
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            return result.result;
        } catch (e) {
            console.warn("AnkiConnect:", e.message);
            return null;
        }
    },
    async getLastCreatedCardId() {
        const cards = await this.invoke('findCards', { query: 'added:1' });
        if (!cards || cards.length === 0) return null;
        return Math.max(...cards);
    },
    async addAudioToCard(cardId, audioSource, filename, targetField, isUrl = false) {
        const cardInfo = await this.invoke('cardsInfo', { cards: [cardId] });
        if (!cardInfo || cardInfo.length === 0) return false;
        
        const noteId = cardInfo[0].note;
        const noteInfo = await this.invoke('notesInfo', { notes: [noteId] });
        if (!noteInfo || noteInfo.length === 0) return false;
        
        const fields = noteInfo[0].fields;

        // Use the user-configured field if it exists on the note, otherwise auto-detect
        let audioField = targetField && fields[targetField] !== undefined ? targetField : null;
        if (!audioField) {
            for (const key of Object.keys(fields)) {
                if (key.toLowerCase().includes('audio') || key.toLowerCase().includes('sound') || key.toLowerCase().includes('voice')) {
                    audioField = key;
                    break;
                }
            }
        }
        if (!audioField) audioField = Object.keys(fields)[0]; 
        
        const mediaParams = isUrl ? { filename, url: audioSource } : { filename, data: audioSource };
        const storedFilename = await this.invoke('storeMediaFile', mediaParams);
        if (!storedFilename) return false;
        
        const currentContent = fields[audioField].value;
        const newContent = currentContent + ` [sound:${storedFilename}]`;
        
        await this.invoke('updateNoteFields', {
            note: { id: noteId, fields: { [audioField]: newContent } }
        });
        return audioField; // Return field name for toast message
    },
    async addCoverToCard(cardId, coverBlob, storedFilename, targetField) {
        // Gets the note and updates the picture field with an <img> tag
        const cardInfo = await this.invoke('cardsInfo', { cards: [cardId] });
        if (!cardInfo || cardInfo.length === 0) return false;
        const noteId = cardInfo[0].note;
        const noteInfo = await this.invoke('notesInfo', { notes: [noteId] });
        if (!noteInfo || noteInfo.length === 0) return false;
        const fields = noteInfo[0].fields;

        let picField = targetField && fields[targetField] !== undefined ? targetField : null;
        if (!picField) {
            for (const key of Object.keys(fields)) {
                if (key.toLowerCase().includes('picture') || key.toLowerCase().includes('image') || key.toLowerCase().includes('photo')) {
                    picField = key; break;
                }
            }
        }
        if (!picField) return false;

        // Upload if not already cached
        let filename = storedFilename;
        if (!filename) {
            const base64 = await new Promise((res, rej) => {
                const reader = new FileReader();
                reader.readAsDataURL(coverBlob);
                reader.onloadend = () => res(reader.result.split(',')[1]);
                reader.onerror = rej;
            });
            const ext = coverBlob.type.includes('png') ? 'png' : 'jpg';
            const proposed = `kikiyomi_cover_${Date.now()}.${ext}`;
            filename = await this.invoke('storeMediaFile', { filename: proposed, data: base64 });
            if (!filename) return false;
        }

        const imgTag = `<img src="${filename}">`;
        await this.invoke('updateNoteFields', {
            note: { id: noteId, fields: { [picField]: imgTag } }
        });
        return filename; // Return stored filename for caching
    }
};

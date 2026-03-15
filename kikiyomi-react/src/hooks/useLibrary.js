import { useState, useCallback, useEffect } from 'react';
import { ServerApi } from '../utils/ServerApi';
import { DB } from '../utils/DB';

export function useLibrary() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchLibrary = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!ServerApi.isAvailable) {
                // If server is not ready, we can't reliably load books, but we can try to fall back to history
                const localMeta = await DB.getAllMetadata();
                setBooks(localMeta);
                setLoading(false);
                return;
            }

            // Fetch server books
            const serverBooks = await ServerApi.fetchLibrary();
            
            // Fetch local metadata (progress, bookmarks, custom covers)
            const allLocalMeta = await DB.getAllMetadata();

            // Merge server books with local metadata overrides
            const mergedBooks = serverBooks.map(sb => {
                const id = 'server_' + sb.title;
                const localBook = allLocalMeta.find(b => b.id === id) || {
                    id, title: sb.title, type: sb.type, isServer: true,
                    isTextOnly: sb.type === 'epub',
                    progress: 0, duration: 0, lastPlayed: 0
                };
                
                // Server URLs supersede local values for these
                return {
                    ...localBook,
                    coverUrl: sb.coverUrl,
                    type: sb.type,
                    audioUrl: sb.audioUrl,
                    epubUrl: sb.epubUrl,
                    srtUrl: sb.srtUrl
                };
            });

            // Sort by most recently played
            mergedBooks.sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
            setBooks(mergedBooks);
        } catch (err) {
            console.error("Failed to fetch library", err);
            setError("Failed to load library.");
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteBook = useCallback(async (id) => {
        setBooks(prev => prev.filter(b => b.id !== id));
        await DB.deleteMetadata(id);
        const activeId = localStorage.getItem('activeBookId');
        if (activeId === id) {
            await DB.clearActive();
            localStorage.removeItem('activeBookId');
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchLibrary();
    }, [fetchLibrary]);

    return { books, loading, error, refreshLibrary: fetchLibrary, deleteBook };
}

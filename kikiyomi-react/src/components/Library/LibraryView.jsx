import React, { useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Utils } from '../../utils/Utils';
import { Stats } from '../../utils/Stats';
import Dropzone from './Dropzone';

export default function LibraryView() {
    const { library, setView, setCurrentBook } = useAppContext();
    const { books, loading, error, deleteBook } = library;

    // Computed Dashboard Stats
    const dashboard = useMemo(() => {
        const today = Stats.getTodayKey();
        const stats = Stats.getDailyStats()[today] || { words: 0, chars: 0, time: 0 };
        const streak = Stats.getStreak();
        return {
            words: Math.floor(stats.words || 0).toLocaleString(),
            chars: Math.floor(stats.chars || 0).toLocaleString(),
            time: Math.floor(stats.time / 60000) + 'm',
            streak: streak + (streak > 0 ? ' 🔥' : ' 🧊')
        };
    }, []);

    const handlePlayBook = (book) => {
        setCurrentBook(book);
        setView('player'); // Navigate to player
    };

    return (
        <div id="view-library">
            <div style={{ textAlign: 'center', marginBottom: '30px', marginTop: '20px' }}>
                <div style={{ color: '#666', fontSize: '0.9rem', marginTop: '5px' }}>
                    Immersive Audiobook & Reader Player
                </div>
            </div>

            <div className="dash-container">
                <div className="dash-card">
                    <div className="dash-card-val">{dashboard.words}</div>
                    <div className="dash-card-label">Words</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-val">{dashboard.chars}</div>
                    <div className="dash-card-label">Characters</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-val">{dashboard.time}</div>
                    <div className="dash-card-label">Time</div>
                </div>
                <div className="dash-card">
                    <div className="dash-card-val">{dashboard.streak}</div>
                    <div className="dash-card-label">Streak</div>
                </div>
            </div>

            <Dropzone />

            <div id="library-list">
                {loading && <div className="spinner" style={{ margin: '40px auto' }}></div>}
                
                {error && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--error)' }}>{error}</div>}

                {!loading && !error && books.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                        Library is empty. Drop media files above to upload them to the server.
                    </div>
                )}

                {!loading && books.map(book => {
                    const activeId = localStorage.getItem('activeBookId');
                    const isActive = book.id === activeId;
                    const durPct = book.duration > 0 ? (book.progress / book.duration * 100).toFixed(1) : 0;
                    const totalWords = book.totalWords || 0;
                    const readWords = book.readWords || 0;
                    
                    const progressStr = (book.type === 'epub' || book.isTextOnly)
                        ? `Line ${Math.floor(book.progress || 0)} / ${Math.floor(book.duration || 0)}`
                        : `${Utils.fmtTime(book.progress)} / ${Utils.fmtTime(book.duration)}`;

                    return (
                        <div key={book.id} className={`lib-item ${isActive ? 'active-book' : ''}`}>
                            <div 
                                style={{ display: 'flex', alignItems: 'center', flex: 1, height: '100%', overflow: 'hidden', cursor: 'pointer' }} 
                                onClick={() => handlePlayBook(book)}
                            >
                                {book.coverUrl ? (
                                    <img className="lib-cover" src={book.coverUrl} alt="Cover" />
                                ) : (
                                    <div className="lib-cover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                        NO COVER
                                    </div>
                                )}
                                
                                <div className="lib-info">
                                    <div className="lib-title">{book.title}</div>
                                    <div className="lib-meta">
                                        {progressStr} 
                                        {book.isTextOnly && <span className="badge" style={{ background: 'rgba(3,218,198,0.2)', color: '#03dac6', border: '1px solid #03dac6', marginLeft: '5px' }}>Reader</span>}
                                        {isActive && <span className="badge playing" style={{ marginLeft: '5px' }}>Now Playing</span>}
                                    </div>
                                    {totalWords > 0 && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            {readWords.toLocaleString()} / {totalWords.toLocaleString()} words
                                        </div>
                                    )}
                                    <div className="progress-bar-mini">
                                        <div className="progress-fill-mini" style={{ width: `${durPct}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', height: '100%' }}>
                                <button 
                                    className="del-btn" 
                                    title="Delete History" 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if (window.confirm(`Are you sure you want to delete ${book.title}?`)) {
                                            deleteBook(book.id); 
                                        }
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

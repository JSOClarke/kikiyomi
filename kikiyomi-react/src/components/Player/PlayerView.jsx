import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { useSubtitles } from '../../hooks/useSubtitles';
import { Utils } from '../../utils/Utils';
import { TTS } from '../../utils/Parsers/TTS';
import { DB } from '../../utils/DB';
import { ServerApi } from '../../utils/ServerApi';
// Import Parsons
import { EPUBParser } from '../../utils/Parsers/EPUBParser';
import { SRTParser } from '../../utils/Parsers/SRTParser';

export default function PlayerView() {
    const { currentBook, setView, settings, setIsFocusMode } = useAppContext();
    const [loading, setLoading] = useState(true);
    const [subs, setSubs] = useState([]);
    const [bookData, setBookData] = useState(null);
    const [progress, setProgress] = useState(currentBook?.progress || 0);

    const { 
        audioRef, isPlaying, currentTime, duration, togglePlay, seek, setIsPlaying 
    } = useAudioPlayer({ 
        meta: currentBook, 
        onProgressUpdate: setProgress 
    });

    const { 
        activeIndex, activeSub, getNextSubTime, getPrevSubTime, getReplaySubTime 
    } = useSubtitles({ 
        subs, 
        currentTime: currentBook?.isTextOnly ? progress : currentTime, 
        isTextOnly: currentBook?.isTextOnly,
        settings 
    });

    const activeSubRef = useRef(null);

    // Initial Loading & Parsing
    useEffect(() => {
        let mounted = true;
        
        const loadMedia = async () => {
            if (!currentBook) return;
            setLoading(true);
            
            try {
                let loadedSubs = [];
                let loadedBookData = null;

                if (currentBook.isTextOnly && currentBook.epubUrl) {
                    // Fetch EPUB and parse
                    const r = await fetch(currentBook.epubUrl);
                    const b = await r.blob();
                    // EPUB parser needs file object mock
                    b.name = 'book.epub';
                    const data = await EPUBParser.parse(b);
                    loadedSubs = data.subs;
                    loadedBookData = data;
                } else {
                    // Audio Book
                    // Fetch SRT if exists
                    if (currentBook.srtUrl) {
                        try {
                            const r = await fetch(currentBook.srtUrl);
                            const b = await r.blob();
                            loadedSubs = await SRTParser.parse(b);
                        } catch(e) { console.error("SRT fetch error", e); }
                    }
                }

                if (mounted) {
                    setSubs(loadedSubs);
                    setBookData(loadedBookData);
                    setLoading(false);
                }

            } catch (err) {
                console.error("Failed to load book media", err);
                if (mounted) setLoading(false);
            }
        };

        loadMedia();
        return () => { mounted = false; };
    }, [currentBook]);

    // Scroll active subtitle into view
    useEffect(() => {
        if (activeSubRef.current && settings.showSubProgress) {
            activeSubRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [activeIndex, settings.showSubProgress]);

    // Auto-save progress
    useEffect(() => {
        if (!currentBook) return;
        const timeToSave = currentBook.isTextOnly ? progress : currentTime;
        
        // Save roughly every 5 seconds of difference
        if (Math.abs(timeToSave - (currentBook.progress || 0)) > 5) {
            currentBook.progress = timeToSave;
            currentBook.lastPlayed = Date.now();
            DB.saveMetadata(currentBook);
        }
    }, [currentTime, progress, currentBook]);

    if (!currentBook) {
        return <div className="p-4 flex justify-center"><button onClick={() => setView('library')} className="btn">Back to Library</button></div>;
    }

    const tCurr = currentBook.isTextOnly ? progress : currentTime;
    const tTotal = currentBook.isTextOnly ? (currentBook.duration || 1) : (duration || 1);
    const fillPct = (tCurr / tTotal) * 100;

    return (
        <div id="view-player" className={currentBook.isTextOnly ? "mode-reader" : ""} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Hidden Audio Element for Media */}
            {!currentBook.isTextOnly && currentBook.audioUrl && (
                <audio ref={audioRef} src={currentBook.audioUrl} preload="auto"></audio>
            )}

            <div className="player-header" style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                <button className="btn" onClick={() => {
                    // Final save on exit
                    currentBook.progress = currentBook.isTextOnly ? progress : currentTime;
                    currentBook.lastPlayed = Date.now();
                    DB.saveMetadata(currentBook);
                    setView('library');
                }}>← Back</button>
                <h2 id="player-title" style={{ margin: 0, fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>
                    {currentBook.title}
                </h2>
                <div className="flex gap-2">
                    <button className="btn" onClick={() => setIsFocusMode(true)}>Focus</button>
                </div>
            </div>

            {loading ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <div className="spinner"></div>
                    <div style={{ marginTop: '10px', color: 'var(--text-muted)' }}>Loading Media...</div>
                </div>
            ) : (
                <div id="sub-container" style={{ flex: 1, overflowY: 'auto', padding: '20px', position: 'relative' }}>
                    <ul id="sub-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {subs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                No Subtitles Available for this Track.
                            </div>
                        ) : (
                            subs.map((sub, i) => {
                                const active = i === activeIndex;
                                // Fast style lookup for active sub
                                let subStyle = { margin: '15px 0', padding: '15px', borderRadius: '8px', cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.3s' };
                                if (active) {
                                    subStyle.background = 'var(--surface-hover)';
                                    subStyle.borderColor = 'var(--border)';
                                    subStyle.transform = `scale(${settings.activeScale || 1.05})`;
                                    subStyle.fontWeight = settings.bold ? 'bold' : 'normal';
                                }

                                const handleSubClick = () => {
                                    if (currentBook.isTextOnly) {
                                        setProgress(sub.start + 0.001);
                                    } else {
                                        seek(sub.start + 0.001);
                                    }
                                };

                                return (
                                    <li 
                                        key={i} 
                                        ref={active ? activeSubRef : null}
                                        style={subStyle}
                                        onClick={handleSubClick}
                                    >
                                        <div style={{ fontSize: '1.2rem', lineHeight: '1.6' }}>
                                            {sub.text}
                                        </div>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            )}

            {/* Playback Controls & Timeline */}
            <div id="player-controls" style={{ background: 'var(--surface)', padding: '20px', borderTop: '1px solid var(--border)' }}>
                <div className="timeline-container" style={{ position: 'relative', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>
                        <span id="t-curr">{Utils.fmtTime(tCurr)}</span>
                        <span id="t-total">{Utils.fmtTime(tTotal)}</span>
                    </div>
                    <div style={{ position: 'relative', height: '6px', background: 'var(--border)', borderRadius: '3px', cursor: 'pointer' }}>
                        <div id="seek-fill" style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: 'var(--primary)', width: `${fillPct}%`, borderRadius: '3px' }}></div>
                        <input 
                            type="range" 
                            id="seek-bar" 
                            min="0" 
                            max={tTotal} 
                            step="0.01" 
                            value={tCurr} 
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (currentBook.isTextOnly) setProgress(val);
                                else seek(val);
                            }}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', alignItems: 'center' }}>
                    <button className="btn" onClick={() => {
                        const t = getPrevSubTime();
                        if (t !== null) currentBook.isTextOnly ? setProgress(t) : seek(t);
                    }}>|← Prev</button>
                    
                    <button className="btn" onClick={() => {
                        const t = getReplaySubTime();
                        if (t !== null) currentBook.isTextOnly ? setProgress(t) : seek(t);
                    }}>↺ Replay</button>
                    
                    <button className="btn btn-primary" style={{ padding: '15px 30px', fontSize: '1.2rem' }} onClick={togglePlay}>
                        {isPlaying ? '❚❚ Pause' : '▶ Play'}
                    </button>
                    
                    <button className="btn" onClick={() => {
                        const t = getNextSubTime();
                        if (t !== null) currentBook.isTextOnly ? setProgress(t) : seek(t);
                    }}>Next →|</button>
                </div>
            </div>
        </div>
    );
}

import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

export default function Header() {
    const { setView } = useAppContext();
    const [showSettings, setShowSettings] = useState(false);
    
    // Minimal header with just Logo and Settings for now
    // We can add the other modals (Stats, Bookmarks, History, Help) later
    
    return (
        <header className="header">
            <h1 onClick={() => setView('library')} title="Return to Library">kikiyomi</h1>
            <div className="flex gap-2">
                <button className="btn" onClick={() => setShowSettings(true)}>Settings</button>
            </div>

            {/* Placeholder for Settings Modal */}
            {showSettings && (
                <div className="modal-overlay" onClick={() => setShowSettings(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, color: 'var(--primary)' }}>Settings (Coming Soon)</h2>
                        <p>Settings UI will be ported here.</p>
                        <div style={{ textAlign: 'right', marginTop: '30px' }}>
                            <button className="btn btn-primary" onClick={() => setShowSettings(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}

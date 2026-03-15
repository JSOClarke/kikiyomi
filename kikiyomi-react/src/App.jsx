import React, { useEffect } from 'react';
import { useAppContext } from './context/AppContext';
import { ServerApi } from './utils/ServerApi';
import { DB } from './utils/DB';
import { Stats } from './utils/Stats';

// Placeholder Components
import LibraryView from './components/Library/LibraryView';
import PlayerView from './components/Player/PlayerView';
import Header from './components/Layout/Header';

function App() {
    const { view, library } = useAppContext();

    useEffect(() => {
        const initApp = async () => {
            await ServerApi.checkStatus();
            await DB.init();
            await Stats.loadServerStats();
            
            // Sync mining history
            if (ServerApi.isAvailable) {
                const serverMining = await ServerApi.syncDown('ky_mining_history');
                if (serverMining && serverMining.length > 0) {
                    localStorage.setItem('ky_mining_history', JSON.stringify(serverMining));
                }
            }
            library.refreshLibrary();
        };
        initApp();
    }, []);

    return (
        <div className="app-container">
            <Header />
            <main className="main-content">
                {view === 'library' && <LibraryView />}
                {view === 'player' && <PlayerView />}
            </main>
        </div>
    );
}

export default App;

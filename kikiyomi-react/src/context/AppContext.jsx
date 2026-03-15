import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLibrary } from '../hooks/useLibrary';

const AppContext = createContext();

export function AppProvider({ children }) {
    // Media State
    const [currentBook, setCurrentBook] = useState(null);
    const [activeAudioBlob, setActiveAudioBlob] = useState(null);
    
    // UI State
    const [view, setView] = useState('library'); // 'library' | 'player'
    const [isFocusMode, setIsFocusMode] = useState(false);
    
    // Settings State
    const [settings, setSettings] = useState(() => ({
        theme: localStorage.getItem('ky_theme') || "kiku-dark",
        font: localStorage.getItem('ky_font') || "system-ui, -apple-system, sans-serif",
        size: parseInt(localStorage.getItem('ky_size') || "36", 10),
        fillGap: localStorage.getItem('ky_fill') !== "false",
        bold: localStorage.getItem('ky_bold') === "true",
        focusWidth: parseInt(localStorage.getItem('ky_focus_width') || "90", 10),
        activeScale: parseFloat(localStorage.getItem('ky_active_scale') || "1.05"),
        ankiField: localStorage.getItem('ky_anki_field') || "SentenceAudio",
        ankiPictureField: localStorage.getItem('ky_anki_pic_field') || "Picture",
        ankiAddCover: localStorage.getItem('ky_anki_add_cover') !== "false",
        showSubProgress: localStorage.getItem('ky_sub_progress') !== "false",
        showDebug: localStorage.getItem('ky_debug') === "true",
        targetLang: localStorage.getItem('ky_lang') || "en",
        volume: parseFloat(localStorage.getItem('ky_volume') || "1"),
        segmentationMode: localStorage.getItem('ky_segmentation') || "word",
        epubSplitAtCommas: localStorage.getItem('ky_epub_split') === "true",
        ttsVoice: localStorage.getItem('ky_tts_voice') || '',
        ttsRate: parseFloat(localStorage.getItem('ky_tts_rate') || "1.0"),
        ttsAutoPlay: localStorage.getItem('ky_tts_auto') === "true"
    }));

    // Data Hooks
    const library = useLibrary();

    // Side-effects for theme/css vars
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', settings.theme);
        document.documentElement.style.setProperty('--font-reader', settings.font);
        document.documentElement.style.setProperty('--font-size-base', settings.size + 'px');
        document.documentElement.style.setProperty('--active-weight', settings.bold ? 'bold' : 'normal');
        document.documentElement.style.setProperty('--focus-width', settings.focusWidth + '%');
        document.documentElement.style.setProperty('--active-scale', settings.activeScale);
    }, [settings]);

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        // Map of standard settings to localstorage keys
        const lsKeys = {
            theme: 'ky_theme', font: 'ky_font', size: 'ky_size', fillGap: 'ky_fill',
            bold: 'ky_bold', focusWidth: 'ky_focus_width', activeScale: 'ky_active_scale',
            ankiField: 'ky_anki_field', ankiPictureField: 'ky_anki_pic_field',
            ankiAddCover: 'ky_anki_add_cover', showSubProgress: 'ky_sub_progress',
            showDebug: 'ky_debug', targetLang: 'ky_lang', volume: 'ky_volume',
            segmentationMode: 'ky_segmentation', epubSplitAtCommas: 'ky_epub_split',
            ttsVoice: 'ky_tts_voice', ttsRate: 'ky_tts_rate', ttsAutoPlay: 'ky_tts_auto'
        };
        if (lsKeys[key]) {
            localStorage.setItem(lsKeys[key], value.toString());
        }
    };

    const value = {
        library,
        settings, setSettings: updateSetting,
        currentBook, setCurrentBook,
        activeAudioBlob, setActiveAudioBlob,
        view, setView,
        isFocusMode, setIsFocusMode
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    return useContext(AppContext);
}

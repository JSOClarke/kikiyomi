import { useState, useRef, useCallback, useEffect } from 'react';

export function useAudioPlayer({ meta, onProgressUpdate }) {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(() => parseFloat(localStorage.getItem('ky_volume') || "1"));
    const animFrameRef = useRef(null);
    const lastAnimTimeRef = useRef(Date.now());

    // Used for custom timing logic in EPUB "text-only" mode where audio might be absent or replaced by TTS
    const isTextOnly = meta?.isTextOnly;

    useEffect(() => {
        if (!audioRef.current && !isTextOnly) return;
        
        const audio = audioRef.current;
        if (audio) {
            audio.volume = volume;
            
            const handleTimeUpdate = () => {
                if (!isTextOnly) {
                    setCurrentTime(audio.currentTime);
                }
            };
            
            const handleLoadedMetadata = () => {
                setDuration(audio.duration);
            };

            const handlePlay = () => setIsPlaying(true);
            const handlePause = () => setIsPlaying(false);

            audio.addEventListener('timeupdate', handleTimeUpdate);
            audio.addEventListener('loadedmetadata', handleLoadedMetadata);
            audio.addEventListener('play', handlePlay);
            audio.addEventListener('pause', handlePause);

            return () => {
                audio.removeEventListener('timeupdate', handleTimeUpdate);
                audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                audio.removeEventListener('play', handlePlay);
                audio.removeEventListener('pause', handlePause);
            };
        }
    }, [isTextOnly, volume]);

    // Custom animation loop for text-only mode
    useEffect(() => {
        if (isTextOnly) {
            if (meta?.duration) setDuration(meta.duration);
            
            const animate = () => {
                if (!isPlaying) return;
                
                const now = Date.now();
                // Storyteller mode doesn't strictly advance time linearly, it jumps via nextSub() logic in useSubtitles.
                // However, we preserve the animation frame structure in case we implement synthetic time.
                lastAnimTimeRef.current = now;
                animFrameRef.current = requestAnimationFrame(animate);
            };
            
            if (isPlaying) {
                lastAnimTimeRef.current = Date.now();
                animFrameRef.current = requestAnimationFrame(animate);
            } else if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
            
            return () => {
                if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            };
        }
    }, [isTextOnly, isPlaying, meta?.duration]);


    const play = useCallback(async () => {
        if (isTextOnly) {
            setIsPlaying(true);
        } else if (audioRef.current) {
            try {
                await audioRef.current.play();
                setIsPlaying(true);
            } catch (err) {
                console.error("Autoplay prevented", err);
            }
        }
    }, [isTextOnly]);

    const pause = useCallback(() => {
        if (isTextOnly) {
            setIsPlaying(false);
        } else if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    }, [isTextOnly]);

    const togglePlay = useCallback(() => {
        if (isPlaying) pause();
        else play();
    }, [isPlaying, play, pause]);

    const seek = useCallback((time) => {
        setCurrentTime(time);
        if (audioRef.current && !isTextOnly) {
            audioRef.current.currentTime = time;
        }
        if (onProgressUpdate) onProgressUpdate(time);
    }, [isTextOnly, onProgressUpdate]);
    
    const changeVolume = useCallback((val) => {
        setVolume(val);
        localStorage.setItem('ky_volume', val.toString());
        if (audioRef.current) audioRef.current.volume = val;
    }, []);

    return {
        audioRef,
        isPlaying,
        currentTime,
        duration,
        volume,
        play,
        pause,
        togglePlay,
        seek,
        changeVolume,
        setIsPlaying // Exposed for TTS overrides in TextOnly mode
    };
}

import { useState, useEffect, useCallback, useMemo } from 'react';

export function useSubtitles({ subs, currentTime, isTextOnly, settings }) {
    const [activeIndex, setActiveIndex] = useState(-1);

    // Binary search for the active subtitle
    useEffect(() => {
        if (!subs || subs.length === 0) {
            setActiveIndex(-1);
            return;
        }

        let lo = 0;
        let hi = subs.length - 1;
        let idx = -1;

        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (currentTime < subs[mid].start) {
                hi = mid - 1;
            } else if (currentTime > subs[mid].end) {
                lo = mid + 1;
            } else {
                idx = mid;
                break;
            }
        }

        // Fill gap logic
        if (idx === -1 && settings?.fillGap) {
            const after = lo;
            const before = lo - 1;
            if (before >= 0 && after < subs.length) {
                const midTime = (subs[before].end + subs[after].start) / 2;
                idx = currentTime < midTime ? before : after;
            } else if (before >= 0) {
                idx = before;
            } else if (after < subs.length) {
                idx = after;
            }
        }

        setActiveIndex(idx);
    }, [subs, currentTime, settings?.fillGap]);

    const activeSub = useMemo(() => {
        if (activeIndex >= 0 && activeIndex < subs?.length) {
            return subs[activeIndex];
        }
        return null;
    }, [subs, activeIndex]);

    const getNextSubTime = useCallback(() => {
        if (!subs || subs.length === 0) return null;
        if (activeIndex > -1) {
            const nextIdx = Math.min(subs.length - 1, activeIndex + 1);
            return subs[nextIdx].start + 0.001;
        } else {
            for (let i = 0; i < subs.length; i++) {
                if (subs[i].start > currentTime) return subs[i].start + 0.001;
            }
        }
        return null;
    }, [subs, activeIndex, currentTime]);

    const getPrevSubTime = useCallback(() => {
        if (!subs || subs.length === 0) return null;
        if (activeIndex > -1) {
            const prevIdx = Math.max(0, activeIndex - 1);
            return subs[prevIdx].start + 0.001;
        } else {
            let target = -1;
            for (let i = 0; i < subs.length; i++) {
                if (subs[i].end < currentTime) target = i;
                else break;
            }
            if (target > -1) return subs[target].start + 0.001;
        }
        return null;
    }, [subs, activeIndex, currentTime]);

    const getReplaySubTime = useCallback(() => {
        if (!subs || subs.length === 0) return null;
        if (activeIndex > -1) return subs[activeIndex].start + 0.001;
        
        let last = -1;
        for (let i = 0; i < subs.length; i++) {
            if (subs[i].start <= currentTime) last = i;
            else break;
        }
        if (last > -1) return subs[last].start + 0.001;
        return null;
    }, [subs, activeIndex, currentTime]);


    return {
        activeIndex,
        activeSub,
        getNextSubTime,
        getPrevSubTime,
        getReplaySubTime
    };
}

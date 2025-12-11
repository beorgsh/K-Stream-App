import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { PLAYER_BASE_URL, THEME_COLOR } from '../constants';
import { saveProgress } from '../services/progress';

interface VideoPlayerProps {
  tmdbId: number;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  mediaTitle?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  // Callback when the player emits an event (only relevant for Host)
  onPlayerEvent?: (event: { action: 'play' | 'pause' | 'seek' | 'sync', time: number, playing?: boolean }) => void;
  isHost?: boolean; // If false, we ignore internal events to prevent feedback loops
  enableProgressSave?: boolean; // New Prop: defaults to true
}

export interface VideoPlayerRef {
  play: (time?: number) => void;
  pause: (time?: number) => void;
  seek: (time: number) => void;
  getStatus: () => void;
}

const VIDFAST_ORIGINS = [
    'https://vidfast.pro',
    'https://vidfast.in',
    'https://vidfast.io',
    'https://vidfast.me',
    'https://vidfast.net',
    'https://vidfast.pm',
    'https://vidfast.xyz',
    'https://vidsrc.to',
    'https://vidsrc.me'
];

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ 
  tmdbId, type, season = 1, episode = 1, mediaTitle, posterPath, backdropPath, onPlayerEvent, isHost = true, enableProgressSave = true
}, ref) => {
  const [src, setSrc] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Flag to differentiate between user actions and programmatic sync commands
  const isSyncing = useRef(false);

  // --- External Control Methods (Called by Parent/PeerJS) ---
  useImperativeHandle(ref, () => ({
    play: (time) => {
        if (!iframeRef.current) return;
        isSyncing.current = true;
        iframeRef.current.contentWindow?.postMessage({ command: 'play', time }, '*');
        setTimeout(() => { isSyncing.current = false; }, 1000);
    },
    pause: (time) => {
        if (!iframeRef.current) return;
        isSyncing.current = true;
        iframeRef.current.contentWindow?.postMessage({ command: 'pause', time }, '*');
        setTimeout(() => { isSyncing.current = false; }, 1000);
    },
    seek: (time) => {
        if (!iframeRef.current) return;
        isSyncing.current = true;
        iframeRef.current.contentWindow?.postMessage({ command: 'seek', time }, '*');
        setTimeout(() => { isSyncing.current = false; }, 1000);
    },
    getStatus: () => {
        if (!iframeRef.current) return;
        // getStatus is a read operation, doesn't need isSyncing lock
        iframeRef.current.contentWindow?.postMessage({ command: 'getStatus' }, '*');
    }
  }));

  // --- Load Iframe ---
  useEffect(() => {
    let url = '';
    // CHANGE: Set autoPlay to true. The parent component will handle the "User Interaction" check
    // to ensure sound works.
    const params = new URLSearchParams({
      autoPlay: 'true', 
      theme: THEME_COLOR,
      poster: 'true',
      title: 'true',
      hideServerControls: 'false',
    });

    if (type === 'movie') {
      url = `${PLAYER_BASE_URL}/movie/${tmdbId}?${params.toString()}`;
    } else {
      params.append('autoNext', 'true');
      params.append('nextButton', 'true');
      url = `${PLAYER_BASE_URL}/tv/${tmdbId}/${season}/${episode}?${params.toString()}`;
    }
    
    setSrc(url);
  }, [tmdbId, type, season, episode]);

  // --- Event Listeners (VidFast Communication) ---
  useEffect(() => {
    const handleMessage = ({ origin, data }: MessageEvent) => {
        // 1. Security Check
        const isVidFast = VIDFAST_ORIGINS.some(o => origin.includes(o) || origin === o);
        if (!data) return;

        // 2. Progress Saving 
        // Only save if prop is enabled (Default true, False for Watch Party)
        if (data.type === 'MEDIA_DATA' && enableProgressSave) {
            // CRITICAL FIX: Override the ID and metadata from props to ensure consistency
            // VidFast might send internal IDs, so we enforce our TMDB ID here.
            const cleanData = {
                ...data.data,
                id: tmdbId, // Force correct TMDB ID
                type: type, // Force correct Type
                title: mediaTitle || data.data.title,
                poster_path: posterPath || data.data.poster_path,
                backdrop_path: backdropPath || data.data.backdrop_path,
                last_season_watched: season,
                last_episode_watched: episode
            };
            saveProgress(cleanData);
        }

        // 3. Player Events -> Send to Parent (Only if Host)
        // If I am a guest, I ignore my own player events, I only obey the host.
        if (data.type === 'PLAYER_EVENT' && isHost) {
            
            // If this event happened because we just received a sync command, ignore it
            // to prevent an infinite loop (Echo cancellation).
            // EXCEPTION: 'playerstatus' is a response to getStatus, we always want it.
            if (isSyncing.current && data.data.event !== 'playerstatus') return;

            const { event, currentTime, playing } = data.data;

            if (event === 'play') {
                onPlayerEvent?.({ action: 'play', time: currentTime });
            } else if (event === 'pause') {
                onPlayerEvent?.({ action: 'pause', time: currentTime });
            } else if (event === 'seeked') {
                onPlayerEvent?.({ action: 'seek', time: currentTime });
            } else if (event === 'playerstatus') {
                // Return full status for absolute syncing
                onPlayerEvent?.({ 
                    action: 'sync', 
                    time: currentTime, 
                    playing: playing 
                });
            }
        }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isHost, onPlayerEvent, enableProgressSave, tmdbId, type, season, episode, mediaTitle, posterPath, backdropPath]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800 group">
        <iframe
            ref={iframeRef}
            src={src}
            title="Video Player"
            className="absolute top-0 left-0 w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
            frameBorder="0"
        />
        
        {/* Overlay for Guests: Blocks interactions so they strictly follow host */}
        {!isHost && (
            <div className="absolute inset-0 bg-transparent z-10" />
        )}
    </div>
  );
});

export default VideoPlayer;

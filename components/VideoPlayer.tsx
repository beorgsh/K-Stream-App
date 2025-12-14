import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { THEME_COLOR } from '../constants';
import { saveProgress } from '../services/progress';
import { Server, Wifi } from 'lucide-react';

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

const SERVERS = [
    { name: 'VidLink', url: 'https://vidlink.pro', type: 'standard' },
    { name: 'VidSrc', url: 'https://vidsrc.to', type: 'embed' }, // Requires /embed/ path
    { name: 'VidFast', url: 'https://vidfast.pro', type: 'standard' },
];

const VIDFAST_ORIGINS = [
    'https://vidfast.pro',
    'https://vidfast.in',
    'https://vidfast.io',
    'https://vidfast.me',
    'https://vidfast.net',
    'https://vidfast.pm',
    'https://vidfast.xyz',
    'https://vidsrc.to',
    'https://vidsrc.me',
    'https://vidlink.pro'
];

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ 
  tmdbId, type, season = 1, episode = 1, mediaTitle, posterPath, backdropPath, onPlayerEvent, isHost = true, enableProgressSave = true
}, ref) => {
  const [src, setSrc] = useState('');
  const [currentServer, setCurrentServer] = useState(SERVERS[0]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Track playback state locally for progress saving
  const lastTimeRef = useRef(0);
  const durationRef = useRef(0);
  
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
    const params = new URLSearchParams({
      autoPlay: 'true', 
      theme: THEME_COLOR,
      poster: 'true',
      title: 'true',
      hideServerControls: 'false',
    });

    // Server specific configurations
    if (currentServer.name === 'VidLink') {
        params.set('player', 'jw');      // Force JW Player
        params.set('multiLang', 'true'); // Enable multi-language support (Subs/Audio)
    }

    const baseUrl = currentServer.url;
    const isEmbedPath = currentServer.type === 'embed';

    if (type === 'movie') {
      const path = isEmbedPath ? '/embed/movie' : '/movie';
      url = `${baseUrl}${path}/${tmdbId}?${params.toString()}`;
    } else {
      params.append('autoNext', 'true');
      params.append('nextButton', 'true');
      const path = isEmbedPath ? '/embed/tv' : '/tv';
      url = `${baseUrl}${path}/${tmdbId}/${season}/${episode}?${params.toString()}`;
    }
    
    setSrc(url);
    
    // Reset refs on source change
    lastTimeRef.current = 0;
    durationRef.current = 0;
  }, [tmdbId, type, season, episode, currentServer]);

  // --- Event Listeners (VidFast/VidLink Communication) ---
  useEffect(() => {
    const handleMessage = ({ origin, data }: MessageEvent) => {
        // Allow messages from known providers
        const isAllowed = VIDFAST_ORIGINS.some(o => origin.includes(o.replace('https://', '')) || origin === o);
        
        if (!data) return;

        // 1. Capture Metadata if available
        if (data.type === 'MEDIA_DATA') {
            if (data.data?.progress?.duration) {
                durationRef.current = data.data.progress.duration;
            }
        }

        // 2. Handle Player Events (Time Updates & Host Events)
        if (data.type === 'PLAYER_EVENT') {
            const { event, currentTime, duration, playing } = data.data;

            // Update duration if provided
            if (duration) durationRef.current = duration;

            // --- PROGRESS SAVING (Fixed) ---
            if (enableProgressSave && currentTime > 0) {
                 lastTimeRef.current = currentTime;
                 const progressData = {
                    id: tmdbId,
                    type: type,
                    title: mediaTitle || 'Unknown',
                    poster_path: posterPath,
                    backdrop_path: backdropPath,
                    last_season_watched: season,
                    last_episode_watched: episode,
                    progress: {
                        watched: currentTime,
                        duration: durationRef.current || 0
                    }
                 };
                 saveProgress(progressData);
            }

            // --- HOST EVENTS (Watch Party) ---
            if (isHost) {
                if (isSyncing.current && event !== 'playerstatus') return;

                if (event === 'play') {
                    onPlayerEvent?.({ action: 'play', time: currentTime });
                } else if (event === 'pause') {
                    onPlayerEvent?.({ action: 'pause', time: currentTime });
                } else if (event === 'seeked') {
                    onPlayerEvent?.({ action: 'seek', time: currentTime });
                } else if (event === 'playerstatus' || event === 'timeupdate') {
                    if (event === 'playerstatus') {
                        onPlayerEvent?.({ 
                            action: 'sync', 
                            time: currentTime, 
                            playing: playing 
                        });
                    }
                }
            }
        }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isHost, onPlayerEvent, enableProgressSave, tmdbId, type, season, episode, mediaTitle, posterPath, backdropPath]);

  return (
    <div className="space-y-3">
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800 group">
            <iframe
                ref={iframeRef}
                src={src}
                title="Video Player"
                className="absolute top-0 left-0 w-full h-full z-10"
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
                frameBorder="0"
                referrerPolicy="origin"
            />
            
            {/* Overlay for Guests: Blocks interactions so they strictly follow host */}
            {!isHost && (
                <div className="absolute inset-0 bg-transparent z-20" />
            )}
        </div>

        {/* Server Switcher */}
        <div className="flex items-center justify-between bg-slate-900/50 p-2.5 rounded-lg border border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 px-2">
                <Server className="h-4 w-4 text-indigo-400" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Stream Server</span>
            </div>
            <div className="flex gap-2">
                {SERVERS.map((server) => (
                    <button
                        key={server.name}
                        onClick={() => setCurrentServer(server)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            currentServer.name === server.name 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                                : 'bg-slate-800 text-gray-400 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                        {server.name}
                    </button>
                ))}
            </div>
        </div>
    </div>
  );
});

export default VideoPlayer;
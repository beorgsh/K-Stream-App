import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { THEME_COLOR } from '../constants';
import { saveProgress } from '../services/progress';
import { Server, Mic, Captions } from 'lucide-react';

interface VideoPlayerProps {
  tmdbId: number;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  mediaTitle?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  onPlayerEvent?: (event: { action: 'play' | 'pause' | 'seek' | 'sync', time: number, playing?: boolean }) => void;
  isHost?: boolean;
  enableProgressSave?: boolean;
  isAnime?: boolean;
  anilistId?: number | null;
}

export interface VideoPlayerRef {
  play: (time?: number) => void;
  pause: (time?: number) => void;
  seek: (time: number) => void;
  getStatus: () => void;
}

const SERVERS = [
    { name: 'VidSrc.cc', url: 'https://vidsrc.cc', type: 'vidsrc-cc' },
    { name: 'VidSrc.to', url: 'https://vidsrc.to', type: 'vidsrc-to' },
    { name: 'VidLink', url: 'https://vidlink.pro', type: 'vidlink' },
];

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ 
  tmdbId, type, season = 1, episode = 1, mediaTitle, posterPath, backdropPath, onPlayerEvent, isHost = true, enableProgressSave = true, isAnime = false, anilistId
}, ref) => {
  const [src, setSrc] = useState('');
  const [currentServer, setCurrentServer] = useState(SERVERS[0]);
  const [animeType, setAnimeType] = useState<'sub' | 'dub'>('sub');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Track playback state locally for progress saving
  const lastTimeRef = useRef(0);
  const durationRef = useRef(0);
  const isSyncing = useRef(false);

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
        iframeRef.current.contentWindow?.postMessage({ command: 'getStatus' }, '*');
    }
  }));

  // Handle Auto-Landscape on Fullscreen
  useEffect(() => {
    const handleFullscreenChange = async () => {
        if (document.fullscreenElement) {
            try {
                // Attempt to lock to landscape
                if (screen.orientation && 'lock' in screen.orientation) {
                    await (screen.orientation as any).lock('landscape');
                }
            } catch (error) {
                console.debug("Orientation lock failed:", error);
            }
        } else {
            try {
                // Unlock when exiting fullscreen
                if (screen.orientation && 'unlock' in screen.orientation) {
                    (screen.orientation as any).unlock();
                }
            } catch (error) {
                console.debug("Orientation unlock failed:", error);
            }
        }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    let url = '';
    const params = new URLSearchParams({
      autoplay: '0', // Changed from autoPlay=false to autoplay=0 for better compatibility
      theme: THEME_COLOR,
    });

    if (isAnime && currentServer.type === 'vidsrc-cc') {
        const idParam = anilistId ? `ani${anilistId}` : `tmdb${tmdbId}`;
        
        // Specific Anime Endpoint
        url = `https://vidsrc.cc/v2/embed/anime/${idParam}/${episode}/${animeType}?autoplay=0`;
    } else if (currentServer.type === 'vidsrc-cc') {
        // VidSrc.cc standard for non-anime
        const basePath = type === 'movie' ? '/v2/embed/movie' : `/v2/embed/tv`;
        const resourcePath = type === 'movie' ? `/${tmdbId}` : `/${tmdbId}/${season}/${episode}`;
        url = `${currentServer.url}${basePath}${resourcePath}?autoplay=0`; 
    } else if (currentServer.type === 'vidsrc-to') {
        // VidSrc.to
        const path = type === 'movie' ? '/embed/movie' : '/embed/tv';
        const resource = type === 'movie' ? `/${tmdbId}` : `/${tmdbId}/${season}/${episode}`;
        url = `${currentServer.url}${path}${resource}`;
    } else {
        // VidLink/Standard
        if (type === 'movie') {
            url = `${currentServer.url}/movie/${tmdbId}?${params.toString()}`;
        } else {
            url = `${currentServer.url}/tv/${tmdbId}/${season}/${episode}?${params.toString()}`;
        }
    }
    
    setSrc(url);
    
    // Reset refs on source change
    lastTimeRef.current = 0;
    durationRef.current = 0;
  }, [tmdbId, type, season, episode, currentServer, isAnime, animeType, anilistId]);

  // Handle messages from embeds (if supported)
  useEffect(() => {
    const handleMessage = ({ origin, data }: MessageEvent) => {
        if (!data) return;

        // Progress Saving Logic (Best Effort)
        if (data.type === 'PLAYER_EVENT' || (data.data && data.data.currentTime)) {
            const currentTime = data.data?.currentTime || data.currentTime;
            const duration = data.data?.duration || data.duration;

            if (duration) durationRef.current = duration;

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
        }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [enableProgressSave, tmdbId, type, season, episode, mediaTitle, posterPath, backdropPath]);

  return (
    <div className="space-y-3">
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800 group">
            {src ? (
                <iframe
                    ref={iframeRef}
                    src={src}
                    title="Video Player"
                    className="absolute top-0 left-0 w-full h-full z-10"
                    allowFullScreen
                    allow="autoplay; encrypted-media; picture-in-picture; screen-wake-lock"
                    frameBorder="0"
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-gray-500">
                    <span className="text-sm">No source available</span>
                </div>
            )}
            
            {!isHost && (
                <div className="absolute inset-0 bg-transparent z-20" />
            )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-900/50 p-2.5 rounded-lg border border-white/5 backdrop-blur-sm gap-3">
            
            {/* Server Selector */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-2 border-r border-white/10 pr-4">
                    <Server className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:block">Server</span>
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

            {/* Anime Sub/Dub Toggle */}
            {isAnime && currentServer.type === 'vidsrc-cc' && (
                <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg border border-white/5">
                    <button 
                        onClick={() => setAnimeType('sub')}
                        className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold transition-all ${
                            animeType === 'sub' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <Captions className="h-3 w-3" /> Sub
                    </button>
                    <button 
                        onClick={() => setAnimeType('dub')}
                        className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold transition-all ${
                            animeType === 'dub' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <Mic className="h-3 w-3" /> Dub
                    </button>
                </div>
            )}
        </div>
    </div>
  );
});

export default VideoPlayer;
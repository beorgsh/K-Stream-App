import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Hls from 'hls.js';

interface AnimePlayerProps {
    src: string;
    poster?: string;
    subtitles?: { url: string; lang: string }[];
    intro?: { start: number; end: number };
    outro?: { start: number; end: number };
    headers?: Record<string, string>;
}

export interface AnimePlayerRef {
    seek: (time: number) => void;
    play: () => void;
    pause: () => void;
    getInstance: () => any;
}

const AnimePlayer = forwardRef<AnimePlayerRef, AnimePlayerProps>(({ src, poster, subtitles, intro, outro, headers }, ref) => {
    const artRef = useRef<HTMLDivElement>(null);
    const playerInstance = useRef<any>(null);

    useImperativeHandle(ref, () => ({
        seek: (time: number) => {
            if (playerInstance.current) {
                playerInstance.current.seek = time;
            }
        },
        play: () => playerInstance.current?.play(),
        pause: () => playerInstance.current?.pause(),
        getInstance: () => playerInstance.current
    }));

    useEffect(() => {
        if (!artRef.current || !src) return;

        // @ts-ignore
        const Artplayer = window.Artplayer;

        if (!Artplayer) {
            console.error("Artplayer not loaded");
            return;
        }

        if (playerInstance.current) {
            playerInstance.current.destroy(false);
        }

        // Initialize Artplayer
        const art = new Artplayer({
            container: artRef.current,
            url: src,
            poster: poster,
            volume: 0.8,
            isLive: false,
            muted: false,
            autoplay: true,
            pip: true,
            autoSize: true,
            autoMini: true,
            screenshot: true,
            setting: true,
            loop: false,
            flip: true,
            playbackRate: true,
            aspectRatio: true,
            fullscreen: true,
            fullscreenWeb: true,
            subtitleOffset: true,
            miniProgressBar: true,
            mutex: true,
            backdrop: true,
            playsInline: true,
            autoPlayback: true,
            airplay: true,
            theme: '#a855f7', // Purple-500
            lang: navigator.language.toLowerCase(),
            moreVideoAttr: {
                crossOrigin: 'anonymous',
            },
            subtitle: {
                url: subtitles?.find(s => s.lang === 'English')?.url || '',
                type: 'vtt',
                style: {
                    color: '#fff',
                    fontSize: '20px',
                },
                encoding: 'utf-8',
            },
            highlight: [
                intro ? { time: intro.start, text: 'Intro Start' } : null,
                intro ? { time: intro.end, text: 'Intro End' } : null,
            ].filter(Boolean),
            customType: {
                m3u8: function (video: HTMLVideoElement, url: string, art: any) {
                    if (Hls.isSupported()) {
                        if (art.hls) art.hls.destroy();
                        const hls = new Hls({
                            // Pass custom headers if available
                            xhrSetup: function(xhr, url) {
                                if (headers) {
                                    for (const [key, value] of Object.entries(headers)) {
                                        try {
                                            xhr.setRequestHeader(key, value as string);
                                        } catch (e) {
                                            // Ignore safe header errors (Refused to set unsafe header)
                                            console.warn(`Could not set header ${key}:`, e);
                                        }
                                    }
                                }
                            }
                        });
                        hls.loadSource(url);
                        hls.attachMedia(video);
                        art.hls = hls;
                        art.on('destroy', () => hls.destroy());
                    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                        video.src = url;
                    } else {
                        art.notice.show = 'Unsupported playback format: m3u8';
                    }
                },
            },
        });

        playerInstance.current = art;

        // Handle Subtitle Switching if multiple provided
        if (subtitles && subtitles.length > 0) {
            const subs = subtitles.map(s => ({
                html: s.lang,
                url: s.url,
            }));
            
            art.setting.add({
                html: 'Subtitles',
                tooltip: 'English',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"><path fill="#ffffff" d="M19 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1H6.5v-5H11v2zM17 13h-1.5v-1.5h-2v1.5H12v-5h1.5v1.5h2V8H17v5z"/></svg>',
                selector: [
                    {
                        html: 'Off',
                        url: '',
                    },
                    ...subs
                ],
                onSelect: (item: any) => {
                    art.subtitle.switch(item.url, {
                        name: item.html,
                    });
                    return item.html;
                },
            });
        }

        return () => {
            if (art && art.destroy) {
                art.destroy(false);
            }
        };
    }, [src, headers]);

    return (
        <div 
            ref={artRef} 
            className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800 z-10"
        ></div>
    );
});

export default AnimePlayer;
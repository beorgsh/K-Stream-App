import { Media, AnimeEpisode, AnimeStreamData, MediaDetails } from '../types';

const BASE_URL = "https://anime-api-iota-six.vercel.app/api";

const fetchJson = async (endpoint: string) => {
    try {
        const url = `${BASE_URL}${endpoint}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error(`Fetch error for ${endpoint}:`, e);
        return { success: false, results: null };
    }
};

// Helper to map new API item structure to App's Media type
const mapItemToMedia = (item: any): Media => {
    // Determine title
    const title = item.title || item.japanese_title || item.name || 'Unknown';
    
    // Determine rating
    let vote_average = 0;
    if (item.tvInfo?.sub) {
        vote_average = 8.0; 
    }

    return {
        id: item.id || String(item.data_id),
        title: title,
        name: title,
        poster_path: item.poster,
        backdrop_path: item.poster,
        overview: item.description || '',
        vote_average: vote_average,
        media_type: 'anime',
        original_language: 'ja',
        release_date: item.tvInfo?.releaseDate || null,
        progress: item.tvInfo ? {
            watched: 0,
            duration: parseInt(item.tvInfo.eps || item.tvInfo.sub || 0)
        } : undefined
    };
};

export const fetchAnimeHome = async (): Promise<{ spotlight: Media[], trending: Media[], latest: Media[] }> => {
    const data = await fetchJson('/');
    
    if (!data.success || !data.results) {
        return { spotlight: [], trending: [], latest: [] };
    }

    const res = data.results;

    return {
        spotlight: (res.spotlights || []).map(mapItemToMedia),
        trending: (res.trending || []).map(mapItemToMedia),
        latest: (res.latestEpisode || []).map(mapItemToMedia)
    };
};

export const searchAnime = async (query: string): Promise<Media[]> => {
    const data = await fetchJson(`/search?keyword=${encodeURIComponent(query)}`);
    
    if (!data.success || !data.results) return [];
    
    return data.results.map(mapItemToMedia);
}

export const fetchAnimeDetails = async (id: string): Promise<MediaDetails> => {
    const data = await fetchJson(`/info?id=${id}`);
    
    if (!data.success || !data.results || !data.results.data) {
        throw new Error("Failed to fetch anime details");
    }

    const d = data.results.data;
    const info = d.animeInfo || {};

    // Map genres
    const genres = (info.Genres || []).map((g: any, i: number) => ({
        id: i,
        name: typeof g === 'string' ? g : (g?.name || 'Unknown')
    }));

    // Map recommendations
    const recs = (data.results.recommended_data || []).flat().map(mapItemToMedia);
    const similar = (data.results.related_data || []).flat().map(mapItemToMedia);

    return {
        id: d.id,
        title: d.title || d.name,
        name: d.title || d.name,
        poster_path: d.poster,
        backdrop_path: d.poster,
        overview: info.Overview || d.description || '',
        vote_average: parseFloat(info['MAL Score']) || 0,
        media_type: 'anime',
        original_language: 'ja',
        release_date: info.Aired || info.Premiered || '',
        genres: genres,
        status: info.Status || 'Unknown',
        runtime: parseInt(info.Duration) || 24,
        number_of_seasons: 1, 
        credits: { cast: [] }, 
        similar: { results: similar },
        recommendations: { results: recs }
    };
};

export const fetchAnimeEpisodes = async (id: string): Promise<AnimeEpisode[]> => {
    const data = await fetchJson(`/episodes/${id}`);
    
    if (!data.success || !data.results?.episodes) return [];

    return data.results.episodes.map((ep: any) => ({
        episodeId: ep.id,
        number: ep.episode_no,
        title: ep.title || `Episode ${ep.episode_no}`,
        isFiller: false
    }));
};

const processServers = (servers: any[]) => {
    // Helper to safely extract server name
    const getName = (s: any) => s.server_name || s.name || s.type || 'Unknown';
    const getId = (s: any) => s.server_id || s.id;

    const sub = servers.filter((s: any) => s.type === 'sub').map((s: any) => ({ serverName: getName(s), serverId: getId(s), type: 'sub' }));
    const dub = servers.filter((s: any) => s.type === 'dub').map((s: any) => ({ serverName: getName(s), serverId: getId(s), type: 'dub' }));
    const raw = servers.filter((s: any) => s.type === 'raw').map((s: any) => ({ serverName: getName(s), serverId: getId(s), type: 'raw' }));
    return { sub, dub, raw };
};

export const fetchAnimeServers = async (episodeId: string): Promise<{ sub: any[], dub: any[], raw: any[] }> => {
    // Strategy: Try multiple endpoints to find server list
    
    // 1. Try dedicated servers endpoint (Standard)
    let data = await fetchJson(`/servers/${episodeId}`);
    if (data.success && Array.isArray(data.results)) {
        return processServers(data.results);
    }
    
    // 2. Try generic stream endpoint (often returns default servers)
    data = await fetchJson(`/stream?id=${episodeId}`);
    if (data.success && data.results?.servers) {
        return processServers(data.results.servers);
    }

    // 3. Try with specific common server 'hd-1'
    data = await fetchJson(`/stream?id=${episodeId}&server=hd-1&type=sub`);
    if (data.success && data.results?.servers) {
        return processServers(data.results.servers);
    }

     // 4. Try with specific common server 'vidstreaming'
    data = await fetchJson(`/stream?id=${episodeId}&server=vidstreaming&type=sub`);
    if (data.success && data.results?.servers) {
        return processServers(data.results.servers);
    }

    return { sub: [], dub: [], raw: [] };
}

// Updated signature to accept serverName and serverId
export const fetchAnimeSources = async (episodeId: string, serverName: string, category: string, serverId?: string): Promise<AnimeStreamData | null> => {
    const cat = category || 'sub';
    
    const tryFetch = async (srv: string) => {
        const data = await fetchJson(`/stream?id=${episodeId}&server=${srv}&type=${cat}`);
        if (data.success && data.results?.streamingLink) {
            let links = data.results.streamingLink;
            if (!Array.isArray(links)) links = [links];
            const streamData = links.find((l: any) => l.link?.file);
            if (streamData) return { data, streamData };
        }
        return null;
    }

    // 1. Try with Server Name (e.g., 'hd-1')
    let result = await tryFetch(serverName || 'hd-1');

    // 2. Try with Server ID if available
    if (!result && serverId) {
        console.warn(`Server name ${serverName} failed, trying ID ${serverId}`);
        result = await tryFetch(serverId);
    }

    // 3. Fallback: Try 'vidstreaming' as it's often the default
    if (!result && serverName !== 'vidstreaming') {
         console.warn("Retrying with vidstreaming fallback");
         result = await tryFetch('vidstreaming');
    }

    if (!result) return null;

    const { streamData } = result;

    return {
        headers: { 
            'Referer': 'https://hianime.to/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36',
            ...streamData.headers // Merge any headers from API response
        }, 
        sources: [{
            url: streamData.link.file,
            type: 'hls',
            isM3U8: streamData.link.file.includes('.m3u8')
        }],
        subtitles: streamData.tracks?.map((t: any) => ({
            url: t.file,
            lang: t.label
        })),
        tracks: streamData.tracks
    };
};
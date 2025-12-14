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
    const sub = servers.filter((s: any) => s.type === 'sub').map((s: any) => ({ serverName: s.server_name, serverId: s.server_id, type: 'sub' }));
    const dub = servers.filter((s: any) => s.type === 'dub').map((s: any) => ({ serverName: s.server_name, serverId: s.server_id, type: 'dub' }));
    const raw = servers.filter((s: any) => s.type === 'raw').map((s: any) => ({ serverName: s.server_name, serverId: s.server_id, type: 'raw' }));
    return { sub, dub, raw };
};

export const fetchAnimeServers = async (episodeId: string): Promise<{ sub: any[], dub: any[], raw: any[] }> => {
    // 1. Try dedicated servers endpoint
    let data = await fetchJson(`/servers/${episodeId}`);
    
    if (data.success && Array.isArray(data.results)) {
        return processServers(data.results);
    }
    
    // 2. Fallback: Try fetching stream with defaults to get server list in response
    // 'hd-1' and 'sub' are safe defaults for this API
    data = await fetchJson(`/stream?id=${episodeId}&server=hd-1&type=sub`);
    
    if (data.success && data.results?.servers) {
        return processServers(data.results.servers);
    }

    return { sub: [], dub: [], raw: [] };
}

export const fetchAnimeSources = async (episodeId: string, server: string, category: string): Promise<AnimeStreamData | null> => {
    // Ensure server/type defaults are set if missing
    const srv = server || 'hd-1';
    const cat = category || 'sub';

    const data = await fetchJson(`/stream?id=${episodeId}&server=${srv}&type=${cat}`);
    
    if (!data.success || !data.results?.streamingLink) return null;

    // Use the first available link
    const streamData = data.results.streamingLink.find((l: any) => l.link?.file);
    if (!streamData) return null;

    return {
        headers: { Referer: 'https://hianime.to' }, 
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
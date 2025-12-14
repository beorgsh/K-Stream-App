import { Media, AnimeEpisode, AnimeStreamData, MediaDetails } from '../types';

// List of HiAnime API instances
// Prioritizing the one provided by user and known working mirrors
const PROVIDERS = [
    "https://aniwatch-api-one-rose.vercel.app/api/v2/hianime",
    "https://hianime-api-chi.vercel.app/api/v2/hianime",
    "https://aniwatch-api-v1-0.vercel.app/api/v2/hianime", 
    "https://api-aniwatch.onrender.com/api/v2/hianime",
    "https://aniwatch-api-psi.vercel.app/api/v2/hianime"
];

const fetchWithFallback = async (endpoint: string) => {
    let lastError;
    for (const provider of PROVIDERS) {
        try {
            const url = `${provider}${endpoint}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Status ${response.status}`);
            const data = await response.json();
            // Basic validation to ensure we got a JSON body
            if (!data) throw new Error("Empty response");
            return data;
        } catch (e) {
            console.warn(`Provider ${provider} failed for ${endpoint}`, e);
            lastError = e;
        }
    }
    throw lastError || new Error("All providers failed");
};

// Convert AniWatch data to our Media interface
const mapAnimeToMedia = (item: any): Media => ({
    id: item.id || item.animeId || 'unknown', // Handle inconsistent ID naming
    title: item.name || item.title || 'Unknown',
    name: item.name || item.title || 'Unknown',
    poster_path: item.poster,
    backdrop_path: item.poster, // API doesn't always provide backdrop, use poster as fallback
    overview: item.description || '',
    vote_average: item.rank ? Math.max(0, 10 - (item.rank / 1000)) : (item.rating ? parseFloat(item.rating) : 0),
    media_type: 'anime',
    original_language: 'ja',
    release_date: item.releaseDate || item.date || null,
    // Store episode counts if available for UI badges
    progress: item.episodes ? {
        watched: 0,
        duration: (item.episodes.sub || 0) + (item.episodes.dub || 0)
    } : undefined
});

export const fetchAnimeHome = async (): Promise<{ spotlight: Media[], trending: Media[], latest: Media[] }> => {
    try {
        const data = await fetchWithFallback('/home');
        
        if (!data.success) {
            console.warn("Anime Home API returned success: false");
            return { spotlight: [], trending: [], latest: [] };
        }
        
        const d = data.data;

        return {
            spotlight: (d?.spotlightAnimes || []).map(mapAnimeToMedia),
            trending: (d?.trendingAnimes || []).map(mapAnimeToMedia),
            latest: (d?.latestEpisodeAnimes || []).map(mapAnimeToMedia)
        };
    } catch (e) {
        console.error("Anime Home Error", e);
        return { spotlight: [], trending: [], latest: [] };
    }
};

export const searchAnime = async (query: string): Promise<Media[]> => {
    try {
        const data = await fetchWithFallback(`/search?q=${encodeURIComponent(query)}&page=1`);
        
        if (!data.success) return [];
        return (data.data?.animes || []).map(mapAnimeToMedia);
    } catch (e) {
        console.error("Anime Search Error", e);
        return [];
    }
}

export const fetchAnimeDetails = async (id: string): Promise<MediaDetails> => {
    const data = await fetchWithFallback(`/anime/${id}`);
    
    if (!data.success) throw new Error("Failed to fetch anime details");
    
    const info = data.data?.anime?.info;
    const moreInfo = data.data?.anime?.moreInfo;
    
    if (!info) throw new Error("Invalid anime details structure");

    return {
        id: info.id || info.animeId,
        title: info.name,
        name: info.name,
        poster_path: info.poster,
        backdrop_path: info.poster, // Fallback
        overview: info.description,
        vote_average: parseFloat(info.stats?.rating) || 0,
        media_type: 'anime',
        original_language: 'ja',
        release_date: moreInfo?.aired || '',
        genres: (moreInfo?.genres || []).map((g: string, i: number) => ({ id: i, name: g })),
        status: moreInfo?.status || 'Unknown',
        runtime: parseInt(moreInfo?.duration) || 24,
        number_of_seasons: 1, // Usually flat list
        credits: { cast: [] }, 
        similar: { results: (data.data?.recommendedAnimes || []).map(mapAnimeToMedia) },
        recommendations: { results: (data.data?.relatedAnimes || []).map(mapAnimeToMedia) }
    };
};

export const fetchAnimeEpisodes = async (id: string): Promise<AnimeEpisode[]> => {
    try {
        const data = await fetchWithFallback(`/anime/${id}/episodes`);
        if (!data.success) return [];
        return data.data?.episodes || [];
    } catch (e) {
        console.error("Fetch Episodes Error", e);
        return [];
    }
};

export const fetchAnimeSources = async (episodeId: string, server: string = 'vidstreaming', category: string = 'sub'): Promise<AnimeStreamData | null> => {
    try {
        // endpoint: /episode/sources?animeEpisodeId={id}&server={server}&category={category}
        // Note: server parameter might need to be serverId in some API versions, but standard is server name lowercase
        const data = await fetchWithFallback(`/episode/sources?animeEpisodeId=${episodeId}&server=${server}&category=${category}`);
        if (!data.success) return null;
        return data.data;
    } catch (e) {
        console.error("Source fetch error", e);
        return null;
    }
};

export const fetchAnimeServers = async (episodeId: string): Promise<{ sub: any[], dub: any[], raw: any[] }> => {
    try {
        const data = await fetchWithFallback(`/episode/servers?animeEpisodeId=${episodeId}`);
        if (!data.success) return { sub: [], dub: [], raw: [] };
        return data.data || { sub: [], dub: [], raw: [] };
    } catch (e) {
        return { sub: [], dub: [], raw: [] };
    }
}
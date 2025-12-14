import { Media, AnimeEpisode, AnimeStreamData, MediaDetails } from '../types';

// List of HiAnime API instances
// Prioritize user provided URL and known working mirrors
const PROVIDERS = [
    "https://aniwatch-api-one-rose.vercel.app/api/v2/hianime",
    "https://hianime-api-chi.vercel.app/api/v2/hianime",
    "https://api-aniwatch.onrender.com/api/v2/hianime",
    "https://aniwatch-api-v1-0.vercel.app/api/v2/hianime"
];

const fetchWithFallback = async (endpoint: string) => {
    let lastError;
    for (const provider of PROVIDERS) {
        try {
            const url = `${provider}${endpoint}`;
            // 'no-referrer' helps bypass some CORS/hotlink protections on these APIs
            const response = await fetch(url, { referrerPolicy: 'no-referrer' });
            
            if (!response.ok) throw new Error(`Status ${response.status}`);
            
            const data = await response.json();
            if (!data) throw new Error("Empty response");
            return data;
        } catch (e) {
            console.warn(`Provider ${provider} failed for ${endpoint}`, e);
            lastError = e;
        }
    }
    throw lastError || new Error("All providers failed");
};

// Convert API data to our Media interface
const mapAnimeToMedia = (item: any): Media => ({
    id: item.id || item.animeId || 'unknown',
    title: item.name || item.title || 'Unknown',
    name: item.name || item.title || 'Unknown',
    poster_path: item.poster,
    backdrop_path: item.poster, // Fallback as anime API often lacks separate backdrop
    overview: item.description || '',
    vote_average: item.rank ? Math.max(0, 10 - (item.rank / 1000)) : (item.rating ? parseFloat(item.rating) : 0),
    media_type: 'anime',
    original_language: 'ja',
    release_date: item.releaseDate || item.date || null,
    progress: item.episodes ? {
        watched: 0,
        duration: (item.episodes.sub || 0) + (item.episodes.dub || 0)
    } : undefined
});

export const fetchAnimeHome = async (): Promise<{ spotlight: Media[], trending: Media[], latest: Media[] }> => {
    try {
        const response = await fetchWithFallback('/home');
        
        // The API returns { status: 200, data: { ... } } OR { success: true, data: { ... } }
        // We accept either format.
        if (response.success === false && response.status !== 200) {
             return { spotlight: [], trending: [], latest: [] };
        }
        
        const data = response.data;
        if (!data) return { spotlight: [], trending: [], latest: [] };

        return {
            spotlight: (data.spotlightAnimes || []).map(mapAnimeToMedia),
            trending: (data.trendingAnimes || []).map(mapAnimeToMedia),
            latest: (data.latestEpisodeAnimes || []).map(mapAnimeToMedia)
        };
    } catch (e) {
        console.error("Anime Home Fetch Error:", e);
        throw e; // Re-throw to let the UI handle the error state
    }
};

export const searchAnime = async (query: string): Promise<Media[]> => {
    try {
        const response = await fetchWithFallback(`/search?q=${encodeURIComponent(query)}&page=1`);
        if (!response.data?.animes) return [];
        return response.data.animes.map(mapAnimeToMedia);
    } catch (e) {
        console.error("Anime Search Error", e);
        return [];
    }
}

export const fetchAnimeDetails = async (id: string): Promise<MediaDetails> => {
    const response = await fetchWithFallback(`/anime/${id}`);
    
    const info = response.data?.anime?.info;
    const moreInfo = response.data?.anime?.moreInfo;
    
    if (!info) throw new Error("Invalid anime details structure");

    return {
        id: info.id || info.animeId,
        title: info.name,
        name: info.name,
        poster_path: info.poster,
        backdrop_path: info.poster, 
        overview: info.description,
        vote_average: parseFloat(info.stats?.rating) || 0,
        media_type: 'anime',
        original_language: 'ja',
        release_date: moreInfo?.aired || '',
        genres: (moreInfo?.genres || []).map((g: string, i: number) => ({ id: i, name: g })),
        status: moreInfo?.status || 'Unknown',
        runtime: parseInt(moreInfo?.duration) || 24,
        number_of_seasons: 1, 
        credits: { cast: [] }, 
        similar: { results: (response.data?.recommendedAnimes || []).map(mapAnimeToMedia) },
        recommendations: { results: (response.data?.relatedAnimes || []).map(mapAnimeToMedia) }
    };
};

export const fetchAnimeEpisodes = async (id: string): Promise<AnimeEpisode[]> => {
    try {
        const response = await fetchWithFallback(`/anime/${id}/episodes`);
        return response.data?.episodes || [];
    } catch (e) {
        console.error("Fetch Episodes Error", e);
        return [];
    }
};

export const fetchAnimeSources = async (episodeId: string, server: string = 'vidstreaming', category: string = 'sub'): Promise<AnimeStreamData | null> => {
    try {
        const response = await fetchWithFallback(`/episode/sources?animeEpisodeId=${episodeId}&server=${server}&category=${category}`);
        return response.data || null;
    } catch (e) {
        console.error("Source fetch error", e);
        return null;
    }
};

export const fetchAnimeServers = async (episodeId: string): Promise<{ sub: any[], dub: any[], raw: any[] }> => {
    try {
        const response = await fetchWithFallback(`/episode/servers?animeEpisodeId=${episodeId}`);
        return response.data || { sub: [], dub: [], raw: [] };
    } catch (e) {
        return { sub: [], dub: [], raw: [] };
    }
}
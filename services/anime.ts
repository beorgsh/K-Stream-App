import { Media, AnimeEpisode, AnimeStreamData, MediaDetails } from '../types';

const BASE_URL = "https://aniwatch-api-one-rose.vercel.app/api/v2/hianime";

// Convert AniWatch data to our Media interface
const mapAnimeToMedia = (item: any): Media => ({
    id: item.id,
    title: item.name,
    name: item.name,
    poster_path: item.poster,
    backdrop_path: item.poster, // API doesn't always provide backdrop, use poster as fallback
    overview: item.description || '',
    vote_average: item.rank ? 10 - (item.rank / 1000) : (item.rating ? parseFloat(item.rating) : 0), // Fake rating from rank if needed
    media_type: 'anime',
    original_language: 'ja',
    release_date: item.releaseDate,
    // Store episode counts if available for UI badges
    progress: item.episodes ? {
        watched: 0,
        duration: item.episodes.sub || item.episodes.dub || 0 // Abuse duration field to store episode count
    } : undefined
});

export const fetchAnimeHome = async (): Promise<{ spotlight: Media[], trending: Media[], latest: Media[] }> => {
    try {
        const response = await fetch(`${BASE_URL}/home`);
        const data = await response.json();
        
        if (!data.success) throw new Error("Failed to fetch anime home");

        return {
            spotlight: (data.data.spotlightAnimes || []).map(mapAnimeToMedia),
            trending: (data.data.trendingAnimes || []).map(mapAnimeToMedia),
            latest: (data.data.latestEpisodeAnimes || []).map(mapAnimeToMedia)
        };
    } catch (e) {
        console.error("Anime Home Error", e);
        return { spotlight: [], trending: [], latest: [] };
    }
};

export const searchAnime = async (query: string): Promise<Media[]> => {
    try {
        const response = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}&page=1`);
        const data = await response.json();
        
        if (!data.success) return [];
        return (data.data.animes || []).map(mapAnimeToMedia);
    } catch (e) {
        console.error("Anime Search Error", e);
        return [];
    }
}

export const fetchAnimeDetails = async (id: string): Promise<MediaDetails> => {
    const response = await fetch(`${BASE_URL}/anime/${id}`);
    const data = await response.json();
    
    if (!data.success) throw new Error("Failed to fetch anime details");
    
    const info = data.data.anime.info;
    const moreInfo = data.data.anime.moreInfo;

    return {
        id: info.id,
        title: info.name,
        name: info.name,
        poster_path: info.poster,
        backdrop_path: info.poster, // Fallback
        overview: info.description,
        vote_average: parseFloat(info.stats.rating) || 0,
        media_type: 'anime',
        original_language: 'ja',
        release_date: moreInfo.aired,
        genres: (moreInfo.genres || []).map((g: string, i: number) => ({ id: i, name: g })),
        status: moreInfo.status,
        runtime: parseInt(moreInfo.duration) || 24,
        number_of_seasons: 1, // Usually flat list
        credits: { cast: [] }, // API doesn't easily provide cast in simple format
        similar: { results: (data.data.recommendedAnimes || []).map(mapAnimeToMedia) },
        recommendations: { results: (data.data.relatedAnimes || []).map(mapAnimeToMedia) }
    };
};

export const fetchAnimeEpisodes = async (id: string): Promise<AnimeEpisode[]> => {
    try {
        const response = await fetch(`${BASE_URL}/anime/${id}/episodes`);
        const data = await response.json();
        if (!data.success) return [];
        return data.data.episodes;
    } catch (e) {
        console.error("Fetch Episodes Error", e);
        return [];
    }
};

export const fetchAnimeSources = async (episodeId: string, server: string = 'vidstreaming', category: string = 'sub'): Promise<AnimeStreamData | null> => {
    try {
        // endpoint: /episode/sources?animeEpisodeId={id}&server={server}&category={category}
        const response = await fetch(`${BASE_URL}/episode/sources?animeEpisodeId=${episodeId}&server=${server}&category=${category}`);
        const data = await response.json();
        if (!data.success) return null;
        return data.data;
    } catch (e) {
        console.error("Source fetch error", e);
        return null;
    }
};

export const fetchAnimeServers = async (episodeId: string): Promise<{ sub: any[], dub: any[], raw: any[] }> => {
    try {
        const response = await fetch(`${BASE_URL}/episode/servers?animeEpisodeId=${episodeId}`);
        const data = await response.json();
        if (!data.success) return { sub: [], dub: [], raw: [] };
        return data.data;
    } catch (e) {
        return { sub: [], dub: [], raw: [] };
    }
}
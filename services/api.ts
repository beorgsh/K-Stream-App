import { TMDB_API_KEY, TMDB_BASE_URL } from '../constants';
import { Media, MediaDetails, TMDBResponse, Episode } from '../types';

const fetchFromTMDB = async <T,>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const queryParams = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: 'en-US',
    ...params,
  });

  const queryString = queryParams.toString().replace(/%7C/g, '|');

  const response = await fetch(`${TMDB_BASE_URL}${endpoint}?${queryString}`);
  
  if (!response.ok) {
    throw new Error(`TMDB API Error: ${response.statusText}`);
  }

  return response.json();
};

// DISCOVER / EXPLORE
export const discoverMedia = async (
    type: 'movie' | 'tv', 
    page: number = 1, 
    isGlobal: boolean = false, 
    isAnime: boolean = false
): Promise<Media[]> => {
  const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv';
  
  const params: Record<string, string> = {
    sort_by: 'popularity.desc',
    'vote_count.gte': '10',
    page: page.toString(),
  };

  if (isAnime) {
      params.with_genres = '16'; // Animation
      params.with_original_language = 'ja';
  } else if (!isGlobal) {
      // Strict Korean Drama/Movie
      params.with_original_language = 'ko'; 
      params.without_genres = '16'; // No Animation
  }
  // If isGlobal is true, we don't apply language/genre restrictions

  const response = await fetchFromTMDB<TMDBResponse<Media>>(endpoint, params);
  return response.results.map(item => ({ ...item, media_type: type }));
};

// Fetch Trending Content
export const fetchTrending = async (type: 'movie' | 'tv', isGlobal: boolean = false): Promise<Media[]> => {
  // Use discover to ensure we filter by Korean language when not global
  const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv';
  
  const params: Record<string, string> = {
    sort_by: 'popularity.desc',
    'vote_count.gte': '20',
  };

  if (!isGlobal) {
    params.with_original_language = 'ko';
    params.without_genres = '16';
  }

  const response = await fetchFromTMDB<TMDBResponse<Media>>(endpoint, params);
  return response.results.map(item => ({ ...item, media_type: type }));
};

// Fetch Top Rated Content
export const fetchTopRated = async (type: 'movie' | 'tv', isGlobal: boolean = false): Promise<Media[]> => {
  const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv';
  const params: Record<string, string> = {
    page: '1',
    sort_by: 'vote_average.desc',
  };

  if (!isGlobal) {
    params.with_original_language = 'ko';
    params.without_genres = '16';
    params['vote_count.gte'] = '100';
  } else {
    params['vote_count.gte'] = '500'; // Higher threshold for global
  }

  const response = await fetchFromTMDB<TMDBResponse<Media>>(endpoint, params);
  return response.results.map(item => ({ ...item, media_type: type }));
};

// --- ANIME SPECIFIC HELPERS ---
export const fetchAnimeTrending = () => discoverMedia('tv', 1, false, true);
export const fetchAnimeMovies = () => discoverMedia('movie', 1, false, true);
export const fetchAnimeTopRated = async (): Promise<Media[]> => {
    // Top rated anime specifically
    const params = {
        with_genres: '16',
        with_original_language: 'ja',
        sort_by: 'vote_average.desc',
        'vote_count.gte': '200',
        page: '1'
    };
    const response = await fetchFromTMDB<TMDBResponse<Media>>('/discover/tv', params);
    return response.results.map(item => ({ ...item, media_type: 'tv' }));
};


// Wrappers for Home Page (Default Korean)
export const fetchTrendingKDramas = () => fetchTrending('tv', false);
export const fetchPopularKMovies = () => fetchTrending('movie', false);
export const fetchTopRatedKDramas = () => fetchTopRated('tv', false);

// Get Full Details
export const fetchMediaDetails = async (type: 'movie' | 'tv', id: number): Promise<MediaDetails> => {
  const data = await fetchFromTMDB<MediaDetails>(`/${type}/${id}`, {
    append_to_response: 'credits,similar,recommendations',
  });
  return { ...data, media_type: type };
};

// Get Season Details
export const fetchSeasonDetails = async (tvId: number, seasonNumber: number): Promise<{ episodes: Episode[] }> => {
  return fetchFromTMDB<{ episodes: Episode[] }>(`/tv/${tvId}/season/${seasonNumber}`);
};

// Search
export const searchContent = async (query: string, isGlobal: boolean = false, isAnime: boolean = false): Promise<Media[]> => {
  const response = await fetchFromTMDB<TMDBResponse<Media>>('/search/multi', {
    query,
    include_adult: 'false',
  });
  
  // Filter client-side
  const results = response.results.filter(item => {
      // Must be movie or tv
      if (item.media_type !== 'tv' && item.media_type !== 'movie') return false;
      
      if (isAnime) {
          // Anime logic: Japanese + Animation genre (16)
          return item.original_language === 'ja' && item.genre_ids?.includes(16);
      }
      
      // If not global, strict Korean filter
      if (!isGlobal) {
          return item.original_language === 'ko';
      }
      
      return true;
  });
  
  return results;
};
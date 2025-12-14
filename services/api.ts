import { TMDB_API_KEY, TMDB_BASE_URL } from '../constants';
import { Media, MediaDetails, TMDBResponse, Episode } from '../types';

const fetchFromTMDB = async <T,>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const queryParams = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: 'en-US',
    ...params,
  });

  // Decode pipe for multi-query params
  const queryString = queryParams.toString().replace(/%7C/g, '|');

  const response = await fetch(`${TMDB_BASE_URL}${endpoint}?${queryString}`);
  
  if (!response.ok) {
    throw new Error(`TMDB API Error: ${response.statusText}`);
  }

  return response.json();
};

// Generic Discover with strict KDrama filtering defaults
export const discoverMedia = async (type: 'movie' | 'tv', page: number = 1, isGlobal: boolean = false, isAnime: boolean = false): Promise<Media[]> => {
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
    // STRICT: Only return Korean content for default view
    params.with_original_language = 'ko';
  }

  const response = await fetchFromTMDB<TMDBResponse<Media>>(endpoint, params);
  return response.results.map(item => ({ ...item, media_type: type }));
};

// Fetch Trending
export const fetchTrending = async (type: 'movie' | 'tv', isGlobal: boolean = false): Promise<Media[]> => {
  // Use discover endpoint for filtered trending to ensure we can apply language filter strictly
  const endpoint = isGlobal ? `/trending/${type}/week` : (type === 'movie' ? '/discover/movie' : '/discover/tv');
  
  const params: Record<string, string> = {};
  
  if (!isGlobal) {
    params.with_original_language = 'ko';
    params.sort_by = 'popularity.desc';
    params['vote_count.gte'] = '50';
  }

  const response = await fetchFromTMDB<TMDBResponse<Media>>(endpoint, params);
  return response.results.map(item => ({ ...item, media_type: type }));
};

// Fetch Top Rated
export const fetchTopRated = async (type: 'movie' | 'tv', isGlobal: boolean = false): Promise<Media[]> => {
  const endpoint = type === 'movie' ? '/movie/top_rated' : '/tv/top_rated';
  const params: Record<string, string> = { page: '1' };

  if (!isGlobal) {
    // For local (Korean) view, use discover to filter by language, as standard top_rated endpoint doesn't filter by lang
    return discoverMedia(type, 1, false); 
  }

  const response = await fetchFromTMDB<TMDBResponse<Media>>(endpoint, params);
  return response.results.map(item => ({ ...item, media_type: type }));
};

// Fetch Content by specific language (For Home Page Rows)
export const fetchMediaByLang = async (type: 'movie' | 'tv', lang: string): Promise<Media[]> => {
  const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv';
  const params: Record<string, string> = {
    sort_by: 'popularity.desc',
    'vote_count.gte': '5',
    with_original_language: lang,
    page: '1',
  };
  
  // If fetching Japanese TV (J-Dramas), exclude animation
  if (lang === 'ja' && type === 'tv') {
      params.without_genres = '16'; 
  }

  const response = await fetchFromTMDB<TMDBResponse<Media>>(endpoint, params);
  return response.results.map(item => ({ ...item, media_type: type }));
};

// Fetch Anime (Japanese Animation)
export const fetchAnimeContent = async (): Promise<Media[]> => {
  const response = await fetchFromTMDB<TMDBResponse<Media>>('/discover/tv', {
    sort_by: 'popularity.desc',
    with_genres: '16', 
    with_original_language: 'ja',
    'vote_count.gte': '5',
    page: '1'
  });
  return response.results.map(item => ({ ...item, media_type: 'tv' }));
};

// Wrappers
export const fetchTrendingKDramas = () => fetchTrending('tv', false);
export const fetchPopularKMovies = () => fetchTrending('movie', false);
export const fetchTopRatedKDramas = () => fetchTopRated('tv', false);

// Get Full Details
export const fetchMediaDetails = async (type: 'movie' | 'tv', id: number): Promise<MediaDetails> => {
  const data = await fetchFromTMDB<MediaDetails>(`/${type}/${id}`, {
    append_to_response: 'credits,similar',
  });
  return { ...data, media_type: type };
};

// Get Season Details
export const fetchSeasonDetails = async (tvId: number, seasonNumber: number): Promise<{ episodes: Episode[] }> => {
  return fetchFromTMDB<{ episodes: Episode[] }>(`/tv/${tvId}/season/${seasonNumber}`);
};

// Search 
export const searchContent = async (query: string, isGlobal: boolean = false): Promise<Media[]> => {
  const response = await fetchFromTMDB<TMDBResponse<Media>>('/search/multi', {
    query,
    include_adult: 'false',
  });
  
  let results = response.results.filter(item => item.media_type === 'tv' || item.media_type === 'movie');

  if (!isGlobal) {
    // Only Korean for default search
    results = results.filter((item) => item.original_language === 'ko');
  }
  
  return results;
};
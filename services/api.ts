import { TMDB_API_KEY, TMDB_BASE_URL } from '../constants';
import { Media, MediaDetails, TMDBResponse, Episode } from '../types';

const fetchFromTMDB = async <T,>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const queryParams = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: 'en-US',
    ...params,
  });

  const response = await fetch(`${TMDB_BASE_URL}${endpoint}?${queryParams}`);
  
  if (!response.ok) {
    throw new Error(`TMDB API Error: ${response.statusText}`);
  }

  return response.json();
};

// Generic Discover for Movies/TV with pagination
export const discoverMedia = async (type: 'movie' | 'tv', page: number = 1, isGlobal: boolean = false): Promise<Media[]> => {
  const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv';
  const params: Record<string, string> = {
    sort_by: 'popularity.desc',
    'vote_count.gte': '10',
    page: page.toString(),
  };

  if (!isGlobal) {
    params.with_original_language = 'ko';
  }

  const response = await fetchFromTMDB<TMDBResponse<Media>>(endpoint, params);
  return response.results.map(item => ({ ...item, media_type: type }));
};

// Fetch Trending
export const fetchTrending = async (type: 'movie' | 'tv', isGlobal: boolean = false): Promise<Media[]> => {
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
  const params: Record<string, string> = {
    page: '1'
  };

  if (!isGlobal) {
    // For Korean specific top rated, we use discover as /movie/top_rated doesn't support region filtering effectively in one go without region param which is vague
    return discoverMedia(type, 1, false); 
  }

  const response = await fetchFromTMDB<TMDBResponse<Media>>(endpoint, params);
  return response.results.map(item => ({ ...item, media_type: type }));
};

// Legacy support wrappers
export const fetchTrendingKDramas = () => fetchTrending('tv', false);
export const fetchPopularKMovies = () => fetchTrending('movie', false);
export const fetchTopRatedKDramas = () => fetchTopRated('tv', false);

// Get Full Details
export const fetchMediaDetails = async (type: 'movie' | 'tv', id: number): Promise<MediaDetails> => {
  const data = await fetchFromTMDB<MediaDetails>(`/${type}/${id}`, {
    append_to_response: 'credits,similar',
  });
  // TMDB detail endpoints don't always return media_type, so we inject it manually to ensure consistency
  return { ...data, media_type: type };
};

// Get Season Details (for episodes)
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
    results = results.filter((item) => item.original_language === 'ko');
  }
  
  return results;
};
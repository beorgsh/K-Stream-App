export interface Media {
  id: number;
  title?: string;
  name?: string; // TV shows use 'name'
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  media_type: 'movie' | 'tv';
  original_language: string;
  genre_ids?: number[];
  // Added for Continue Watching
  progress?: {
    watched: number;
    duration: number;
  };
  last_season?: number;
  last_episode?: number;
}

export interface MediaDetails extends Media {
  genres: { id: number; name: string }[];
  status: string;
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  seasons?: Season[];
  credits?: {
    cast: CastMember[];
  };
}

export interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string;
  poster_path: string | null;
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

// Stored data structure from Player
export interface StoredMediaData {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  progress: {
    watched: number;
    duration: number;
  };
  last_season_watched?: number;
  last_episode_watched?: number;
  last_updated: number;
  show_progress?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface SavedRoom {
  id: string;
  name: string;
  timestamp: number;
  users?: number; // For mock data
}
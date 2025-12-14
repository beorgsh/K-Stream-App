
export interface Media {
  id: number | string; // Updated to support Anime string IDs
  title?: string;
  name?: string; // TV shows use 'name'
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  media_type: 'movie' | 'tv' | 'anime';
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
  similar?: {
    results: Media[];
  };
  recommendations?: {
    results: Media[];
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
  runtime?: number;
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
  id: number | string;
  type: 'movie' | 'tv' | 'anime';
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  original_language?: string; // Added for filtering
  genre_ids?: number[]; // Added for filtering
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
  id: string; // The PeerJS ID
  name: string; // Room Name (e.g. "Chill Night")
  timestamp: number;
  users: number;
  isPrivate: boolean;
  password?: string; // Storing simple password for this MVP
  hostName: string;
  media: {
    id: number | string;
    type: 'movie' | 'tv' | 'anime';
    title: string;
    poster_path: string | null;
    backdrop_path: string | null;
  };
}

// --- Anime Specific Types ---

export interface AnimeEpisode {
    episodeId: string;
    number: number;
    title: string;
    isFiller: boolean;
}

export interface AnimeStreamSource {
    url: string;
    type: string;
    isM3U8: boolean;
    quality?: string;
}

export interface AnimeSubtitle {
    url: string;
    lang: string;
}

export interface AnimeStreamData {
    headers: Record<string, string>;
    sources: AnimeStreamSource[];
    subtitles?: AnimeSubtitle[];
    tracks?: {
        file: string;
        label: string;
        kind: string;
        default?: boolean;
    }[];
}
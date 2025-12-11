import { Media, StoredMediaData } from '../types';

const STORAGE_KEY = 'vidFastProgress';

const DUMMY_DATA = {
    "t63174": {
        "id": 63174,
        "type": "tv",
        "title": "Lucifer",
        "poster_path": "/ekZobS8isE6mA53RAiGDG93hBxL.jpg",
        "backdrop_path": "/wbiPjTWpZMIB8ffBq7HvzAph4Ft.jpg",
        "progress": {
            "watched": 793.207692,
            "duration": 2695.3689
        },
        "last_season_watched": 1,
        "last_episode_watched": 1,
        "last_updated": Date.now()
    },
    "m533535": {
        "id": 533535,
        "type": "movie",
        "title": "Deadpool & Wolverine",
        "poster_path": "/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
        "backdrop_path": "/by8z9Fe8y7p4jo2YlW2SZDnptyT.jpg",
        "progress": {
            "watched": 353.530349,
            "duration": 7667.227
        },
        "last_updated": Date.now() - 10000 // slightly older
    }
};

export const getContinueWatching = (): Media[] => {
  let stored = localStorage.getItem(STORAGE_KEY);
  
  // Inject dummy data if strictly empty to verify functionality
  if (!stored || stored === '{}') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DUMMY_DATA));
    stored = JSON.stringify(DUMMY_DATA);
  }

  try {
    const data: Record<string, StoredMediaData> = JSON.parse(stored);
    
    // Convert object to array, sort by recency, and map to Media type
    return Object.values(data)
      .sort((a, b) => b.last_updated - a.last_updated)
      .map(item => ({
        id: item.id,
        title: item.title,
        name: item.title, // For TV compatibility
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        overview: '', 
        vote_average: 0, 
        media_type: item.type,
        original_language: 'en',
        progress: item.progress,
        last_season: item.last_season_watched,
        last_episode: item.last_episode_watched
      }));
  } catch (e) {
    console.error("Failed to parse progress data", e);
    return [];
  }
};

export const saveProgress = (data: Record<string, any>) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error("Failed to save progress", e);
    }
}

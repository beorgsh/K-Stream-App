import { Media } from '../types';

const ANILIST_API_URL = 'https://graphql.anilist.co';

export const fetchAnilistImage = async (tmdbId: number): Promise<string | null> => {
    const query = `
    query($tmdbId: Int) {
      Media(idTmdb: $tmdbId, type: ANIME) {
        coverImage {
          extraLarge
          large
        }
        bannerImage
      }
    }
    `;

    try {
        const response = await fetch(ANILIST_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                variables: { tmdbId }
            })
        });

        const data = await response.json();
        const media = data?.data?.Media;
        
        if (media) {
            return media.bannerImage || media.coverImage?.extraLarge || media.coverImage?.large || null;
        }
        return null;
    } catch (error) {
        console.error("Anilist fetch error:", error);
        return null;
    }
};

export const fetchAnilistId = async (tmdbId: number): Promise<number | null> => {
    const query = `
    query($tmdbId: Int) {
      Media(idTmdb: $tmdbId, type: ANIME) {
        id
      }
    }
    `;

    try {
        const response = await fetch(ANILIST_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                variables: { tmdbId }
            })
        });

        const data = await response.json();
        return data?.data?.Media?.id || null;
    } catch (error) {
        console.error("Anilist ID fetch error:", error);
        return null;
    }
};

export const fetchAnilistMetadata = async (tmdbId: number) => {
    const query = `
    query($tmdbId: Int) {
      Media(idTmdb: $tmdbId, type: ANIME) {
        id
        title {
          english
          romaji
          native
        }
        description
        coverImage {
          extraLarge
          large
        }
        bannerImage
        averageScore
        status
        genres
        seasonYear
        episodes
        duration
      }
    }
    `;

    try {
        const response = await fetch(ANILIST_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query, variables: { tmdbId } })
        });

        const data = await response.json();
        return data?.data?.Media || null;
    } catch (error) {
        console.error("Anilist Metadata fetch error:", error);
        return null;
    }
};

export const searchAnilistMedia = async (query: string): Promise<Media[]> => {
    const graphqlQuery = `
    query ($search: String) {
      Page(page: 1, perPage: 20) {
        media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
          id
          idTmdb
          title {
            romaji
            english
            native
          }
          coverImage {
            extraLarge
            large
          }
          bannerImage
          description
          averageScore
          startDate {
            year
            month
            day
          }
          format
          genres
        }
      }
    }
    `;

    try {
        const response = await fetch(ANILIST_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: graphqlQuery,
                variables: { search: query }
            })
        });

        const data = await response.json();
        const results = data?.data?.Page?.media || [];
        
        return results
            .filter((item: any) => item.idTmdb) // Must have TMDB ID for app compatibility
            .map((item: any) => ({
                id: item.idTmdb,
                title: item.title.english || item.title.romaji || item.title.native,
                name: item.title.english || item.title.romaji || item.title.native,
                poster_path: item.coverImage.extraLarge || item.coverImage.large,
                backdrop_path: item.bannerImage || item.coverImage.extraLarge,
                overview: item.description ? item.description.replace(/<[^>]*>?/gm, '') : '',
                vote_average: item.averageScore ? item.averageScore / 10 : 0,
                media_type: item.format === 'MOVIE' ? 'movie' : 'tv',
                original_language: 'ja',
                genre_ids: [16], // Animation
                release_date: item.startDate.year ? `${item.startDate.year}-${String(item.startDate.month).padStart(2, '0')}-${String(item.startDate.day).padStart(2, '0')}` : undefined,
            }));
    } catch (error) {
        console.error("Anilist Search Error:", error);
        return [];
    }
};
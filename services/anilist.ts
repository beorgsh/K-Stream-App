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
import { describe, it, expect, vi } from 'vitest';

describe('Person Page', () => {
    describe('loadPersonPage', () => {
        it.todo('fetches person details and combined credits from TMDB');
        it.todo('renders person bio with photo, name, and metadata');
        it.todo('renders filmography grid with poster cards');
        it.todo('fetches awards via OMDb external_ids -> getAllRatings');
        it.todo('renders awards string when available');
        it.todo('hides awards section when data is N/A or null');
    });

    describe('Filmography Filters', () => {
        it.todo('All filter shows deduplicated cast + crew');
        it.todo('Movies filter shows only media_type === movie');
        it.todo('TV Shows filter shows only media_type === tv');
        it.todo('As Director filter shows only crew with job === Director');
    });

    describe('Filmography Sort', () => {
        it.todo('Newest first sorts by release_date descending');
        it.todo('By rating sorts by vote_average descending');
    });

    describe('Frequently Works With', () => {
        it.todo('identifies collaborators appearing in 2+ shared titles');
        it.todo('limits API calls to top 10 titles by vote_count');
        it.todo('returns top 5-8 collaborators');
    });

    describe('Navigation', () => {
        it.todo('back button returns to detail modal');
        it.todo('filmography card click opens detail modal');
    });
});

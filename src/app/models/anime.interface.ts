export interface Anime {
  id: number;
  title: string;
  description: string;
  image: string;
  year: string; // Mudado para string para compatibilidade com o schema do banco
  genre?: string;
  genres?: string[];
  episodes?: number;
  status?: 'completed' | 'ongoing' | 'upcoming';
  rating?: number;
  studio?: string;
  dubbed?: boolean;
  slug?: string;
  originalLink?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Episode {
  id: number;
  number: number;
  title: string;
  description?: string;
  duration?: string;
  thumbnail?: string;
  videoUrl?: string;
  airDate?: string;
  isWatched?: boolean;
  originalLink?: string | null;
  animeId?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
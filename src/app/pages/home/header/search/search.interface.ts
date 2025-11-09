export interface SearchConfig {
  debounceTime?: number;
  minQueryLength?: number;
  placeholder?: string;
  maxLength?: number;
}

export interface SearchEvent {
  query: string;
  immediate?: boolean;
  filters?: SearchFilters;
}

export interface SearchState {
  query: string;
  isLoading: boolean;
  hasResults: boolean;
}

export interface SearchFilters {
  audioType?: AudioType[];
  genres?: string[];
  year?: string; // Mudado para string para compatibilidade com o schema do banco
}

export type AudioType = 'legendado' | 'dublado';

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface GenreOption extends FilterOption {
  // Pode ter propriedades específicas de gênero no futuro
}

export interface YearOption {
  value: string; // Mudado para string para compatibilidade com o schema do banco
  label: string;
}
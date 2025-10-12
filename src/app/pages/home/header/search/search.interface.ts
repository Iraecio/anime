export interface SearchConfig {
  debounceTime?: number;
  minQueryLength?: number;
  placeholder?: string;
  maxLength?: number;
}

export interface SearchEvent {
  query: string;
  immediate?: boolean;
}

export interface SearchState {
  query: string;
  isLoading: boolean;
  hasResults: boolean;
}
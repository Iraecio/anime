export interface PaginationConfig {
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  maxPagesToShow?: number;
  boundaryPages?: number;
  size?: 'sm' | 'lg' | 'default';
  alwaysShow?: boolean;
  showInfo?: boolean;
  customLabels?: {
    first?: string;
    previous?: string;
    next?: string;
    last?: string;
    info?: string;
  };
}

export interface PaginationEvent {
  page: number;
  previousPage: number;
  totalPages: number;
  totalItems: number;
}

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
  pageNumbers: number[];
}
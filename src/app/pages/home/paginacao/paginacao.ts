import {
  Component,
  ChangeDetectionStrategy,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginationConfig, PaginationEvent, PaginationState } from './paginacao.interface';

@Component({
  selector: 'app-paginacao',
  imports: [CommonModule],
  templateUrl: './paginacao.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.pagination-wrapper]': 'true',
    '[class.pagination-sm]': 'config().size === "sm"',
    '[class.pagination-lg]': 'config().size === "lg"',
  },
  styles: [`
    :host {
      display: block;
    }
    
    .pagination-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    
    .pagination-nav {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }
    
    .pagination-info {
      text-align: center;
      font-size: 0.875rem;
      color: var(--bs-text-muted, #6c757d);
    }
    
    @media (min-width: 768px) {
      .pagination-nav {
        flex-direction: row;
        justify-content: space-between;
        width: 100%;
        max-width: 600px;
      }
      
      .pagination-info {
        order: 2;
        flex: 0 0 auto;
      }
      
      .pagination {
        order: 1;
        margin: 0;
      }
    }
    
    .page-link {
      transition: all 0.2s ease-in-out;
    }
    
    .page-link:hover:not(:disabled) {
      transform: translateY(-1px);
    }
    
    .page-link:focus {
      box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
      z-index: 3;
    }
  `],
})
export class PaginacaoComponent {
  // Inputs
  readonly totalItems = input.required<number>();
  readonly itemsPerPage = input<number>(50);
  readonly currentPage = input<number>(1);
  readonly config = input<PaginationConfig>({});
  
  // Outputs
  readonly onPageChange = output<PaginationEvent>();

  // Internal signals
  private readonly internalCurrentPage = signal(1);

  // Default configuration
  private readonly defaultConfig: PaginationConfig = {
    showFirstLast: true,
    showPrevNext: true,
    maxPagesToShow: 5,
    boundaryPages: 1,
    size: 'lg',
    alwaysShow: false,
    showInfo: false,
    customLabels: {
      first: '««',
      previous: '‹',
      next: '›',
      last: '»»',
      info: 'Página {{current}} de {{total}}'
    }
  };

  // Computed properties
  readonly mergedConfig = computed(() => ({
    ...this.defaultConfig,
    ...this.config(),
    customLabels: {
      ...this.defaultConfig.customLabels,
      ...this.config().customLabels
    }
  }));

  readonly totalPages = computed(() => 
    Math.max(1, Math.ceil(this.totalItems() / this.itemsPerPage()))
  );

  readonly paginationState = computed((): PaginationState => {
    const current = this.internalCurrentPage();
    const total = this.totalPages();
    const totalItems = this.totalItems();
    const itemsPerPage = this.itemsPerPage();

    return {
      currentPage: current,
      totalPages: total,
      totalItems,
      itemsPerPage,
      hasNext: current < total,
      hasPrevious: current > 1,
      pageNumbers: this.calculatePageNumbers(current, total)
    };
  });

  readonly shouldShowPagination = computed(() => {
    const state = this.paginationState();
    return this.mergedConfig().alwaysShow || state.totalPages > 1;
  });

  readonly paginationInfo = computed(() => {
    const state = this.paginationState();
    const template = this.mergedConfig().customLabels?.info || 'Página {{current}} de {{total}}';
    
    return template
      .replace('{{current}}', state.currentPage.toString())
      .replace('{{total}}', state.totalPages.toString());
  });

  constructor() {
    // Sync external currentPage input with internal signal
    effect(() => {
      const externalPage = this.currentPage();
      const total = this.totalPages();
      const validPage = Math.max(1, Math.min(externalPage, total));
      
      if (this.internalCurrentPage() !== validPage) {
        this.internalCurrentPage.set(validPage);
      }
    }, { allowSignalWrites: true });

    // Emit page changes
    effect(() => {
      const currentState = this.paginationState();
      const previousPage = this.internalCurrentPage();
      
      this.onPageChange.emit({
        page: currentState.currentPage,
        previousPage,
        totalPages: currentState.totalPages,
        totalItems: currentState.totalItems
      });
    });
  }

  private calculatePageNumbers(currentPage: number, totalPages: number): number[] {
    const config = this.mergedConfig();
    const maxPages = config.maxPagesToShow || 5;
    const boundaryPages = config.boundaryPages || 1;

    if (totalPages <= maxPages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: number[] = [];
    const halfMax = Math.floor(maxPages / 2);
    
    let startPage = Math.max(1, currentPage - halfMax);
    let endPage = Math.min(totalPages, currentPage + halfMax);

    // Adjust if we're at the beginning or end
    if (startPage === 1) {
      endPage = Math.min(totalPages, maxPages);
    } else if (endPage === totalPages) {
      startPage = Math.max(1, totalPages - maxPages + 1);
    }

    // Add boundary pages at the beginning
    if (startPage > boundaryPages + 1) {
      for (let i = 1; i <= boundaryPages; i++) {
        pages.push(i);
      }
      if (startPage > boundaryPages + 2) {
        pages.push(-1); // Ellipsis
      }
    }

    // Add main pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add boundary pages at the end
    if (endPage < totalPages - boundaryPages) {
      if (endPage < totalPages - boundaryPages - 1) {
        pages.push(-1); // Ellipsis
      }
      for (let i = totalPages - boundaryPages + 1; i <= totalPages; i++) {
        pages.push(i);
      }
    }

    return pages;
  }

  // Navigation methods
  nextPage(): void {
    const state = this.paginationState();
    if (state.hasNext) {
      this.internalCurrentPage.set(state.currentPage + 1);
    }
  }

  previousPage(): void {
    const state = this.paginationState();
    if (state.hasPrevious) {
      this.internalCurrentPage.set(state.currentPage - 1);
    }
  }

  goToFirstPage(): void {
    this.internalCurrentPage.set(1);
  }

  goToLastPage(): void {
    this.internalCurrentPage.set(this.totalPages());
  }

  goToPage(page: number): void {
    const total = this.totalPages();
    const validPage = Math.max(1, Math.min(page, total));
    
    if (validPage !== this.internalCurrentPage()) {
      this.internalCurrentPage.set(validPage);
    }
  }

  // Keyboard navigation
  onKeyDown(event: KeyboardEvent, action: () => void): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }

  // Accessibility helpers
  getAriaLabel(page: number): string {
    const state = this.paginationState();
    const config = this.mergedConfig();
    
    if (page === state.currentPage) {
      return `Página atual, página ${page}`;
    }
    
    return `Ir para página ${page}`;
  }

  getButtonAriaLabel(action: string): string {
    const labels = this.mergedConfig().customLabels!;
    const state = this.paginationState();
    
    switch (action) {
      case 'first':
        return `Ir para primeira página`;
      case 'previous':
        return `Ir para página anterior, página ${state.currentPage - 1}`;
      case 'next':
        return `Ir para próxima página, página ${state.currentPage + 1}`;
      case 'last':
        return `Ir para última página, página ${state.totalPages}`;
      default:
        return '';
    }
  }
}

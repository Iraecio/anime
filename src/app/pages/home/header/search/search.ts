import {
    Component,
    ChangeDetectionStrategy,
    computed,
    effect,
    ElementRef,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { SearchConfig, SearchEvent } from './search.interface';

@Component({
  selector: 'app-search',
  imports: [CommonModule, FormsModule],
  styleUrls: ['./search.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.search-loading]': 'isSearching()',
    '[class.search-has-query]': 'hasQuery()',
  },
  template: `
    <div class="search-container">
      <div class="input-group">
        <input
          #searchInput
          type="text"
          class="form-control bg-dark text-white border-secondary"
          [placeholder]="config().placeholder || 'Buscar animes por título...'"
          [maxlength]="config().maxLength || 100"
          [(ngModel)]="searchQuery"
          (input)="onInputChange($event)"
          (keyup.enter)="onEnterPress()"
          (blur)="onBlur()"
          (focus)="onFocus()"
          autocomplete="off"
          spellcheck="false"
        />
        <div class="input-group-text bg-dark border-secondary">
          @if (isSearching()) {
          <div
            class="spinner-border spinner-border-sm text-primary"
            role="status"
            aria-label="Carregando resultados da busca"
          >
            <span class="visually-hidden">Carregando...</span>
          </div>
          } @else if (hasQuery()) {
          <button
            class="btn btn-sm text-danger border-0 p-1 d-flex align-items-center justify-content-center"
            (click)="clearSearch()"
            title="Limpar busca"
            type="button"
            aria-label="Limpar busca"
          >
            <!-- YouTube Clear/Close Icon -->
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                fill="currentColor"
              />
            </svg>
          </button>
          } @else {
          <!-- YouTube Search Icon -->
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            class="text-muted"
            aria-hidden="true"
          >
            <path
              d="M20.87 20.17l-5.59-5.59C16.35 13.35 17 11.75 17 10c0-3.87-3.13-7-7-7s-7 3.13-7 7 3.13 7 7 7c1.75 0 3.35-.65 4.58-1.71l5.59 5.59.7-.71zM10 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"
              fill="currentColor"
            />
          </svg>
          }
        </div>
      </div>
    </div>
  `,
})
export class SearchComponent {
  // Inputs
  readonly config = input<SearchConfig>({});
  readonly isSearching = input<boolean>(false);
  readonly initialQuery = input<string>('');

  // Outputs
  readonly onSearch = output<SearchEvent>();
  readonly onClear = output<void>();
  readonly onFocusChange = output<boolean>();

  // ViewChild usando nova API
  readonly searchInputRef =
    viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  // Signals internos
  readonly searchQuery = signal('');
  private readonly isFocused = signal(false);
  private readonly searchSubject = new Subject<string>();

  // Computed properties
  readonly hasQuery = computed(() => this.searchQuery().trim().length > 0);
  readonly isValid = computed(() => {
    const query = this.searchQuery().trim();
    const minLength = this.config().minQueryLength || 0;
    return query.length >= minLength;
  });

  constructor() {
    // Effect para sincronizar query inicial
    effect(() => {
      const initial = this.initialQuery();
      if (initial !== this.searchQuery()) {
        this.searchQuery.set(initial);
      }
    });

    // Setup do debounce
    this.setupSearchDebounce();
  }

  private setupSearchDebounce(): void {
    const debounceMs = this.config().debounceTime || 300;

    this.searchSubject
      .pipe(debounceTime(debounceMs), distinctUntilChanged())
      .subscribe((query) => {
        const trimmedQuery = query.trim();
        if (this.isValid()) {
          this.onSearch.emit({
            query: trimmedQuery,
            immediate: false,
          });
        }
      });
  }

  // Event handlers
  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;

    this.searchQuery.set(value);

    // Emite através do subject para debounce
    this.searchSubject.next(value);
  }

  onEnterPress(): void {
    const query = this.searchQuery().trim();

    if (this.isValid()) {
      this.onSearch.emit({
        query,
        immediate: true,
      });
    }
  }

  onFocus(): void {
    this.isFocused.set(true);
    this.onFocusChange.emit(true);
  }

  onBlur(): void {
    this.isFocused.set(false);
    this.onFocusChange.emit(false);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.onClear.emit();

    // Foca no input após limpar
    setTimeout(() => {
      this.searchInputRef().nativeElement.focus();
    }, 0);
  }

  // Método público para focar o input
  focusInput(): void {
    this.searchInputRef().nativeElement.focus();
  }

  // Método público para definir query programaticamente
  setQuery(query: string): void {
    this.searchQuery.set(query);
  }
}

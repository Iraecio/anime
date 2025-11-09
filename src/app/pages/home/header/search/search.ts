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
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { SearchConfig, SearchEvent, SearchFilters, AudioType, GenreOption, YearOption } from './search.interface';
import { SupabaseService } from '../../../../services/supabase.service';

@Component({
  selector: 'app-search',
  imports: [CommonModule, FormsModule],
  styleUrl: './search.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.search-loading]': 'isSearching()',
    '[class.search-has-query]': 'hasQuery()',
    '[class.filters-expanded]': 'filtersExpanded()',
  },
  template: `
    <div class="search-container">
      <!-- Barra de Busca Principal -->
      <div class="search-bar">
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
          
          <!-- Botão de Filtros -->
          <button 
            class="filter-toggle-btn"
            (click)="toggleFilters()"
            [class.active]="filtersExpanded()"
            title="Filtros de busca"
            type="button"
            aria-label="Abrir filtros de busca"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.73-4.8 5.75-7.39c.51-.66.04-1.61-.79-1.61H5.04c-.83 0-1.3.95-.79 1.61z" fill="currentColor"/>
            </svg>
            @if (hasActiveFilters()) {
              <span class="filter-indicator"></span>
            }
          </button>

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

      <!-- Painel de Filtros Expandido -->
      @if (filtersExpanded()) {
        <div class="filters-panel">
          <div class="filters-content">
            
            <!-- Filtro de Áudio -->
            <div class="filter-group">
              <label class="filter-label">Tipo de Áudio:</label>
              <div class="filter-options">
                @for (audioType of audioTypes; track audioType) {
                  <label class="filter-checkbox">
                    <input 
                      type="checkbox" 
                      [checked]="selectedAudioTypes().includes(audioType)"
                      (change)="toggleAudioType(audioType)"
                    />
                    <span class="checkmark"></span>
                    {{ audioType | titlecase }}
                  </label>
                }
              </div>
            </div>

            <!-- Filtro de Gêneros -->
            <div class="filter-group">
              <label class="filter-label">Gêneros:</label>
              <div class="filter-options genre-options">
                @for (genre of popularGenres(); track genre.value) {
                  <label class="filter-checkbox">
                    <input 
                      type="checkbox" 
                      [checked]="selectedGenres().includes(genre.value)"
                      (change)="toggleGenre(genre.value)"
                    />
                    <span class="checkmark"></span>
                    {{ genre.label }}
                  </label>
                }
              </div>
            </div>

            <!-- Filtro de Ano -->
            <div class="filter-group">
              <label class="filter-label">Ano de Lançamento:</label>
              <div class="filter-options">
                <select 
                  class="form-select"
                  [ngModel]="selectedYear()"
                  (ngModelChange)="setYear($event)"
                >
                  <option value="">Todos os anos</option>
                  @for (year of yearOptions(); track year.value) {
                    <option [value]="year.value">{{ year.label }}</option>
                  }
                </select>
              </div>
            </div>

            <!-- Info de Aplicação Automática -->
            <div class="filter-info">
              <small class="text-muted">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 4px;">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                </svg>
                Filtros são aplicados automaticamente
              </small>
            </div>

            <!-- Ações dos Filtros -->
            <div class="filter-actions">
              <button 
                class="btn btn-outline-light btn-sm"
                (click)="clearFilters()"
                [disabled]="!hasActiveFilters()"
              >
                Limpar Filtros
              </button>
              <button 
                class="btn btn-secondary btn-sm"
                (click)="applyFilters()"
              >
                Fechar Filtros
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class SearchComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
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

  // Signals internos para busca
  readonly searchQuery = signal('');
  private readonly isFocused = signal(false);
  private readonly searchSubject = new Subject<string>();

  // Signals para filtros
  readonly filtersExpanded = signal(false);
  readonly selectedAudioTypes = signal<AudioType[]>([]);
  readonly selectedGenres = signal<string[]>([]);
  readonly selectedYear = signal<string | null>(null);

  // Dados estáticos para filtros
  readonly audioTypes: AudioType[] = ['legendado', 'dublado'];
  
  readonly allGenres = signal<GenreOption[]>([]);

  // Computed properties
  readonly hasQuery = computed(() => this.searchQuery().trim().length > 0);
  readonly isValid = computed(() => {
    const query = this.searchQuery().trim();
    const minLength = this.config().minQueryLength || 0;
    return query.length >= minLength;
  });

  // Computed properties para filtros
  readonly popularGenres = computed(() => {
    // Retorna os gêneros mais populares primeiro (pode ser baseado em dados reais)
    return this.allGenres(); // Mostra apenas os primeiros 12
  });

  readonly yearOptions = computed(() => {
    const currentYear = new Date().getFullYear();
    const years: YearOption[] = [];
    
    for (let year = currentYear; year >= currentYear - 50; year--) {
      years.push({
        value: year.toString(), // Convertido para string para compatibilidade com o banco
        label: year.toString()
      });
    }
    
    return years;
  });

  readonly hasActiveFilters = computed(() => {
    return this.selectedAudioTypes().length > 0 ||
           this.selectedGenres().length > 0 ||
           this.selectedYear() !== null;
  });

  readonly currentFilters = computed((): SearchFilters => {
    return {
      audioType: this.selectedAudioTypes().length > 0 ? this.selectedAudioTypes() : undefined,
      genres: this.selectedGenres().length > 0 ? this.selectedGenres() : undefined,
      year: this.selectedYear() || undefined
    };
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

  ngOnInit(): void {
    this.supabase.getGenresList().subscribe((genres) => {
      let generos: GenreOption[] = [];
      genres.forEach(genre => {
        const genero = { label: genre, value: genre };
        generos.push(genero);
      });
      this.allGenres.set(generos);
    });
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
            filters: this.currentFilters()
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
        filters: this.currentFilters()
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

  // ===== MÉTODOS PARA FILTROS =====
  
  toggleFilters(): void {
    this.filtersExpanded.update(expanded => !expanded);
  }

  toggleAudioType(audioType: AudioType): void {
    this.selectedAudioTypes.update(types => {
      const exists = types.includes(audioType);
      if (exists) {
        return types.filter(type => type !== audioType);
      } else {
        return [...types, audioType];
      }
    });
    
    // Aplica automaticamente quando o filtro é alterado
    this.applyFiltersAutomatically();
  }

  toggleGenre(genre: string): void {
    this.selectedGenres.update(genres => {
      const exists = genres.includes(genre);
      if (exists) {
        return genres.filter(g => g !== genre);
      } else {
        return [...genres, genre];
      }
    });
    
    // Aplica automaticamente quando o filtro é alterado
    this.applyFiltersAutomatically();
  }

  setYear(year: string): void {
    const yearValue = year || null;
    this.selectedYear.set(yearValue);
    
    // Aplica automaticamente quando o filtro é alterado
    this.applyFiltersAutomatically();
  }

  clearFilters(): void {
    this.selectedAudioTypes.set([]);
    this.selectedGenres.set([]);
    this.selectedYear.set(null);
    
    // Aplica automaticamente após limpar
    this.applyFiltersAutomatically();
  }

  applyFilters(): void {
    const query = this.searchQuery().trim();
    const filters = this.currentFilters();
    
    // Emite evento de busca com filtros
    this.onSearch.emit({
      query,
      immediate: true,
      filters
    });

    // Fecha o painel de filtros após aplicar manualmente
    this.filtersExpanded.set(false);
  }

  private applyFiltersAutomatically(): void {
    const query = this.searchQuery().trim();
    const filters = this.currentFilters();
    
    // Debug: Log dos filtros combinados no SearchComponent
    console.log('🎛️ SearchComponent - Aplicando filtros automaticamente:', {
      query,
      filters,
      'audioTypes atuais': this.selectedAudioTypes(),
      'genres atuais': this.selectedGenres(),
      'year atual': this.selectedYear()
    });
    
    // Emite evento de busca com filtros automaticamente
    this.onSearch.emit({
      query,
      immediate: true,
      filters
    });
    
    // NÃO fecha o painel para aplicação automática
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

import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  SupabaseAnimeWithEpisodes,
  SupabaseEpisode,
  SupabaseService,
} from '../../services/supabase.service';
import { EpisodeService } from '../../services/episode.service';
import { CacheDebugComponent } from '../../components/cache-debug.component';
import { environment } from '../../../environments/environment';
import { PaginacaoComponent } from './paginacao/paginacao';
import { SearchComponent } from './header/search/search';
import { SearchEvent, SearchFilters } from './header/search/search.interface';
import { PaginationEvent } from './paginacao/paginacao.interface';
import { AnimeCard, AnimeCardEvents } from './components/anime-card/anime-card';
import { CardService } from '../../services/card-service.service';

@Component({
  selector: 'app-home',
  imports: [
    FormsModule,
    CacheDebugComponent,
    PaginacaoComponent,
    SearchComponent,
    AnimeCard,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private episodeService = inject(EpisodeService);
  private cardService = inject(CardService);

  // Estados para o mostruário do Supabase
  isLoading = signal(false);
  animes = signal<SupabaseAnimeWithEpisodes[]>([]);
  totalAnimes = signal(0);
  currentPage = signal(1);
  perPage = signal(50);

  searchQuery = signal('');
  isSearching = signal(false);

  // Configuração do componente de busca
  searchConfig = {
    debounceTime: 300,
    minQueryLength: 0,
    placeholder: 'Buscar animes por título...',
    maxLength: 100,
  };

  // Computed properties do CardService
  readonly expandedAnimeId = computed(() =>
    this.cardService.currentExpandedAnimeId()
  );
  readonly expandedEpisodes = computed(() =>
    this.cardService.currentExpandedEpisodes()
  );
  readonly expandedAnime = computed(() =>
    this.cardService.currentExpandedAnime()
  );
  readonly hasExpandedCard = computed(() => this.cardService.hasExpandedCard());

  // Computed para mostrar estado de loading (apenas loading principal, não busca)
  showLoading = computed(() => this.isLoading());

  // Computed para mostrar loading de dados (incluindo busca)
  showDataLoading = computed(() => this.isLoading() || this.isSearching());

  // Computed para mostrar debug do cache (apenas em desenvolvimento)
  showCacheDebug = computed(() => {
    return (
      !environment.production ||
      localStorage.getItem('show-cache-debug') === 'true'
    );
  });

  // Computed para verificar se está em modo de busca
  isInSearchMode = computed(() => this.searchQuery().trim().length > 0);

  // Computed properties para categorizar animes em rows
  readonly recentAnimes = computed(() => {
    return this.animes().slice(0, 20); // Primeiros 20 animes
  });

  readonly actionAnimes = computed(() => {
    return this.animes()
      .filter((anime) =>
        anime.generos?.some(
          (genre) =>
            genre.toLowerCase().includes('action') ||
            genre.toLowerCase().includes('ação')
        )
      )
      .slice(0, 12);
  });

  readonly romanceAnimes = computed(() => {
    return this.animes()
      .filter((anime) =>
        anime.generos?.some((genre) => genre.toLowerCase().includes('romance'))
      )
      .slice(0, 12);
  });

  readonly completedAnimes = computed(() => {
    return this.animes()
      .filter((anime) => anime.status === 'completed')
      .slice(0, 12);
  });

  readonly ongoingAnimes = computed(() => {
    return this.animes()
      .filter((anime) => anime.status === 'ongoing')
      .slice(0, 12);
  });

  handleSearch(searchEvent: SearchEvent): void {
    console.log('Search event received:', searchEvent);
    const { query, immediate, filters } = searchEvent;

    // Atualiza estado de busca e reseta página
    this.searchQuery.set(query);
    this.currentPage.set(1);
    this.cardService.clearAllState();

    // Limpa cache de busca para garantir dados atualizados
    this.supabaseService.invalidateSearchCache();

    // Usa a nova função com filtros
    this.searchAnimesWithFilters(query, filters);
  }

  handleSearchClear(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.cardService.clearAllState();
    this.loadAnimes(); // Volta para listagem normal
  }

  ngOnInit() {
    this.loadAnimes();
  }

  handlePageChange(event: PaginationEvent): void {
    this.currentPage.set(event.page);
    this.cardService.clearAllState(); // Limpa estado dos cards ao mudar página
    this.loadCurrentData();
  }

  // Carrega animes do Supabase
  private loadAnimes(): void {
    this.isLoading.set(true);
    this.supabaseService
      .getAnimes(this.currentPage(), this.perPage())
      .subscribe({
        next: (result) => {
          this.animes.set(result.data);
          this.totalAnimes.set(result.total);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Erro ao carregar animes:', error);
          this.isLoading.set(false);
        },
      });
  }

  // Busca animes por título
  private searchAnimes(): void {
    const query = this.searchQuery().trim();

    if (query.length === 0) {
      // Se a busca estiver vazia, carrega animes normalmente
      this.loadAnimes();
      return;
    }

    this.isSearching.set(true);
    this.supabaseService
      .searchAnimes(query, this.currentPage(), this.perPage())
      .subscribe({
        next: (result) => {
          this.animes.set(result.data);
          this.totalAnimes.set(result.total);
          this.isSearching.set(false);
        },
        error: (error) => {
          console.error('Erro ao buscar animes:', error);
          this.isSearching.set(false);
        },
      });
  }

  // Nova busca com filtros avançados
  private searchAnimesWithFilters(query: string, filters?: SearchFilters): void {
    const trimmedQuery = query?.trim();

    // Debug: Log detalhado dos filtros recebidos
    console.log('🏠 HomeComponent - Filtros recebidos:', {
      query,
      trimmedQuery,
      filters,
      'audioType específico': filters?.audioType,
      'genres específico': filters?.genres,
      'year específico': filters?.year
    });

    // Verifica se há filtros válidos
    const hasFilters = filters && (
      (filters.audioType && filters.audioType.length > 0) ||
      (filters.genres && filters.genres.length > 0) ||
      filters.year
    );

    console.log('🔍 Análise de filtros:', {
      hasFilters,
      'tem audioType': filters?.audioType && filters.audioType.length > 0,
      'tem genres': filters?.genres && filters.genres.length > 0,
      'tem year': !!filters?.year
    });

    if (!trimmedQuery && !hasFilters) {
      // Se não há busca nem filtros válidos, carrega animes normalmente
      console.log('🏠 Nenhum filtro ativo, carregando animes normalmente');
      this.loadAnimes();
      return;
    }

    this.isSearching.set(true);
    this.supabaseService
      .searchAnimesWithFilters(trimmedQuery || undefined, filters, this.currentPage(), this.perPage())
      .subscribe({
        next: (result) => {
          this.animes.set(result.data);
          this.totalAnimes.set(result.total);
          this.isSearching.set(false);
        },
        error: (error) => {
          console.error('Erro ao buscar animes com filtros:', error);
          this.isSearching.set(false);
        },
      });
  }

  // Método auxiliar que escolhe entre busca ou carregamento normal
  private loadCurrentData(): void {
    if (this.isInSearchMode()) {
      // Para compatibilidade, usa a busca antiga se não houver filtros implementados
      this.searchAnimes();
    } else {
      this.loadAnimes();
    }
  }

  // ===== EVENT HANDLERS PARA ANIME CARDS =====

  // Handler para clique no card (via AnimeCard component)
  handleAnimeCardClick(event: AnimeCardEvents['cardClick']): void {
    // O card component já gerencia a lógica de expansão
    console.log('Card clicked:', event.anime.titulo);
  }

  // Handler para clique em episódio
  handleEpisodeClick(episode: SupabaseEpisode): void {
    const anime = this.expandedAnime();
    if (anime) {
      // Marca o episódio como assistido automaticamente
      this.episodeService.markAsWatched(episode.id);

      // Navega para o player
      this.router.navigate(['/player', anime.slug, episode.id]);
    }
  }

  // Handler para toggle de conteúdo adulto
  handleAdultContentToggle(event: AnimeCardEvents['adultContentToggle']): void {
    console.log(
      'Adult content toggled:',
      event.animeId,
      'revealed:',
      event.revealed
    );
  }

  // Métodos de utilidade que delegam para o CardService
  isAdultContent(anime: SupabaseAnimeWithEpisodes): boolean {
    return this.cardService.isAdultContent(anime);
  }

  isAdultContentRevealed(animeId: number): boolean {
    return this.cardService.isAdultContentRevealed(animeId);
  }

  isAnimeExpanded(animeId: number): boolean {
    return this.cardService.isAnimeExpanded(animeId);
  }

  getMatchPercentage(anime: SupabaseAnimeWithEpisodes): number {
    return this.cardService.getMatchPercentage(anime);
  }

  // ===== MÉTODOS DE GERENCIAMENTO DE CACHE =====

  /**
   * Força atualização dos dados (ignora cache)
   */
  forceRefresh(): void {
    if (this.isInSearchMode()) {
      // Invalida cache de busca e busca novamente
      this.supabaseService.invalidateSearchCache();
      this.searchAnimes();
    } else {
      // Força atualização da página atual
      this.supabaseService
        .forceRefreshAnimes(this.currentPage(), this.perPage())
        .subscribe({
          next: (result) => {
            this.animes.set(result.data);
            this.totalAnimes.set(result.total);
          },
          error: (error) => {
            console.error('Erro ao atualizar dados:', error);
          },
        });
    }
  }

  // Listener para tecla Escape
  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.hasExpandedCard()) {
      this.cardService.collapseAnime();
    }

    // Também limpa conteúdo adulto revelado
    this.cardService.clearRevealedAdultContent();
  }

  // Listener para cliques no documento (reset do filtro +18)
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Se clicou fora dos cards de anime, limpa conteúdo revelado
    const target = event.target as HTMLElement;
    const isAnimeCard = target.closest('.netflix-card-container');
    const isSearchInput = target.closest('.search-container');
    const isPagination = target.closest('.pagination');

    if (!isAnimeCard && !isSearchInput && !isPagination) {
      this.cardService.clearRevealedAdultContent();
    }
  }

  // Navegar para a página de episódios
  navigateToEpisodes(animeId: number): void {
    this.router.navigate(['/anime', animeId]);
  }

  // Método de utilidade para fechar expansão (usado no template)
  closeExpansion(): void {
    this.cardService.collapseAnime();
  }

  // Marca episódio como assistido (usando sistema local por enquanto)
  toggleEpisodeWatched(episode: SupabaseEpisode): void {
    // Por enquanto mantém um sistema local de watched episodes
    // TODO: Implementar persistência no Supabase no futuro
    this.episodeService.toggleWatchedStatus(episode.id);
  }

  // Verifica se um episódio foi assistido
  isEpisodeWatched(episode: SupabaseEpisode): boolean {
    return this.episodeService.isWatched(episode.id);
  }

  // Navega para o player do episódio e marca como assistido
  playEpisode(episode: SupabaseEpisode): void {
    const anime = this.expandedAnime();
    if (anime) {
      // Marca o episódio como assistido automaticamente
      this.episodeService.markAsWatched(episode.id);

      // Navega para o player
      this.router.navigate(['/player', anime.slug, episode.id]);
    }
  }

  // ========================================
  // NETFLIX-STYLE HELPER METHODS
  // ========================================
}

import { Component, computed, inject, OnInit, signal, HostListener, ChangeDetectionStrategy } from '@angular/core';
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
import { SearchEvent } from './header/search/search.interface';
import { PaginationEvent } from './paginacao/paginacao.interface';

@Component({
  selector: 'app-home',
  imports: [
    FormsModule,
    CacheDebugComponent,
    PaginacaoComponent,
    SearchComponent,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private episodeService = inject(EpisodeService);

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
    maxLength: 100
  };

  // Estados para expansão
  expandedAnimeId = signal<number | null>(null);
  expandedEpisodes = signal<SupabaseEpisode[]>([]);
  expandedAnime = signal<SupabaseAnimeWithEpisodes | null>(null);
  expandDirection = signal<'left' | 'right'>('right');

  // Estados para controle de conteúdo +18
  revealedAdultContent = signal<Set<number>>(new Set());

  // Computed para mostrar estado de loading (apenas loading principal, não busca)
  showLoading = computed(() => this.isLoading());

  // Computed para mostrar loading de dados (incluindo busca)
  showDataLoading = computed(() => this.isLoading() || this.isSearching());

  // Computed para mostrar debug do cache (apenas em desenvolvimento)
  showCacheDebug = computed(() => {
    return false;
    return (
      !environment.production ||
      localStorage.getItem('show-cache-debug') === 'true'
    );
  });

  // Computed para verificar se está em modo de busca
  isInSearchMode = computed(() => this.searchQuery().trim().length > 0);
  
  handleSearch(searchEvent: SearchEvent): void {
    const { query, immediate } = searchEvent;
    
    if (query === this.searchQuery()) return; // Ignora se não mudou

    // Atualiza estado de busca e reseta página
    this.searchQuery.set(query);
    this.currentPage.set(1);
    this.clearRevealedAdultContent();
    
    // Se é busca imediata (Enter), força execução
    this.loadCurrentData();
  }

  handleSearchClear(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.clearRevealedAdultContent();
    this.loadAnimes(); // Volta para listagem normal
  }

  ngOnInit() {
    this.loadAnimes();
  }

  handlePageChange(event: PaginationEvent): void {
    this.currentPage.set(event.page);
    this.clearRevealedAdultContent(); // Limpa conteúdo adulto revelado ao mudar página
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


  // Método auxiliar que escolhe entre busca ou carregamento normal
  private loadCurrentData(): void {
    if (this.isInSearchMode()) {
      this.searchAnimes();
    } else {
      this.loadAnimes();
    }
  }

  // ===== MÉTODOS PARA CONTROLE DE CONTEÚDO +18 =====

  // Verifica se um anime tem conteúdo +18
  isAdultContent(anime: SupabaseAnimeWithEpisodes): boolean {
    // Verifica primeiro pelos gêneros se existirem
    if (anime.generos) {
      const generos = Array.isArray(anime.generos)
        ? anime.generos
        : [anime.generos];
      const hasAdultGenre = generos.some((genero: any) => {
        const nomeGenero = typeof genero === 'string' ? genero : genero?.nome;
        return (
          nomeGenero &&
          (nomeGenero.toLowerCase().includes('+18') ||
            nomeGenero.toLowerCase().includes('adulto') ||
            nomeGenero.toLowerCase().includes('ecchi') ||
            nomeGenero.toLowerCase().includes('hentai') ||
            nomeGenero.toLowerCase().includes('mature'))
        );
      });

      if (hasAdultGenre) return true;
    }

    // Para demonstração, detecta alguns animes como +18 baseado no título
    const titulo = anime.titulo?.toLowerCase() || '';
    return (
      titulo.includes('nukitashi') ||
      titulo.includes('bad girl') ||
      titulo.includes('panty') ||
      titulo.includes('stocking') ||
      titulo.includes('ecchi') ||
      titulo.includes('hentai') ||
      titulo.includes('+18')
    );
  }

  // Verifica se o conteúdo +18 foi revelado
  isAdultContentRevealed(animeId: number): boolean {
    return this.revealedAdultContent().has(animeId);
  }

  // Alterna a revelação do conteúdo +18
  toggleAdultContentReveal(animeId: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const currentRevealed = this.revealedAdultContent();
    const newRevealed = new Set(currentRevealed);

    if (newRevealed.has(animeId)) {
      newRevealed.delete(animeId);
    } else {
      newRevealed.add(animeId);
    }

    this.revealedAdultContent.set(newRevealed);
  }

  // Limpa todo o conteúdo adulto revelado
  clearRevealedAdultContent(): void {
    this.revealedAdultContent.set(new Set());
  }

  // Lida com o clique no card do anime (considerando conteúdo +18)
  handleAnimeCardClick(anime: SupabaseAnimeWithEpisodes, index: number): void {
    // Se é conteúdo adulto e não foi revelado, revela primeiro
    if (this.isAdultContent(anime) && !this.isAdultContentRevealed(anime.id!)) {
      this.toggleAdultContentReveal(anime.id!);
      return;
    }

    // Caso contrário, comportamento normal (expandir/colapsar episódios)
    this.toggleAnimeExpansion(anime, index);
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
    if (this.expandedAnimeId()) {
      this.closeExpansion();
    }

    // Também limpa conteúdo adulto revelado
    this.clearRevealedAdultContent();
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
      this.clearRevealedAdultContent();
    }
  }

  // Navegar para a página de episódios
  navigateToEpisodes(animeId: number): void {
    this.router.navigate(['/anime', animeId]);
  }

  // Método para expandir/colapsar anime
  toggleAnimeExpansion(anime: SupabaseAnimeWithEpisodes, index: number): void {
    const currentExpanded = this.expandedAnimeId();

    if (currentExpanded === anime.id) {
      // Se já está expandido, colapsa
      this.expandedAnimeId.set(null);
      this.expandedEpisodes.set([]);
      this.expandedAnime.set(null);
    } else {
      // Expande o anime
      this.expandedAnimeId.set(anime.id);
      this.expandedAnime.set(anime);

      // Limpa outros animes com filtro revelado ao expandir
      this.clearRevealedAdultContent();

      // Determina direção da expansão baseado na posição na grid (5 por linha)
      const positionInRow = index % 5;
      const direction = positionInRow >= 3 ? 'left' : 'right'; // Se está nas últimas 2 posições, expande para esquerda
      this.expandDirection.set(direction);

      // Carrega episódios do Supabase
      this.expandedEpisodes.set(anime['episodios'] || []); // Usa episódios já carregados se disponíveis
    }
  }

  // Verifica se um anime está expandido
  isAnimeExpanded(animeId: number): boolean {
    return this.expandedAnimeId() === animeId;
  }

  // Fecha a expansão
  closeExpansion(): void {
    this.expandedAnimeId.set(null);
    this.expandedEpisodes.set([]);
    this.expandedAnime.set(null);
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

  /**
   * Gera uma porcentagem de "match" para o anime baseado no número de episódios
   * e se é dublado (simulado para efeito visual)
   */
  getMatchPercentage(anime: SupabaseAnimeWithEpisodes): number {
    // Simula uma porcentagem baseada em critérios do anime
    let percentage = 75; // Base

    // Mais episódios = maior match (até 95%)
    if (anime.episodios.length > 50) percentage = 95;
    else if (anime.episodios.length > 25) percentage = 90;
    else if (anime.episodios.length > 12) percentage = 85;
    else if (anime.episodios.length > 6) percentage = 80;

    // Dublado adiciona pontos
    if (anime.dublado) {
      percentage = Math.min(98, percentage + 5);
    }

    // Adiciona um pouco de aleatoriedade baseada no ID para variedade
    const randomFactor = (anime.id % 10) - 5; // -5 a +4
    percentage = Math.max(65, Math.min(98, percentage + randomFactor));

    return Math.round(percentage);
  }
}

import { Component, computed, inject, OnInit, signal, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  SupabaseAnimeWithEpisodes,
  SupabaseEpisode,
  SupabaseService,
} from '../services/supabase.service';
import { EpisodeService } from '../services/episode.service';
import { CacheDebugComponent } from '../components/cache-debug.component';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-home',
  imports: [FormsModule, CacheDebugComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
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

  // Estados para busca
  searchQuery = signal('');
  isSearching = signal(false);
  searchTimeout: any = null;

  // Estados para expansão
  expandedAnimeId = signal<number | null>(null);
  expandedEpisodes = signal<SupabaseEpisode[]>([]);
  expandedAnime = signal<SupabaseAnimeWithEpisodes | null>(null);
  expandDirection = signal<'left' | 'right'>('right');

  // Computed properties para paginação
  totalPages = computed(() => Math.ceil(this.totalAnimes() / this.perPage()));

  // Computed para verificar se está em modo de busca
  isInSearchMode = computed(() => this.searchQuery().trim().length > 0);

  // Computed para mostrar estado de loading (normal ou busca)
  showLoading = computed(() => this.isLoading() || this.isSearching());

  // Computed para mostrar debug do cache (apenas em desenvolvimento)
  showCacheDebug = computed(() => {
    return !environment.production || localStorage.getItem('show-cache-debug') === 'true';
  });

  // Computed para informações de paginação
  pageInfo = computed(() => {
    const start = (this.currentPage() - 1) * this.perPage() + 1;
    const end = Math.min(
      this.currentPage() * this.perPage(),
      this.totalAnimes()
    );
    return { start, end, total: this.totalAnimes() };
  });

  // Computed para resultado paginado (compatibilidade)
  paginatedResult = computed(() => ({
    data: this.animes(),
    total: this.totalAnimes(),
    page: this.currentPage(),
    perPage: this.perPage(),
    totalPages: this.totalPages(),
  }));

  // Array para mostrar os números das páginas na navegação
  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const delta = 2; // Quantas páginas mostrar antes e depois da atual

    let start = Math.max(1, current - delta);
    let end = Math.min(total, current + delta);

    // Ajusta para sempre mostrar pelo menos 5 páginas quando possível
    if (end - start < 4) {
      if (start === 1) {
        end = Math.min(total, start + 4);
      } else if (end === total) {
        start = Math.max(1, end - 4);
      }
    }

    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  ngOnInit() {
    // Carrega animes do Supabase na inicialização
    this.loadAnimes();
    
    // Pré-carrega cache se necessário (opcional)
    // this.supabaseService.preloadCache();
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

  // Método chamado quando o usuário digita na busca
  onSearchInput(): void {
    // Cancela timeout anterior se existir
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Reseta para primeira página ao buscar
    this.currentPage.set(1);

    // Adiciona delay para evitar muitas requisições
    this.searchTimeout = setTimeout(() => {
      this.searchAnimes();
    }, 800); // 300ms de delay
  }

  // Limpa a busca e volta para listagem normal
  clearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.loadAnimes();
  }

  // Método auxiliar que escolhe entre busca ou carregamento normal
  private loadCurrentData(): void {
    if (this.isInSearchMode()) {
      this.searchAnimes();
    } else {
      this.loadAnimes();
    }
  }

  // Métodos de navegação de página
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadCurrentData();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((page) => page + 1);
      this.loadCurrentData();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((page) => page - 1);
      this.loadCurrentData();
    }
  }

  goToFirstPage(): void {
    this.currentPage.set(1);
    this.loadCurrentData();
  }

  goToLastPage(): void {
    this.currentPage.set(this.totalPages());
    this.loadCurrentData();
  }

  // Computed para verificar se é possível navegar
  canGoNext = computed(() => this.currentPage() < this.totalPages());
  canGoPrevious = computed(() => this.currentPage() > 1);

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
      this.supabaseService.forceRefreshAnimes(this.currentPage(), this.perPage()).subscribe({
        next: (result) => {
          this.animes.set(result.data);
          this.totalAnimes.set(result.total);
        },
        error: (error) => {
          console.error('Erro ao atualizar dados:', error);
        }
      });
    }
  }

  // Listener para tecla Escape
  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.expandedAnimeId()) {
      this.closeExpansion();
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
      const animeSlug = this.createSlug(anime.titulo);
      this.router.navigate(['/player', animeSlug, episode.id]);
    }
  }

  // Cria um slug amigável para URL a partir do título
  private createSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD') // Decompor caracteres com acentos
      .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos
      .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiais
      .replace(/\s+/g, '-') // Substituir espaços por hífens
      .replace(/-+/g, '-') // Remover hífens duplicados
      .trim(); // Remover espaços em branco
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

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseAnime, SupabaseEpisode, SupabaseService } from '../services/supabase.service';
import { EpisodeService } from '../services/episode.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private episodeService = inject(EpisodeService);

  // Estados para o mostruário do Supabase
  isLoading = signal(false);
  animes = signal<SupabaseAnime[]>([]);
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
  expandedAnime = signal<SupabaseAnime | null>(null);
  expandDirection = signal<'left' | 'right'>('right');
  
  // Computed properties para paginação
  totalPages = computed(() => Math.ceil(this.totalAnimes() / this.perPage()));
  
  // Computed para verificar se está em modo de busca
  isInSearchMode = computed(() => this.searchQuery().trim().length > 0);
  
  // Computed para mostrar estado de loading (normal ou busca)
  showLoading = computed(() => this.isLoading() || this.isSearching());
  
  // Computed para informações de paginação
  pageInfo = computed(() => {
    const start = (this.currentPage() - 1) * this.perPage() + 1;
    const end = Math.min(this.currentPage() * this.perPage(), this.totalAnimes());
    return { start, end, total: this.totalAnimes() };
  });

  // Computed para resultado paginado (compatibilidade)
  paginatedResult = computed(() => ({
    data: this.animes(),
    total: this.totalAnimes(),
    page: this.currentPage(),
    perPage: this.perPage(),
    totalPages: this.totalPages()
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
  }

  // Carrega animes do Supabase
  private loadAnimes(): void {
    this.isLoading.set(true);
    this.supabaseService.getAnimes(this.currentPage(), this.perPage()).subscribe({
      next: (result) => {
        this.animes.set(result.data);
        this.totalAnimes.set(result.total);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erro ao carregar animes:', error);
        this.isLoading.set(false);
      }
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
    this.supabaseService.searchAnimes(query, this.currentPage(), this.perPage()).subscribe({
      next: (result) => {
        this.animes.set(result.data);
        this.totalAnimes.set(result.total);
        this.isSearching.set(false);
      },
      error: (error) => {
        console.error('Erro ao buscar animes:', error);
        this.isSearching.set(false);
      }
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
    }, 300); // 300ms de delay
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
      this.currentPage.update(page => page + 1);
      this.loadCurrentData();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
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

  // Navegar para a página de episódios
  navigateToEpisodes(animeId: number): void {
    this.router.navigate(['/anime', animeId]);
  }

  // Método para expandir/colapsar anime
  toggleAnimeExpansion(anime: SupabaseAnime, index: number): void {
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
      
      // Determina direção da expansão baseado na posição na grid (10 por linha)
      const positionInRow = index % 10;
      const direction = positionInRow >= 7 ? 'left' : 'right'; // Se está nas últimas 3 posições, expande para esquerda
      this.expandDirection.set(direction);
      
      // Carrega episódios do Supabase
      this.supabaseService.getEpisodesByAnimeId(anime.id).subscribe({
        next: (episodes) => {
          this.expandedEpisodes.set(episodes);
        },
        error: (error) => {
          console.error('Erro ao carregar episódios:', error);
          this.expandedEpisodes.set([]);
        }
      });
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

  // Navega para o player do episódio
  playEpisode(episode: SupabaseEpisode): void {
    const anime = this.expandedAnime();
    if (anime) {
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
}

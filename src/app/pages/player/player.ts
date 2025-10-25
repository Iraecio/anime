import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  HostListener,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import {
  SupabaseService,
  SupabaseEpisode,
  SupabaseAnime,
} from '../../services/supabase.service';
import { EpisodeService } from '../../services/episode.service';

@Component({
  selector: 'app-episode-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player.html',
  styleUrl: './player.scss',
})
export class EpisodePlayer implements OnInit, AfterViewInit {
  @ViewChild('scrollContainer', { static: false })
  scrollContainer!: ElementRef<HTMLElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private supabaseService = inject(SupabaseService);
  private episodeService = inject(EpisodeService);
  private sanitizer = inject(DomSanitizer);

  // Estado do componente
  currentEpisode = signal<SupabaseEpisode | null>(null);
  currentAnime = signal<SupabaseAnime | null>(null);
  allEpisodes = signal<SupabaseEpisode[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Signals para navegação do carrossel
  canScrollLeft = signal(false);
  canScrollRight = signal(true);
  isScrolling = signal(false);

  // Touch/swipe support
  private touchStartX = 0;
  private touchEndX = 0;

  // Computed properties para navegação
  currentEpisodeIndex = computed(() => {
    const current = this.currentEpisode();
    const episodes = this.allEpisodes();
    if (!current || !episodes.length) return -1;
    return episodes.findIndex((ep) => ep.id === current.id);
  });

  hasNextEpisode = computed(() => {
    const index = this.currentEpisodeIndex();
    const episodes = this.allEpisodes();
    return index >= 0 && index < episodes.length - 1;
  });

  hasPreviousEpisode = computed(() => {
    const index = this.currentEpisodeIndex();
    return index > 0;
  });

  nextEpisode = computed(() => {
    const index = this.currentEpisodeIndex();
    const episodes = this.allEpisodes();
    if (this.hasNextEpisode()) {
      return episodes[index + 1];
    }
    return null;
  });

  previousEpisode = computed(() => {
    const index = this.currentEpisodeIndex();
    const episodes = this.allEpisodes();
    if (this.hasPreviousEpisode()) {
      return episodes[index - 1];
    }
    return null;
  });

  // Computed para mostrar todos os episódios
  allVisibleEpisodes = computed(() => this.allEpisodes());

  // Computed para URL segura do iframe
  safeVideoUrl = computed(() => {
    const episode = this.currentEpisode();
    if (!episode?.link_video) return null;
    //pega a url do nosso site como referer
    return this.sanitizer.bypassSecurityTrustResourceUrl(episode.link_video);
  });

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const episodeIdParam = params['episodeId'];
      const animeSlugParam = params['animeSlug'];

      // Validação mais robusta dos parâmetros
      if (!episodeIdParam || !animeSlugParam) {
        this.error.set(
          'Link inválido: parâmetros obrigatórios não encontrados'
        );
        this.isLoading.set(false);
        return;
      }

      const episodeId = +episodeIdParam;

      if (isNaN(episodeId) || episodeId <= 0) {
        this.error.set('ID do episódio inválido');
        this.isLoading.set(false);
        return;
      }

      // Normaliza o slug antes de usar
      const animeSlug = this.normalizeSlug(animeSlugParam);

      if (animeSlug.length < 2) {
        this.error.set('Slug do anime inválido ou muito curto');
        this.isLoading.set(false);
        return;
      }

      console.log(`Carregando episódio ${episodeId} do anime: ${animeSlug}`);
      this.loadEpisodeDataBySlug(episodeId, animeSlug);
    });
  }



  private async loadEpisodeDataBySlug(episodeId: number, animeSlug: string) {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      // Primeiro, buscar o anime pelo slug
      const animeResult = await this.findAnimeBySlug(animeSlug);

      if (!animeResult) {
        // Se não encontrar por slug, tenta buscar o episódio diretamente
        // e usar o anime_id do episódio para buscar o anime
        console.warn(
          `Anime não encontrado por slug: ${animeSlug}. Tentando busca alternativa...`
        );
        return await this.loadEpisodeDataFallback(episodeId, animeSlug);
      }

      // Carregar episódio atual e lista de episódios
      const [episodeResult, episodesResult] = await Promise.all([
        this.supabaseService.getEpisodeById(episodeId).toPromise(),
        this.supabaseService.getEpisodesByAnimeId(animeResult.id).toPromise(),
      ]);

      if (!episodeResult) {
        throw new Error('Episódio não encontrado');
      }

      // Verificar se o episódio pertence ao anime correto
      if (episodeResult.anime_id !== animeResult.id) {
        console.warn(
          'Episódio não pertence ao anime do slug. Tentando busca alternativa...'
        );
        return await this.loadEpisodeDataFallback(episodeId, animeSlug);
      }

      this.currentEpisode.set(episodeResult);
      this.currentAnime.set(animeResult);
      this.allEpisodes.set(episodesResult || []);

      // Centralizar o episódio atual após carregar episódios
      setTimeout(() => {
        this.centerCurrentEpisode();
      }, 1000); // Timeout maior para garantir renderização

      // Marcar episódio como assistido
      this.episodeService.markAsWatched(episodeId);

      console.log('assistido');
      this.isLoading.set(false);
    } catch (error) {
      console.error('Erro ao carregar dados do episódio:', error);
      // Tenta busca alternativa como último recurso
      try {
        await this.loadEpisodeDataFallback(episodeId, animeSlug);
      } catch (fallbackError) {
        console.error('Erro na busca alternativa:', fallbackError);
        this.error.set(
          'Erro ao carregar o episódio. Verifique se o link está correto.'
        );
        this.isLoading.set(false);
      }
    }
  }

  // Método de fallback que busca o episódio primeiro e depois o anime
  private async loadEpisodeDataFallback(
    episodeId: number,
    expectedSlug: string
  ) {
    try {
      // Buscar o episódio primeiro
      const episodeResult = await this.supabaseService
        .getEpisodeById(episodeId)
        .toPromise();

      if (!episodeResult) {
        throw new Error('Episódio não encontrado');
      }

      // Buscar o anime usando o anime_id do episódio
      const animeResult = await this.supabaseService
        .getAnimeById(episodeResult.anime_id)
        .toPromise();

      if (!animeResult) {
        throw new Error('Anime do episódio não encontrado');
      }

      // Verificar se o slug do anime encontrado corresponde ao esperado
      const actualSlug = this.createSlug(animeResult.titulo);
      if (actualSlug !== expectedSlug) {
        console.warn(
          `Slug esperado: ${expectedSlug}, slug real: ${actualSlug}. Redirecionando para URL correta...`
        );
        // Redireciona para a URL correta
        this.router.navigate(['/player', actualSlug, episodeId], {
          replaceUrl: true,
        });
        return;
      }

      // Carregar todos os episódios do anime
      const episodesResult = await this.supabaseService
        .getEpisodesByAnimeId(animeResult.id)
        .toPromise();

      this.currentEpisode.set(episodeResult);
      this.currentAnime.set(animeResult);
      this.allEpisodes.set(episodesResult || []);

      // Centralizar o episódio atual após carregar episódios
      setTimeout(() => {
        this.centerCurrentEpisode();
      }, 1000); // Timeout maior para garantir renderização

      // Marcar episódio como assistido
      this.episodeService.markAsWatched(episodeId);
      this.isLoading.set(false);
    } catch (error) {
      console.error('Erro no carregamento alternativo:', error);
      throw error;
    }
  }

  private async findAnimeBySlug(slug: string): Promise<SupabaseAnime | null> {
    try {
      // Normaliza o slug de entrada
      const normalizedSlug = this.normalizeSlug(slug);

      // Primeiro, tenta uma busca paginada eficiente
      let page = 1;
      const perPage = 50; // Busca em lotes menores
      let foundAnime: SupabaseAnime | null = null;

      while (!foundAnime && page <= 20) {
        // Limita a 1000 animes (20 * 50)
        const result = await this.supabaseService
          .getAnimes(page, perPage)
          .toPromise();

        if (!result || !result.data || result.data.length === 0) {
          break; // Não há mais dados
        }

        // Procura o anime nesta página
        foundAnime =
          result.data.find(
            (anime: SupabaseAnime) =>
              this.createSlug(anime.titulo) === normalizedSlug
          ) || null;

        if (foundAnime) {
          console.log(`Anime encontrado na página ${page}:`, foundAnime.titulo);
          return foundAnime;
        }

        page++;

        // Se chegou ao final dos dados (menos resultados que o solicitado)
        if (result.data.length < perPage) {
          break;
        }
      }

      console.warn(
        `Anime não encontrado para o slug: ${normalizedSlug} (original: ${slug})`
      );
      return null;
    } catch (error) {
      console.error('Erro ao buscar anime por slug:', error);
      return null;
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
      .replace(/^-+|-+$/g, '') // Remover hífens do início e fim
      .trim(); // Remover espaços em branco
  }

  // Normaliza um slug que pode vir da URL com problemas
  private normalizeSlug(slug: string): string {
    return slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '') // Remove caracteres inválidos
      .replace(/-+/g, '-') // Remove hífens duplicados
      .replace(/^-+|-+$/g, '') // Remove hífens do início e fim
      .trim();
  }

  goToNextEpisode() {
    const next = this.nextEpisode();
    const anime = this.currentAnime();
    if (next && anime) {
      const animeSlug = this.createSlug(anime.titulo);
      this.router.navigate(['/player', animeSlug, next.id]);
    }
  }

  goToPreviousEpisode() {
    const previous = this.previousEpisode();
    const anime = this.currentAnime();
    if (previous && anime) {
      const animeSlug = this.createSlug(anime.titulo);
      this.router.navigate(['/player', animeSlug, previous.id]);
    }
  }

  navigateToAnime() {
    this.router.navigate(['/']);
  }

  goHome() {
    this.router.navigate(['/home']);
  }

  toggleFullscreen() {
    const iframe = document.querySelector('iframe');
    if (iframe) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        iframe.requestFullscreen();
      }
    }
  }

  goToRandomEpisode() {
    const episodes = this.allEpisodes();
    const currentEpisode = this.currentEpisode();
    
    if (episodes.length <= 1) {
      return; // Não há outros episódios para escolher
    }

    // Filtrar episódios diferentes do atual
    const availableEpisodes = episodes.filter(ep => ep.id !== currentEpisode?.id);
    
    // Selecionar aleatório
    const randomIndex = Math.floor(Math.random() * availableEpisodes.length);
    const randomEpisode = availableEpisodes[randomIndex];
    
    if (randomEpisode) {
      this.goToEpisode(randomEpisode);
    }
  }

  ngAfterViewInit() {
    // Centralizar episódio atual após a view ser inicializada (se já tiver dados)
    setTimeout(() => {
      if (this.currentEpisode() && this.allEpisodes().length > 0) {
        this.centerCurrentEpisode();
      } else {
        this.updateScrollButtons();
      }
    }, 1000); // Timeout maior para dar tempo de renderizar
  }

  scrollLeft() {
    if (!this.scrollContainer || this.isScrolling()) return;

    this.isScrolling.set(true);
    const container = this.scrollContainer.nativeElement;

    // Scroll baseado na largura do container visível
    const containerWidth = container.clientWidth;
    const scrollAmount = containerWidth * 0.8; // Scroll 80% da largura visível

    container.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth',
    });

    setTimeout(() => {
      this.updateScrollButtons();
      this.isScrolling.set(false);
    }, 300);
  }

  scrollRight() {
    if (!this.scrollContainer || this.isScrolling()) return;

    this.isScrolling.set(true);
    const container = this.scrollContainer.nativeElement;

    // Scroll baseado na largura do container visível
    const containerWidth = container.clientWidth;
    const scrollAmount = containerWidth * 0.8; // Scroll 80% da largura visível

    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth',
    });

    setTimeout(() => {
      this.updateScrollButtons();
      this.isScrolling.set(false);
    }, 300);
  }

  onScroll() {
    if (!this.isScrolling()) {
      this.updateScrollButtons();
    }
  }

  private updateScrollButtons() {
    if (!this.scrollContainer) return;

    const container = this.scrollContainer.nativeElement;
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    const maxScrollLeft = scrollWidth - clientWidth;

    // Só mostra botão esquerdo se scrollou para a direita (há conteúdo escondido à esquerda)
    this.canScrollLeft.set(scrollLeft > 5); // 5px de margem para evitar flickering

    // Só mostra botão direito se há conteúdo escondido à direita
    this.canScrollRight.set(scrollLeft < maxScrollLeft - 5); // 5px de margem
  }

  private centerCurrentEpisode() {
    if (!this.scrollContainer) {
      console.log('ScrollContainer não disponível');
      return;
    }

    const container = this.scrollContainer.nativeElement;
    const episodes = this.allEpisodes();
    const currentIndex = this.currentEpisodeIndex();

    console.log('centerCurrentEpisode chamado:', { 
      episodesLength: episodes.length, 
      currentIndex,
      hasContainer: !!this.scrollContainer 
    });

    if (currentIndex < 0 || episodes.length === 0) {
      console.log('Índice inválido ou sem episódios');
      return;
    }

    // Função para tentar centralizar com retry
    const tryCenter = (attempts = 0) => {
      if (attempts > 10) {
        console.log('Máximo de tentativas atingido');
        return;
      }

      const episodeCards = container.querySelectorAll('.episode-card');
      
      console.log(`Tentativa ${attempts + 1} - Elementos encontrados:`, {
        cardsFound: episodeCards.length,
        expectedCards: episodes.length,
        containerScrollWidth: container.scrollWidth,
        containerClientWidth: container.clientWidth
      });

      // Verifica se todos os cards foram renderizados
      if (episodeCards.length < episodes.length) {
        console.log('Ainda renderizando cards, tentando novamente...');
        setTimeout(() => tryCenter(attempts + 1), 200);
        return;
      }

      const currentCard = episodeCards[currentIndex] as HTMLElement;
      if (!currentCard) {
        console.log(`Card atual não encontrado no índice: ${currentIndex}`);
        setTimeout(() => tryCenter(attempts + 1), 200);
        return;
      }

      const containerWidth = container.clientWidth;
      const cardLeft = currentCard.offsetLeft;
      const cardWidth = currentCard.offsetWidth;

      // Calcula a posição para centralizar o card atual
      const scrollPosition = cardLeft - (containerWidth / 2) + (cardWidth / 2);

      // Garante que não role além dos limites
      const maxScroll = container.scrollWidth - containerWidth;
      const finalPosition = Math.max(0, Math.min(scrollPosition, maxScroll));

      console.log('Centralizando episódio:', {
        currentIndex,
        cardLeft,
        cardWidth,
        containerWidth,
        scrollPosition,
        finalPosition,
        episodeNumber: episodes[currentIndex]?.numero
      });

      container.scrollTo({
        left: finalPosition,
        behavior: 'smooth'
      });

      // Atualiza os botões após o scroll
      setTimeout(() => this.updateScrollButtons(), 300);
    };

    // Inicia as tentativas
    setTimeout(() => tryCenter(), 100);
  }

  goToEpisode(episode: SupabaseEpisode) {
    const anime = this.currentAnime();
    if (anime) {
      const animeSlug = this.createSlug(anime.titulo);
      this.router.navigate(['/player', animeSlug, episode.id]);
    }
  }

  // Métodos removidos - não mais necessários com flex layout

  // Navegação por teclado
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Apenas processar se não estivermos em um campo de input
    if ((event.target as HTMLElement)?.tagName === 'INPUT') {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.goToPreviousEpisode();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.goToNextEpisode();
        break;
      case 'Home':
        event.preventDefault();
        const firstEpisode = this.allEpisodes()[0];
        if (firstEpisode) {
          this.goToEpisode(firstEpisode);
        }
        break;
      case 'End':
        event.preventDefault();
        const episodes = this.allEpisodes();
        const lastEpisode = episodes[episodes.length - 1];
        if (lastEpisode) {
          this.goToEpisode(lastEpisode);
        }
        break;
    }
  }

  // Métodos para touch/swipe
  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.touches[0].clientX;
  }

  onTouchEnd(event: TouchEvent) {
    this.touchEndX = event.changedTouches[0].clientX;
    this.handleSwipe();
  }

  private handleSwipe() {
    const swipeThreshold = 50; // Minimum distance for a swipe
    const swipeDistance = this.touchStartX - this.touchEndX;

    if (Math.abs(swipeDistance) > swipeThreshold) {
      if (swipeDistance > 0) {
        // Swipe left - scroll right
        this.scrollRight();
      } else {
        // Swipe right - scroll left
        this.scrollLeft();
      }
    }
  }

  @HostListener('window:resize')
  onWindowResize() { 
    setTimeout(() => this.updateScrollButtons(), 100);
  }
}

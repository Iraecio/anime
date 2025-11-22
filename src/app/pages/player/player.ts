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
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-episode-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player.html',
  styleUrl: './player.scss',
})
export class EpisodePlayer implements OnInit, AfterViewInit {
  private httpClient = inject(HttpClient);

  @ViewChild('scrollContainer', { static: false })
  scrollContainer!: ElementRef<HTMLElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private supabaseService = inject(SupabaseService);
  private episodeService = inject(EpisodeService);
  private sanitizer = inject(DomSanitizer);

  currentEpisode = signal<SupabaseEpisode | null>(null);
  currentAnime = signal<SupabaseAnime | null>(null);
  allEpisodes = signal<SupabaseEpisode[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);
  canScrollLeft = signal(false);
  canScrollRight = signal(true);
  isScrolling = signal(false);
  private touchStartX = 0;
  private touchEndX = 0;

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

  allVisibleEpisodes = computed(() => this.allEpisodes());

  safeVideoUrl = computed(() => {
    const episode = this.currentEpisode();
    if (!episode?.link_video) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(episode.link_video);
  });

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const episodeIdParam = params['episodeId'];
      const animeSlugParam = params['animeSlug'];

      if (!episodeIdParam || !animeSlugParam) {
        this.error.set(
          'Link inválido: parâmetros obrigatórios não encontrados'
        );
        this.isLoading.set(false);
        return;
      }

      const animeSlug = this.normalizeSlug(animeSlugParam);

      if (animeSlug.length < 2) {
        this.error.set('Slug do anime inválido ou muito curto');
        this.isLoading.set(false);
        return;
      }

      this.loadEpisodeData(+episodeIdParam, animeSlug);
    });
  }

  private async loadEpisodeData(episodeId: number, expectedSlug: string) {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      const episodeResult = await this.supabaseService
        .getEpisodeById(episodeId)
        .toPromise();

      if (!episodeResult) {
        throw new Error('Episódio não encontrado');
      }

      const animeResult = await this.supabaseService
        .getAnimeById(episodeResult.anime_id)
        .toPromise();

      if (!animeResult) {
        throw new Error('Anime não encontrado');
      }

      const actualSlug = this.createSlug(animeResult.titulo);

      if (actualSlug !== expectedSlug) {
        this.router.navigate(['/player', actualSlug, episodeId], {
          replaceUrl: true,
        });
        return;
      }

      this.currentEpisode.set(episodeResult);
      this.currentAnime.set(animeResult);
      this.allEpisodes.set(animeResult.episodios || []);

      setTimeout(() => {
        this.centerCurrentEpisode();
      }, 1000);

      this.episodeService.markAsWatched(episodeId);
      this.isLoading.set(false);
    } catch (error) {
      console.error('Erro ao carregar dados do episódio:', error);
      this.error.set(
        'Erro ao carregar o episódio. Verifique se o link está correto.'
      );
      this.isLoading.set(false);
    }
  }

  private createSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .trim();
  }

  private normalizeSlug(slug: string): string {
    return slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
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
      return;
    }

    const availableEpisodes = episodes.filter(
      (ep) => ep.id !== currentEpisode?.id
    );
    const randomIndex = Math.floor(Math.random() * availableEpisodes.length);
    const randomEpisode = availableEpisodes[randomIndex];

    if (randomEpisode) {
      this.goToEpisode(randomEpisode);
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.currentEpisode() && this.allEpisodes().length > 0) {
        this.centerCurrentEpisode();
      } else {
        this.updateScrollButtons();
      }
    }, 1000);
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
    const containerWidth = container.clientWidth;
    const scrollAmount = containerWidth * 0.8;

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

    this.canScrollLeft.set(scrollLeft > 5);
    this.canScrollRight.set(scrollLeft < maxScrollLeft - 5);
  }

  private centerCurrentEpisode() {
    if (!this.scrollContainer) { 
      return;
    }

    const container = this.scrollContainer.nativeElement;
    const episodes = this.allEpisodes();
    const currentIndex = this.currentEpisodeIndex();

    if (currentIndex < 0 || episodes.length === 0) {
      return;
    }

    const tryCenter = (attempts = 0) => {
      if (attempts > 10) {
        return;
      }

      const episodeCards = container.querySelectorAll('.episode-card');

      if (episodeCards.length < episodes.length) {
        setTimeout(() => tryCenter(attempts + 1), 200);
        return;
      }

      const currentCard = episodeCards[currentIndex] as HTMLElement;
      if (!currentCard) {
        setTimeout(() => tryCenter(attempts + 1), 200);
        return;
      }

      const containerWidth = container.clientWidth;
      const cardLeft = currentCard.offsetLeft;
      const cardWidth = currentCard.offsetWidth;
      const isMobile = window.innerWidth <= 575;
      const isTablet = window.innerWidth > 575 && window.innerWidth <= 991;

      let scrollPosition: number;

      if (isMobile) {
        scrollPosition = cardLeft - containerWidth / 2 + cardWidth / 2;
      } else if (isTablet) {
        const offsetRatio = 0.4;
        scrollPosition =
          cardLeft - containerWidth * offsetRatio + cardWidth / 2;
      } else {
        scrollPosition = cardLeft - containerWidth / 2 + cardWidth / 2;
      }
      const maxScroll = container.scrollWidth - containerWidth;
      const finalPosition = Math.max(0, Math.min(scrollPosition, maxScroll));

      container.scrollTo({
        left: finalPosition,
        behavior: 'smooth',
      });

      setTimeout(() => this.updateScrollButtons(), 300);
    };

    setTimeout(() => tryCenter(), 100);
  }

  goToEpisode(episode: SupabaseEpisode) {
    const anime = this.currentAnime();
    if (anime) {
      const animeSlug = this.createSlug(anime.titulo);
      this.router.navigate(['/player', animeSlug, episode.id]);
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
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

  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.touches[0].clientX;
  }

  onTouchEnd(event: TouchEvent) {
    this.touchEndX = event.changedTouches[0].clientX;
    this.handleSwipe();
  }

  private handleSwipe() {
    const swipeThreshold = 50;
    const swipeDistance = this.touchStartX - this.touchEndX;

    if (Math.abs(swipeDistance) > swipeThreshold) {
      if (swipeDistance > 0) {
        this.scrollRight();
      } else {
        this.scrollLeft();
      }
    }
  }

  @HostListener('window:resize')
  onWindowResize() {
    setTimeout(() => {
      if (this.currentEpisode() && this.allEpisodes().length > 0) {
        this.centerCurrentEpisode();
      } else {
        this.updateScrollButtons();
      }
    }, 200);
  }

  async togglePip() {
    const video = document.querySelector('video');
    if (!video) return;
    video?.requestPictureInPicture();
  }
}

import {
    Component,
    ChangeDetectionStrategy,
    input,
    signal,
    computed,
    output,
    ViewChild,
    ElementRef,
    AfterViewInit,
    HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    AnimeCard,
    AnimeCardEvents,
} from '../anime-card/anime-card';
import {
    SupabaseAnimeWithEpisodes,
    SupabaseEpisode,
} from '../../../../services/supabase.service';

@Component({
  selector: 'app-anime-row',
  imports: [CommonModule, AnimeCard],
  templateUrl: './anime-row.html',
  styleUrls: ['./anime-row.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'anime-row-container',
  },
})
export class AnimeRow implements AfterViewInit {
  @ViewChild('scrollContainer', { static: false })
  scrollContainer!: ElementRef<HTMLElement>;

  // Inputs
  readonly title = input.required<string>();
  readonly animes = input.required<SupabaseAnimeWithEpisodes[]>();
  readonly showTitle = input(true);

  // Outputs
  readonly onAnimeClick = output<AnimeCardEvents['cardClick']>();
  readonly onEpisodeClick = output<SupabaseEpisode>();
  readonly onAdultContentToggle =
    output<AnimeCardEvents['adultContentToggle']>();

  // Signals
  readonly canScrollLeft = signal(false);
  readonly canScrollRight = signal(true);
  readonly isScrolling = signal(false);

  // Computed
  readonly hasAnimes = computed(() => this.animes().length > 0);

  ngAfterViewInit() {
    // Verificar se pode fazer scroll após a view ser inicializada
    setTimeout(() => this.updateScrollButtons(), 0);
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

  handleAnimeClick(event: AnimeCardEvents['cardClick']) {
    this.onAnimeClick.emit(event);
  }

  handleEpisodeClick(episode: SupabaseEpisode) {
    this.onEpisodeClick.emit(episode);
  }

  handleAdultContentToggle(event: AnimeCardEvents['adultContentToggle']) {
    this.onAdultContentToggle.emit(event);
  }

  @HostListener('window:resize')
  onWindowResize() { 
    setTimeout(() => this.updateScrollButtons(), 100);
  }
}

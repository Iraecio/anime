import {
  Component,
  ChangeDetectionStrategy,
  input,
  inject,
  output,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseAnimeWithEpisodes, SupabaseEpisode } from '../../../../services/supabase.service';
import { CardService } from '../../../../services/card-service.service';
import { ImageErrorService } from '../../../../services/image-error.service';
import { AnimeCardService } from './anime-card.service';

export interface AnimeCardEvents {
  cardClick: { anime: SupabaseAnimeWithEpisodes; index: number };
  episodeClick: SupabaseEpisode;
  adultContentToggle: { animeId: number; revealed: boolean };
}

@Component({
  selector: 'app-card-anime',
  imports: [FormsModule],
  templateUrl: './anime-card.html',
  styleUrls: ['./anime-card.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.adult-content-card]': 'isAdultContent()',
    '[class.adult-content-revealed]': 'isAdultContentRevealed()',
    '[class.card-expanded]': 'isExpanded()',
  }
})
export class AnimeCard {
  // Dependências
  private cardService = inject(CardService);
  private imageErrorService = inject(ImageErrorService);
  private animeCardService = inject(AnimeCardService);

  // Inputs
  readonly anime = input.required<SupabaseAnimeWithEpisodes>();
  readonly index = input.required<number>();

  // Estado local
  readonly isUpdating = signal<boolean>(false);

  // Outputs
  readonly onCardClick = output<AnimeCardEvents['cardClick']>();
  readonly onEpisodeClick = output<SupabaseEpisode>();
  readonly onAdultContentToggle = output<AnimeCardEvents['adultContentToggle']>();

  // Computed properties
  readonly isAdultContent = computed(() => {
    const anime = this.anime();
    return this.cardService.isAdultContent(anime);
  });

  readonly isAdultContentRevealed = computed(() => {
    const anime = this.anime();
    return this.cardService.isAdultContentRevealed(anime.id);
  });

  readonly isExpanded = computed(() => {
    const anime = this.anime();
    return this.cardService.isAnimeExpanded(anime.id);
  });

  readonly matchPercentage = computed(() => {
    const anime = this.anime();
    return this.cardService.getMatchPercentage(anime);
  });

  readonly expandedEpisodes = computed(() => {
    return this.cardService.currentExpandedEpisodes();
  });

  readonly shouldShowEpisodes = computed(() => {
    return this.isExpanded() && this.expandedEpisodes().length > 0;
  });

  // Event handlers
  handleCardClick(): void {
    const anime = this.anime();
    const index = this.index();

    // Se é conteúdo adulto e não foi revelado, revela primeiro
    if (this.isAdultContent() && !this.isAdultContentRevealed()) {
      this.handleAdultContentToggle();
      return;
    }

    // Caso contrário, comportamento normal (expandir/colapsar episódios)
    this.cardService.toggleAnimeExpansion(anime, index);
    this.onCardClick.emit({ anime, index });
  }

  handleAdultContentToggle(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const anime = this.anime();
    const wasRevealed = this.isAdultContentRevealed();
    
    this.cardService.toggleAdultContentReveal(anime.id);
    
    // Emite evento com o novo estado
    this.onAdultContentToggle.emit({
      animeId: anime.id,
      revealed: !wasRevealed
    });
  }

  handleEpisodeClick(episode: SupabaseEpisode, event: Event): void {
    event.stopPropagation();
    this.onEpisodeClick.emit(episode);
  }

  handleCloseExpansion(event: Event): void {
    event.stopPropagation();
    this.cardService.collapseAnime();
  }

  handleUpdateRequest(event: Event): void {
    event.stopPropagation();
    const animeId = this.anime().id;
    
    this.isUpdating.set(true);
    this.animeCardService.getUpdateEpisodesFromAnime(animeId).subscribe({
      next: () => {
        this.isUpdating.set(false);
        console.log(`Atualização solicitada para anime ID: ${animeId}`);
      },
      error: (error) => {
        this.isUpdating.set(false);
        console.error('Erro ao solicitar atualização:', error);
      }
    });
  }

  // Keyboard navigation
  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.handleCardClick();
        break;
      case 'Escape':
        if (this.isExpanded()) {
          event.preventDefault();
          this.handleCloseExpansion(event);
        }
        break;
    }
  }

  // Utilities para template
  getImageErrorSrc(): string { 
    // Reporta o erro de imagem para o serviço quando a imagem falha
    const anime = this.anime();
    this.imageErrorService.reportImageError(anime.id);
    
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMjIxIi8+PHRleHQgeD0iNTAlIiB5PSI0NSUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkFuaW1lPC90ZXh0PjxjaXJjbGUgY3g9IjUwJSIgY3k9IjU1JSIgcj0iMTAiIGZpbGw9IiNlNTA5MTQiLz48L3N2Zz4=';
  } 

  getCardAriaLabel(): string {
    const anime = this.anime();
    const baseLabel = `${anime.titulo}, ${anime.episodios.length} episódios`;
    
    if (this.isAdultContent() && !this.isAdultContentRevealed()) {
      return `${baseLabel}, conteúdo adulto (clique para revelar)`;
    }
    
    if (this.isExpanded()) {
      return `${baseLabel}, expandido (pressione Escape para fechar)`;
    }
    
    return `${baseLabel} (clique para ver episódios)`;
  }
}

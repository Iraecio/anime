import { Injectable, signal, computed } from '@angular/core';
import { SupabaseAnimeWithEpisodes, SupabaseEpisode } from './supabase.service';

export interface CardState {
  expandedAnimeId: number | null;
  expandedAnime: SupabaseAnimeWithEpisodes | null;
  expandedEpisodes: SupabaseEpisode[];
  expandDirection: 'left' | 'right';
  revealedAdultContent: Set<number>;
}

@Injectable({
  providedIn: 'root'
})
export class CardService {
  // Estados centralizados
  private expandedAnimeId = signal<number | null>(null);
  private expandedAnime = signal<SupabaseAnimeWithEpisodes | null>(null);
  private expandedEpisodes = signal<SupabaseEpisode[]>([]);
  private expandDirection = signal<'left' | 'right'>('right');
  private revealedAdultContent = signal<Set<number>>(new Set());

  // Computed properties (read-only)
  readonly currentExpandedAnimeId = computed(() => this.expandedAnimeId());
  readonly currentExpandedAnime = computed(() => this.expandedAnime());
  readonly currentExpandedEpisodes = computed(() => this.expandedEpisodes());
  readonly currentExpandDirection = computed(() => this.expandDirection());
  readonly currentRevealedAdultContent = computed(() => this.revealedAdultContent());

  // Computed para verificar se algum card está expandido
  readonly hasExpandedCard = computed(() => this.expandedAnimeId() !== null);

  // ===== MÉTODOS PARA CONTROLE DE CONTEÚDO +18 =====

  /**
   * Verifica se um anime tem conteúdo +18
   */
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

  /**
   * Verifica se o conteúdo +18 de um anime foi revelado
   */
  isAdultContentRevealed(animeId: number): boolean {
    return this.revealedAdultContent().has(animeId);
  }

  /**
   * Alterna a revelação do conteúdo +18 de um anime
   */
  toggleAdultContentReveal(animeId: number): void {
    const currentRevealed = this.revealedAdultContent();
    const newRevealed = new Set(currentRevealed);

    if (newRevealed.has(animeId)) {
      newRevealed.delete(animeId);
    } else {
      newRevealed.add(animeId);
    }

    this.revealedAdultContent.set(newRevealed);
  }

  /**
   * Revela o conteúdo +18 de um anime específico
   */
  revealAdultContent(animeId: number): void {
    const currentRevealed = this.revealedAdultContent();
    const newRevealed = new Set(currentRevealed);
    newRevealed.add(animeId);
    this.revealedAdultContent.set(newRevealed);
  }

  /**
   * Oculta o conteúdo +18 de um anime específico
   */
  hideAdultContent(animeId: number): void {
    const currentRevealed = this.revealedAdultContent();
    const newRevealed = new Set(currentRevealed);
    newRevealed.delete(animeId);
    this.revealedAdultContent.set(newRevealed);
  }

  /**
   * Limpa todo o conteúdo adulto revelado
   */
  clearRevealedAdultContent(): void {
    this.revealedAdultContent.set(new Set());
  }

  // ===== MÉTODOS PARA CONTROLE DE EXPANSÃO DE CARDS =====

  /**
   * Verifica se um anime está expandido
   */
  isAnimeExpanded(animeId: number): boolean {
    return this.expandedAnimeId() === animeId;
  }

  /**
   * Expande um anime específico
   */
  expandAnime(anime: SupabaseAnimeWithEpisodes, index: number): void {
    this.expandedAnimeId.set(anime.id);
    this.expandedAnime.set(anime);
    this.expandedEpisodes.set(anime['episodios'] || []);

    // Determina direção da expansão baseado na posição na grid
    // Assumindo 6 cards por linha em telas grandes
    const cardsPerRow = 6;
    const positionInRow = index % cardsPerRow;
    const direction = positionInRow >= Math.floor(cardsPerRow / 2) ? 'left' : 'right';
    this.expandDirection.set(direction);

    // Limpa outros animes com conteúdo adulto revelado ao expandir
    this.clearRevealedAdultContent();
  }

  /**
   * Colapsa o anime atualmente expandido
   */
  collapseAnime(): void {
    this.expandedAnimeId.set(null);
    this.expandedAnime.set(null);
    this.expandedEpisodes.set([]);
  }

  /**
   * Alterna a expansão de um anime (expande se não estiver expandido, colapsa se estiver)
   */
  toggleAnimeExpansion(anime: SupabaseAnimeWithEpisodes, index: number): void {
    const currentExpanded = this.expandedAnimeId();

    if (currentExpanded === anime.id) {
      // Se já está expandido, colapsa
      this.collapseAnime();
    } else {
      // Expande o anime
      this.expandAnime(anime, index);
    }
  }

  // ===== MÉTODOS UTILITÁRIOS =====

  /**
   * Limpa todo o estado (útil para mudanças de página, busca, etc.)
   */
  clearAllState(): void {
    this.collapseAnime();
    this.clearRevealedAdultContent();
  }

  /**
   * Obtém o estado atual completo do serviço
   */
  getCurrentState(): CardState {
    return {
      expandedAnimeId: this.expandedAnimeId(),
      expandedAnime: this.expandedAnime(),
      expandedEpisodes: this.expandedEpisodes(),
      expandDirection: this.expandDirection(),
      revealedAdultContent: this.revealedAdultContent(),
    };
  }

  /**
   * Restaura o estado do serviço (útil para navegação ou cache)
   */
  restoreState(state: Partial<CardState>): void {
    if (state.expandedAnimeId !== undefined) {
      this.expandedAnimeId.set(state.expandedAnimeId);
    }
    if (state.expandedAnime !== undefined) {
      this.expandedAnime.set(state.expandedAnime);
    }
    if (state.expandedEpisodes !== undefined) {
      this.expandedEpisodes.set(state.expandedEpisodes);
    }
    if (state.expandDirection !== undefined) {
      this.expandDirection.set(state.expandDirection);
    }
    if (state.revealedAdultContent !== undefined) {
      this.revealedAdultContent.set(state.revealedAdultContent);
    }
  }

  /**
   * Gera uma porcentagem de "match" para o anime (funcionalidade Netflix-style)
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

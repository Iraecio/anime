import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import {
  SupabaseService,
  SupabaseEpisode,
  SupabaseAnime,
} from '../services/supabase.service';
import { EpisodeService } from '../services/episode.service';

@Component({
  selector: 'app-episode-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './episode-player.html',
  styleUrl: './episode-player.scss',
})
export class EpisodePlayer implements OnInit {
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

  // Computed para URL segura do iframe
  safeVideoUrl = computed(() => {
    const episode = this.currentEpisode();
    if (!episode?.link_video) return null;
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

      // Marcar episódio como assistido
      this.episodeService.markAsWatched(episodeId);

      console.log('assistido')
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
}

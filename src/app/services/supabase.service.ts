import { Injectable, signal, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Database } from '../types/supabase';
import { Observable, from, map, catchError, of, switchMap } from 'rxjs';
import { CacheService } from './cache.service';
import { SearchFilters } from '../pages/home/header/search/search.interface';

export type SupabaseAnime = Database['public']['Tables']['animes']['Row'];
export type SupabaseEpisode = Database['public']['Tables']['episodios']['Row'];
export type SupabaseAnimeWithEpisodes = SupabaseAnime & {
  episodios: SupabaseEpisode[];
  generos: string[];
};

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient<Database>;
  private cacheService = inject(CacheService);

  // Signals para estado de loading e erros
  isLoading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    this.supabase = createClient<Database>(
      environment.apiUrl,
      environment.anonPublicKey
    );
    
    // Inicia a limpeza automática do cache
    this.cacheService.startAutoCleanup();
  }

  // ===== MÉTODOS PARA GÊNEROS =====
  // animes_by_genre
  getAnimesByGenre(
    genre: string,
    page: number = 1,
    limit: number = 50
  ): Observable<{ data: SupabaseAnimeWithEpisodes[]; total: number }> {
    const from_index = (page - 1) * limit;
    const to_index = from_index + limit - 1;

    this.isLoading.set(true);
    this.error.set(null);

    return from(
      this.supabase
        .from('animes_by_genre')
        .select('*', { count: 'exact' })
        .ilike('generos_string', `%${genre}%`)
        .range(from_index, to_index)
        .order('ultimo_episodio_criado_em', {
          ascending: false,
          nullsFirst: false,
        })
    ).pipe(
      map(({ data, error, count }) => {
        this.isLoading.set(false);

        if (error) {
          this.error.set(error.message);
          throw new Error(error.message);
        }

        // Mapear dados para incluir array de episódios vazio (para compatibilidade de tipo)
        const animesWithEpisodes: SupabaseAnimeWithEpisodes[] = (data || []).map(
          (anime) => ({
            // Preencher explicitamente os campos obrigatórios do tipo SupabaseAnimeWithEpisodes
            id: anime.id ?? 0,
            titulo: anime.titulo ?? '',
            thumb: anime.thumb ?? null,
            slug: anime.slug ?? null,
            dublado: anime.dublado ?? null,
            link_original: anime.link_original ?? '',
            status: (anime as any).status ?? null,
            criado_em: (anime as any).criado_em ?? null,
            atualizado_em: (anime as any).atualizado_em ?? null,
            ano: anime.ano ?? null,
            // Episódios vazios pois a view não retorna episódios aqui
            episodios: [],
            // Normaliza generos para string[]
            generos: Array.isArray(anime.generos)
              ? anime.generos.filter((g): g is string => typeof g === 'string')
              : typeof anime.generos === 'string'
              ? [anime.generos]
              : [],
          })
        );

        return { data: animesWithEpisodes, total: count || 0 };
      }),
      catchError((error) => {
        this.isLoading.set(false);
        this.error.set(error.message);
        console.error('Erro ao buscar animes por gênero:', error);
        return of({ data: [], total: 0 });
      })
    );
  }

  // ===== MÉTODOS PARA ANIMES =====
  getAnimes(
    page: number = 1,
    limit: number = 50
  ): Observable<{ data: SupabaseAnimeWithEpisodes[]; total: number }> {
    // Cria chave única para o cache
    const cacheKey = this.cacheService.createKey('animes', { page, limit });
    
    // Usa cache com TTL de 3 minutos para listagem geral
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchAnimes(page, limit),
      1 * 60 * 1000 // 1 minuto
    );
  }

  /**
   * Método privado para buscar animes sem cache
   */
  private fetchAnimes(
    page: number,
    limit: number
  ): Observable<{ data: SupabaseAnimeWithEpisodes[]; total: number }> {
    this.isLoading.set(true);
    this.error.set(null);

    const from_index = (page - 1) * limit;
    const to_index = from_index + limit - 1;

    return from(
      this.supabase
        .from('animes_with_latest_episode')
        .select('*', { count: 'exact' })
        .range(from_index, to_index)
        .order('ultimo_episodio_criado_em', {
          ascending: false,
          nullsFirst: false,
        })
        .order('total_episodios', { ascending: false })
    ).pipe(
      switchMap(({ data: animesData, error: animesError, count }) => {
        if (animesError) {
          throw new Error(animesError.message);
        }

        if (!animesData || animesData.length === 0) {
          return of({ data: [], total: count || 0 });
        }

        // Buscar episódios para cada anime usando a view episodios_por_titulo
        const titulos = animesData
          .map((anime) => anime.titulo)
          .filter((titulo): titulo is string => titulo !== null);

        return from(
          this.supabase
            .from('episodios_por_titulo')
            .select('*')
            .in('titulo', titulos)
            .order('numero', { ascending: true })
        ).pipe(
          map(({ data: episodiosData, error: episodiosError }) => {
            if (episodiosError) {
              throw new Error(episodiosError.message);
            }

            // Agrupar episódios por título do anime
            const episodiosPorTitulo = (episodiosData || [])
              .filter(
                (episodio) =>
                  episodio.id !== null &&
                  episodio.titulo !== null &&
                  episodio.anime_id !== null &&
                  episodio.numero !== null
              )
              .reduce((acc, episodio) => {
                const tituloAnime = episodio.titulo!;
                if (!acc[tituloAnime]) {
                  acc[tituloAnime] = [];
                }
                acc[tituloAnime].push({
                  id: episodio.id!,
                  anime_id: episodio.anime_id!,
                  numero: episodio.numero!,
                  criado_em: episodio.criado_em,
                  link_original: episodio.link_original,
                  link_video: episodio.link_video,
                });
                return acc;
              }, {} as Record<string, SupabaseEpisode[]>);

            // Combinar animes com seus episódios
            const animesWithEpisodes: SupabaseAnimeWithEpisodes[] = (
              animesData || []
            )
              .filter(
                (anime) =>
                  anime.id !== null &&
                  typeof anime.id === 'number' &&
                  anime.titulo !== null &&
                  typeof anime.titulo === 'string'
              )
              .map((anime) => ({
                id: anime.id!,
                titulo: anime.titulo!,
                thumb: anime.thumb,
                slug: anime.slug,
                dublado: anime.dublado,
                link_original: anime.link_original || '',
                status: null, // não disponível na view
                criado_em: null, // não disponível na view
                atualizado_em: null, // não disponível na view
                ano: anime.ano || null, // Adiciona o campo 'ano' para compatibilidade de tipo
                episodios: episodiosPorTitulo[anime.titulo!] || [],
                generos: Array.isArray(anime.generos)
                  ? anime.generos.filter(
                      (g): g is string => typeof g === 'string'
                    )
                  : typeof anime.generos === 'string'
                  ? [anime.generos]
                  : [],
              }));

            return { data: animesWithEpisodes, total: count || 0 };
          })
        );
      }),
      map((result) => {
        this.isLoading.set(false);
        return result;
      }),
      catchError((error) => {
        this.isLoading.set(false);
        this.error.set(error.message);
        console.error('Erro ao buscar animes:', error);
        return of({ data: [], total: 0 });
      })
    );
  }

  /**
   * Busca um anime específico por ID
   */
  getAnimeById(id: number): Observable<SupabaseAnimeWithEpisodes | null> {
    // Cria chave única para o cache
    const cacheKey = this.cacheService.createKey('anime', { id });
    
    // Usa cache com TTL de 5 minutos para anime específico
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchAnimeById(id),
      5 * 60 * 1000 // 5 minutos
    );
  }

  /**
   * Método privado para buscar anime por ID sem cache
   */
  private fetchAnimeById(id: number): Observable<SupabaseAnimeWithEpisodes | null> {
    this.isLoading.set(true);
    this.error.set(null);

    return from(
      this.supabase
        .from('animes_with_latest_episode')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      switchMap(({ data: animeData, error: animeError }) => {
        if (animeError) {
          throw new Error(animeError.message);
        }

        if (!animeData || !animeData.titulo) {
          return of(null);
        }

        // Buscar episódios para este anime usando a view episodios_por_titulo
        return from(
          this.supabase
            .from('episodios_por_titulo')
            .select('*')
            .eq('titulo', animeData.titulo)
            .order('numero', { ascending: true })
        ).pipe(
          map(({ data: episodiosData, error: episodiosError }) => {
            if (episodiosError) {
              throw new Error(episodiosError.message);
            }

            // Mapear episódios
            const episodios: SupabaseEpisode[] = (episodiosData || [])
              .filter(
                (episodio) =>
                  episodio.id !== null &&
                  episodio.anime_id !== null &&
                  episodio.numero !== null
              )
              .map((episodio) => ({
                id: episodio.id!,
                anime_id: episodio.anime_id!,
                numero: episodio.numero!,
                criado_em: episodio.criado_em,
                link_original: episodio.link_original,
                link_video: episodio.link_video,
              }));

            // Combinar anime com seus episódios
            const animeWithEpisodes: SupabaseAnimeWithEpisodes = {
              id: animeData.id!,
              titulo: animeData.titulo!,
              thumb: animeData.thumb,
              slug: animeData.slug,
              dublado: animeData.dublado,
              link_original: animeData.link_original || '',
              status: null, // não disponível na view
              criado_em: null, // não disponível na view
              atualizado_em: null, // não disponível na view
              ano: animeData.ano || null, // Adiciona o campo 'ano' para compatibilidade de tipo
              episodios,
              generos: Array.isArray(animeData.generos)
                ? animeData.generos.filter(
                    (g): g is string => typeof g === 'string'
                  )
                : typeof animeData.generos === 'string'
                ? [animeData.generos]
                : [],
            };

            return animeWithEpisodes;
          })
        );
      }),
      map((result) => {
        this.isLoading.set(false);
        return result;
      }),
      catchError((error) => {
        this.isLoading.set(false);
        this.error.set(error.message);
        console.error('Erro ao buscar anime:', error);
        return of(null);
      })
    );
  }

  /**
   * Busca animes por título (pesquisa)
   */
  searchAnimes(
    query: string,
    page: number = 1,
    limit: number = 50
  ): Observable<{ data: SupabaseAnimeWithEpisodes[]; total: number }> {
    // Cria chave única para o cache da busca
    const cacheKey = this.cacheService.createKey('search', { 
      query: query.toLowerCase().trim(), 
      page, 
      limit 
    });
    
    // Usa cache com TTL menor para buscas (1 minuto)
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchSearchResults(query, page, limit),
      1 * 60 * 1000 // 1 minuto
    );
  }

  /**
   * Método privado para buscar resultados sem cache
   */
  private fetchSearchResults(
    query: string,
    page: number,
    limit: number
  ): Observable<{ data: SupabaseAnimeWithEpisodes[]; total: number }> {
    this.isLoading.set(true);
    this.error.set(null);

    const from_index = (page - 1) * limit;
    const to_index = from_index + limit - 1;

    return from(
      this.supabase
        .from('animes_with_latest_episode')
        .select('*', { count: 'exact' })
        .ilike('titulo', `%${query}%`)
        .range(from_index, to_index)
        .order('ultimo_episodio_criado_em', {
          ascending: false,
          nullsFirst: false,
        })
        .order('total_episodios', { ascending: false })
    ).pipe(
      switchMap(({ data: animesData, error: animesError, count }) => {
        if (animesError) {
          throw new Error(animesError.message);
        }

        if (!animesData || animesData.length === 0) {
          return of({ data: [], total: count || 0 });
        }

        // Buscar episódios para cada anime usando a view episodios_por_titulo
        const titulos = animesData
          .map((anime) => anime.titulo)
          .filter((titulo): titulo is string => titulo !== null);

        return from(
          this.supabase
            .from('episodios_por_titulo')
            .select('*')
            .in('titulo', titulos)
            .order('numero', { ascending: true })
        ).pipe(
          map(({ data: episodiosData, error: episodiosError }) => {
            if (episodiosError) {
              throw new Error(episodiosError.message);
            }

            // Agrupar episódios por título do anime
            const episodiosPorTitulo = (episodiosData || [])
              .filter(
                (episodio) =>
                  episodio.id !== null &&
                  episodio.titulo !== null &&
                  episodio.anime_id !== null &&
                  episodio.numero !== null
              )
              .reduce((acc, episodio) => {
                const tituloAnime = episodio.titulo!;
                if (!acc[tituloAnime]) {
                  acc[tituloAnime] = [];
                }
                acc[tituloAnime].push({
                  id: episodio.id!,
                  anime_id: episodio.anime_id!,
                  numero: episodio.numero!,
                  criado_em: episodio.criado_em,
                  link_original: episodio.link_original,
                  link_video: episodio.link_video,
                });
                return acc;
              }, {} as Record<string, SupabaseEpisode[]>);

            // Combinar animes com seus episódios
            const animesWithEpisodes: SupabaseAnimeWithEpisodes[] = (
              animesData || []
            )
              .filter(
                (anime) =>
                  anime.id !== null &&
                  typeof anime.id === 'number' &&
                  anime.titulo !== null &&
                  typeof anime.titulo === 'string'
              )
              .map((anime) => ({
                id: anime.id!,
                titulo: anime.titulo!,
                thumb: anime.thumb,
                slug: anime.slug,
                dublado: anime.dublado,
                link_original: anime.link_original || '',
                status: null, // não disponível na view
                criado_em: null, // não disponível na view
                atualizado_em: null, // não disponível na view
                ano: anime.ano || null, // Adiciona o campo 'ano' para compatibilidade de tipo
                episodios: episodiosPorTitulo[anime.titulo!] || [],
                generos: Array.isArray(anime.generos)
                  ? anime.generos.filter(
                      (g): g is string => typeof g === 'string'
                    )
                  : typeof anime.generos === 'string'
                  ? [anime.generos]
                  : [],
              }));

            return { data: animesWithEpisodes, total: count || 0 };
          })
        );
      }),
      map((result) => {
        this.isLoading.set(false);
        return result;
      }),
      catchError((error) => {
        this.isLoading.set(false);
        this.error.set(error.message);
        console.error('Erro ao pesquisar animes:', error);
        return of({ data: [], total: 0 });
      })
    );
  }

  /**
   * Nova busca de animes com filtros avançados
   * Usa as funções SQL criadas: search_animes_filtered() e count_animes_filtered()
   */
  searchAnimesWithFilters(
    query?: string,
    filters?: SearchFilters,
    page: number = 1,
    limit: number = 50
  ): Observable<{ data: SupabaseAnimeWithEpisodes[]; total: number }> {
    // Temporariamente desabilitando cache para filtros para garantir atualizações
    // TODO: Implementar cache mais inteligente depois
    console.log('🔄 Executando busca sem cache para garantir filtros atualizados');
    return this.fetchFilteredResults(query, filters, page, limit);
  }

  /**
   * Método privado para buscar com filtros usando RPC (chamadas de função SQL)
   */
  private fetchFilteredResults(
    query?: string,
    filters?: SearchFilters,
    page: number = 1,
    limit: number = 50
  ): Observable<{ data: SupabaseAnimeWithEpisodes[]; total: number }> {
    this.isLoading.set(true);
    this.error.set(null);

    const offset = (page - 1) * limit;

    // Prepara parâmetros para as funções SQL
    const searchParams = {
      p_query: query || null,
      p_audio_types: filters?.audioType?.length ? filters.audioType : null,
      p_genres: filters?.genres?.length ? filters.genres : null,
      p_year: filters?.year || null,
      p_limit: limit,
      p_offset: offset
    };

    // Debug: Log completo dos parâmetros de busca  
    console.log('🔍 Parâmetros da busca com filtros:', {
      query,
      filters,
      searchParams,
      'DETALHES DOS FILTROS': {
        'p_query': searchParams.p_query,
        'p_audio_types': searchParams.p_audio_types,
        'p_genres': searchParams.p_genres,
        'p_year': searchParams.p_year,
        'p_limit': searchParams.p_limit,
        'p_offset': searchParams.p_offset
      }
    });

    const countParams = {
      p_query: query || null,
      p_audio_types: filters?.audioType?.length ? filters.audioType : null,
      p_genres: filters?.genres?.length ? filters.genres : null,
      p_year: filters?.year || null
    };

    // Executa busca e contagem em paralelo usando any para contornar limitações de tipos
    const searchPromise = (this.supabase as any).rpc('search_animes_filtered', searchParams);
    const countPromise = (this.supabase as any).rpc('count_animes_filtered', countParams);

    return from(Promise.all([searchPromise, countPromise])).pipe(
      switchMap(([searchResult, countResult]) => {
        if (searchResult.error) {
          throw new Error(`Erro na busca: ${searchResult.error.message}`);
        }
        if (countResult.error) {
          throw new Error(`Erro na contagem: ${countResult.error.message}`);
        }

        const animes = (searchResult.data as any[]) || [];
        const total = (countResult.data as number) || 0;

        // Debug: Log dos resultados do SQL
        console.log('📊 Resultados do SQL:', {
          'total encontrados': animes.length,
          'contagem total': total,
          'primeiros 3 animes': animes.slice(0, 3).map(a => ({
            titulo: a.titulo,
            generos: a.generos_array
          }))
        });

        if (animes.length === 0) {
          console.log('⚠️ Nenhum anime encontrado com os filtros aplicados');
          this.isLoading.set(false);
          return of({ data: [], total });
        }

        // Buscar episódios para cada anime usando a view episodios_por_titulo
        const titulos = animes
          .map((anime: any) => anime.titulo)
          .filter((titulo: string) => titulo !== null);

        return from(
          this.supabase
            .from('episodios_por_titulo')
            .select('*')
            .in('titulo', titulos)
            .order('numero', { ascending: true })
        ).pipe(
          map(({ data: episodiosData, error: episodiosError }) => {
            if (episodiosError) {
              throw new Error(episodiosError.message);
            }

            // Agrupar episódios por título do anime
            const episodiosPorTitulo = (episodiosData || [])
              .filter(
                (episodio) =>
                  episodio.id !== null &&
                  episodio.titulo !== null &&
                  episodio.anime_id !== null &&
                  episodio.numero !== null
              )
              .reduce((acc, episodio) => {
                const tituloAnime = episodio.titulo!;
                if (!acc[tituloAnime]) {
                  acc[tituloAnime] = [];
                }
                acc[tituloAnime].push({
                  id: episodio.id!,
                  anime_id: episodio.anime_id!,
                  numero: episodio.numero!,
                  criado_em: episodio.criado_em,
                  link_original: episodio.link_original,
                  link_video: episodio.link_video,
                });
                return acc;
              }, {} as Record<string, SupabaseEpisode[]>);

            // Combinar animes com seus episódios
            const transformedData: SupabaseAnimeWithEpisodes[] = animes.map((anime: any) => ({
              id: anime.id,
              titulo: anime.titulo,
              thumb: anime.thumb,
              slug: anime.slug,
              dublado: anime.dublado,
              link_original: anime.link_original,
              ano: anime.ano,
              status: null, // não disponível na view
              criado_em: null, // não disponível na view  
              atualizado_em: null, // não disponível na view
              episodios: episodiosPorTitulo[anime.titulo] || [],
              generos: anime.generos_array || [] // Usa o array de gêneros
            }));

            this.isLoading.set(false);
            return { data: transformedData, total };
          })
        );
      }),
      catchError((error) => {
        this.isLoading.set(false);
        this.error.set(error.message);
        console.error('Erro ao pesquisar animes com filtros:', error);
        return of({ data: [], total: 0 });
      })
    );
  }
   
  // ===== MÉTODOS PARA EPISÓDIOS =====

  /**
   * Busca episódios de um anime específico
   */
  getEpisodesByAnimeId(animeId: number): Observable<SupabaseEpisode[]> {
    this.isLoading.set(true);
    this.error.set(null);

    return from(
      this.supabase
        .from('episodios')
        .select('*')
        .eq('anime_id', animeId)
        .order('numero', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        this.isLoading.set(false);

        if (error) {
          this.error.set(error.message);
          throw new Error(error.message);
        }

        return data ?? [];
      }),
      catchError((error) => {
        this.isLoading.set(false);
        this.error.set(error.message);
        console.error('Erro ao buscar episódios:', error);
        return of([]);
      })
    );
  }

  /**
   * Busca um episódio específico
   */
  getEpisodeById(id: number): Observable<SupabaseEpisode | null> {
    this.isLoading.set(true);
    this.error.set(null);

    return from(
      this.supabase.from('episodios').select('*').eq('id', id).single()
    ).pipe(
      map(({ data, error }) => {
        this.isLoading.set(false);

        if (error) {
          this.error.set(error.message);
          return null;
        }

        return data ?? null;
      }),
      catchError((error) => {
        this.isLoading.set(false);
        this.error.set(error.message);
        console.error('Erro ao buscar episódio:', error);
        return of(null);
      })
    );
  }

  /**
   * Conta total de animes
   */
  getTotalAnimes(): Observable<number> {
    return from(
      this.supabase.from('animes').select('id', { count: 'exact', head: true })
    ).pipe(
      map(({ count, error }) => {
        if (error) {
          console.error('Erro ao contar animes:', error);
          return 0;
        }
        return count || 0;
      }),
      catchError(() => of(0))
    );
  }

  /**
   * Conta episódios de um anime
   */
  getEpisodeCount(animeId: number): Observable<number> {
    return from(
      this.supabase
        .from('episodios')
        .select('id', { count: 'exact', head: true })
        .eq('anime_id', animeId)
    ).pipe(
      map(({ count, error }) => {
        if (error) {
          console.error('Erro ao contar episódios:', error);
          return 0;
        }
        return count || 0;
      }),
      catchError(() => of(0))
    );
  }

  getGenresList(): Observable<string[]> {
    return from(
      this.supabase.from('generos').select('nome')
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('Erro ao buscar lista de gêneros:', error);
          return [];
        }
        return (data || []).map(g => g.nome).filter((g): g is string => typeof g === 'string');
      }),
      catchError(() => of([]))
    );
  }

  // ===== MÉTODOS DE GERENCIAMENTO DE CACHE =====

  /**
   * Invalida todo o cache
   */
  clearCache(): void {
    this.cacheService.clear();
  }

  /**
   * Invalida cache específico de animes
   */
  invalidateAnimeCache(animeId?: number): void {
    this.cacheService.invalidateAnimeCache(animeId);
  }

  /**
   * Invalida cache de busca
   */
  invalidateSearchCache(): void {
    this.cacheService.deletePattern(/^search/);
  }

  /**
   * Força atualização de dados (ignora cache)
   */
  forceRefreshAnimes(page: number = 1, limit: number = 50): Observable<{ data: SupabaseAnimeWithEpisodes[]; total: number }> {
    // Invalida cache específico desta página
    const cacheKey = this.cacheService.createKey('animes', { page, limit });
    this.cacheService.delete(cacheKey);
    
    // Busca dados novos
    return this.getAnimes(page, limit);
  }

  /**
   * Força atualização de um anime específico
   */
  forceRefreshAnime(id: number): Observable<SupabaseAnimeWithEpisodes | null> {
    // Invalida cache do anime
    this.invalidateAnimeCache(id);
    
    // Busca dados novos
    return this.getAnimeById(id);
  }

  /**
   * Obtém estatísticas do cache
   */
  getCacheStats() {
    return this.cacheService.getStats();
  }

  /**
   * Obtém taxa de hit do cache
   */
  getCacheHitRate(): number {
    return this.cacheService.getHitRate();
  }

  /**
   * Busca todos os gêneros disponíveis
   */
  getAllGenres(): Observable<string[]> {
    const cacheKey = 'all_genres';
    
    return this.cacheService.getOrSet(
      cacheKey,
      () => from(
        this.supabase
          .from('generos')
          .select('nome')
          .order('nome', { ascending: true })
      ).pipe(
        map(({ data, error }) => {
          if (error) {
            throw new Error(error.message);
          }
          return (data || []).map(genre => genre.nome).filter(Boolean);
        }),
        catchError((error) => {
          console.error('Erro ao buscar gêneros:', error);
          return of([]);
        })
      ),
      10 * 60 * 1000 // Cache por 10 minutos
    );
  }

  /**
   * Pré-carrega cache com dados frequentemente acessados
   */
  preloadCache(): void {
    // Pré-carrega primeira página de animes
    this.getAnimes(1, 50).subscribe();
    
    // Pré-carrega segunda página se necessário
    this.getAnimes(2, 50).subscribe();
    
    // Pré-carrega gêneros
    this.getAllGenres().subscribe();
  }
}

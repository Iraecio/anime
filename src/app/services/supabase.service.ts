import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Database } from '../types/supabase';
import { Observable, from, map, catchError, of, switchMap } from 'rxjs';

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

  // Signals para estado de loading e erros
  isLoading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    this.supabase = createClient<Database>(
      environment.apiUrl,
      environment.anonPublicKey
    );
  }

  // ===== MÉTODOS PARA ANIMES =====
  getAnimes(
    page: number = 1,
    limit: number = 50
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
                ano: null, // Adiciona o campo 'ano' para compatibilidade de tipo
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
              ano: null, // Adiciona o campo 'ano' para compatibilidade de tipo
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
                ano: null, // Adiciona o campo 'ano' para compatibilidade de tipo
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
}

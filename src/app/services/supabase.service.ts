import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Database } from '../types/supabase';
import { Observable, from, map, catchError, of, switchMap } from 'rxjs';

export type SupabaseAnime = Database['public']['Tables']['animes']['Row'];
export type SupabaseEpisode = Database['public']['Tables']['episodios']['Row'];
export type SupabaseAnimeWithEpisodes = SupabaseAnime & {
  episodios: SupabaseEpisode[];
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

  /**
   * Busca todos os animes com paginação
   */
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
        .order('criado_em', { ascending: false })
    ).pipe(
      switchMap(({ data: animesData, error: animesError, count }) => {
        if (animesError) {
          throw new Error(animesError.message);
        }

        if (!animesData || animesData.length === 0) {
          return of({ data: [], total: count || 0 });
        }

        // Buscar episódios para cada anime
        const animeIds = animesData
          .map((anime) => anime.id)
          .filter((id): id is number => id !== null && id !== undefined);

        return from(
          this.supabase
            .from('episodios')
            .select('*')
            .in('anime_id', animeIds)
            .order('numero', { ascending: true })
        ).pipe(
          map(({ data: episodiosData, error: episodiosError }) => {
            if (episodiosError) {
              throw new Error(episodiosError.message);
            }

            // Agrupar episódios por anime
            const episodiosPorAnime = (episodiosData || []).reduce(
              (acc, episodio) => {
                if (!acc[episodio.anime_id]) {
                  acc[episodio.anime_id] = [];
                }
                acc[episodio.anime_id].push(episodio);
                return acc;
              },
              {} as Record<number, SupabaseEpisode[]>
            );

            // Combinar animes com seus episódios, garantindo que campos obrigatórios não sejam nulos
            const animesWithEpisodes: any[] = (animesData || [])
              .filter(
                (anime) =>
                  anime.id !== null &&
                  typeof anime.id === 'number' &&
                  anime.titulo !== null &&
                  typeof anime.titulo === 'string' &&
                  anime.link_original !== null &&
                  typeof anime.link_original === 'string'
              )
              .map((anime) => ({
                ...anime,
                episodios: episodiosPorAnime[anime.id!] || [],
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
        .from('animes')
        .select('*, episodios(*)')
        .eq('id', id)
        .single()
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
        .order('criado_em', { ascending: false })
    ).pipe(
      switchMap(({ data: animesData, error: animesError, count }) => {
        if (animesError) {
          throw new Error(animesError.message);
        }

        if (!animesData || animesData.length === 0) {
          return of({ data: [], total: count || 0 });
        }

        // Buscar episódios para cada anime
        const animeIds = animesData
          .map((anime) => anime.id)
          .filter((id): id is number => id !== null && id !== undefined);

        return from(
          this.supabase
            .from('episodios')
            .select('*')
            .in('anime_id', animeIds)
            .order('numero', { ascending: true })
        ).pipe(
          map(({ data: episodiosData, error: episodiosError }) => {
            if (episodiosError) {
              throw new Error(episodiosError.message);
            }

            // Agrupar episódios por anime
            const episodiosPorAnime = (episodiosData || []).reduce(
              (acc, episodio) => {
                if (!acc[episodio.anime_id]) {
                  acc[episodio.anime_id] = [];
                }
                acc[episodio.anime_id].push(episodio);
                return acc;
              },
              {} as Record<number, SupabaseEpisode[]>
            );

            // Combinar animes com seus episódios
            const animesWithEpisodes: any[] = (animesData || [])
              .filter(
                (anime) =>
                  anime.id !== null &&
                  typeof anime.id === 'number' &&
                  anime.titulo !== null &&
                  typeof anime.titulo === 'string' &&
                  anime.link_original !== null &&
                  typeof anime.link_original === 'string'
              )
              .map((anime) => ({
                ...anime,
                episodios: episodiosPorAnime[anime.id!] || [],
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

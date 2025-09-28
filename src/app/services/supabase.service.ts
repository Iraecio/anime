import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Database } from '../types/supabase';
import { Observable, from, map, catchError, of } from 'rxjs';

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
        .from('animes')
        .select(
          `
          *,
          episodios!inner(*)
        `,
          { count: 'exact' }
        )
        .range(from_index, to_index) 
        .order('criado_em', { referencedTable: 'episodios', ascending: false })
        .order('numero', { referencedTable: 'episodios', ascending: false })
    ).pipe(
      map(({ data, error, count }) => {
        this.isLoading.set(false);

        if (error) {
          this.error.set(error.message);
          throw new Error(error.message);
        }
        return { data: data, total: count || 0 };
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
      this.supabase.from('animes').select('*, episodios(*)').eq('id', id).single()
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
        .from('animes')
        .select(
          `
          *,
          episodios!inner(*)
        `,
          { count: 'exact' }
        )
        .ilike('titulo', `%${query}%`)
        .range(from_index, to_index)
        .order('criado_em', { referencedTable: 'episodios', ascending: false })
        .order('numero', { referencedTable: 'episodios', ascending: false })
    ).pipe(
      map(({ data, error, count }) => {
        this.isLoading.set(false);

        if (error) {
          this.error.set(error.message);
          throw new Error(error.message);
        }

        return { data: data, total: count || 0 };
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

  // ===== MÉTODOS UTILITÁRIOS =====

  /**
   * Gera rating fictício (pode ser substituído por dados reais no futuro)
   */
  private generateRating(): number {
    return Math.round((Math.random() * 2 + 8) * 10) / 10; // Entre 8.0 e 10.0
  }

  /**
   * Extrai ano de uma data string
   */
  private extractYearFromDate(dateString: string | null): number {
    if (!dateString) return new Date().getFullYear();
    return new Date(dateString).getFullYear();
  }

  /**
   * Mapeia status do banco para formato padronizado
   */
  private mapStatus(
    status: string | null
  ): 'completed' | 'ongoing' | 'upcoming' {
    if (!status) return 'ongoing';

    const statusLower = status.toLowerCase();
    if (
      statusLower.includes('completo') ||
      statusLower.includes('finalizado')
    ) {
      return 'completed';
    }
    if (
      statusLower.includes('em andamento') ||
      statusLower.includes('ongoing')
    ) {
      return 'ongoing';
    }
    return 'upcoming';
  }

  /**
   * Gera duração aleatória para episódios
   */
  private generateRandomDuration(): string {
    const minutes = Math.floor(Math.random() * 10) + 20; // 20-30 minutos
    return `${minutes}:00`;
  }

  /**
   * Formata data para exibição
   */
  private formatDate(dateString: string | null): string {
    if (!dateString) return new Date().toLocaleDateString('pt-BR');
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  // ===== MÉTODOS DE ESTATÍSTICAS =====

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

import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class EpisodeService {
  private supabaseService = inject(SupabaseService);
  private watchedEpisodes = signal<Set<number>>(new Set());
  private _useSupabase = signal(false); // Flag para alternar entre mock e Supabase
  private readonly STORAGE_KEY = 'anime_watched_episodes';

  constructor() {
    // Carregar dados do localStorage na inicialização
    this.loadWatchedEpisodesFromStorage();
  }

  // ===== MÉTODOS PARA GERENCIAR LOCALSTORAGE =====

  /**
   * Carrega episódios assistidos do localStorage
   */
  private loadWatchedEpisodesFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const episodeIds = JSON.parse(stored) as number[];
        this.watchedEpisodes.set(new Set(episodeIds));
      }
    } catch (error) {
      console.error('Erro ao carregar episódios assistidos do localStorage:', error);
      this.watchedEpisodes.set(new Set());
    }
  }

  /**
   * Salva episódios assistidos no localStorage
   */
  private saveWatchedEpisodesToStorage(): void {
    try {
      const episodeIds = Array.from(this.watchedEpisodes());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(episodeIds));
    } catch (error) {
      console.error('Erro ao salvar episódios assistidos no localStorage:', error);
    }
  }

   
  // Alterna o status de assistido de um episódio
  toggleWatchedStatus(episodeId: number): void {
    const watched = this.watchedEpisodes();
    const newWatched = new Set(watched);
    
    if (newWatched.has(episodeId)) {
      newWatched.delete(episodeId);
    } else {
      newWatched.add(episodeId);
    }
    
    this.watchedEpisodes.set(newWatched);
    this.saveWatchedEpisodesToStorage();
  }

  // Marca um episódio como assistido
  markAsWatched(episodeId: number): void {
    const watched = this.watchedEpisodes();
    const newWatched = new Set(watched);
    newWatched.add(episodeId);
    this.watchedEpisodes.set(newWatched);
    this.saveWatchedEpisodesToStorage();
  }

  // Marca um episódio como não assistido
  markAsUnwatched(episodeId: number): void {
    const watched = this.watchedEpisodes();
    const newWatched = new Set(watched);
    newWatched.delete(episodeId);
    this.watchedEpisodes.set(newWatched);
    this.saveWatchedEpisodesToStorage();
  }

  // Verifica se um episódio foi assistido
  isWatched(episodeId: number): boolean {
    return this.watchedEpisodes().has(episodeId);
  }

  /**
   * Limpa todos os episódios assistidos
   */
  clearAllWatchedEpisodes(): void {
    this.watchedEpisodes.set(new Set());
    this.saveWatchedEpisodesToStorage();
  }

  /**
   * Exporta dados de episódios assistidos como JSON
   */
  exportWatchedEpisodes(): string {
    return JSON.stringify(Array.from(this.watchedEpisodes()));
  }

  /**
   * Importa dados de episódios assistidos de JSON
   */
  importWatchedEpisodes(jsonData: string): boolean {
    try {
      const episodeIds = JSON.parse(jsonData) as number[];
      if (Array.isArray(episodeIds) && episodeIds.every(id => typeof id === 'number')) {
        this.watchedEpisodes.set(new Set(episodeIds));
        this.saveWatchedEpisodesToStorage();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao importar episódios assistidos:', error);
      return false;
    }
  }

  /**
   * Retorna lista de IDs dos episódios assistidos
   */
  getWatchedEpisodeIds(): number[] {
    return Array.from(this.watchedEpisodes());
  }

  /**
   * Retorna quantidade de episódios assistidos
   */
  getWatchedEpisodesCount(): number {
    return this.watchedEpisodes().size;
  }
 
 
}
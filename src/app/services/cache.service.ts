import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  size: string;
}

@Injectable({
  providedIn: 'root',
})
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos por padrão
  
  // Signals para estatísticas do cache
  private hits = signal(0);
  private misses = signal(0);
  
  /**
   * Obtém dados do cache ou executa a função de busca se não existir/expirou
   */
  getOrSet<T>(
    key: string, 
    fetchFn: () => Observable<T>, 
    ttl: number = this.DEFAULT_TTL
  ): Observable<T> {
    const entry = this.cache.get(key);
    
    // Verifica se o cache existe e não expirou
    if (entry && this.isValid(entry)) {
      this.hits.update(count => count + 1);
      return of(entry.data);
    }
    
    // Cache miss - busca dados e armazena
    this.misses.update(count => count + 1);
    return fetchFn().pipe(
      tap(data => {
        this.set(key, data, ttl);
      })
    );
  }

  /**
   * Armazena dados no cache
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };
    
    this.cache.set(key, entry);
    this.cleanupExpiredEntries();
  }

  /**
   * Obtém dados do cache (pode retornar null se não existir ou expirou)
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry || !this.isValid(entry)) {
      return null;
    }
    
    return entry.data;
  }

  /**
   * Remove uma entrada específica do cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Remove entradas do cache que correspondem a um padrão
   */
  deletePattern(pattern: RegExp): number {
    let deleted = 0;
    
    for (const [key] of this.cache) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    return deleted;
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
    this.hits.set(0);
    this.misses.set(0);
  }

  /**
   * Invalida cache relacionado a animes
   */
  invalidateAnimeCache(animeId?: number): void {
    if (animeId) {
      // Remove cache específico do anime
      this.deletePattern(new RegExp(`anime-${animeId}`));
      this.deletePattern(new RegExp(`episodes-${animeId}`));
    } else {
      // Remove todo cache de animes
      this.deletePattern(/^(animes|search|anime-\d+|episodes-\d+)/);
    }
  }

  /**
   * Verifica se uma entrada do cache ainda é válida
   */
  private isValid(entry: CacheEntry<any>): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < entry.ttl;
  }

  /**
   * Remove entradas expiradas do cache (cleanup automático)
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache) {
      if ((now - entry.timestamp) >= entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Força a limpeza de entradas expiradas
   */
  cleanup(): void {
    this.cleanupExpiredEntries();
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats(): CacheStats {
    // Calcula o tamanho aproximado em MB
    const sizeBytes = JSON.stringify([...this.cache.entries()]).length;
    const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);
    
    return {
      hits: this.hits(),
      misses: this.misses(),
      entries: this.cache.size,
      size: `${sizeMB} MB`
    };
  }

  /**
   * Obtém a taxa de hit do cache (porcentagem)
   */
  getHitRate(): number {
    const totalRequests = this.hits() + this.misses();
    return totalRequests > 0 ? (this.hits() / totalRequests) * 100 : 0;
  }

  /**
   * Cria uma chave de cache baseada nos parâmetros
   */
  createKey(prefix: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return sortedParams ? `${prefix}-${sortedParams}` : prefix;
  }

  /**
   * Configura limpeza automática do cache em intervalos
   */
  startAutoCleanup(intervalMs: number = 10 * 60 * 1000): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, intervalMs); // Padrão: 10 minutos
  }
}
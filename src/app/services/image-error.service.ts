import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';

export interface ImageUpdateRequest {
  animesId: string[];
}

export interface ImageUpdateResponse { 
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ImageErrorService {
  private readonly API_URL = 'http://localhost:3000/images';
  private readonly BATCH_DELAY = 5000; // 5 segundos de delay para agrupar erros

  // Set para armazenar IDs únicos de animes com erro de imagem
  private readonly erroredAnimeIds = new Set<string>();

  // Signal para rastrear se há uma requisição pendente
  private readonly isUpdating = signal(false);

  // Signal para rastrear quantos animes têm erro de imagem
  readonly errorCount = signal(0);

  constructor(private http: HttpClient) {
    this.setupBatchUpdate();
  }

  /**
   * Adiciona um anime ID à lista de animes com erro de imagem
   */
  reportImageError(animeId: number): void {
    const id = animeId.toString();
    const wasEmpty = this.erroredAnimeIds.size === 0;

    this.erroredAnimeIds.add(id);
    this.errorCount.set(this.erroredAnimeIds.size);

    // Se é o primeiro erro, inicia o timer para batch update
    if (wasEmpty) {
      this.scheduleBatchUpdate();
    }
  }

  /**
   * Agenda uma atualização em lote após um delay
   */
  private scheduleBatchUpdate(): void {
    setTimeout(() => {
      if (this.erroredAnimeIds.size > 0 && !this.isUpdating()) {
        this.updateImages();
      }
    }, this.BATCH_DELAY);
  }

  /**
   * Configura o sistema de batch update
   */
  private setupBatchUpdate(): void {
    // Podemos adicionar outros triggers aqui no futuro se necessário
  }

  /**
   * Faz a chamada para atualizar as imagens dos animes com erro
   */
  private updateImages(): void {
    if (this.erroredAnimeIds.size === 0 || this.isUpdating()) {
      return;
    }

    const animesId = Array.from(this.erroredAnimeIds);
    this.isUpdating.set(true);

    console.log(
      `🔄 Atualizando imagens para ${animesId.length} animes:`,
      animesId
    );

    this.sendImageUpdateRequest(animesId).subscribe({
      next: (response) => {
        console.log('✅ Imagens atualizadas com sucesso:', response);
        this.clearErroredAnimes();
      },
      error: (error) => {
        console.error('❌ Erro ao atualizar imagens:', error);
        // Mantém os IDs para tentar novamente mais tarde
      },
      complete: () => {
        this.isUpdating.set(false);

        // Se ainda há erros acumulados durante a requisição, agenda nova atualização
        if (this.erroredAnimeIds.size > 0) {
          this.scheduleBatchUpdate();
        }
      },
    });
  }

  /**
   * Faz a requisição HTTP para o endpoint de atualização
   */
  private sendImageUpdateRequest(
    animesId: string[]
  ): Observable<ImageUpdateResponse> {
    const payload: ImageUpdateRequest = { animesId };

    return this.http.post<ImageUpdateResponse>(this.API_URL, payload).pipe(
      catchError((error) => {
        console.error('❌ Erro ao atualizar imagens:', error);
        return of({
          success: false,
          updated: 0,
          message: (error as Error)?.message ?? 'Unknown error',
        });
      })
    );
  }

  /**
   * Limpa a lista de animes com erro
   */
  private clearErroredAnimes(): void {
    this.erroredAnimeIds.clear();
    this.errorCount.set(0);
  }

  /**
   * Força uma atualização imediata (útil para testes ou casos especiais)
   */
  forceUpdate(): void {
    if (this.erroredAnimeIds.size > 0) {
      this.updateImages();
    }
  }

  /**
   * Retorna o número atual de animes com erro de imagem
   */
  getErrorCount(): number {
    return this.erroredAnimeIds.size;
  }

  /**
   * Verifica se há uma atualização em andamento
   */
  isCurrentlyUpdating(): boolean {
    return this.isUpdating();
  }

  /**
   * Retorna os IDs dos animes com erro (para debug)
   */
  getErroredAnimeIds(): string[] {
    return Array.from(this.erroredAnimeIds);
  }
}

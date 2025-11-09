import { HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../services/cache.service';

/**
 * Interceptor para cache automático de requisições HTTP GET
 */
export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  const cacheService = inject(CacheService);

  // Só faz cache de requisições GET
  if (req.method !== 'GET') {
    return next(req);
  }

  // Verifica se a requisição deve ser cacheada
  if (shouldCache(req)) {
    const cacheKey = createCacheKey(req);
    const cachedResponse = cacheService.get<HttpResponse<any>>(cacheKey);

    // Retorna resposta do cache se existir
    if (cachedResponse) {
      return of(cachedResponse);
    }

    // Executa a requisição e armazena no cache
    return next(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          const ttl = getCacheTTL(req);
          cacheService.set(cacheKey, event, ttl);
        }
      })
    );
  }

  return next(req);
};

/**
 * Determina se uma requisição deve ser cacheada
 */
function shouldCache(req: HttpRequest<any>): boolean {
  // URLs que devem ser cacheadas
  const cacheablePatterns = [
    /\/rest\/v1\/animes/,
    /\/rest\/v1\/episodios/,
    /\/rest\/v1\/animes_with_latest_episode/,
    /\/rest\/v1\/episodios_por_titulo/
  ];

  // URLs que NÃO devem ser cacheadas
  const noCachePatterns = [
    /\/auth\//,
    /\/realtime\//
  ];

  // Verifica se não deve ser cacheado
  if (noCachePatterns.some(pattern => pattern.test(req.url))) {
    return false;
  }

  // Verifica se deve ser cacheado
  return cacheablePatterns.some(pattern => pattern.test(req.url));
}

/**
 * Cria uma chave única para o cache baseada na requisição
 */
function createCacheKey(req: HttpRequest<any>): string {
  const url = req.urlWithParams;
  const method = req.method;
  
  // Adiciona headers relevantes para a chave se necessário
  const relevantHeaders = ['authorization'];
  const headersPart = relevantHeaders
    .map(header => req.headers.get(header))
    .filter(value => value !== null)
    .join('|');

  return `http-${method}-${url}${headersPart ? `-${headersPart}` : ''}`;
}

/**
 * Determina o TTL (Time To Live) para diferentes tipos de requisição
 */
function getCacheTTL(req: HttpRequest<any>): number {
  // TTL baseado no tipo de endpoint
  if (req.url.includes('animes_with_latest_episode')) {
    return 1 * 60 * 1000; // 1 minuto (dados mais dinâmicos)
  }
  
  if (req.url.includes('animes') && !req.url.includes('search')) {
    return 5 * 60 * 1000; // 5 minutos (lista de animes)
  }
  
  if (req.url.includes('episodios')) {
    return 10 * 60 * 1000; // 10 minutos (episódios mudam menos)
  }
  
  if (req.url.includes('search')) {
    return 1 * 60 * 1000; // 1 minuto (resultados de busca)
  }

  // TTL padrão
  return 3 * 60 * 1000; // 3 minutos
}
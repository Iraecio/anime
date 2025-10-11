# Sistema de Cache

## Visão Geral

O sistema de cache implementado melhora significativamente a performance da aplicação ao armazenar temporariamente os resultados das requisições mais frequentes. Isso reduz a latência, diminui a carga no servidor e proporciona uma experiência mais fluida para o usuário.

## Características Principais

### 🚀 Performance
- **Cache inteligente** com TTL (Time To Live) configurável
- **Hit rate** otimizado para diferentes tipos de dados
- **Cleanup automático** de entradas expiradas
- **Pré-carregamento** opcional de dados frequentes

### 🔧 Flexibilidade
- **Cache por camada**: Interceptor HTTP + Cache de serviço
- **TTL diferenciado** por tipo de requisição
- **Invalidação seletiva** por padrões
- **Estatísticas em tempo real**

### 🛡️ Confiabilidade
- **Fallback automático** em caso de falha
- **Gerenciamento de memória** com limpeza automática
- **Validação de expiração** antes do uso
- **Tratamento de erros** robusto

## Arquitetura

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Component     │───▶│   Service    │───▶│   Supabase      │
│                 │    │              │    │   Database      │
└─────────────────┘    └──────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────┐
│ Cache Debug     │    │ Cache Service│
│ Component       │    │              │
└─────────────────┘    └──────────────┘
         │                       ▲
         └───────────────────────┘
```

## Componentes

### 1. CacheService (`cache.service.ts`)

**Responsabilidades:**
- Gerenciamento central do cache
- Validação de TTL
- Estatísticas e métricas
- Limpeza automática

**Métodos principais:**
- `getOrSet<T>()` - Obtém do cache ou executa função de busca
- `set()` - Armazena dados com TTL
- `get()` - Recupera dados do cache
- `clear()` - Limpa todo o cache
- `deletePattern()` - Remove por padrão regex
- `getStats()` - Estatísticas do cache

### 2. Cache Interceptor (`cache.interceptor.ts`)

**Responsabilidades:**
- Interceptação automática de requisições HTTP GET
- Cache transparente para o desenvolvedor
- TTL diferenciado por endpoint
- Filtragem de URLs cacheáveis

**URLs cacheadas:**
- `/rest/v1/animes*` - 5 minutos
- `/rest/v1/episodios*` - 10 minutos
- `/rest/v1/animes_with_latest_episode*` - 2 minutos
- Buscas (`search`) - 1 minuto

### 3. Supabase Service (modificado)

**Novas funcionalidades:**
- Integração com CacheService
- Métodos de invalidação específicos
- Força atualização ignorando cache
- Pré-carregamento de dados

**Métodos de cache:**
- `clearCache()` - Limpa todo o cache
- `invalidateAnimeCache()` - Invalida cache de animes
- `forceRefreshAnimes()` - Atualização forçada
- `getCacheStats()` - Estatísticas
- `preloadCache()` - Pré-carregamento

### 4. Cache Debug Component

**Funcionalidades:**
- Visualização de estatísticas em tempo real
- Controles para limpeza e pré-carregamento
- Hit rate e métricas de performance
- Interface amigável para desenvolvimento

## TTL (Time To Live) por Tipo

| Tipo de Dados | TTL | Justificativa |
|---------------|-----|---------------|
| Lista de animes | 3 min | Dados relativamente estáticos |
| Anime específico | 5 min | Detalhes mudam raramente |
| Episódios | 10 min | Dados mais estáticos |
| Resultados de busca | 1 min | Resultados podem variar |
| Latest episodes | 2 min | Dados mais dinâmicos |

## Uso

### Automático (Transparente)
O cache funciona automaticamente para todas as requisições GET do Supabase:

```typescript
// Esta chamada será automaticamente cacheada
this.supabaseService.getAnimes(1, 50).subscribe(animes => {
  // Dados podem vir do cache ou da API
});
```

### Manual (Controle Direto)
```typescript
// Força atualização ignorando cache
this.supabaseService.forceRefreshAnimes(1, 50).subscribe();

// Limpa cache específico
this.supabaseService.invalidateAnimeCache(123);

// Limpa todo cache
this.supabaseService.clearCache();

// Pré-carrega dados
this.supabaseService.preloadCache();
```

### Estatísticas
```typescript
// Obtém estatísticas do cache
const stats = this.supabaseService.getCacheStats();
console.log(`Hit rate: ${this.supabaseService.getCacheHitRate()}%`);
```

## Configuração

### TTL Personalizado
```typescript
// No CacheService, método getOrSet
const customTTL = 10 * 60 * 1000; // 10 minutos
return this.cacheService.getOrSet(
  key, 
  fetchFunction, 
  customTTL
);
```

### Interceptor - URLs Cacheáveis
```typescript
// Em cache.interceptor.ts
const cacheablePatterns = [
  /\/rest\/v1\/animes/,
  /\/rest\/v1\/episodios/,
  // Adicione novos padrões aqui
];
```

## Monitoramento

### Componente de Debug
- Disponível em desenvolvimento
- Mostra hits/misses em tempo real
- Permite limpeza manual do cache
- Exibe uso de memória

### Console Logs
```typescript
// Ativar logs detalhados (opcional)
localStorage.setItem('cache-debug', 'true');
```

## Benefícios de Performance

### Antes do Cache
```
Requisição → Supabase API → Resposta
⏱️ ~200-500ms por requisição
```

### Com Cache
```
Requisição → Cache Hit → Resposta instantânea
⏱️ ~1-5ms (98% mais rápido)
```

### Métricas Esperadas
- **Hit Rate**: 70-85% em uso normal
- **Redução de latência**: 95%+
- **Redução de requisições**: 70%+
- **Melhoria da UX**: Navegação mais fluida

## Boas Práticas

### 1. Invalidação Estratégica
```typescript
// Ao criar/editar/deletar dados
onAnimeUpdated(animeId: number) {
  this.supabaseService.invalidateAnimeCache(animeId);
  // Recarrega dados atualizados
  this.loadAnime(animeId);
}
```

### 2. Pré-carregamento
```typescript
// No início da aplicação
ngOnInit() {
  // Carrega dados críticos no cache
  this.supabaseService.preloadCache();
}
```

### 3. Monitoramento
```typescript
// Verifica performance regularmente
const hitRate = this.supabaseService.getCacheHitRate();
if (hitRate < 60) {
  console.warn('Cache hit rate baixo:', hitRate);
}
```

## Troubleshooting

### Cache não está funcionando
1. Verifique se o interceptor está registrado em `app.config.ts`
2. Confirme se as URLs estão nos padrões cacheáveis
3. Verifique TTL e expiração

### Dados desatualizados
1. Use `forceRefresh()` para atualização manual
2. Ajuste TTL se necessário
3. Implemente invalidação automática em mutations

### Performance baixa
1. Monitore hit rate no debug component
2. Ajuste TTL por tipo de dado
3. Considere pré-carregamento de dados críticos

## Roadmap Futuro

- [ ] **Cache persistente** com IndexedDB
- [ ] **Cache distribuído** para PWA
- [ ] **Compressão** de dados grandes
- [ ] **Cache de imagens** com Service Worker
- [ ] **Analytics** detalhados de cache
- [ ] **A/B testing** de estratégias de cache
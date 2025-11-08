# Sistema de Atualização Automática de Imagens

## Implementação Completa

O sistema foi implementado para detectar automaticamente imagens quebradas e solicitar atualizações ao backend em lotes, otimizando as chamadas de API.

## Arquivos Criados/Modificados

### 1. Novo Serviço: `ImageErrorService`
**Localização:** `src/app/services/image-error.service.ts`

**Funcionalidades:**
- ✅ Coleta IDs de animes com imagens quebradas
- ✅ Agrupa erros em lotes para evitar múltiplas chamadas
- ✅ Delay de 5 segundos para consolidar erros
- ✅ Chamada única para o endpoint `POST /images`
- ✅ Gerenciamento de estado com signals
- ✅ Retry automático em caso de erro

### 2. Componente Atualizado: `AnimeCard`
**Localização:** `src/app/pages/home/components/anime-card/anime-card.ts`

**Modificações:**
- ✅ Importa o `ImageErrorService`
- ✅ Injeta o serviço no construtor
- ✅ Atualiza `getImageErrorSrc()` para reportar erros

### 3. Componente de Debug (Opcional)
**Localização:** `src/app/components/image-error-debug.component.ts`

**Funcionalidades:**
- ✅ Monitor visual dos erros acumulados
- ✅ Status de atualização em tempo real
- ✅ Botão para forçar atualização
- ✅ Lista de IDs com problema

## Como Funciona

### Fluxo de Detecção e Atualização

1. **Detecção de Erro:**
   ```html
   <img 
     [src]="anime().thumb" 
     (error)="$event.target.src = getImageErrorSrc()"
   />
   ```

2. **Coleta de IDs:**
   ```typescript
   getImageErrorSrc(): string {
     // Reporta o erro automaticamente
     this.imageErrorService.reportImageError(anime.id);
     return 'data:image/svg+xml;base64,...'; // Imagem placeholder
   }
   ```

3. **Agrupamento em Lote:**
   - Sistema aguarda 5 segundos para coletar todos os erros
   - Evita múltiplas chamadas simultâneas
   - Agrupa todos os IDs em uma única requisição

4. **Chamada para API:**
   ```typescript
   POST http://localhost:3000/images
   Content-Type: application/json

   {
     "animesId": ["1", "2", "3", "15", "42"]
   }
   ```

### API do Serviço

```typescript
// Reportar erro de imagem (usado automaticamente)
imageErrorService.reportImageError(animeId: number): void

// Forçar atualização imediata (para casos especiais)
imageErrorService.forceUpdate(): void

// Verificar quantidade de erros
imageErrorService.getErrorCount(): number

// Verificar se está atualizando
imageErrorService.isCurrentlyUpdating(): boolean

// Debug: ver IDs com erro
imageErrorService.getErroredAnimeIds(): string[]
```

## Configurações

### Delay de Batch (padrão: 5 segundos)
```typescript
private readonly BATCH_DELAY = 5000; // Alterar se necessário
```

### URL da API (padrão: localhost:3000)
```typescript
private readonly API_URL = 'http://localhost:3000/images';
```

## Testing

### 1. Ativar Debug (Temporário)
O componente de debug está incluído em `app.html` e mostra:
- Quantidade de animes com erro
- Status de atualização
- Lista de IDs problemáticos
- Botão de força atualização

### 2. Simular Erros
Para testar, você pode:
- Modificar URLs de imagem temporariamente
- Usar Network tab do DevTools para bloquear imagens
- Monitorar console para logs do serviço

### 3. Verificar Chamadas de API
- Abra DevTools > Network
- Filtre por método POST
- Observe chamadas para `/images` com payload de IDs

## Logs do Console

O serviço produz logs informativos:

```
🔄 Atualizando imagens para 5 animes: ["1", "2", "3", "15", "42"]
✅ Imagens atualizadas com sucesso: { success: true, updated: 5 }
```

## Performance e Otimizações

1. **Debounce de 5s:** Evita spam de requisições
2. **Set para IDs únicos:** Previne duplicatas
3. **Signals reativas:** UI atualiza automaticamente
4. **Lazy loading:** Imagens carregam conforme necessário
5. **Error boundaries:** Falhas não quebram a aplicação

## Próximos Passos

1. **Remover debug:** Após testes, remover `<app-image-error-debug />` do `app.html`
2. **Configurar ambiente:** Ajustar URL da API para produção
3. **Monitoramento:** Adicionar métricas de sucesso/erro
4. **Cache:** Evitar re-reportar mesmos erros após atualização

## Estrutura Final

```
src/app/
├── services/
│   └── image-error.service.ts          (Novo - Gerencia erros e atualizações)
├── components/
│   └── image-error-debug.component.ts  (Novo - Debug temporário)
├── pages/home/components/anime-card/
│   └── anime-card.ts                   (Modificado - Integra com serviço)
└── app.ts                              (Modificado - Inclui debug)
```

## Benefícios

✅ **Automático:** Zero intervenção manual
✅ **Eficiente:** Chamadas em lote otimizadas
✅ **Resiliente:** Retry em caso de falha
✅ **Monitorável:** Debug visual incluído
✅ **Performático:** Não impacta UX negativamente
✅ **Escalável:** Funciona com qualquer volume de imagens
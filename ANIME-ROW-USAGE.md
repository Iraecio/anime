# Como usar o componente anime-row

## ✅ TOTALMENTE REESCRITO: Classes Bootstrap + Botões Inteligentes

O componente agora:
- 🎯 **USA AS MESMAS CLASSES** da home page: `col-6 col-sm-4 col-md-3 col-lg-2 col-xl-2`
- 🔘 **Botões inteligentes**: aparecem APENAS quando há conteúdo escondido
- 📏 **Sem espaços desnecessários**: início e fim sem padding extra
- 🎨 **100% Bootstrap**: CSS mínimo, máximo aproveitamento das classes

## Exemplo de uso no template HTML:

```html
<!-- Exemplo de uso do anime-row com diferentes categorias -->

<!-- Seção de animes recentes -->
@if (recentAnimes().length > 0) {
<app-anime-row
  title="Recém Adicionados"
  [animes]="recentAnimes()"
  [showTitle]="true"
  (onAnimeClick)="handleAnimeCardClick($event)"
  (onEpisodeClick)="handleEpisodeClick($event)"
  (onAdultContentToggle)="handleAdultContentToggle($event)">
</app-anime-row>
}

<!-- Seção de animes de ação -->
@if (actionAnimes().length > 0) {
<app-anime-row
  title="Animes de Ação"
  [animes]="actionAnimes()"
  [showTitle]="true"
  (onAnimeClick)="handleAnimeCardClick($event)"
  (onEpisodeClick)="handleEpisodeClick($event)"
  (onAdultContentToggle)="handleAdultContentToggle($event)">
</app-anime-row>
}

<!-- Seção de romance -->
@if (romanceAnimes().length > 0) {
<app-anime-row
  title="Romance"
  [animes]="romanceAnimes()"
  [showTitle]="true"
  (onAnimeClick)="handleAnimeCardClick($event)"
  (onEpisodeClick)="handleEpisodeClick($event)"
  (onAdultContentToggle)="handleAdultContentToggle($event)">
</app-anime-row>
}

<!-- Seção de animes completos -->
@if (completedAnimes().length > 0) {
<app-anime-row
  title="Séries Completas"
  [animes]="completedAnimes()"
  [showTitle]="true"
  (onAnimeClick)="handleAnimeCardClick($event)"
  (onEpisodeClick)="handleEpisodeClick($event)"
  (onAdultContentToggle)="handleAdultContentToggle($event)">
</app-anime-row>
}

<!-- Seção de animes em andamento -->
@if (ongoingAnimes().length > 0) {
<app-anime-row
  title="Em Andamento"
  [animes]="ongoingAnimes()"
  [showTitle]="true"
  (onAnimeClick)="handleAnimeCardClick($event)"
  (onEpisodeClick)="handleEpisodeClick($event)"
  (onAdultContentToggle)="handleAdultContentToggle($event)">
</app-anime-row>
}
```

## Propriedades do componente:

### Inputs
- `title` (required): Título da seção
- `animes` (required): Array de animes para exibir
- `showTitle` (optional, default: true): Se deve mostrar o título da seção

### Outputs
- `onAnimeClick`: Evento emitido quando um anime é clicado
- `onEpisodeClick`: Evento emitido quando um episódio é clicado  
- `onAdultContentToggle`: Evento emitido quando conteúdo adulto é revelado

## Computed properties necessárias no componente TypeScript:

```typescript
// Computed properties para categorizar animes em rows
readonly recentAnimes = computed(() => {
  return this.animes().slice(0, 12); // Primeiros 12 animes
});

readonly actionAnimes = computed(() => {
  return this.animes().filter(anime => 
    anime.generos?.some(genre => genre.toLowerCase().includes('action') || genre.toLowerCase().includes('ação'))
  ).slice(0, 12);
});

readonly romanceAnimes = computed(() => {
  return this.animes().filter(anime => 
    anime.generos?.some(genre => genre.toLowerCase().includes('romance'))
  ).slice(0, 12);
});

readonly completedAnimes = computed(() => {
  return this.animes().filter(anime => anime.status === 'completed').slice(0, 12);
});

readonly ongoingAnimes = computed(() => {
  return this.animes().filter(anime => anime.status === 'ongoing').slice(0, 12);
});
```

## Funcionalidades:

1. **Scroll horizontal**: Botões de navegação prev/next
2. **Responsivo**: Mesmos breakpoints da home page (Bootstrap grid)
3. **Tamanhos consistentes**: Cards idênticos aos da home page
4. **Estados visuais**: Botões desabilitados quando não há mais conteúdo para scroll
5. **Animações**: Transições suaves e animações de entrada
6. **Acessibilidade**: Labels apropriados e suporte a teclado
7. **Reutilizável**: Pode ser usado em qualquer parte da aplicação

## Breakpoints e Tamanhos (IDÊNTICOS à home):

| Breakpoint | Classes Bootstrap | Cards visíveis | Comportamento dos Botões |
|------------|-------------------|----------------|---------------------------|
| xl (1200px+) | `col-xl-2` | 6 por linha | Scroll 80% da largura |
| lg (992-1199px) | `col-lg-2` | 6 por linha | Scroll 80% da largura |
| md (768-991px) | `col-md-3` | 4 por linha | Scroll 80% da largura |
| sm (576-767px) | `col-sm-4` | 3 por linha | Scroll 80% da largura |
| xs (<576px) | `col-6` | 2 por linha | Scroll 80% da largura |

## Lógica dos Botões:

- ✅ **Botão LEFT**: Aparece APENAS quando scrollou para direita (conteúdo oculto à esquerda)
- ✅ **Botão RIGHT**: Aparece APENAS quando há conteúdo oculto à direita
- ✅ **Responsivo**: Se redimensionar janela, botões se atualizam automaticamente
- ✅ **Sem flickering**: 5px de margem para evitar piscar

## Uso alternativo sem título:

```html
<app-anime-row
  title="Categoria Especial"
  [animes]="specialAnimes()"
  [showTitle]="false"
  (onAnimeClick)="handleAnimeCardClick($event)">
</app-anime-row>
```
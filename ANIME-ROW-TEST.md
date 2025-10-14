# Componente AnimeRow - Teste com Bootstrap

## 🚀 Versão Atualizada - Bootstrap Classes + Botões Inteligentes

Para testar o componente totalmente reescrito:

```html
<!-- Teste do anime-row com Bootstrap classes -->
@if (animes().length > 0) {
<app-anime-row
  title="🔥 Cards Idênticos à Home"
  [animes]="animes().slice(0, 25)"
  [showTitle]="true"
  (onAnimeClick)="handleAnimeCardClick($event)"
  (onEpisodeClick)="handleEpisodeClick($event)"
  (onAdultContentToggle)="handleAdultContentToggle($event)">
</app-anime-row>
}

<!-- Teste com mais animes para ver scroll -->
@if (animes().length > 25) {
<app-anime-row
  title="📺 Scroll Horizontal Testado"
  [animes]="animes()"
  [showTitle]="true"
  (onAnimeClick)="handleAnimeCardClick($event)">
</app-anime-row>
}
```

## Como testar:

1. **Adicione o import** no `home.ts` (já foi feito):
```typescript
import { AnimeRow } from '../../components/anime-row/anime-row';

@Component({
  imports: [AnimeRow, ...outros]
})
```

2. **Cole o código HTML** acima no final do template da home (antes do fechamento da div principal)

3. **Execute o projeto**:
```bash
npm start
```

4. **Verifique os comportamentos**:
   - ✅ **Cards IDÊNTICOS** à home (mesmas classes Bootstrap)
   - ✅ **Botão LEFT**: aparece APENAS após scrollar para direita
   - ✅ **Botão RIGHT**: aparece APENAS quando há conteúdo oculto
   - ✅ **Scroll suave**: 80% da largura visível por vez
   - ✅ **Sem espaços desnecessários**: conteúdo encosta nas bordas
   - ✅ **Responsivo**: redimensione a janela e veja os botões se adaptarem

## Teste Específico dos Botões:

1. **Início**: Apenas botão RIGHT visível
2. **Scroll para direita**: Aparece botão LEFT
3. **Meio**: Ambos os botões visíveis  
4. **Final**: Apenas botão LEFT visível
5. **Redimensionar janela**: Botões se adaptam automaticamente

## Classes Bootstrap Utilizadas:

- `container-fluid px-0 mb-4`: Container principal
- `row mx-0 mb-3` + `col px-3`: Header do título  
- `btn btn-dark rounded-circle`: Botões de navegação
- `position-absolute`: Posicionamento dos botões
- `overflow-auto`: Scroll horizontal
- `row flex-nowrap mx-0 g-3`: Row dos cards
- `col-6 col-sm-4 col-md-3 col-lg-2 col-xl-2 flex-shrink-0`: **MESMAS CLASSES DA HOME**
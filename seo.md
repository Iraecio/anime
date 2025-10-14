# SEO para Site de Anime - Estratégias de Otimização

## 📊 Análise do Projeto Atual

Com base na estrutura do projeto Angular, temos uma Single Page Application (SPA) que precisa de otimizações específicas para SEO.

## 🎯 Estratégias Gerais de SEO

### 1. **Server Side Rendering (SSR)**
```bash
ng add @nguniversal/express-engine
```
- Implementar Angular Universal para renderização no servidor
- Melhora drasticamente o crawling pelos bots de busca
- Reduz o tempo de First Contentful Paint (FCP)

### 2. **Meta Tags Dinâmicas**
```typescript
// Implementar no componente de cada página
constructor(private meta: Meta, private title: Title) {}

setMetaTags(anime: Anime) {
  this.title.setTitle(`${anime.title} - Assista Online`);
  this.meta.updateTag({ name: 'description', content: anime.synopsis });
  this.meta.updateTag({ property: 'og:title', content: anime.title });
  this.meta.updateTag({ property: 'og:image', content: anime.image });
}
```

### 3. **Estrutura de URLs Amigáveis**
- ✅ `/anime/naruto-shippuden`
- ❌ `/anime?id=123`
- ✅ `/episodio/naruto-shippuden-episode-1`
- ❌ `/player?anime=123&ep=1`

## 🔍 Palavras-Chave Estratégicas

### **Primárias (Alto Volume)**
- "assistir anime online"
- "anime dublado"
- "anime legendado"
- "animes completos"

### **Long Tail (Conversão Alta)**
- "assistir [nome do anime] dublado online"
- "onde assistir [nome do anime] legendado"
- "[nome do anime] todos os episódios"
- "anime [gênero] online grátis"

### **Específicas por Anime**
- Nome do anime + "assistir online"
- Nome do anime + "episódios"
- Nome do anime + "temporadas"
- Nome do anime + "dublado/legendado"

## 📄 Otimização de Conteúdo

### 1. **Página Home**
```html
<!-- Title otimizado -->
<title>Assistir Anime Online - [Nome do Site] | Dublado e Legendado</title>

<!-- Meta description -->
<meta name="description" content="Assista aos melhores animes online grátis, dublado e legendado. Naruto, One Piece, Attack on Titan e muito mais!">
```

### 2. **Páginas de Anime Individual**
- **Title**: "[Nome do Anime] - Assistir Online Dublado/Legendado"
- **H1**: Nome do anime
- **H2**: Sinopse, Episódios, Informações
- **Alt text** nas imagens: "Assistir [Nome do Anime] online"

### 3. **Páginas de Episódios**
- **Title**: "[Nome do Anime] Episódio X - Assistir Online"
- **Description**: Resumo do episódio + call-to-action

## 🏗️ Estrutura Técnica

### 1. **Schema Markup (JSON-LD)**
```json
{
  "@context": "https://schema.org",
  "@type": "TVSeries",
  "name": "Nome do Anime",
  "description": "Sinopse do anime",
  "genre": ["Ação", "Aventura"],
  "numberOfSeasons": 1,
  "numberOfEpisodes": 24,
  "image": "url_da_imagem",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": 4.8,
    "reviewCount": 1000
  }
}
```

### 2. **Sitemap XML Dinâmico**
```typescript
// Gerar sitemap automaticamente
generateSitemap() {
  const urls = [
    { loc: '/', priority: 1.0 },
    ...animes.map(anime => ({
      loc: `/anime/${anime.slug}`,
      priority: 0.8,
      lastmod: anime.updatedAt
    }))
  ];
}
```

### 3. **Robots.txt Otimizado**
```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: https://seusite.com/sitemap.xml
```

## 📱 Core Web Vitals

### 1. **Largest Contentful Paint (LCP)**
- Implementar `NgOptimizedImage` para imagens dos animes
- Lazy loading para cards de anime
- Preload de recursos críticos

### 2. **First Input Delay (FID)**
- Code splitting por rotas
- Lazy loading de componentes pesados
- Service Workers para cache

### 3. **Cumulative Layout Shift (CLS)**
- Definir dimensions fixas para imagens
- Skeleton loaders durante carregamento
- Evitar inserção de conteúdo dinâmico

## 🔗 Link Building Estratégico

### 1. **Conteúdo Linkável**
- Top 10 animes por gênero
- Reviews detalhadas de animes
- Guias de ordem de assistir séries
- Notícias sobre lançamentos

### 2. **Parcerias**
- Sites de review de anime
- Canais do YouTube sobre anime
- Fóruns e comunidades (Reddit, Discord)
- Blogs especializados

### 3. **Guest Posts**
- "Os 10 melhores animes de 2024"
- "Guia completo para iniciantes em anime"
- "Animes que todo otaku deve assistir"

## 📈 Estratégias de Conteúdo

### 1. **Blog Interno**
- Reviews de episódios semanais
- Análises de temporadas
- Comparações entre animes
- Teorias e especulações

### 2. **Páginas de Categoria**
- `/genero/acao` - Animes de ação
- `/genero/romance` - Animes de romance
- `/ano/2024` - Animes de 2024
- `/status/em-andamento` - Animes em andamento

### 3. **Conteúdo Sazonal**
- "Animes da temporada de [Primavera/Verão/Outono/Inverno]"
- "Lançamentos mais esperados de [mês]"
- "Animes que terminaram em [mês]"

## 🛠️ Ferramentas de Monitoramento

### 1. **Google Tools**
- Google Search Console
- Google Analytics 4
- Google PageSpeed Insights
- Mobile-Friendly Test

### 2. **SEO Tools**
- Ahrefs (análise de concorrentes)
- SEMrush (pesquisa de palavras-chave)
- Screaming Frog (auditoria técnica)

### 3. **Performance**
- Lighthouse CI
- GTmetrix
- WebPageTest

## 🎮 Otimizações Específicas para Anime

### 1. **Busca por Personagens**
- Páginas dedicadas a personagens populares
- "Personagens de [Nome do Anime]"
- "Melhores personagens masculinos/femininos"

### 2. **Episódios Especiais**
- OVAs, filmes, especiais
- "Ordem cronológica de [Nome do Anime]"
- "Filmes de [Nome do Anime] para assistir"

### 3. **Comparações**
- "Naruto vs One Piece"
- "Melhores animes como Attack on Titan"
- "Animes similares a [Nome Popular]"

## 🚀 Implementação Prioritária

### **Fase 1 (Imediata)**
1. Implementar meta tags dinâmicas
2. Otimizar URLs e estrutura de rotas
3. Adicionar Schema Markup básico
4. Criar sitemap XML

### **Fase 2 (1-2 meses)**
1. Implementar SSR com Angular Universal
2. Otimizar Core Web Vitals
3. Criar conteúdo de blog
4. Configurar Google Search Console

### **Fase 3 (3-6 meses)**
1. Estratégia de link building
2. Expansão de conteúdo
3. Otimizações avançadas
4. Análise de concorrentes

## 📊 KPIs para Monitorar

- **Tráfego Orgânico**: Crescimento mês a mês
- **Rankings**: Posições das palavras-chave principais
- **CTR**: Taxa de clique nos resultados de busca
- **Core Web Vitals**: LCP, FID, CLS
- **Páginas Indexadas**: Cobertura do sitemap
- **Backlinks**: Quantity e qualidade dos links

---

## 💡 Dicas Extras

1. **Mobile First**: 70% do tráfego de anime vem de mobile
2. **Velocidade**: Sites de streaming precisam ser rápidos
3. **UX**: Facilite a navegação entre episódios
4. **Social Proof**: Reviews e ratings dos usuários
5. **Freshness**: Conteúdo atualizado regularmente

## ⚠️ Cuidados Legais

- Sempre verificar direitos autorais
- Usar disclaimers apropriados
- Considerar implementar sistema de DMCA
- Política de privacidade e termos de uso claros
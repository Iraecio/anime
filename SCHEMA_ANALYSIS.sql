-- ========================================
-- ANÁLISE DO SCHEMA E COMPATIBILIDADE DE TIPOS
-- ========================================
-- Baseado no arquivo SCHEMA.sql fornecido
-- ========================================

-- TIPOS REAIS DO BANCO DE DADOS (baseado no schema):

-- TABELA: animes
-- - id: integer (NOT NULL, auto-increment)
-- - titulo: character varying (NOT NULL)
-- - status: character varying (com CHECK constraint)
-- - criado_em: timestamp without time zone
-- - atualizado_em: timestamp without time zone
-- - thumb: text
-- - slug: text
-- - dublado: boolean (DEFAULT false)
-- - link_original: character varying (NOT NULL, UNIQUE)
-- - ano: text ⚠️ IMPORTANTE: É TEXT, não INTEGER!

-- TABELA: animes_generos
-- - anime_id: bigint (NOT NULL)
-- - genero_id: bigint (NOT NULL)

-- TABELA: episodios
-- - id: integer (NOT NULL, auto-increment)
-- - numero: integer (NOT NULL)
-- - link_video: text (UNIQUE)
-- - criado_em: timestamp without time zone ⚠️ IMPORTANTE: Sem timezone!
-- - anime_id: integer (NOT NULL, FK)
-- - link_original: character varying (UNIQUE)

-- TABELA: generos
-- - id: bigint (NOT NULL, auto-increment)
-- - nome: character varying (NOT NULL, UNIQUE)
-- - criado_em: timestamp without time zone
-- - atualizado_em: timestamp without time zone

-- ========================================
-- AJUSTES FEITOS NA MIGRAÇÃO:
-- ========================================

-- 1. Campo 'ano' mantido como TEXT (não convertido para INTEGER)
-- 2. Campo 'titulo' cast para TEXT (de character varying)
-- 3. Campo 'link_original' cast para TEXT (de character varying)
-- 4. Campo 'criado_em' mantido como TIMESTAMP WITHOUT TIME ZONE
-- 5. Parâmetros das funções ajustados para aceitar ano como TEXT
-- 6. Relacionamentos com tipos corretos (bigint para IDs de gêneros)

-- ========================================
-- TESTES DE COMPATIBILIDADE:
-- ========================================

-- Teste 1: Verificar tipos da view
SELECT 
  pg_typeof(id) as tipo_id,           -- Deve ser integer
  pg_typeof(titulo) as tipo_titulo,   -- Deve ser text
  pg_typeof(ano) as tipo_ano,         -- Deve ser text
  pg_typeof(thumb) as tipo_thumb,     -- Deve ser text
  pg_typeof(slug) as tipo_slug,       -- Deve ser text
  pg_typeof(dublado) as tipo_dublado, -- Deve ser boolean
  pg_typeof(generos_array) as tipo_generos_array, -- Deve ser text[]
  pg_typeof(audio_types) as tipo_audio_types      -- Deve ser text[]
FROM animes_search_filtered 
LIMIT 1;

-- Teste 2: Busca por ano (como TEXT)
SELECT titulo, ano, dublado 
FROM search_animes_filtered(NULL, NULL, NULL, '2023', 5, 0);

-- Teste 3: Busca por gêneros
SELECT titulo, generos_array 
FROM search_animes_filtered(NULL, NULL, ARRAY['Ação', 'Aventura'], NULL, 5, 0);

-- ========================================
-- IMPORTANTE PARA O FRONTEND (Angular):
-- ========================================

-- No TypeScript, o campo 'ano' deve ser tratado como string, não number:
-- 
-- interface AnimeSearchResult {
--   id: number;
--   titulo: string;
--   ano: string;        // ⚠️ STRING, não number!
--   thumb: string;
--   slug: string;
--   dublado: boolean;
--   legendado: boolean;
--   // ... outros campos
-- }
--
-- No SearchComponent, o filtro de ano deve enviar string:
-- setYear(year: string) {
--   this.searchFilters.update(filters => ({
--     ...filters,
--     year: year || null
--   }));
-- }
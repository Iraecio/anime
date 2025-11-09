-- ========================================
-- MIGRAÇÃO CORRIGIDA: Sistema de Busca com Filtros
-- ========================================
-- Data: 2024-11-09 (Versão Corrigida)
-- Fix: Resolvido problema de tipos de arrays no Supabase
-- Recursos: dublado/legendado, gêneros, ano, busca por texto
-- ========================================

-- ========================================
-- 1. VIEW PARA BUSCA COM FILTROS (CORRIGIDA)
-- ========================================

-- Remove view anterior se existir
DROP VIEW IF EXISTS animes_search_filtered CASCADE;

CREATE VIEW animes_search_filtered 
WITH (security_invoker = true) AS
SELECT 
  MIN(a.id)::INTEGER AS id,      -- id representativo (integer)
  a.titulo::TEXT,                -- título como TEXT (cast explícito)
  MAX(a.ano) AS ano,             -- ano mantido como TEXT (schema original)
  MAX(a.thumb) AS thumb,         -- thumbnail (text no schema)
  MAX(a.slug) AS slug,           -- slug (text no schema)
  BOOL_OR(a.dublado) AS dublado, -- se tem versão dublada
  -- Determina se é legendado (se não for dublado ou se tem ambos)
  CASE 
    WHEN BOOL_OR(a.dublado) AND COUNT(DISTINCT a.dublado) > 1 THEN true  -- tem ambos
    WHEN NOT BOOL_OR(a.dublado) THEN true                                 -- só legendado
    ELSE BOOL_OR(NOT a.dublado)                                          -- verifica se tem legendado
  END AS legendado,
  MAX(a.link_original) AS link_original,  -- character varying no schema
  MAX(e.criado_em)::TIMESTAMP WITHOUT TIME ZONE AS ultimo_episodio_criado_em,
  COUNT(e.id) AS total_episodios,
  -- Array de gêneros para filtros (CORRIGIDO: cast para text)
  COALESCE(
    ARRAY_AGG(DISTINCT g.nome::text) FILTER (WHERE g.nome IS NOT NULL),
    ARRAY[]::text[]
  ) AS generos_array,
  -- JSON de gêneros (compatibilidade com view anterior)
  COALESCE(
    JSON_AGG(DISTINCT g.nome) FILTER (WHERE g.nome IS NOT NULL),
    '[]'::json
  ) AS generos,
  -- Campos para busca textual (título em lowercase para pesquisa case-insensitive)
  LOWER(a.titulo) AS titulo_lower,
  -- Tags de áudio para filtros (MANTIDO como text array)
  CASE 
    WHEN BOOL_OR(a.dublado) AND (COUNT(DISTINCT a.dublado) > 1 OR NOT BOOL_OR(a.dublado)) 
      THEN ARRAY['dublado', 'legendado']::text[]
    WHEN BOOL_OR(a.dublado) 
      THEN ARRAY['dublado']::text[]
    ELSE ARRAY['legendado']::text[]
  END AS audio_types
FROM animes a
INNER JOIN episodios e ON a.id = e.anime_id
LEFT JOIN animes_generos ag ON a.id = ag.anime_id  
LEFT JOIN generos g ON ag.genero_id = g.id
GROUP BY a.titulo
-- Ordena por último episódio criado (mais recentes primeiro)
ORDER BY ultimo_episodio_criado_em DESC;

-- ========================================
-- 2. FUNÇÃO DE BUSCA COM FILTROS (CORRIGIDA)
-- ========================================

CREATE OR REPLACE FUNCTION search_animes_filtered(
  p_query TEXT DEFAULT NULL,              -- Busca por título (opcional)
  p_audio_types TEXT[] DEFAULT NULL,      -- Array de tipos de áudio: ['dublado', 'legendado'] (opcional)
  p_genres TEXT[] DEFAULT NULL,           -- Array de gêneros (opcional)  
  p_year TEXT DEFAULT NULL,               -- Ano específico como TEXT (compatível com schema)
  p_limit INTEGER DEFAULT 50,             -- Limite de resultados
  p_offset INTEGER DEFAULT 0              -- Offset para paginação
)
RETURNS TABLE(
  id INTEGER,
  titulo TEXT,
  ano TEXT,
  thumb TEXT,
  slug TEXT,
  dublado BOOLEAN,
  legendado BOOLEAN,
  link_original TEXT,
  ultimo_episodio_criado_em TIMESTAMP WITHOUT TIME ZONE,
  total_episodios BIGINT,
  generos JSON,
  generos_array TEXT[],
  audio_types TEXT[]
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    asf.id,
    asf.titulo::TEXT,
    asf.ano,
    asf.thumb,
    asf.slug,
    asf.dublado,
    asf.legendado,
    asf.link_original::TEXT,
    asf.ultimo_episodio_criado_em::TIMESTAMP WITHOUT TIME ZONE,
    asf.total_episodios,
    asf.generos,
    asf.generos_array,
    asf.audio_types
  FROM animes_search_filtered asf
  WHERE 
    -- Filtro por texto (busca case-insensitive no título)
    (p_query IS NULL OR asf.titulo_lower LIKE '%' || LOWER(p_query) || '%')
    
    -- Filtro por tipos de áudio (CORRIGIDO: cast explícito)
    AND (
      p_audio_types IS NULL 
      OR p_audio_types = ARRAY[]::TEXT[]
      OR asf.audio_types && p_audio_types  -- Interseção de arrays
    )
    
    -- Filtro por gêneros (CORRIGIDO: cast explícito)
    AND (
      p_genres IS NULL 
      OR p_genres = ARRAY[]::TEXT[]
      OR asf.generos_array && p_genres     -- Interseção de arrays
    )
    
    -- Filtro por ano (CORRIGIDO: tipos garantidos)
    AND (p_year IS NULL OR asf.ano = p_year)
    
  ORDER BY asf.ultimo_episodio_criado_em DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ========================================
-- 3. FUNÇÃO DE CONTAGEM PARA PAGINAÇÃO (CORRIGIDA)
-- ========================================

CREATE OR REPLACE FUNCTION count_animes_filtered(
  p_query TEXT DEFAULT NULL,              -- Busca por título (opcional)
  p_audio_types TEXT[] DEFAULT NULL,      -- Array de tipos de áudio (opcional)
  p_genres TEXT[] DEFAULT NULL,           -- Array de gêneros (opcional)  
  p_year TEXT DEFAULT NULL                -- Ano específico como TEXT (compatível com schema)
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  total_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO total_count
  FROM animes_search_filtered asf
  WHERE 
    -- Filtro por texto (busca case-insensitive no título)
    (p_query IS NULL OR asf.titulo_lower LIKE '%' || LOWER(p_query) || '%')
    
    -- Filtro por tipos de áudio (CORRIGIDO: cast explícito)
    AND (
      p_audio_types IS NULL 
      OR p_audio_types = ARRAY[]::TEXT[]
      OR asf.audio_types && p_audio_types  -- Interseção de arrays
    )
    
        -- Filtro por gêneros (CORRIGIDO: cast explícito)
    AND (
      p_genres IS NULL 
      OR p_genres = ARRAY[]::TEXT[]
      OR asf.generos_array && p_genres     -- Interseção de arrays
    )
    
    -- Filtro por ano (CORRIGIDO: tipos garantidos)
    AND (p_year IS NULL OR asf.ano = p_year);
    
  RETURN total_count;
END;
$$;

-- ========================================
-- 4. ÍNDICES PARA PERFORMANCE
-- ========================================

-- Índice para busca por título (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_animes_titulo_lower 
ON animes (LOWER(titulo));

-- Índice para busca por ano
CREATE INDEX IF NOT EXISTS idx_animes_ano 
ON animes (ano);

-- Índice para filtro dublado/legendado
CREATE INDEX IF NOT EXISTS idx_animes_dublado 
ON animes (dublado);

-- Índice composto para episódios (ordenação por data)
CREATE INDEX IF NOT EXISTS idx_episodios_anime_criado 
ON episodios (anime_id, criado_em DESC);

-- Índice para relação animes-gêneros
CREATE INDEX IF NOT EXISTS idx_animes_generos_anime_id 
ON animes_generos (anime_id);

CREATE INDEX IF NOT EXISTS idx_animes_generos_genero_id 
ON animes_generos (genero_id);

-- ========================================
-- 5. COMENTÁRIOS DE DOCUMENTAÇÃO
-- ========================================

COMMENT ON VIEW animes_search_filtered IS 
'View otimizada para busca de animes com suporte a filtros múltiplos: texto, áudio, gêneros e ano. Inclui todos os gêneros - filtros controlados pelo usuário. CORRIGIDA para compatibilidade com Supabase.';

COMMENT ON FUNCTION search_animes_filtered IS 
'Função para busca de animes com filtros. Suporta busca por texto, tipo de áudio, gêneros e ano com paginação. CORRIGIDA para tipos de arrays.';

COMMENT ON FUNCTION count_animes_filtered IS 
'Função para contar total de animes que atendem aos filtros especificados. Útil para paginação. CORRIGIDA para tipos de arrays.';

-- ========================================
-- 6. TESTE BÁSICO DA IMPLEMENTAÇÃO
-- ========================================

-- Teste rápido para verificar se tudo está funcionando
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  -- Testa a view
  SELECT COUNT(*) INTO test_count FROM animes_search_filtered;
  RAISE NOTICE 'View animes_search_filtered criada com sucesso. Total de registros: %', test_count;
  
  -- Testa a função de busca (teste mais simples primeiro)
  SELECT COUNT(*) INTO test_count FROM search_animes_filtered(NULL, NULL, NULL, NULL, 5, 0);
  RAISE NOTICE 'Função search_animes_filtered testada com sucesso. Registros retornados: %', test_count;
  
  -- Testa a função de contagem
  test_count := count_animes_filtered();
  RAISE NOTICE 'Função count_animes_filtered testada com sucesso. Total de animes: %', test_count;
  
  -- Teste com filtro simples
  SELECT COUNT(*) INTO test_count FROM search_animes_filtered('anime', NULL, NULL, NULL, 10, 0);
  RAISE NOTICE 'Teste de busca por texto concluído. Animes encontrados: %', test_count;
  
  RAISE NOTICE '✅ Migração CORRIGIDA concluída com sucesso! 🎉';
  RAISE NOTICE '📊 Sistema pronto para uso com filtros de texto, áudio, gêneros e ano!';
END $$;
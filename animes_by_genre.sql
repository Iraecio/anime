-- View para filtrar animes por gênero específico
-- Baseada na estrutura da view animes_with_latest_episode
-- Permite filtrar por qualquer gênero sem limite de resultados
DROP VIEW IF EXISTS animes_by_genre;

CREATE VIEW animes_by_genre 
WITH (security_invoker = true) AS
SELECT 
  MIN(a.id) AS id,               -- id representativo
  a.titulo,
  MAX(a.ano) AS ano,             -- pega algum ano
  MAX(a.thumb) AS thumb,         -- pega alguma thumb
  MAX(a.slug) AS slug,           -- pega algum slug
  BOOL_OR(a.dublado) AS dublado, -- se algum for dublado, retorna true
  MAX(a.link_original) AS link_original,
  MAX(e.criado_em) AS ultimo_episodio_criado_em,
  COUNT(e.id) AS total_episodios,
  COALESCE(
    JSON_AGG(DISTINCT g.nome) FILTER (WHERE g.nome IS NOT NULL),
    '[]'::json
  ) AS generos,
  -- Adiciona uma coluna com todos os gêneros para facilitar filtros
  STRING_AGG(DISTINCT g.nome, ', ') AS generos_string
FROM animes a
INNER JOIN episodios e ON a.id = e.anime_id
LEFT JOIN animes_generos ag ON a.id = ag.anime_id
LEFT JOIN generos g ON ag.genero_id = g.id
WHERE NOT EXISTS (
  -- Filtra conteúdo adulto/+18
  SELECT 1
  FROM animes_generos ag2
  INNER JOIN generos g2 ON ag2.genero_id = g2.id
  WHERE ag2.anime_id = a.id
  AND (
    g2.nome ILIKE '%18%' OR 
    g2.nome ILIKE '%+18%' OR 
    g2.nome ILIKE '%adulto%' OR
    g2.nome ILIKE '%adult%' OR
    g2.nome ILIKE '%hentai%' OR
    g2.nome ILIKE '%ecchi%' OR
    g2.nome ILIKE '%mature%'
  )
)
GROUP BY a.titulo; 

-- Exemplos de uso:
-- Para filtrar por um gênero específico:
-- SELECT * FROM animes_by_genre WHERE generos_string ILIKE '%Ação%';
-- SELECT * FROM animes_by_genre WHERE generos_string ILIKE '%Romance%';
-- SELECT * FROM animes_by_genre WHERE generos_string ILIKE '%Comédia%';
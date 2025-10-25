-- View modificada para excluir animes com gênero "+18" e conteúdo adulto
-- Versão simples e direta com filtros robustos para conteúdo adulto
-- Filtra variações como: +18, 18+, adulto, adult, hentai, ecchi, mature
DROP VIEW IF EXISTS animes_with_latest_episode;

CREATE VIEW animes_with_latest_episode 
WITH (security_invoker = true) AS
SELECT 
  MIN(a.id) AS id,               -- id representativo
  a.titulo,
  MAX(a.ano) AS ano,         -- pega algum ano
  MAX(a.thumb) AS thumb,         -- pega alguma thumb
  MAX(a.slug) AS slug,           -- pega algum slug
  BOOL_OR(a.dublado) AS dublado, -- se algum for dublado, retorna true
  MAX(a.link_original) AS link_original,
  MAX(e.criado_em) AS ultimo_episodio_criado_em,
  COUNT(e.id) AS total_episodios,
  COALESCE(
    JSON_AGG(DISTINCT g.nome) FILTER (WHERE g.nome IS NOT NULL),
    '[]'::json
  ) AS generos
FROM animes a
INNER JOIN episodios e ON a.id = e.anime_id
LEFT JOIN animes_generos ag ON a.id = ag.anime_id
LEFT JOIN generos g ON ag.genero_id = g.id
WHERE NOT EXISTS (
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
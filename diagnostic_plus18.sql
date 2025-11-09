-- ========================================
-- DIAGNÓSTICO: Por que filtro +18 não funciona?
-- ========================================

-- HIPÓTESE 1: A view está retornando animes duplicados ou com outros gêneros também
SELECT 
  'Animes que têm +18 (podem ter outros gêneros também)' as teste,
  titulo, 
  generos_array,
  array_length(generos_array, 1) as total_generos
FROM animes_search_filtered 
WHERE '+18' = ANY(generos_array)
ORDER BY titulo
LIMIT 10;

-- HIPÓTESE 2: O operador && não está funcionando como esperado
-- Teste com diferentes formas de filtrar
SELECT 
  'Teste 1: Operador = ANY' as teste,
  COUNT(*) as total
FROM animes_search_filtered 
WHERE '+18' = ANY(generos_array);

SELECT 
  'Teste 2: Operador &&' as teste, 
  COUNT(*) as total
FROM animes_search_filtered 
WHERE generos_array && ARRAY['+18'];

SELECT 
  'Teste 3: Operador @>' as teste,
  COUNT(*) as total  
FROM animes_search_filtered 
WHERE generos_array @> ARRAY['+18'];

-- HIPÓTESE 3: Verificar a função de busca passo a passo
-- Primeiro, testar só a view com WHERE manual
SELECT 
  'Manual WHERE na view' as teste,
  titulo, generos_array
FROM animes_search_filtered 
WHERE generos_array && ARRAY['+18']
LIMIT 5;

-- Depois testar a função
SELECT 
  'Função search_animes_filtered' as teste,
  titulo, generos_array
FROM search_animes_filtered(NULL, NULL, ARRAY['+18'], NULL, 5, 0);

-- HIPÓTESE 4: Problema no nome do gênero
-- Listar gêneros que contêm "18" 
SELECT DISTINCT nome 
FROM generos 
WHERE nome ILIKE '%18%' OR nome ILIKE '%adult%' OR nome ILIKE '%ecchi%';

-- Se os resultados forem diferentes entre o WHERE manual e a função,
-- o problema está na implementação da função SQL.
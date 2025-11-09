-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.animes (
  id integer NOT NULL DEFAULT nextval('animes_id_seq'::regclass),
  titulo character varying NOT NULL,
  status character varying CHECK (status::text = ANY (ARRAY['Em andamento'::character varying, 'Finalizado'::character varying, 'Hiato'::character varying]::text[])),
  criado_em timestamp without time zone DEFAULT now(),
  atualizado_em timestamp without time zone DEFAULT now(),
  thumb text,
  slug text,
  dublado boolean DEFAULT false,
  link_original character varying NOT NULL UNIQUE,
  ano text,
  CONSTRAINT animes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.animes_generos (
  anime_id bigint NOT NULL,
  genero_id bigint NOT NULL,
  CONSTRAINT animes_generos_pkey PRIMARY KEY (anime_id, genero_id),
  CONSTRAINT animes_generos_anime_id_fkey FOREIGN KEY (anime_id) REFERENCES public.animes(id),
  CONSTRAINT animes_generos_genero_id_fkey FOREIGN KEY (genero_id) REFERENCES public.generos(id)
);
CREATE TABLE public.episodios (
  id integer NOT NULL DEFAULT nextval('episodios_id_seq'::regclass),
  numero integer NOT NULL,
  link_video text UNIQUE,
  criado_em timestamp without time zone DEFAULT now(),
  anime_id integer NOT NULL,
  link_original character varying UNIQUE,
  CONSTRAINT episodios_pkey PRIMARY KEY (id),
  CONSTRAINT episodios_anime_id_fkey FOREIGN KEY (anime_id) REFERENCES public.animes(id)
);
CREATE TABLE public.generos (
  id bigint NOT NULL DEFAULT nextval('generos_id_seq'::regclass),
  nome character varying NOT NULL UNIQUE,
  criado_em timestamp without time zone DEFAULT now(),
  atualizado_em timestamp without time zone DEFAULT now(),
  CONSTRAINT generos_pkey PRIMARY KEY (id)
);
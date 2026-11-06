-- ════════════════════════════════════════════════════════════════════════════
-- Visitas a enlaces de rastreo compartido — 2026-09-28
--
-- El worker wialon-proxy registra cada petición hecha con ?token=<hex> (las
-- páginas públicas consultan cada 15–20 s), así el panel "Compartidos" puede
-- mostrar cuántos visitantes hay en este momento y el detalle por IP.
--
-- Un visitante = (token, ip, user_agent): se actualiza la misma fila en cada
-- latido en vez de insertar una nueva, para que la tabla no crezca sin control.
--
-- Retención: las visitas viven lo que vive el enlace (ON DELETE CASCADE). Al
-- revocar un enlace o al purgar expirados se borran sus IPs (datos personales).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public."RastreoVisita" (
  id          bigint generated always as identity primary key,
  token       text not null references public."RastreoCompartido"(token) on delete cascade,
  ip          text not null,
  user_agent  text not null default '',
  pais        text,
  region      text,
  ciudad      text,
  primera_vez timestamptz not null default now(),
  ultima_vez  timestamptz not null default now(),
  hits        integer not null default 1,
  constraint rastreo_visita_unica unique (token, ip, user_agent)
);

create index if not exists rastreo_visita_ultima_vez_idx
  on public."RastreoVisita" (token, ultima_vez desc);

alter table public."RastreoVisita" enable row level security;

drop policy if exists "interno_lectura" on public."RastreoVisita";
create policy "interno_lectura" on public."RastreoVisita"
  for select to authenticated using (public.es_interno());

-- Sólo el worker (service_role) escribe. Upsert con incremento de hits, algo
-- que el upsert de PostgREST no puede hacer.
create or replace function public.registrar_visita_rastreo(
  p_token      text,
  p_ip         text,
  p_user_agent text,
  p_pais       text,
  p_region     text,
  p_ciudad     text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public."RastreoVisita" (token, ip, user_agent, pais, region, ciudad)
  values (p_token, p_ip, left(coalesce(p_user_agent, ''), 400), p_pais, p_region, p_ciudad)
  on conflict (token, ip, user_agent) do update
    set ultima_vez = now(),
        hits       = public."RastreoVisita".hits + 1,
        pais       = coalesce(excluded.pais,   public."RastreoVisita".pais),
        region     = coalesce(excluded.region, public."RastreoVisita".region),
        ciudad     = coalesce(excluded.ciudad, public."RastreoVisita".ciudad);
$$;

revoke execute on function public.registrar_visita_rastreo(text, text, text, text, text, text) from public, anon, authenticated;
grant  execute on function public.registrar_visita_rastreo(text, text, text, text, text, text) to service_role;

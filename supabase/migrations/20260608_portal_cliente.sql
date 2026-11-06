-- Portal de Cliente ("cuentas espejo" de rastreo)
-- Permite que un cliente inicie sesión y vea SOLO las unidades que se le asignan,
-- en vivo y con historial a partir del momento en que se creó su cuenta.

-- ── Tabla: una fila por cuenta de cliente ──────────────────────────────────────
create table if not exists public.cuenta_cliente (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  nombre          text not null,
  cliente_id      uuid references public."Cliente"(id) on delete set null,
  historial_desde timestamptz not null default now(),  -- el cliente NO ve historial previo a esto
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (user_id)
);

-- ── Tabla: unidades asignadas a cada cuenta (asignación manual) ─────────────────
create table if not exists public.cuenta_cliente_unidad (
  cuenta_id      uuid not null references public.cuenta_cliente(id) on delete cascade,
  wialon_unit_id bigint not null,
  wialon_nombre  text,
  primary key (cuenta_id, wialon_unit_id)
);

create index if not exists idx_cuenta_cliente_user  on public.cuenta_cliente(user_id);
create index if not exists idx_cuenta_unidad_cuenta on public.cuenta_cliente_unidad(cuenta_id);

-- ── RLS: cada cliente solo lee SU propia cuenta y sus unidades ─────────────────
-- La gestión (alta/edición/baja) la hace la Edge Function `admin-cuentas-cliente`
-- con service_role, que bypassa RLS. Por eso aquí solo se definen políticas de lectura
-- para el propio cliente.
alter table public.cuenta_cliente        enable row level security;
alter table public.cuenta_cliente_unidad enable row level security;

drop policy if exists "cuenta_cliente_self_select" on public.cuenta_cliente;
create policy "cuenta_cliente_self_select" on public.cuenta_cliente
  for select using (user_id = auth.uid());

drop policy if exists "cuenta_unidad_self_select" on public.cuenta_cliente_unidad;
create policy "cuenta_unidad_self_select" on public.cuenta_cliente_unidad
  for select using (
    exists (
      select 1 from public.cuenta_cliente cc
      where cc.id = cuenta_cliente_unidad.cuenta_id
        and cc.user_id = auth.uid()
    )
  );

-- =====================================================================
--  Cumple 20 de Juli — Esquema de Supabase
--
--  Cómo usarlo:
--    1. Cambia [MI_CONTRASEÑA] (más abajo, sección "Contraseña de admin")
--       por la contraseña que quieras para /admin-juli.
--    2. Copia TODO este archivo en Supabase → SQL Editor → Run.
--
--  Se puede ejecutar varias veces sin romper nada (es "idempotente").
-- =====================================================================

-- pgcrypto: para guardar la contraseña de admin cifrada (bcrypt)
create extension if not exists pgcrypto with schema extensions;


-- =====================================================================
-- 1. TABLAS
-- =====================================================================

-- Fotos de la fiesta. `ruta` es la ubicación del archivo dentro del bucket
-- (se necesita para poder borrarlo luego desde el panel de admin).
create table if not exists public.fotos (
  id          uuid primary key default gen_random_uuid(),
  url         text not null,
  ruta        text not null unique,
  subido_por  text not null,
  created_at  timestamptz not null default now(),

  constraint fotos_nombre_valido check (char_length(trim(subido_por)) between 1 and 40),
  constraint fotos_ruta_valida   check (ruta ~ '^fiesta/[A-Za-z0-9_.-]{1,120}$')
);

create index if not exists fotos_created_at_idx on public.fotos (created_at desc);

-- Contador de shots y vasos de agua por invitado
create table if not exists public.shots (
  id          bigint generated always as identity primary key,
  nombre      text not null unique,
  cantidad    integer not null default 0,
  agua        integer not null default 0,
  updated_at  timestamptz not null default now(),

  constraint shots_nombre_valido   check (char_length(trim(nombre)) between 1 and 40),
  constraint shots_cantidad_valida check (cantidad >= 0),
  constraint shots_agua_valida     check (agua >= 0)
);

-- Configuración privada (contraseña de admin). El cliente NO puede leerla.
create table if not exists public.config (
  clave  text primary key,
  valor  text not null
);

-- Interna: archivos que el admin ya borró y que Storage tiene permitido eliminar.
create table if not exists public.fotos_por_borrar (
  ruta        text primary key,
  created_at  timestamptz not null default now()
);


-- =====================================================================
-- 2. RLS (Row Level Security)
-- =====================================================================

alter table public.fotos            enable row level security;
alter table public.shots            enable row level security;
alter table public.config           enable row level security;
alter table public.fotos_por_borrar enable row level security;

-- Cinturón y tirantes: además de RLS, quitamos permisos que el cliente no usa
revoke update, delete, truncate on public.fotos  from anon, authenticated;
revoke update, delete, truncate on public.shots  from anon, authenticated;
revoke all on public.config           from anon, authenticated;
revoke all on public.fotos_por_borrar from anon, authenticated;

-- ---------- fotos: lectura e inserción pública ----------
drop policy if exists "fotos: lectura publica"   on public.fotos;
drop policy if exists "fotos: insercion publica" on public.fotos;

create policy "fotos: lectura publica"
  on public.fotos for select
  to anon, authenticated
  using (true);

-- Solo se puede registrar una foto si el archivo YA existe en el bucket
-- y si la URL apunta a ese mismo archivo. La fecha la pone el servidor.
create policy "fotos: insercion publica"
  on public.fotos for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from storage.objects o
      where o.bucket_id = 'fotos-fiesta' and o.name = ruta
    )
    and url like 'https://%/storage/v1/object/public/fotos-fiesta/%'
    and right(url, char_length(ruta) + 1) = '/' || ruta
    and created_at between now() - interval '1 minute' and now() + interval '1 minute'
  );

-- ---------- shots: lectura e inserción pública ----------
-- Insertar solo en ceros; para sumar/restar se usa la función cambiar_shots().
-- No hay política de UPDATE ni DELETE → el cliente no puede editar directamente.
drop policy if exists "shots: lectura publica"   on public.shots;
drop policy if exists "shots: insercion publica" on public.shots;

create policy "shots: lectura publica"
  on public.shots for select
  to anon, authenticated
  using (true);

create policy "shots: insercion publica"
  on public.shots for insert
  to anon, authenticated
  with check (cantidad = 0 and agua = 0);

-- config y fotos_por_borrar: SIN políticas → sin acceso desde el cliente.


-- =====================================================================
-- 3. CONTRASEÑA DE ADMIN
--    Cambia [MI_CONTRASEÑA] antes de ejecutar. Se guarda cifrada con bcrypt.
--    Si vuelves a ejecutar el archivo con otra contraseña, se actualiza.
-- =====================================================================

insert into public.config (clave, valor)
values ('admin_password', extensions.crypt('juli2026fiesta', extensions.gen_salt('bf')))
on conflict (clave) do update set valor = excluded.valor;


-- =====================================================================
-- 4. FUNCIONES RPC
--    `security definer` = corren con permisos del dueño, así pueden tocar
--    tablas que el cliente no puede tocar, pero SOLO de la forma permitida.
-- =====================================================================

-- ---------- Shots: sumar o restar de 1 en 1 ----------
create or replace function public.cambiar_shots(p_nombre text, p_delta integer)
returns public.shots
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text := regexp_replace(trim(coalesce(p_nombre, '')), '\s+', ' ', 'g');
  v_fila   public.shots;
begin
  if p_delta is null or p_delta not in (-1, 1) then
    raise exception 'Solo se puede sumar o restar de 1 en 1';
  end if;
  if char_length(v_nombre) not between 1 and 40 then
    raise exception 'Nombre inválido';
  end if;

  insert into public.shots as s (nombre, cantidad)
  values (v_nombre, greatest(p_delta, 0))
  on conflict (nombre) do update
    set cantidad   = greatest(s.cantidad + p_delta, 0),  -- nunca baja de 0
        updated_at = now()
  returning * into v_fila;

  return v_fila;
end;
$$;

-- ---------- Agua: sumar 1 vaso ----------
create or replace function public.sumar_agua(p_nombre text)
returns public.shots
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text := regexp_replace(trim(coalesce(p_nombre, '')), '\s+', ' ', 'g');
  v_fila   public.shots;
begin
  if char_length(v_nombre) not between 1 and 40 then
    raise exception 'Nombre inválido';
  end if;

  insert into public.shots as s (nombre, agua)
  values (v_nombre, 1)
  on conflict (nombre) do update
    set agua       = s.agua + 1,
        updated_at = now()
  returning * into v_fila;

  return v_fila;
end;
$$;

-- ---------- Admin: validar contraseña (uso interno) ----------
create or replace function public._clave_admin_valida(p_clave text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.config
    where clave = 'admin_password'
      and valor = extensions.crypt(coalesce(p_clave, ''), valor)
  );
$$;

-- Lanza error (con una pausa para frenar a quien intente adivinar) si la clave es mala
create or replace function public._exigir_admin(p_clave text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public._clave_admin_valida(p_clave) then
    perform pg_sleep(1);
    raise exception 'Contraseña incorrecta' using errcode = '28P01';
  end if;
end;
$$;

-- ---------- Admin: verificar contraseña (para entrar al panel) ----------
create or replace function public.verificar_admin(p_clave text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if public._clave_admin_valida(p_clave) then
    return true;
  end if;
  perform pg_sleep(1);
  return false;
end;
$$;

-- ---------- Admin: borrar una foto ----------
-- Borra la fila y marca el archivo para que Storage permita eliminarlo.
-- Devuelve la ruta del archivo para que la app lo quite del bucket.
create or replace function public.borrar_foto(p_clave text, p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ruta text;
begin
  perform public._exigir_admin(p_clave);

  delete from public.fotos where id = p_id returning ruta into v_ruta;

  if v_ruta is not null then
    insert into public.fotos_por_borrar (ruta) values (v_ruta)
    on conflict (ruta) do nothing;
  end if;

  return v_ruta;
end;
$$;

-- ---------- Admin: reiniciar el contador de shots ----------
create or replace function public.reiniciar_shots(p_clave text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_borradas integer;
begin
  perform public._exigir_admin(p_clave);
  delete from public.shots where true;
  get diagnostics v_borradas = row_count;
  return v_borradas;
end;
$$;

-- ---------- Usada por la política de Storage al borrar archivos ----------
create or replace function public.foto_marcada_para_borrar(p_ruta text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.fotos_por_borrar where ruta = p_ruta);
$$;

-- Permisos de ejecución: las internas NO se pueden llamar desde el cliente
revoke all on function public._clave_admin_valida(text) from public, anon, authenticated;
revoke all on function public._exigir_admin(text)       from public, anon, authenticated;

revoke all on function public.cambiar_shots(text, integer)      from public;
revoke all on function public.sumar_agua(text)                  from public;
revoke all on function public.verificar_admin(text)             from public;
revoke all on function public.borrar_foto(text, uuid)           from public;
revoke all on function public.reiniciar_shots(text)             from public;
revoke all on function public.foto_marcada_para_borrar(text)    from public;

grant execute on function public.cambiar_shots(text, integer)   to anon, authenticated;
grant execute on function public.sumar_agua(text)               to anon, authenticated;
grant execute on function public.verificar_admin(text)          to anon, authenticated;
grant execute on function public.borrar_foto(text, uuid)        to anon, authenticated;
grant execute on function public.reiniciar_shots(text)          to anon, authenticated;
grant execute on function public.foto_marcada_para_borrar(text) to anon, authenticated;


-- =====================================================================
-- 5. STORAGE: bucket `fotos-fiesta`
--    Público para leer, máximo 10 MB, solo imágenes jpg/png/webp/heic.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fotos-fiesta',
  'fotos-fiesta',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fotos-fiesta: lectura publica" on storage.objects;
drop policy if exists "fotos-fiesta: subida publica"  on storage.objects;
drop policy if exists "fotos-fiesta: borrar marcadas" on storage.objects;

create policy "fotos-fiesta: lectura publica"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'fotos-fiesta');

-- Subida pública solo dentro de la carpeta fiesta/ y con extensión de imagen.
-- (El tipo MIME y el tamaño los valida además la configuración del bucket.)
create policy "fotos-fiesta: subida publica"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'fotos-fiesta'
    and (storage.foldername(name))[1] = 'fiesta'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'heic', 'heif')
  );

-- Solo se pueden eliminar archivos que el admin ya borró con borrar_foto()
create policy "fotos-fiesta: borrar marcadas"
  on storage.objects for delete
  to anon, authenticated
  using (
    bucket_id = 'fotos-fiesta'
    and public.foto_marcada_para_borrar(name)
  );


-- =====================================================================
-- 6. REALTIME en `fotos` y `shots`
-- =====================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fotos'
  ) then
    alter publication supabase_realtime add table public.fotos;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shots'
  ) then
    alter publication supabase_realtime add table public.shots;
  end if;
end;
$$;

-- ¡Listo! 🎉

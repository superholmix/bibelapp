-- Konto, Notizen, Abo-Status und KI-Verbrauch für den Markus-Testlauf.
-- Grundsatz: Jede Person sieht und ändert nur ihre eigenen Zeilen.
-- Abo-Status und Verbrauch schreibt ausschließlich das Backend (service_role).

-- Notizen ------------------------------------------------------------------

create table public.notes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Versschlüssel wie in der App, z. B. "Mrk.1.1"
  verse_key text not null check (verse_key ~ '^[1-3]?[A-Za-z]+\.[0-9]{1,3}\.[0-9]{1,3}$'),
  text text not null default '' check (char_length(text) <= 20000),
  -- Zeitpunkt der Änderung auf dem Gerät; entscheidet bei Konflikten (letzte Änderung gewinnt)
  updated_at timestamptz not null,
  -- Gelöschte Notizen bleiben als Markierung, damit andere Geräte das Löschen mitbekommen
  deleted boolean not null default false,
  -- Zeitpunkt auf dem Server; danach fragt die App „was ist neu seit …“
  synced_at timestamptz not null default now(),
  primary key (user_id, verse_key)
);

create index notes_user_synced on public.notes (user_id, synced_at);

alter table public.notes enable row level security;

create policy "Eigene Notizen lesen" on public.notes
  for select to authenticated using ((select auth.uid()) = user_id);

-- Schreiben läuft über push_notes(), damit ältere Stände neuere nie überschreiben.
-- Direktes Schreiben bleibt für die eigene Zeile erlaubt (z. B. aus dem Dashboard).
create policy "Eigene Notizen anlegen" on public.notes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Eigene Notizen ändern" on public.notes
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Eigene Notizen löschen" on public.notes
  for delete to authenticated using ((select auth.uid()) = user_id);

create function public.notes_touch_synced_at() returns trigger
  language plpgsql set search_path = '' as $$
begin
  new.synced_at := now();
  return new;
end;
$$;

create trigger notes_touch_synced_at before insert or update on public.notes
  for each row execute function public.notes_touch_synced_at();

-- Nimmt Änderungen vom Gerät an. Eine Änderung gewinnt nur, wenn sie neuer ist
-- als der Stand auf dem Server. Gibt die Zeilen zurück, die danach gelten.
create function public.push_notes(changes jsonb) returns setof public.notes
  language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;
  if jsonb_typeof(changes) <> 'array' or jsonb_array_length(changes) > 500 then
    raise exception 'Erwartet höchstens 500 Änderungen als Liste' using errcode = '22023';
  end if;

  return query
  insert into public.notes as n (user_id, verse_key, text, updated_at, deleted)
  select auth.uid(), c.verse_key, coalesce(c.text, ''), least(c.updated_at, now() + interval '5 minutes'), coalesce(c.deleted, false)
  from jsonb_to_recordset(changes) as c (verse_key text, text text, updated_at timestamptz, deleted boolean)
  on conflict (user_id, verse_key) do update
    set text = excluded.text, updated_at = excluded.updated_at, deleted = excluded.deleted
    where n.updated_at < excluded.updated_at
  returning n.*;
end;
$$;

-- Gibt Änderungen nach einem Stand zurück, seitenweise nach (synced_at, verse_key).
-- Die App merkt sich den letzten Stand und fragt beim nächsten Mal nur das Neue ab.
create function public.pull_notes(after_synced timestamptz, after_key text default '', max_rows integer default 500)
  returns setof public.notes
  language sql stable security invoker set search_path = '' as $$
  select * from public.notes n
  where n.user_id = auth.uid()
    and (n.synced_at, n.verse_key) > (after_synced, coalesce(after_key, ''))
  order by n.synced_at, n.verse_key
  limit least(greatest(max_rows, 1), 1000);
$$;

-- Abo-Status ---------------------------------------------------------------

create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- 'revenuecat' kommt vom Webhook, 'manual' wird von Hand gesetzt (Testpersonen)
  source text not null check (source in ('revenuecat', 'manual')),
  product_id text,
  -- null bei 'manual' ohne Ablauf
  expires_at timestamptz,
  -- Kündigung oder Abbruch ändern erst mit expires_at etwas am Zugang
  will_renew boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.entitlements enable row level security;

create policy "Eigenen Abo-Status lesen" on public.entitlements
  for select to authenticated using ((select auth.uid()) = user_id);

create function public.has_active_entitlement(uid uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.entitlements e
    where e.user_id = uid and (e.expires_at is null or e.expires_at > now())
  );
$$;

revoke execute on function public.has_active_entitlement(uuid) from public, anon, authenticated;

-- Für die App: eigener Status, ohne fremde Nutzer-IDs abfragen zu können
create function public.my_entitlement() returns table (active boolean, source text, expires_at timestamptz, will_renew boolean)
  language sql stable security invoker set search_path = '' as $$
  select (e.expires_at is null or e.expires_at > now()), e.source, e.expires_at, e.will_renew
  from public.entitlements e where e.user_id = auth.uid();
$$;

-- KI-Verbrauch -------------------------------------------------------------

create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('frage', 'wort')),
  ref text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10, 6) not null default 0,
  created_at timestamptz not null default now()
);

create index ai_usage_user_created on public.ai_usage (user_id, created_at);

alter table public.ai_usage enable row level security;

create policy "Eigenen Verbrauch lesen" on public.ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);

-- Verbrauch im laufenden Kalendermonat (UTC), für die Kostenbremse im Backend
create function public.ai_usage_this_month(uid uuid) returns table (requests bigint, cost_usd numeric)
  language sql stable security definer set search_path = '' as $$
  select count(*), coalesce(sum(u.cost_usd), 0)
  from public.ai_usage u
  where u.user_id = uid and u.created_at >= date_trunc('month', now() at time zone 'utc') at time zone 'utc';
$$;

revoke execute on function public.ai_usage_this_month(uuid) from public, anon, authenticated;

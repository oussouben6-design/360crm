-- =====================================================================
-- 0027 — Demandes de contact publiques (`contact_requests`)
--
-- Stocke les messages envoyés depuis la page publique `/contact` (demande de
-- démonstration, tarifs, assistance, partenariat, autre).
--
-- Sécurité :
--  - RLS activée ET forcée (comme sur toutes les tables métier) ;
--  - aucune politique SELECT/UPDATE/DELETE pour les visiteurs : une demande
--    soumise n'est jamais relisible via une API publique ;
--  - sur Supabase, la politique INSERT publique est préservée pour compatibilité,
--    tandis que SELECT/UPDATE/DELETE sont explicitement révoqués ;
--  - l'application Next.js enregistre les demandes côté serveur après validation
--    Zod et limitation de débit par adresse IP.
--
-- Migration idempotente (ré-exécutable sur une base où la table existe déjà).
-- =====================================================================

create table if not exists contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null constraint contact_requests_name_check
    check (char_length(trim(both from name)) >= 2 and char_length(trim(both from name)) <= 160),
  email text not null constraint contact_requests_email_check
    check (char_length(trim(both from email)) >= 3 and char_length(trim(both from email)) <= 320),
  phone text,
  company text,
  subject text not null default 'demo' constraint contact_requests_subject_check
    check (subject in ('demo', 'pricing', 'support', 'partnership', 'other')),
  message text not null constraint contact_requests_message_check
    check (char_length(trim(both from message)) >= 10 and char_length(trim(both from message)) <= 5000),
  status text not null default 'new' constraint contact_requests_status_check
    check (status in ('new', 'contacted', 'qualified', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists contact_requests_created_idx on contact_requests (created_at desc);

alter table contact_requests enable row level security;
alter table contact_requests force row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon')
     and exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'drop policy if exists contact_requests_insert_public on contact_requests';
    execute 'create policy contact_requests_insert_public on contact_requests for insert to anon, authenticated with check (true)';
    execute 'grant insert on table contact_requests to anon, authenticated';
    execute 'revoke select, update, delete on table contact_requests from anon, authenticated';
  end if;
end $$;

grant select, insert, update, delete on table contact_requests to organix_app;

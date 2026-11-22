-- 뜨개 사전 · 커뮤니티 표현 위키 (Kim): anyone may rewrite a community term's 설명. Nothing is overwritten - every
-- change is a new row (a 판); the newest row is what everyone sees, and an older one can be brought back (a new row
-- that copies it, `reverts`). Read by everyone; written only through the app's /api/glossary-wiki (which checks
-- the term and the lengths), with the anon key under these rules.
create table if not exists public.glossary_edits (
  id bigint generated always as identity primary key,
  term_id text not null check (char_length(term_id) between 1 and 64),
  summary text not null check (char_length(btrim(summary)) between 2 and 600),
  author text not null default '익명' check (char_length(author) between 1 and 20),
  note text check (note is null or char_length(note) <= 80),
  reverts bigint references public.glossary_edits(id),
  created_at timestamptz not null default now()
);
create index if not exists glossary_edits_term_idx on public.glossary_edits (term_id, id desc);

alter table public.glossary_edits enable row level security;
drop policy if exists "read all" on public.glossary_edits;
create policy "read all" on public.glossary_edits for select to anon, authenticated using (true);
drop policy if exists "add only" on public.glossary_edits;
create policy "add only" on public.glossary_edits for insert to anon, authenticated with check (created_at > now() - interval '1 minute');
-- no update / delete policy: history can't be rewritten

-- against floods: at most 6 changes a minute per term and 60 an hour overall
create or replace function public.glossary_edits_throttle() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.glossary_edits where term_id = new.term_id and created_at > now() - interval '1 minute') >= 6
     or (select count(*) from public.glossary_edits where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'too many edits' using errcode = 'P0001';
  end if;
  new.created_at := now();
  return new;
end $$;
drop trigger if exists glossary_edits_throttle on public.glossary_edits;
create trigger glossary_edits_throttle before insert on public.glossary_edits for each row execute function public.glossary_edits_throttle();

-- the trigger function is not for calling from the API (Supabase advisor 0028/0029); the trigger still fires
revoke execute on function public.glossary_edits_throttle() from public, anon, authenticated;

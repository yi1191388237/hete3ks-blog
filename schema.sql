-- Hete3ks blog schema for Supabase (PostgreSQL)
-- Run this whole file in Supabase Dashboard -> SQL Editor.
-- Admin authorization is based on app_metadata.role='admin', not user-editable user_metadata.

create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  slug text not null unique,
  category text not null default '随笔',
  excerpt text not null default '',
  content text not null default '',
  cover_symbol text not null default 'H',
  cover_color text not null default '#dce2d4',
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_publication_idx on public.posts(status, published_at desc);
alter table public.posts enable row level security;

create or replace function public.is_blog_admin()
returns boolean
language sql stable security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

grant usage on schema public to anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
grant execute on function public.is_blog_admin() to anon, authenticated;

drop policy if exists "Public can read published posts" on public.posts;
create policy "Public can read published posts"
on public.posts for select
to anon, authenticated
using (
  status = 'published'
  and published_at is not null
  and published_at <= now()
);

drop policy if exists "Admins can read all posts" on public.posts;
create policy "Admins can read all posts"
on public.posts for select
to authenticated
using (public.is_blog_admin());

drop policy if exists "Admins can insert posts" on public.posts;
create policy "Admins can insert posts"
on public.posts for insert
to authenticated
with check (public.is_blog_admin() and author_id = auth.uid());

drop policy if exists "Admins can update posts" on public.posts;
create policy "Admins can update posts"
on public.posts for update
to authenticated
using (public.is_blog_admin())
with check (public.is_blog_admin());

drop policy if exists "Admins can delete posts" on public.posts;
create policy "Admins can delete posts"
on public.posts for delete
to authenticated
using (public.is_blog_admin());

-- Important: disable public sign-ups in Authentication settings.
-- Create the first user in Dashboard -> Authentication -> Users.
-- Then open that user and set app_metadata JSON to: {"role":"admin"}
-- Do not put service_role keys in any frontend file.

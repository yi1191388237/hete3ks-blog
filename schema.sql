-- Hete3ks incremental Supabase migration
-- Safe to run against the existing project: keeps public.posts and existing rows.
-- Run in Supabase Dashboard -> SQL Editor.
begin;

create extension if not exists pgcrypto;

-- Extend existing posts table for Markdown tags and useful metadata.
alter table public.posts add column if not exists tags text[] not null default '{}';
alter table public.posts add column if not exists meta_description text not null default '';
alter table public.posts add column if not exists reading_minutes integer not null default 1;
create index if not exists posts_publication_idx on public.posts(status, published_at desc);
create index if not exists posts_category_idx on public.posts(category);
create index if not exists posts_tags_gin_idx on public.posts using gin(tags);
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
on public.posts for select to anon, authenticated
using (status = 'published' and published_at is not null and published_at <= now());

drop policy if exists "Admins can read all posts" on public.posts;
create policy "Admins can read all posts"
on public.posts for select to authenticated using (public.is_blog_admin());

drop policy if exists "Admins can insert posts" on public.posts;
create policy "Admins can insert posts"
on public.posts for insert to authenticated
with check (public.is_blog_admin() and author_id = auth.uid());

drop policy if exists "Admins can update posts" on public.posts;
create policy "Admins can update posts"
on public.posts for update to authenticated
using (public.is_blog_admin()) with check (public.is_blog_admin());

drop policy if exists "Admins can delete posts" on public.posts;
create policy "Admins can delete posts"
on public.posts for delete to authenticated using (public.is_blog_admin());

-- Comments: public can submit, but every new comment is pending by default.
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 40),
  email text null check (email is null or char_length(email) <= 160),
  content text not null check (char_length(content) between 1 and 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  moderated_at timestamptz null,
  moderated_by uuid null references auth.users(id) on delete set null
);
create index if not exists comments_post_status_created_idx
  on public.comments(post_id, status, created_at);
create index if not exists comments_status_created_idx
  on public.comments(status, created_at desc);
alter table public.comments enable row level security;

grant select, insert on public.comments to anon, authenticated;
grant update, delete on public.comments to authenticated;

drop policy if exists "Public can read approved comments for published posts" on public.comments;
create policy "Public can read approved comments for published posts"
on public.comments for select to anon, authenticated
using (
  status = 'approved'
  and exists (
    select 1 from public.posts p
    where p.id = comments.post_id
      and p.status = 'published'
      and p.published_at is not null
      and p.published_at <= now()
  )
);

drop policy if exists "Anyone can submit pending comments on published posts" on public.comments;
create policy "Anyone can submit pending comments on published posts"
on public.comments for insert to anon, authenticated
with check (
  status = 'pending'
  and moderated_at is null
  and moderated_by is null
  and exists (
    select 1 from public.posts p
    where p.id = comments.post_id
      and p.status = 'published'
      and p.published_at is not null
      and p.published_at <= now()
  )
);

drop policy if exists "Admins can read all comments" on public.comments;
create policy "Admins can read all comments"
on public.comments for select to authenticated
using (public.is_blog_admin());

drop policy if exists "Admins can moderate comments" on public.comments;
create policy "Admins can moderate comments"
on public.comments for update to authenticated
using (public.is_blog_admin())
with check (public.is_blog_admin() and status in ('pending','approved','rejected'));

drop policy if exists "Admins can delete comments" on public.comments;
create policy "Admins can delete comments"
on public.comments for delete to authenticated
using (public.is_blog_admin());

-- Public visitors must not be able to mutate existing comments; UPDATE/DELETE
-- privileges are only granted to authenticated users and RLS still checks admin role.
commit;

-- Dashboard configuration required:
-- 1) Authentication -> sign-ups: disable public registration.
-- 2) Authentication -> Users -> your user -> app_metadata: {"role":"admin"}.
-- 3) Authentication -> URL Configuration:
--    Site URL: https://yi1191388237.github.io/hete3ks-blog/
--    Redirect URL: https://yi1191388237.github.io/hete3ks-blog/reset-password.html
--    (Also add http://localhost:8000/reset-password.html for local testing if needed.)
-- Never use auth.users UPDATE SQL as a client, never expose service_role keys.

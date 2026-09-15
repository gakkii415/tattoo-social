-- Tattoo Social schema for Supabase
-- Fresh-project setup. Security and performance settings match production.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null default 'New artist',
  bio text not null default '',
  avatar_url text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  caption text not null default '',
  tags text[] not null default '{}',
  style text not null default 'tattoo',
  created_at timestamptz not null default now(),
  constraint caption_length check (char_length(caption) <= 280)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

create table if not exists public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('like','follow')),
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_user_id_idx on public.posts(user_id, created_at desc);
create index if not exists posts_style_idx on public.posts(style);
create index if not exists follows_following_idx on public.follows(following_id);
create index if not exists likes_post_idx on public.likes(post_id);
create index if not exists saves_post_id_idx on public.saves(post_id);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_actor_id_idx on public.notifications(actor_id);
create index if not exists notifications_post_id_idx on public.notifications(post_id);

-- Create a profile automatically for every new authenticated user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_name text;
begin
  base_name := regexp_replace(split_part(coalesce(new.email,'artist'),'@',1), '[^a-zA-Z0-9_]+', '', 'g');
  if base_name = '' then base_name := 'artist'; end if;
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    lower(left(base_name, 22) || '_' || left(replace(new.id::text,'-',''), 6)),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name',''), 'New artist')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Notification creation is server-side so users cannot forge notifications.
create or replace function public.notify_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare owner_id uuid;
begin
  select user_id into owner_id from public.posts where id = new.post_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications(user_id, actor_id, type, post_id)
    values(owner_id, new.user_id, 'like', new.post_id);
  end if;
  return new;
end;
$$;

drop trigger if exists likes_notify on public.likes;
create trigger likes_notify after insert on public.likes
for each row execute procedure public.notify_like();

create or replace function public.notify_follow()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.following_id <> new.follower_id then
    insert into public.notifications(user_id, actor_id, type)
    values(new.following_id, new.follower_id, 'follow');
  end if;
  return new;
end;
$$;

drop trigger if exists follows_notify on public.follows;
create trigger follows_notify after insert on public.follows
for each row execute procedure public.notify_follow();

-- These functions are trigger-only. Do not expose them as RPC endpoints.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.notify_like() from public, anon, authenticated;
revoke execute on function public.notify_follow() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;
alter table public.saves enable row level security;
alter table public.notifications enable row level security;

-- Profiles
create policy "profiles are public" on public.profiles for select using (true);
create policy "users insert own profile" on public.profiles for insert with check ((select auth.uid()) = id);
create policy "users update own profile" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Posts
create policy "posts are public" on public.posts for select using (true);
create policy "users create own posts" on public.posts for insert with check ((select auth.uid()) = user_id);
create policy "users update own posts" on public.posts for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users delete own posts" on public.posts for delete using ((select auth.uid()) = user_id);

-- Follows are public so follower/following relationships can be displayed.
create policy "follows are public" on public.follows for select using (true);
create policy "users follow as themselves" on public.follows for insert with check ((select auth.uid()) = follower_id);
create policy "users unfollow as themselves" on public.follows for delete using ((select auth.uid()) = follower_id);

-- Likes are public for like counts.
create policy "likes are public" on public.likes for select using (true);
create policy "users like as themselves" on public.likes for insert with check ((select auth.uid()) = user_id);
create policy "users remove own likes" on public.likes for delete using ((select auth.uid()) = user_id);

-- Saves are private.
create policy "users read own saves" on public.saves for select using ((select auth.uid()) = user_id);
create policy "users save as themselves" on public.saves for insert with check ((select auth.uid()) = user_id);
create policy "users remove own saves" on public.saves for delete using ((select auth.uid()) = user_id);

-- Notifications belong only to their recipient.
create policy "users read own notifications" on public.notifications for select using ((select auth.uid()) = user_id);
create policy "users update own notifications" on public.notifications for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Public image bucket. Uploads are restricted to the authenticated user's own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tattoo-images','tattoo-images',true,10485760,array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update set public = excluded.public;

create policy "tattoo images are public"
on storage.objects for select
using (bucket_id = 'tattoo-images');

create policy "users upload to own tattoo folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'tattoo-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "users update own tattoo images"
on storage.objects for update to authenticated
using (bucket_id = 'tattoo-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'tattoo-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users delete own tattoo images"
on storage.objects for delete to authenticated
using (bucket_id = 'tattoo-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

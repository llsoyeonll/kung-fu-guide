-- 0.0.34: forum thread status
alter table public.posts
  add column if not exists thread_status text not null default 'waiting'
  check (thread_status in ('waiting','completed'));

create index if not exists posts_author_status_idx
  on public.posts(author_id,status);

create index if not exists comments_author_idx
  on public.comments(author_id);

-- ============================================================
-- FlowDesk — Database Schema
-- Chạy toàn bộ file này trong Supabase SQL Editor
-- Mỗi user có workspace riêng, bảo vệ bởi RLS
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";


-- ============================================================
-- 2. BẢNG PROJECTS
-- ============================================================
create table public.projects (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  color       text not null default '#378ADD',
  description text,
  status      text not null default 'active'
                check (status in ('active', 'paused', 'done')),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index
create index projects_user_id_idx on public.projects(user_id);

-- RLS
alter table public.projects enable row level security;

create policy "users manage own projects"
  on public.projects
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
-- 3. BẢNG TASKS
-- ============================================================
create table public.tasks (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references auth.users(id) on delete cascade not null,
  project_id     uuid references public.projects(id) on delete set null,
  title          text not null,
  note           text,
  status         text not null default 'todo'
                   check (status in ('todo', 'done', 'cancelled')),
  priority       text check (priority in ('high', 'mid', 'low')),
  time_slot      text check (time_slot in ('morning', 'afternoon', 'evening')),
  scheduled_date date,                    -- ngày thực hiện
  scheduled_time time,                    -- giờ cụ thể (tuỳ chọn)
  completed_at   timestamptz,
  postpone_count int not null default 0, -- số lần hoãn
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Index
create index tasks_user_date_idx on public.tasks(user_id, scheduled_date);
create index tasks_user_status_idx on public.tasks(user_id, status);
create index tasks_project_idx on public.tasks(project_id);

-- RLS
alter table public.tasks enable row level security;

create policy "users manage own tasks"
  on public.tasks
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
-- 4. BẢNG ARCHIVE ITEMS
-- ============================================================
create table public.archive_items (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  project_id  uuid references public.projects(id) on delete set null,
  type        text not null
                check (type in ('image', 'article', 'link', 'note')),
  title       text not null,
  storage_url text,                       -- Supabase Storage URL (ảnh/file)
  source_url  text,                       -- URL gốc (link/article)
  content     text,                       -- nội dung ghi chú
  purpose     text[] not null default '{}',  -- ['Viết content', 'Đề án', ...]
  tags        text[] not null default '{}',
  metadata    jsonb  not null default '{}',  -- file_size, mime_type, width, height
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index
create index archive_user_idx on public.archive_items(user_id);
create index archive_project_idx on public.archive_items(project_id);
create index archive_type_idx on public.archive_items(user_id, type);
create index archive_purpose_idx on public.archive_items using gin(purpose);
create index archive_tags_idx on public.archive_items using gin(tags);

-- Full-text search trên title + content
alter table public.archive_items
  add column if not exists fts tsvector
    generated always as (
      to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
    ) stored;

create index archive_fts_idx on public.archive_items using gin(fts);

-- RLS
alter table public.archive_items enable row level security;

create policy "users manage own archive"
  on public.archive_items
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
-- 5. BẢNG MEETINGS (lịch hẹn)
-- ============================================================
create table public.meetings (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  project_id   uuid references public.projects(id) on delete set null,
  title        text not null,
  client_name  text not null,
  scheduled_at timestamptz not null,
  duration_min int not null default 60,
  mode         text not null default 'offline'
                 check (mode in ('online', 'offline', 'phone')),
  location     text,                      -- địa điểm hoặc link meet
  agenda       text,                      -- mục tiêu / nội dung buổi gặp
  notes        text,                      -- ghi chú sau buổi gặp
  status       text not null default 'upcoming'
                 check (status in ('upcoming', 'done', 'cancelled')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Index
create index meetings_user_idx on public.meetings(user_id);
create index meetings_schedule_idx on public.meetings(user_id, scheduled_at);
create index meetings_project_idx on public.meetings(project_id);

-- RLS
alter table public.meetings enable row level security;

create policy "users manage own meetings"
  on public.meetings
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
-- 6. TỰ ĐỘNG CẬP NHẬT updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_projects
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger set_updated_at_tasks
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger set_updated_at_archive
  before update on public.archive_items
  for each row execute function public.set_updated_at();

create trigger set_updated_at_meetings
  before update on public.meetings
  for each row execute function public.set_updated_at();


-- ============================================================
-- 7. SUPABASE STORAGE BUCKET (chạy trong Storage tab hoặc SQL)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'archive-files',
  'archive-files',
  true,
  10485760,   -- 10MB mỗi file
  array['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
on conflict (id) do nothing;

-- RLS cho Storage: chỉ đọc/ghi file trong folder của mình
create policy "users upload own files"
  on storage.objects for insert
  with check (
    bucket_id = 'archive-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users read own files"
  on storage.objects for select
  using (
    bucket_id = 'archive-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users delete own files"
  on storage.objects for delete
  using (
    bucket_id = 'archive-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- ============================================================
-- 8. DỮ LIỆU MẪU (tuỳ chọn — để test sau khi đăng nhập)
-- Bỏ comment phần này nếu muốn chạy với auth.uid() thật
-- ============================================================
/*
insert into public.projects (user_id, name, color, description) values
  (auth.uid(), 'Marketing SaaS', '#378ADD', 'Chiến dịch marketing sản phẩm'),
  (auth.uid(), 'App Mobile',     '#1D9E75', 'Phát triển ứng dụng mobile'),
  (auth.uid(), 'Brand Identity', '#D85A30', 'Xây dựng nhận diện thương hiệu');
*/

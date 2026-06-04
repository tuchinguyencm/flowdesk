# FlowDesk — Kế hoạch triển khai toàn bộ

> Personal Command Center — quản lý task, dự án, lưu trữ, lịch hẹn  
> Stack: Next.js 14 · Supabase · Dexie (offline-first) · Tailwind CSS · Zustand · TanStack Query

---

## Tổng quan hệ thống

FlowDesk là web app cá nhân chạy trên nhiều thiết bị, mỗi user có workspace riêng biệt bảo vệ bởi Row Level Security. Dữ liệu lưu local trước (IndexedDB) và sync lên Supabase khi có mạng.

```
Thiết bị (Desktop / Mobile)
  └── Next.js PWA
        ├── Dexie IndexedDB  ← offline-first, phản hồi tức thì
        └── Sync Engine      ← đẩy/kéo khi có mạng
              └── Supabase
                    ├── Auth (Email magic link + Google OAuth)
                    ├── Postgres + RLS (tasks, projects, archive, meetings)
                    └── Storage (ảnh, file archive)
```

---

## Trạng thái hiện tại

| Tính năng | Trạng thái |
|---|---|
| Today View — hiển thị task theo ngày, checkbox | ✅ Xong |
| Quick Add Task — ⌘K, form đầy đủ, lưu Dexie | ✅ Xong |
| Quick Add Archive — 4 loại, upload ảnh, tags | ✅ Xong |
| Quick Add Meeting — form lịch hẹn, hình thức | ✅ Xong |
| Supabase Auth — magic link, Google OAuth | ✅ Xong |
| Middleware bảo vệ route | ✅ Xong |
| SQL Schema + RLS toàn bộ | ✅ Xong |
| Sync engine Dexie ↔ Supabase | ✅ Xong |
| Archive Library — grid, filter, search | 🔲 Chưa |
| Project Workspace — kanban, phases | 🔲 Chưa |
| Calendar View — tháng/tuần, kéo thả | 🔲 Chưa |
| PWA — install mobile, offline hoàn toàn | 🔲 Chưa |
| Push notification | 🔲 Chưa |

---

## Phase 1 — Nền tảng (XONG)

Mục tiêu: app chạy được thật, đăng nhập được, thêm task được.

### 1.1 Scaffold project

```bash
npx create-next-app@latest flowdesk --typescript --tailwind --eslint --app --src-dir
cd flowdesk
npm install zustand @tanstack/react-query react-hook-form zod @hookform/resolvers \
  dexie dexie-react-hooks @supabase/supabase-js @supabase/ssr date-fns uuid
```

### 1.2 Cấu trúc thư mục

```
src/
├── app/
│   ├── (app)/          ← layout bảo vệ bởi auth
│   │   ├── today/
│   │   ├── projects/
│   │   ├── archive/
│   │   └── calendar/
│   ├── (auth)/login/   ← trang đăng nhập
│   └── auth/
│       ├── callback/   ← Google OAuth redirect
│       └── confirm/    ← Email magic link
├── components/
│   ├── auth/           ← LoginForm, UserGuard
│   ├── layout/         ← Sidebar
│   ├── today/          ← TodayView, TaskRow
│   ├── quick-add/      ← QuickAddModal (3 tab)
│   ├── archive/        ← ArchiveLibrary (TODO)
│   └── projects/       ← ProjectWorkspace (TODO)
├── hooks/
│   ├── use-today-tasks.ts
│   └── use-projects.ts
├── lib/
│   ├── supabase.ts         ← browser client
│   ├── supabase-server.ts  ← server client (SSR)
│   ├── auth-context.tsx    ← useAuth()
│   ├── sync.ts             ← push/pull Supabase
│   └── sync-provider.tsx   ← auto-sync khi login
├── db/index.ts         ← Dexie schema
├── store/index.ts      ← Zustand UI state
└── types/index.ts      ← TypeScript types
```

### 1.3 Supabase setup

1. Tạo project tại [supabase.com](https://supabase.com) (miễn phí)
2. Vào **SQL Editor** → paste toàn bộ `supabase/schema.sql` → Run
3. Vào **Authentication → Providers**:
   - Bật **Email** (magic link, không cần password)
   - Bật **Google** → điền Client ID + Secret từ Google Cloud Console
4. Vào **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (dev) hoặc domain thật (production)
   - Redirect URLs: thêm `http://localhost:3000/auth/callback`

### 1.4 Biến môi trường

Tạo file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 1.5 Database schema

5 bảng chính, RLS bật trên tất cả:

```sql
-- Mỗi policy chỉ cần 1 dòng — Postgres tự enforce
create policy "users manage own tasks"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

| Bảng | Mô tả | Index quan trọng |
|---|---|---|
| `projects` | Dự án của user | `user_id`, `status` |
| `tasks` | Task theo ngày | `user_id + scheduled_date`, `project_id` |
| `archive_items` | Link/ảnh/note/bài viết | GIN trên `purpose[]`, `tags[]`, full-text `fts` |
| `meetings` | Lịch hẹn khách hàng | `user_id + scheduled_at` |
| `storage.objects` | File ảnh (Supabase Storage) | Path: `user_id/project_id/filename` |

---

## Phase 2 — Tính năng cốt lõi (TIẾP THEO)

### 2.1 Archive Library

Màn hình `/archive` — kho lưu trữ nội dung tái sử dụng.

**Tính năng:**
- Grid / List view toggle
- Filter theo loại (link / ảnh / bài viết / ghi chú)
- Filter theo mục đích (Viết content / Đề án / Tham khảo / Thiết kế / Đo lường)
- Filter theo dự án
- Full-text search (dùng Postgres `fts` column)
- Preview thumbnail cho ảnh, excerpt cho bài viết
- Thống kê nhanh: tổng mục, phân theo loại

**Hook cần viết:**

```typescript
// src/hooks/use-archive.ts
export function useArchiveItems(userId: string, filters: ArchiveFilters) {
  return useQuery({
    queryKey: ['archive', userId, filters],
    queryFn: async () => {
      let query = supabase
        .from('archive_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (filters.type)    query = query.eq('type', filters.type)
      if (filters.purpose) query = query.contains('purpose', [filters.purpose])
      if (filters.search)  query = query.textSearch('fts', filters.search)

      const { data, error } = await query
      if (error) throw error
      return data as ArchiveItem[]
    },
    enabled: !!userId,
  })
}
```

### 2.2 Project Workspace

Màn hình `/projects/[id]` — không gian làm việc từng dự án.

**Tính năng:**
- Header: tên, màu, mô tả, tiến độ tổng
- Task list theo phase chiến dịch:
  - Thiết kế hệ thống
  - Chạy chiến dịch marketing
  - Tạo nội dung
  - Đo lường & báo cáo
- Kanban view (Todo / Doing / Done)
- Archive items liên quan đến project
- Meetings lịch sử với khách hàng của project

**Phases component:**

```typescript
const CAMPAIGN_PHASES = [
  { id: 'design',    label: 'Thiết kế hệ thống', color: '#8B5CF6' },
  { id: 'marketing', label: 'Chạy chiến dịch',   color: '#378ADD' },
  { id: 'content',   label: 'Tạo nội dung',       color: '#1D9E75' },
  { id: 'measure',   label: 'Đo lường',           color: '#D85A30' },
]
```

### 2.3 Quick Add hoàn thiện (đã có skeleton)

Tab Archive và Meeting đã có form. Cần bổ sung:
- Auto-detect URL khi paste link → tự điền tiêu đề (fetch og:title)
- Smart suggestion: gõ "gặp khách" → gợi ý chuyển sang tab Meeting
- Drag & drop ảnh vào form Archive

---

## Phase 3 — Hoàn thiện trải nghiệm

### 3.1 Calendar View

Màn hình `/calendar`:
- View tháng: hiển thị số task theo ngày, dot màu theo dự án
- View tuần: timeline theo giờ, kéo thả task vào khung giờ
- Click ngày → Today View của ngày đó
- Hiển thị meeting như event màu khác

**Thư viện đề xuất:** `@fullcalendar/react` hoặc tự viết grid đơn giản với Tailwind.

### 3.2 PWA — Install trên mobile

Thêm vào `next.config.ts`:

```typescript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})
module.exports = withPWA({ /* next config */ })
```

Thêm icons vào `public/icons/`:
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)

Sau khi deploy, trên mobile Chrome/Safari sẽ có nút "Thêm vào màn hình chính".

### 3.3 Push Notification

Nhắc task sắp đến hạn, lịch hẹn sắp diễn ra.

```typescript
// Đăng ký service worker nhận push
const registration = await navigator.serviceWorker.ready
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: process.env.NEXT_PUBLIC_VAPID_KEY,
})
// Lưu subscription vào Supabase để server gửi notification
```

Dùng **Supabase Edge Functions** để schedule và gửi push theo giờ.

---

## Deploy lên VPS (hosting riêng)

### Yêu cầu server
- Ubuntu 22.04+
- RAM 1GB+ (khuyến nghị 2GB)
- Node.js 18+
- Nginx (reverse proxy)
- PM2 (process manager)

### Các bước deploy

**Bước 1 — Cài môi trường:**

```bash
# Cài Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Cài PM2
npm install -g pm2

# Cài Nginx
sudo apt install -y nginx
```

**Bước 2 — Upload code:**

```bash
# Trên máy local
scp flowdesk.zip user@your-server-ip:/var/www/

# Trên server
cd /var/www && unzip flowdesk.zip && cd flowdesk
npm install
```

**Bước 3 — Biến môi trường production:**

```bash
# Tạo .env.production
cat > .env.production << EOF
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EOF
```

**Bước 4 — Build và chạy:**

```bash
npm run build
pm2 start npm --name "flowdesk" -- start
pm2 save
pm2 startup
```

**Bước 5 — Nginx config:**

```nginx
server {
    server_name flowdesk.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Bước 6 — HTTPS (miễn phí với Certbot):**

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d flowdesk.yourdomain.com
```

**Bước 7 — Cập nhật Supabase URL:**

Trong Supabase dashboard → Authentication → URL Configuration:
- Site URL: `https://flowdesk.yourdomain.com`
- Redirect URLs: thêm `https://flowdesk.yourdomain.com/auth/callback`

### CI/CD tự động (tuỳ chọn)

```yaml
# .github/workflows/deploy.yml
name: Deploy FlowDesk

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v0.1.10
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/flowdesk
            git pull origin main
            npm install
            npm run build
            pm2 restart flowdesk
```

---

## Checklist trước khi go live

### Supabase
- [ ] Chạy `supabase/schema.sql` trong SQL Editor
- [ ] Bật Email provider (magic link)
- [ ] Bật Google OAuth (Client ID + Secret)
- [ ] Cập nhật Site URL và Redirect URLs theo domain thật
- [ ] Kiểm tra bucket `archive-files` đã tạo và có RLS policy

### Môi trường
- [ ] `.env.local` (dev) hoặc `.env.production` (prod) đã điền đủ keys
- [ ] `NEXT_PUBLIC_SUPABASE_URL` đúng format `https://xxx.supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` là anon key (không phải service role key)

### Server (nếu deploy VPS)
- [ ] Node.js 18+ đã cài
- [ ] PM2 đã cài và đang chạy
- [ ] Nginx đã config đúng domain
- [ ] HTTPS đã bật (Certbot)
- [ ] Firewall mở port 80 và 443

### Test sau deploy
- [ ] Đăng nhập bằng Google OAuth
- [ ] Đăng nhập bằng email magic link
- [ ] Thêm task → hiển thị trong Today View
- [ ] Check hoàn thành task → progress bar cập nhật
- [ ] Lưu link vào Archive
- [ ] Upload ảnh vào Archive
- [ ] Tạo lịch hẹn
- [ ] Đăng xuất → không truy cập được app
- [ ] Đăng nhập trên thiết bị khác → data sync về đủ

---

## Thứ tự build còn lại

| STT | Tính năng | Ước tính | Phụ thuộc |
|---|---|---|---|
| 1 | Archive Library | 1 ngày | Đã có schema + sync |
| 2 | Project Workspace | 2 ngày | useProjects đã có |
| 3 | Calendar View | 2 ngày | Tasks đã có |
| 4 | PWA + Service Worker | 0.5 ngày | Build xong mới test |
| 5 | Push Notification | 1 ngày | PWA phải xong trước |
| **Tổng** | | **~6.5 ngày** | |

---

## Tech stack tóm tắt

| Layer | Công nghệ | Lý do chọn |
|---|---|---|
| Framework | Next.js 14 App Router | SSR + RSC + file-based routing |
| UI | Tailwind CSS + shadcn/ui | Không cần design system riêng |
| State (UI) | Zustand | Nhẹ, đơn giản, không boilerplate |
| State (Server) | TanStack Query | Cache thông minh, sync tự động |
| Form | React Hook Form + Zod | Type-safe, validation gọn |
| Local DB | Dexie (IndexedDB) | Offline-first, reactive với useLiveQuery |
| Backend | Supabase | Auth + Postgres + Storage + Realtime |
| Auth | Supabase Auth | Magic link + OAuth, không cần tự build |
| File storage | Supabase Storage | S3-compatible, RLS tích hợp |
| Deploy | VPS + Nginx + PM2 | Toàn quyền kiểm soát, hosting riêng |

---

*Cập nhật lần cuối: tháng 6/2025*

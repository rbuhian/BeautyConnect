-- Create announcements table for admin broadcast messages
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  sent_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Only admins can insert/read announcements
alter table public.announcements enable row level security;

create policy "Admins can manage announcements"
  on public.announcements
  for all
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

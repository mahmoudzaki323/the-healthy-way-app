create extension if not exists "pgcrypto";

create type public.app_role as enum ('client', 'coach', 'admin');
create type public.profile_status as enum ('invited', 'active', 'paused', 'archived');
create type public.content_status as enum ('draft', 'published', 'scheduled', 'archived');
create type public.assignment_target as enum ('program', 'program_week', 'client', 'all_clients', 'library');
create type public.resource_type as enum ('article', 'pdf', 'video', 'link', 'worksheet');
create type public.event_type as enum ('workout', 'meal', 'live_call', 'check_in', 'resource', 'custom');
create type public.rsvp_status as enum ('going', 'maybe', 'declined', 'pending');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.app_role not null default 'client',
  status public.profile_status not null default 'active',
  avatar_url text,
  timezone text not null default 'America/Los_Angeles',
  phone text,
  bio text,
  dietary_preferences text[] not null default '{}',
  fitness_preferences jsonb not null default '{}'::jsonb,
  availability text,
  notification_preferences jsonb not null default '{"email": true, "sms": false, "push": false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'client'::public.app_role
  );
$$;

create or replace function public.is_coach_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() in ('coach'::public.app_role, 'admin'::public.app_role);
$$;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  email text,
  coach_id uuid references public.profiles(id) on delete set null,
  role public.app_role not null default 'client',
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.coach_clients (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  status public.profile_status not null default 'active',
  start_date date not null default current_date,
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coach_id, client_id)
);

create table public.client_intakes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.profiles(id) on delete cascade,
  full_name text not null,
  primary_goal text not null,
  food_support text[] not null default '{}',
  fitness_level text not null,
  dietary_preferences text[] not null default '{}',
  availability_days text not null,
  availability_time text not null,
  session_length text not null,
  program_id text not null,
  answers jsonb not null default '{}'::jsonb,
  disclaimer_ack_at timestamptz not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  coach_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text not null,
  duration_weeks integer not null check (duration_weeks > 0),
  cover_image_url text,
  best_for text,
  status public.content_status not null default 'draft',
  sort_order integer not null default 0,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.program_weeks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  week_number integer not null check (week_number > 0),
  title text not null,
  description text,
  sort_order integer not null default 0,
  unique (program_id, week_number)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  program_week_id uuid not null references public.program_weeks(id) on delete cascade,
  title text not null,
  body text not null,
  video_url text,
  status public.content_status not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  title text not null,
  description text not null,
  week_number integer not null,
  sort_order integer not null default 0
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text not null,
  meal_type text not null,
  cuisine text,
  difficulty text not null default 'Easy',
  servings integer not null default 1 check (servings > 0),
  prep_minutes integer not null default 0 check (prep_minutes >= 0),
  cook_minutes integer not null default 0 check (cook_minutes >= 0),
  calories integer check (calories >= 0),
  protein integer check (protein >= 0),
  carbs integer check (carbs >= 0),
  fat integer check (fat >= 0),
  dietary_tags text[] not null default '{}',
  allergens text[] not null default '{}',
  image_url text,
  tips text,
  substitutions text,
  status public.content_status not null default 'draft',
  sort_order integer not null default 0,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  label text not null,
  quantity text,
  sort_order integer not null default 0
);

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  body text not null,
  sort_order integer not null default 0
);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text not null,
  category text not null,
  difficulty text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  equipment text[] not null default '{}',
  calories_estimate integer check (calories_estimate >= 0),
  video_url text,
  warmup text,
  cooldown text,
  coach_notes text,
  safety_notes text,
  status public.content_status not null default 'draft',
  sort_order integer not null default 0,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references public.profiles(id) on delete set null,
  name text not null,
  category text not null,
  instructions text,
  media_url text,
  created_at timestamptz not null default now()
);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  name text not null,
  sets integer not null check (sets > 0),
  reps text not null,
  rest text not null,
  notes text,
  sort_order integer not null default 0
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references public.profiles(id) on delete set null,
  title text not null,
  summary text not null,
  body text not null,
  type public.resource_type not null,
  topic text not null,
  url text,
  cover_image_url text,
  read_minutes integer not null default 5 check (read_minutes > 0),
  tags text[] not null default '{}',
  featured boolean not null default false,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.program_items (
  id uuid primary key default gen_random_uuid(),
  program_week_id uuid references public.program_weeks(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  item_type text not null check (item_type in ('lesson', 'recipe', 'workout', 'resource', 'live_call', 'goal')),
  item_id uuid not null,
  title text not null,
  required boolean not null default true,
  sort_order integer not null default 0
);

create table public.program_enrollments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active',
  started_at date not null default current_date,
  completed_at timestamptz,
  current_week integer not null default 1,
  unique (client_id, program_id)
);

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz,
  unique (client_id, lesson_id)
);

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  created_at timestamptz not null default now(),
  unique (client_id, week_start)
);

create table public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  meal_date date not null,
  meal_slot text not null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.recipe_saves (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (client_id, recipe_id)
);

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  label text not null,
  checked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.workout_completions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete cascade,
  completed_at timestamptz not null default now(),
  effort integer not null check (effort between 1 and 10),
  notes_for_coach text,
  exercise_status jsonb not null default '{}'::jsonb
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references public.profiles(id) on delete set null,
  client_id uuid references public.profiles(id) on delete cascade,
  program_id uuid references public.programs(id) on delete set null,
  event_type public.event_type not null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'America/Los_Angeles',
  item_type text,
  item_id uuid,
  call_url text,
  required boolean not null default false,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  status public.rsvp_status not null default 'pending',
  reminder_minutes integer not null default 15,
  reminder_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (event_id, client_id)
);

create table public.event_agenda_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  starts_at time,
  label text not null,
  sort_order integer not null default 0
);

create table public.event_resources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade
);

create table public.call_replays (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  title text not null,
  replay_url text not null,
  duration_minutes integer not null default 60,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references public.profiles(id) on delete set null,
  client_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  icon text not null default 'leaf',
  description text not null,
  target_days integer not null check (target_days between 1 and 7),
  metric text not null,
  reminder_time time,
  why_it_matters text,
  status public.content_status not null default 'published',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goal_logs (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null,
  completed boolean not null default false,
  value numeric,
  note text,
  created_at timestamptz not null default now(),
  unique (goal_id, client_id, log_date)
);

create table public.metric_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  metric text not null,
  value numeric not null,
  unit text,
  logged_at timestamptz not null default now(),
  note text
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid references public.profiles(id) on delete set null,
  mood text not null,
  win text not null,
  challenge text not null,
  support_needed text not null,
  status text not null default 'pending',
  submitted_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.coach_feedback (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid references public.check_ins(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.non_scale_wins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  won_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.community_topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  sort_order integer not null default 0
);

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.community_topics(id) on delete restrict,
  author_id uuid references public.profiles(id) on delete set null,
  title text,
  body text not null,
  image_url text,
  pinned boolean not null default false,
  hidden_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  parent_id uuid references public.community_comments(id) on delete cascade,
  body text not null,
  hidden_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.community_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null,
  created_at timestamptz not null default now(),
  unique (post_id, comment_id, author_id, reaction),
  check (post_id is not null or comment_id is not null)
);

create table public.community_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table public.resource_assignments (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  target_type public.assignment_target not null,
  target_id uuid,
  assigned_by uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.resource_reads (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  saved boolean not null default false,
  completed_at timestamptz,
  last_read_at timestamptz not null default now(),
  unique (resource_id, client_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (conversation_id, profile_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);
create index coach_clients_coach_idx on public.coach_clients(coach_id);
create index coach_clients_client_idx on public.coach_clients(client_id);
create index calendar_events_client_starts_idx on public.calendar_events(client_id, starts_at);
create index calendar_events_coach_starts_idx on public.calendar_events(coach_id, starts_at);
create index event_agenda_items_event_idx on public.event_agenda_items(event_id);
create index event_resources_event_idx on public.event_resources(event_id);
create index program_enrollments_client_program_idx on public.program_enrollments(client_id, program_id);
create index community_posts_topic_created_idx on public.community_posts(topic_id, created_at desc);
create index messages_conversation_created_idx on public.messages(conversation_id, created_at);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger coach_clients_set_updated_at before update on public.coach_clients for each row execute function public.set_updated_at();
create trigger client_intakes_set_updated_at before update on public.client_intakes for each row execute function public.set_updated_at();
create trigger programs_set_updated_at before update on public.programs for each row execute function public.set_updated_at();
create trigger lessons_set_updated_at before update on public.lessons for each row execute function public.set_updated_at();
create trigger recipes_set_updated_at before update on public.recipes for each row execute function public.set_updated_at();
create trigger workouts_set_updated_at before update on public.workouts for each row execute function public.set_updated_at();
create trigger resources_set_updated_at before update on public.resources for each row execute function public.set_updated_at();
create trigger calendar_events_set_updated_at before update on public.calendar_events for each row execute function public.set_updated_at();
create trigger goals_set_updated_at before update on public.goals for each row execute function public.set_updated_at();
create trigger community_posts_set_updated_at before update on public.community_posts for each row execute function public.set_updated_at();
create trigger conversations_set_updated_at before update on public.conversations for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.invitations enable row level security;
alter table public.coach_clients enable row level security;
alter table public.client_intakes enable row level security;
alter table public.programs enable row level security;
alter table public.program_weeks enable row level security;
alter table public.lessons enable row level security;
alter table public.milestones enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.workouts enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.resources enable row level security;
alter table public.program_items enable row level security;
alter table public.program_enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_plan_items enable row level security;
alter table public.recipe_saves enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.workout_completions enable row level security;
alter table public.calendar_events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.event_agenda_items enable row level security;
alter table public.event_resources enable row level security;
alter table public.call_replays enable row level security;
alter table public.goals enable row level security;
alter table public.goal_logs enable row level security;
alter table public.metric_entries enable row level security;
alter table public.check_ins enable row level security;
alter table public.coach_feedback enable row level security;
alter table public.non_scale_wins enable row level security;
alter table public.community_topics enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reactions enable row level security;
alter table public.community_reports enable row level security;
alter table public.resource_assignments enable row level security;
alter table public.resource_reads enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_audit_events enable row level security;

create or replace function public.can_read_calendar_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_coach_or_admin()
    or exists (
      select 1
      from public.calendar_events ce
      join public.profiles viewer on viewer.id = auth.uid()
      where ce.id = p_event_id
        and ce.status in ('published', 'scheduled')
        and viewer.status = 'active'
        and (
          ce.client_id = auth.uid()
          or (
            ce.client_id is null
            and ce.program_id is null
          )
          or (
            ce.client_id is null
            and ce.program_id is not null
            and exists (
              select 1
              from public.program_enrollments pe
              where pe.client_id = auth.uid()
                and pe.program_id = ce.program_id
                and pe.status = 'active'
            )
          )
        )
    );
$$;

create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.profile_id = auth.uid()
  );
$$;

create policy "profiles_select_self_or_coach" on public.profiles for select using (
  id = auth.uid() or public.is_coach_or_admin()
);
create policy "profiles_update_self_or_coach" on public.profiles for update using (
  id = auth.uid() or public.is_coach_or_admin()
) with check (
  id = auth.uid() or public.is_coach_or_admin()
);
create policy "profiles_insert_authenticated" on public.profiles for insert with check (id = auth.uid() or public.is_coach_or_admin());

create policy "coach_clients_select_related" on public.coach_clients for select using (
  client_id = auth.uid() or coach_id = auth.uid() or public.is_coach_or_admin()
);
create policy "coach_clients_write_coach" on public.coach_clients for all using (public.is_coach_or_admin()) with check (public.is_coach_or_admin());

create policy "intakes_select_owner_or_coach" on public.client_intakes for select using (
  client_id = auth.uid() or public.is_coach_or_admin()
);
create policy "intakes_write_owner_or_coach" on public.client_intakes for all using (
  client_id = auth.uid() or public.is_coach_or_admin()
) with check (
  client_id = auth.uid() or public.is_coach_or_admin()
);

create policy "published_content_read_programs" on public.programs for select using (status in ('published', 'scheduled') or public.is_coach_or_admin());
create policy "coach_write_programs" on public.programs for all using (public.is_coach_or_admin()) with check (public.is_coach_or_admin());
create policy "published_content_read_weeks" on public.program_weeks for select using (true);
create policy "coach_write_weeks" on public.program_weeks for all using (public.is_coach_or_admin()) with check (public.is_coach_or_admin());
create policy "published_content_read_lessons" on public.lessons for select using (status in ('published', 'scheduled') or public.is_coach_or_admin());
create policy "coach_write_lessons" on public.lessons for all using (public.is_coach_or_admin()) with check (public.is_coach_or_admin());
create policy "published_content_read_milestones" on public.milestones for select using (true);
create policy "coach_write_milestones" on public.milestones for all using (public.is_coach_or_admin()) with check (public.is_coach_or_admin());

create policy "published_content_read_recipes" on public.recipes for select using (status in ('published', 'scheduled') or public.is_coach_or_admin());
create policy "coach_write_recipes" on public.recipes for all using (public.is_coach_or_admin()) with check (public.is_coach_or_admin());
create policy "read_recipe_children" on public.recipe_ingredients for select using (true);
create policy "coach_write_recipe_ingredients" on public.recipe_ingredients for all using (public.is_coach_or_admin()) with check (public.is_coach_or_admin());
create policy "read_recipe_steps" on public.recipe_steps for select using (true);
create policy "coach_write_recipe_steps" on public.recipe_steps for all using (public.is_coach_or_admin()) with check (public.is_coach_or_admin());

create policy "published_content_read_workouts" on public.workouts for select using (status in ('published', 'scheduled') or public.is_coach_or_admin());
create policy "coach_write_workouts" on public.workouts for all using (public.is_coach_or_admin()) with check (public.is_coach_or_admin());
create policy "read_exercises" on public.exercises for select using (true);
create policy "coach_write_exercises" on public.exercises for all using (public.is_coach_or_admin()) with check (public.is_coach_or_admin());
create policy "read_workout_exercises" on public.workout_exercises for select using (true);
create policy "coach_write_workout_exercises" on public.workout_exercises for all using (public.is_coach_or_admin()) with check (public.is_coach_or_admin());

create policy "published_resources_read" on public.resources for select using (status in ('published', 'scheduled') or public.is_coach_or_admin());
create policy "coach_write_resources" on public.resources for all using (public.is_coach_or_admin()) with check (public.is_coach_or_admin());
create policy "program_items_read" on public.program_items for select using (true);
create policy "coach_write_program_items" on public.program_items for all using (public.is_coach_or_admin()) with check (public.is_coach_or_admin());

create policy "enrollments_select_related" on public.program_enrollments for select using (client_id = auth.uid() or public.is_coach_or_admin());
create policy "coach_write_enrollments" on public.program_enrollments for all using (public.is_coach_or_admin()) with check (public.is_coach_or_admin());
create policy "lesson_progress_owner" on public.lesson_progress for all using (client_id = auth.uid() or public.is_coach_or_admin()) with check (client_id = auth.uid() or public.is_coach_or_admin());
create policy "meal_plans_owner" on public.meal_plans for all using (client_id = auth.uid() or public.is_coach_or_admin()) with check (client_id = auth.uid() or public.is_coach_or_admin());
create policy "meal_plan_items_owner" on public.meal_plan_items for all using (
  exists (select 1 from public.meal_plans mp where mp.id = meal_plan_id and (mp.client_id = auth.uid() or public.is_coach_or_admin()))
) with check (
  exists (select 1 from public.meal_plans mp where mp.id = meal_plan_id and (mp.client_id = auth.uid() or public.is_coach_or_admin()))
);
create policy "recipe_saves_owner" on public.recipe_saves for all using (client_id = auth.uid() or public.is_coach_or_admin()) with check (client_id = auth.uid() or public.is_coach_or_admin());
create policy "shopping_list_owner" on public.shopping_list_items for all using (client_id = auth.uid() or public.is_coach_or_admin()) with check (client_id = auth.uid() or public.is_coach_or_admin());
create policy "workout_completions_owner" on public.workout_completions for all using (client_id = auth.uid() or public.is_coach_or_admin()) with check (client_id = auth.uid() or public.is_coach_or_admin());

create policy "events_related" on public.calendar_events for select using (public.can_read_calendar_event(id));
create policy "coach_write_events" on public.calendar_events for all using (public.is_coach_or_admin()) with check (public.is_coach_or_admin());
create policy "rsvps_owner" on public.event_rsvps for all using (client_id = auth.uid() or public.is_coach_or_admin()) with check (client_id = auth.uid() or public.is_coach_or_admin());
create policy "event_agenda_read" on public.event_agenda_items for select using (public.can_read_calendar_event(event_id));
create policy "coach_write_event_agenda" on public.event_agenda_items for all using (public.is_coach_or_admin()) with check (public.is_coach_or_admin());
create policy "event_resources_read" on public.event_resources for select using (
  public.can_read_calendar_event(event_id)
  and exists (
    select 1
    from public.resources r
    where r.id = event_resources.resource_id
      and (r.status in ('published', 'scheduled') or public.is_coach_or_admin())
  )
);
create policy "coach_write_event_resources" on public.event_resources for all using (public.is_coach_or_admin()) with check (public.is_coach_or_admin());
create policy "call_replays_read" on public.call_replays for select using (visible or public.is_coach_or_admin());
create policy "coach_write_call_replays" on public.call_replays for all using (public.is_coach_or_admin()) with check (public.is_coach_or_admin());

create policy "goals_related" on public.goals for all using (client_id = auth.uid() or client_id is null or public.is_coach_or_admin()) with check (client_id = auth.uid() or client_id is null or public.is_coach_or_admin());
create policy "goal_logs_owner" on public.goal_logs for all using (client_id = auth.uid() or public.is_coach_or_admin()) with check (client_id = auth.uid() or public.is_coach_or_admin());
create policy "metric_entries_owner" on public.metric_entries for all using (client_id = auth.uid() or public.is_coach_or_admin()) with check (client_id = auth.uid() or public.is_coach_or_admin());
create policy "check_ins_owner" on public.check_ins for all using (client_id = auth.uid() or public.is_coach_or_admin()) with check (client_id = auth.uid() or public.is_coach_or_admin());
create policy "coach_feedback_related" on public.coach_feedback for all using (client_id = auth.uid() or coach_id = auth.uid() or public.is_coach_or_admin()) with check (client_id = auth.uid() or coach_id = auth.uid() or public.is_coach_or_admin());
create policy "non_scale_wins_owner" on public.non_scale_wins for all using (client_id = auth.uid() or public.is_coach_or_admin()) with check (client_id = auth.uid() or public.is_coach_or_admin());

create policy "community_topics_read" on public.community_topics for select using (true);
create policy "coach_write_topics" on public.community_topics for all using (public.is_coach_or_admin()) with check (public.is_coach_or_admin());
create policy "community_posts_read" on public.community_posts for select using (hidden_at is null or public.is_coach_or_admin());
create policy "community_posts_insert_auth" on public.community_posts for insert with check (author_id = auth.uid() or public.is_coach_or_admin());
create policy "community_posts_update_owner_or_coach" on public.community_posts for update using (author_id = auth.uid() or public.is_coach_or_admin()) with check (author_id = auth.uid() or public.is_coach_or_admin());
create policy "community_comments_read" on public.community_comments for select using (hidden_at is null or public.is_coach_or_admin());
create policy "community_comments_write" on public.community_comments for all using (author_id = auth.uid() or public.is_coach_or_admin()) with check (author_id = auth.uid() or public.is_coach_or_admin());
create policy "community_reactions_owner" on public.community_reactions for all using (author_id = auth.uid() or public.is_coach_or_admin()) with check (author_id = auth.uid() or public.is_coach_or_admin());
create policy "community_reports_owner" on public.community_reports for all using (reporter_id = auth.uid() or public.is_coach_or_admin()) with check (reporter_id = auth.uid() or public.is_coach_or_admin());

create policy "resource_assignments_select_related" on public.resource_assignments for select using (
  public.is_coach_or_admin()
  or target_type = 'all_clients'::public.assignment_target
  or (
    target_type = 'client'::public.assignment_target
    and target_id = auth.uid()
  )
  or (
    target_type = 'program'::public.assignment_target
    and exists (
      select 1
      from public.program_enrollments pe
      where pe.client_id = auth.uid()
        and pe.program_id = resource_assignments.target_id
        and pe.status = 'active'
    )
  )
);
create policy "coach_write_resource_assignments" on public.resource_assignments for all using (public.is_coach_or_admin()) with check (public.is_coach_or_admin());
create policy "resource_reads_owner" on public.resource_reads for all using (client_id = auth.uid() or public.is_coach_or_admin()) with check (client_id = auth.uid() or public.is_coach_or_admin());

create policy "conversation_members_read_related" on public.conversation_members for select using (public.is_conversation_member(conversation_id) or public.is_coach_or_admin());
create policy "conversations_read_member" on public.conversations for select using (public.is_conversation_member(id) or public.is_coach_or_admin());
create policy "conversations_write_auth" on public.conversations for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "conversation_members_write_auth" on public.conversation_members for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "messages_read_member" on public.messages for select using (public.is_conversation_member(conversation_id) or public.is_coach_or_admin());
create policy "messages_insert_member" on public.messages for insert with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id));
create policy "notifications_owner" on public.notifications for all using (profile_id = auth.uid() or public.is_coach_or_admin()) with check (profile_id = auth.uid() or public.is_coach_or_admin());
create policy "admin_audit_read_coach" on public.admin_audit_events for select using (public.is_coach_or_admin());
create policy "admin_audit_insert_coach" on public.admin_audit_events for insert with check (public.is_coach_or_admin());

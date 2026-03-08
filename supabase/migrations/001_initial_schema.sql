-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  name text,
  weight_kg numeric,
  height_cm numeric,
  goal text,
  calories_target integer default 2000,
  protein_target integer default 150,
  carbs_target integer default 200,
  fat_target integer default 70,
  supplements jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Meals
create table meals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  name text not null,
  calories integer,
  protein numeric,
  carbs numeric,
  fat numeric,
  photo_url text,
  created_at timestamptz default now()
);

-- Sleep logs
create table sleep_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  bedtime timestamptz,
  wake_time timestamptz,
  quality integer check (quality between 1 and 5),
  notes text,
  source text default 'manual' check (source in ('manual','whoop')),
  duration_hours numeric,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- Supplement logs
create table supplement_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- Routines
create table routines (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  weekly_schedule jsonb default '{}'::jsonb,
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Workout logs
create table workout_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  routine_id uuid references routines(id) on delete set null,
  date date not null,
  completed_exercises jsonb not null default '[]'::jsonb,
  duration_min integer,
  notes text,
  created_at timestamptz default now()
);

-- Stoic entries
create table stoic_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  theme text,
  reflection text,
  practice text,
  read boolean default false,
  saved boolean default false,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- Gratitude entries
create table gratitude_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  items text[] not null default '{}',
  second_prompt text,
  second_answer text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- Evening reflections
create table evening_reflections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  went_well text,
  do_differently text,
  coach_response text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- Habits
create table habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  frequency jsonb not null default '{"type":"daily"}'::jsonb,
  category text,
  note text,
  active boolean default true,
  created_at timestamptz default now()
);

-- Habit logs
create table habit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  habit_id uuid references habits(id) on delete cascade not null,
  date date not null,
  completed boolean default false,
  created_at timestamptz default now(),
  unique(user_id, habit_id, date)
);

-- RLS Policies
alter table profiles enable row level security;
alter table meals enable row level security;
alter table sleep_logs enable row level security;
alter table supplement_logs enable row level security;
alter table routines enable row level security;
alter table workout_logs enable row level security;
alter table stoic_entries enable row level security;
alter table gratitude_entries enable row level security;
alter table evening_reflections enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;

-- Profiles policies
create policy "Users can view own profile" on profiles for select using (auth.uid() = user_id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = user_id);

-- Meals policies
create policy "Users can manage own meals" on meals for all using (auth.uid() = user_id);

-- Sleep logs policies
create policy "Users can manage own sleep logs" on sleep_logs for all using (auth.uid() = user_id);

-- Supplement logs policies
create policy "Users can manage own supplement logs" on supplement_logs for all using (auth.uid() = user_id);

-- Routines policies
create policy "Users can manage own routines" on routines for all using (auth.uid() = user_id);

-- Workout logs policies
create policy "Users can manage own workout logs" on workout_logs for all using (auth.uid() = user_id);

-- Stoic entries policies
create policy "Users can manage own stoic entries" on stoic_entries for all using (auth.uid() = user_id);

-- Gratitude entries policies
create policy "Users can manage own gratitude entries" on gratitude_entries for all using (auth.uid() = user_id);

-- Evening reflections policies
create policy "Users can manage own evening reflections" on evening_reflections for all using (auth.uid() = user_id);

-- Habits policies
create policy "Users can manage own habits" on habits for all using (auth.uid() = user_id);

-- Habit logs policies
create policy "Users can manage own habit logs" on habit_logs for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (user_id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

alter table public.invitations
  add column if not exists program_id uuid references public.programs(id) on delete set null;

drop policy if exists "profiles_update_self_or_coach" on public.profiles;
drop policy if exists "profiles_insert_authenticated" on public.profiles;

create policy "profiles_update_self_safe" on public.profiles
for update using (id = auth.uid())
with check (id = auth.uid());

create policy "profiles_update_coach" on public.profiles
for update using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

create policy "profiles_insert_coach" on public.profiles
for insert with check (public.is_coach_or_admin());

create or replace function public.prevent_profile_privilege_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('app.accepting_invitation', true) = 'true' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if (
      old.role is distinct from new.role
      or old.status is distinct from new.status
      or lower(old.email) is distinct from lower(new.email)
    ) and not public.is_coach_or_admin() then
      raise exception 'Profile role, status, and email cannot be changed by this user.';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if new.id = auth.uid()
      and new.role <> 'client'::public.app_role
      and not public.is_coach_or_admin()
    then
      raise exception 'Profile role cannot be self-assigned.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_privilege_changes on public.profiles;
create trigger profiles_prevent_privilege_changes
before insert or update on public.profiles
for each row execute function public.prevent_profile_privilege_changes();

drop policy if exists "invitations_update_owner_or_coach" on public.invitations;

create policy "invitations_update_coach" on public.invitations
for update using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

create unique index if not exists client_intakes_client_id_unique
on public.client_intakes(client_id);

drop policy if exists "client_insert_own_enrollments" on public.program_enrollments;

create policy "client_insert_own_enrollments" on public.program_enrollments
for insert with check (
  client_id = auth.uid()
  and status = 'active'
  and exists (
    select 1
    from public.programs p
    where p.id = program_id
      and p.status in ('published'::public.content_status, 'scheduled'::public.content_status)
  )
  and (
    coach_id is null
    or exists (
      select 1
      from public.coach_clients cc
      where cc.client_id = auth.uid()
        and cc.coach_id = program_enrollments.coach_id
        and cc.status = 'active'
    )
  )
);

drop policy if exists "goals_related" on public.goals;

create policy "goals_select_related" on public.goals
for select using (
  client_id = auth.uid()
  or client_id is null
  or public.is_coach_or_admin()
);

create policy "goals_insert_client" on public.goals
for insert with check (client_id = auth.uid());

create policy "goals_update_client" on public.goals
for update using (client_id = auth.uid())
with check (client_id = auth.uid());

create policy "goals_delete_client" on public.goals
for delete using (client_id = auth.uid());

create policy "goals_write_coach" on public.goals
for all using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

create index if not exists event_agenda_items_event_idx on public.event_agenda_items(event_id);
create index if not exists event_resources_event_idx on public.event_resources(event_id);
create index if not exists program_enrollments_client_program_idx on public.program_enrollments(client_id, program_id);

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

drop policy if exists "events_related" on public.calendar_events;
drop policy if exists "events_select_related" on public.calendar_events;

create policy "events_select_related" on public.calendar_events
for select using (public.can_read_calendar_event(id));

drop policy if exists "event_agenda_read" on public.event_agenda_items;
drop policy if exists "event_resources_read" on public.event_resources;

create policy "event_agenda_read" on public.event_agenda_items
for select using (public.can_read_calendar_event(event_id));

create policy "event_resources_read" on public.event_resources
for select using (
  public.can_read_calendar_event(event_id)
  and exists (
    select 1
    from public.resources r
    where r.id = event_resources.resource_id
      and (r.status in ('published', 'scheduled') or public.is_coach_or_admin())
  )
);

drop policy if exists "resource_assignments_read" on public.resource_assignments;
drop policy if exists "resource_assignments_select_related" on public.resource_assignments;

create policy "resource_assignments_select_related" on public.resource_assignments
for select using (
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

create or replace function public.accept_invitation_profile(
  p_full_name text,
  p_invite_code text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_profile public.profiles%rowtype;
  v_invite public.invitations%rowtype;
begin
  if v_user_id is null or v_email = '' then
    raise exception 'Authentication is required.';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_user_id;

  if found then
    return v_profile;
  end if;

  if nullif(trim(p_invite_code), '') is null then
    raise exception 'A valid invitation code is required.';
  end if;

  select *
  into v_invite
  from public.invitations
  where code = trim(p_invite_code)
    and accepted_at is null
    and (expires_at is null or expires_at > now())
    and (email is null or lower(email) = v_email)
  for update;

  if not found then
    raise exception 'This invitation is invalid, expired, or already accepted.';
  end if;

  perform set_config('app.accepting_invitation', 'true', true);

  insert into public.profiles (
    id,
    email,
    full_name,
    role
  )
  values (
    v_user_id,
    v_email,
    coalesce(nullif(trim(p_full_name), ''), split_part(v_email, '@', 1)),
    v_invite.role
  )
  returning * into v_profile;

  update public.invitations
  set accepted_at = now()
  where id = v_invite.id;

  if v_invite.role = 'client'::public.app_role and v_invite.coach_id is not null then
    insert into public.coach_clients (
      coach_id,
      client_id,
      status,
      start_date
    )
    values (
      v_invite.coach_id,
      v_user_id,
      'active',
      current_date
    )
    on conflict (coach_id, client_id) do update set
      status = excluded.status,
      updated_at = now();
  end if;

  if v_invite.role = 'client'::public.app_role and v_invite.program_id is not null then
    insert into public.program_enrollments (
      client_id,
      program_id,
      coach_id,
      status,
      started_at,
      current_week
    )
    values (
      v_user_id,
      v_invite.program_id,
      v_invite.coach_id,
      'active',
      current_date,
      1
    )
    on conflict (client_id, program_id) do nothing;
  end if;

  perform set_config('app.accepting_invitation', '', true);

  return v_profile;
end;
$$;

grant execute on function public.accept_invitation_profile(text, text) to authenticated;

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

drop policy if exists "conversation_members_read_related" on public.conversation_members;
drop policy if exists "conversation_members_read_thread_members" on public.conversation_members;
drop policy if exists "conversations_read_member" on public.conversations;
drop policy if exists "messages_read_member" on public.messages;
drop policy if exists "messages_insert_member" on public.messages;
drop policy if exists "conversations_write_auth" on public.conversations;
drop policy if exists "conversation_members_write_auth" on public.conversation_members;

create policy "conversation_members_read_thread_members" on public.conversation_members
for select using (
  public.is_conversation_member(conversation_id)
  or public.is_coach_or_admin()
);

create policy "conversations_read_member" on public.conversations
for select using (
  public.is_conversation_member(id)
  or public.is_coach_or_admin()
);

create policy "messages_read_member" on public.messages
for select using (
  public.is_conversation_member(conversation_id)
  or public.is_coach_or_admin()
);

create policy "messages_insert_member" on public.messages
for insert with check (
  sender_id = auth.uid()
  and public.is_conversation_member(conversation_id)
);

create policy "coach_write_conversations" on public.conversations
for all using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

create policy "coach_write_conversation_members" on public.conversation_members
for all using (public.is_coach_or_admin())
with check (public.is_coach_or_admin());

create or replace function public.start_coach_conversation()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_user public.profiles%rowtype;
  v_coach_id uuid;
  v_conversation_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  select *
  into v_user
  from public.profiles
  where id = v_user_id;

  if not found then
    raise exception 'Profile is required before starting a conversation.';
  end if;

  select coach_id
  into v_coach_id
  from public.coach_clients
  where client_id = v_user_id
    and status = 'active'
  order by created_at
  limit 1;

  if v_coach_id is null then
    select id
    into v_coach_id
    from public.profiles
    where role in ('coach'::public.app_role, 'admin'::public.app_role)
      and id <> v_user_id
    order by created_at
    limit 1;
  end if;

  if v_coach_id is null then
    raise exception 'No coach profile is available yet.';
  end if;

  select cm_user.conversation_id
  into v_conversation_id
  from public.conversation_members cm_user
  join public.conversation_members cm_coach
    on cm_coach.conversation_id = cm_user.conversation_id
  where cm_user.profile_id = v_user_id
    and cm_coach.profile_id = v_coach_id
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (title)
  values ('Coach conversation')
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, profile_id)
  values
    (v_conversation_id, v_user_id),
    (v_conversation_id, v_coach_id);

  return v_conversation_id;
end;
$$;

grant execute on function public.start_coach_conversation() to authenticated;

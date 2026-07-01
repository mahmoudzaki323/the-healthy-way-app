create or replace function public.validate_invitation(
  p_email text,
  p_invite_code text
)
returns table (
  role public.app_role,
  program_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_code text := trim(coalesce(p_invite_code, ''));
  v_invite public.invitations%rowtype;
begin
  if v_email = '' then
    raise exception 'Email is required.';
  end if;

  if v_code = '' then
    raise exception 'A valid invitation code is required.';
  end if;

  select *
  into v_invite
  from public.invitations
  where code = v_code
    and accepted_at is null
    and (expires_at is null or expires_at > now())
    and (email is null or lower(email) = v_email);

  if not found then
    raise exception 'This invitation is invalid, expired, already accepted, or does not match this email.';
  end if;

  role := v_invite.role;
  program_id := v_invite.program_id;
  return next;
end;
$$;

grant execute on function public.validate_invitation(text, text) to anon, authenticated;

create or replace function public.start_coach_conversation_for_client(
  p_client_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach_id uuid := auth.uid();
  v_role public.app_role;
  v_client public.profiles%rowtype;
  v_conversation_id uuid;
begin
  if v_coach_id is null then
    raise exception 'Authentication is required.';
  end if;

  select public.current_profile_role() into v_role;

  if v_role not in ('coach'::public.app_role, 'admin'::public.app_role) then
    raise exception 'Coach access is required.';
  end if;

  select *
  into v_client
  from public.profiles
  where id = p_client_id
    and role = 'client'::public.app_role;

  if not found then
    raise exception 'Client profile was not found.';
  end if;

  if v_role <> 'admin'::public.app_role and not exists (
    select 1
    from public.coach_clients cc
    where cc.coach_id = v_coach_id
      and cc.client_id = p_client_id
      and cc.status = 'active'
  ) then
    raise exception 'This client is not assigned to your roster.';
  end if;

  select cm_client.conversation_id
  into v_conversation_id
  from public.conversation_members cm_client
  join public.conversation_members cm_coach
    on cm_coach.conversation_id = cm_client.conversation_id
  where cm_client.profile_id = p_client_id
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
    (v_conversation_id, p_client_id),
    (v_conversation_id, v_coach_id);

  return v_conversation_id;
end;
$$;

grant execute on function public.start_coach_conversation_for_client(uuid) to authenticated;

drop policy if exists "check_ins_owner" on public.check_ins;
drop policy if exists "coach_feedback_related" on public.coach_feedback;
drop policy if exists "non_scale_wins_owner" on public.non_scale_wins;

create policy "check_ins_select_related" on public.check_ins
for select using (
  client_id = auth.uid()
  or public.current_profile_role() = 'admin'::public.app_role
  or coach_id = auth.uid()
  or (
    coach_id is null
    and exists (
      select 1
      from public.coach_clients cc
      where cc.client_id = check_ins.client_id
        and cc.coach_id = auth.uid()
        and cc.status = 'active'
    )
  )
);

create policy "check_ins_insert_client" on public.check_ins
for insert with check (
  client_id = auth.uid()
  and (
    coach_id is null
    or exists (
      select 1
      from public.coach_clients cc
      where cc.client_id = auth.uid()
        and cc.coach_id = check_ins.coach_id
        and cc.status = 'active'
    )
  )
);

create policy "check_ins_update_assigned_coach" on public.check_ins
for update using (
  public.current_profile_role() = 'admin'::public.app_role
  or coach_id = auth.uid()
  or (
    coach_id is null
    and exists (
      select 1
      from public.coach_clients cc
      where cc.client_id = check_ins.client_id
        and cc.coach_id = auth.uid()
        and cc.status = 'active'
    )
  )
) with check (
  public.current_profile_role() = 'admin'::public.app_role
  or coach_id = auth.uid()
  or (
    coach_id is null
    and exists (
      select 1
      from public.coach_clients cc
      where cc.client_id = check_ins.client_id
        and cc.coach_id = auth.uid()
        and cc.status = 'active'
    )
  )
);

create policy "coach_feedback_select_related" on public.coach_feedback
for select using (
  client_id = auth.uid()
  or public.current_profile_role() = 'admin'::public.app_role
  or coach_id = auth.uid()
);

create policy "coach_feedback_insert_coach" on public.coach_feedback
for insert with check (
  public.current_profile_role() = 'admin'::public.app_role
  or (
    coach_id = auth.uid()
    and exists (
      select 1
      from public.coach_clients cc
      where cc.client_id = coach_feedback.client_id
        and cc.coach_id = auth.uid()
        and cc.status = 'active'
    )
  )
);

create policy "coach_feedback_update_coach" on public.coach_feedback
for update using (
  public.current_profile_role() = 'admin'::public.app_role
  or coach_id = auth.uid()
) with check (
  public.current_profile_role() = 'admin'::public.app_role
  or coach_id = auth.uid()
);

create policy "non_scale_wins_select_related" on public.non_scale_wins
for select using (
  client_id = auth.uid()
  or public.current_profile_role() = 'admin'::public.app_role
  or exists (
    select 1
    from public.coach_clients cc
    where cc.client_id = non_scale_wins.client_id
      and cc.coach_id = auth.uid()
      and cc.status = 'active'
  )
);

create policy "non_scale_wins_insert_client" on public.non_scale_wins
for insert with check (client_id = auth.uid());

create policy "non_scale_wins_write_admin" on public.non_scale_wins
for all using (public.current_profile_role() = 'admin'::public.app_role)
with check (public.current_profile_role() = 'admin'::public.app_role);

drop policy if exists "profiles_select_self_or_coach" on public.profiles;

create policy "profiles_select_self_coach_public_or_coach" on public.profiles
for select using (
  id = auth.uid()
  or role in ('coach'::public.app_role, 'admin'::public.app_role)
  or public.is_coach_or_admin()
);

create policy "invitations_select_owner_or_coach" on public.invitations
for select using (
  public.is_coach_or_admin()
  or (
    accepted_at is null
    and (expires_at is null or expires_at > now())
    and (
      email is null
      or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
);

create policy "invitations_insert_coach" on public.invitations
for insert with check (public.is_coach_or_admin());

create policy "invitations_update_owner_or_coach" on public.invitations
for update using (
  public.is_coach_or_admin()
  or (
    accepted_at is null
    and (expires_at is null or expires_at > now())
    and (
      email is null
      or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
) with check (
  public.is_coach_or_admin()
  or (
    email is null
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "conversation_members_read_related" on public.conversation_members;

create policy "conversation_members_read_thread_members" on public.conversation_members
for select using (
  public.is_conversation_member(conversation_id)
  or public.is_coach_or_admin()
);

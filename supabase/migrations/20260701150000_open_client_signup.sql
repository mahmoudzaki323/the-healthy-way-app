create or replace function public.create_client_profile(
  p_full_name text
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
    'client'::public.app_role
  )
  returning * into v_profile;

  perform set_config('app.accepting_invitation', '', true);

  return v_profile;
exception
  when others then
    perform set_config('app.accepting_invitation', '', true);
    raise;
end;
$$;

grant execute on function public.create_client_profile(text) to authenticated;

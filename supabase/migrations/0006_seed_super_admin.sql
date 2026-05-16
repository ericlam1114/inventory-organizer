-- Seed the super_admin. Reads email from a Supabase Vault secret, not a plain
-- env var, so this works correctly against the linked remote project.
--
-- Before running: store the secret in Vault:
--   supabase secrets set seed_super_admin_email=janelle@straightenuphome.com
--
-- This migration is fully idempotent:
--   • If the vault secret is absent          → NOTICE + skip
--   • If a profile with that email exists    → NOTICE + skip

do $$
declare
  v_email text;
  v_uid   uuid;
begin
  -- Read from vault (requires pg_vault / Supabase Vault extension)
  select decrypted_secret into v_email
  from vault.decrypted_secrets
  where name = 'seed_super_admin_email'
  limit 1;

  if v_email is null then
    raise notice 'seed_super_admin_email not set in vault; skipping seed';
    return;
  end if;

  -- Skip if a profile with this email already exists (idempotency guard)
  if exists (select 1 from public.profiles where email = v_email) then
    raise notice 'super_admin profile for % already exists; skipping', v_email;
    return;
  end if;

  -- Create the auth.users row.
  -- Column set mirrors the working INSERT in supabase/tests/0004_rls_test.sql.
  -- encrypted_password is NULL — magic-link-only login; no password is set.
  insert into auth.users (
    id,
    instance_id,
    email,
    aud,
    role,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
  )
  values (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    v_email,
    'authenticated',
    'authenticated',
    null,
    now(),
    now(),
    now(),
    '{}'::jsonb,
    '{}'::jsonb
  )
  returning id into v_uid;

  -- Profile row
  insert into public.profiles (id, email, display_name)
  values (v_uid, v_email, 'Janelle Lam');

  -- Org-level super_admin grant
  insert into public.org_roles (user_id, role)
  values (v_uid, 'super_admin');

  raise notice 'Seeded super_admin: % (%)', v_email, v_uid;
end $$;

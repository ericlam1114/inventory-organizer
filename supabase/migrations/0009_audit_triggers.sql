-- Slice 03: audit log trigger + move_item / change_item_status RPCs

-- 1. profiles.deleted_at (idempotent)
alter table public.profiles add column if not exists deleted_at timestamptz;

-- 2. log_item_change trigger function (security definer to bypass RLS on audit_log)
create or replace function public.log_item_change()
returns trigger language plpgsql security definer as $$
declare
  v_note text := nullif(current_setting('audit.note', true), '');
  v_client uuid;
begin
  v_client := (
    select client_id from public.locations
    where id = coalesce(NEW.location_id, OLD.location_id)
  );

  if TG_OP = 'INSERT' then
    insert into public.audit_log (user_id, client_id, target_type, target_id, action, before, after)
    values (auth.uid(), v_client, 'item', NEW.id, 'create', null, to_jsonb(NEW));
    return NEW;
  end if;

  if TG_OP = 'DELETE' then
    insert into public.audit_log (user_id, client_id, target_type, target_id, action, before, after)
    values (auth.uid(), v_client, 'item', OLD.id, 'delete', to_jsonb(OLD), null);
    return OLD;
  end if;

  -- UPDATE
  if NEW.location_id is distinct from OLD.location_id then
    insert into public.audit_log (user_id, client_id, target_type, target_id, action, before, after)
    values (
      auth.uid(), v_client, 'item', NEW.id, 'move',
      jsonb_build_object('location_id', OLD.location_id, 'note', v_note),
      jsonb_build_object('location_id', NEW.location_id)
    );
  end if;

  if NEW.status is distinct from OLD.status then
    insert into public.audit_log (user_id, client_id, target_type, target_id, action, before, after)
    values (
      auth.uid(), v_client, 'item', NEW.id, 'status_change',
      jsonb_build_object('status', OLD.status, 'note', v_note),
      jsonb_build_object('status', NEW.status)
    );
  end if;

  return NEW;
end $$;

drop trigger if exists items_audit on public.items;
create trigger items_audit
  after insert or update or delete on public.items
  for each row execute function public.log_item_change();

-- 3. RPC: move_item (security invoker — RLS still applies)
create or replace function public.move_item(
  p_item_id uuid,
  p_new_location_id uuid,
  p_note text default null
)
returns public.items language plpgsql security invoker as $$
declare
  v_row public.items;
begin
  perform set_config('audit.note', coalesce(p_note, ''), true);
  update public.items set location_id = p_new_location_id
    where id = p_item_id returning * into v_row;
  return v_row;
end $$;

-- 4. RPC: change_item_status (security invoker — RLS still applies)
create or replace function public.change_item_status(
  p_item_id uuid,
  p_new_status text,
  p_note text default null
)
returns public.items language plpgsql security invoker as $$
declare
  v_row public.items;
begin
  perform set_config('audit.note', coalesce(p_note, ''), true);
  update public.items set status = p_new_status
    where id = p_item_id returning * into v_row;
  return v_row;
end $$;

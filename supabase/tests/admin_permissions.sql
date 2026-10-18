-- Run as postgres against a disposable/test database after migration 0019.
-- Every write is rolled back; no real user or role assignment is needed.
begin;

do $$
declare
  client_role text;
  statement text;
  table_name text;
begin
  foreach table_name in array array['roles', 'role_permissions', 'user_roles'] loop
    if not (select relrowsecurity from pg_class
            where oid = ('public.' || table_name)::regclass) then
      raise exception 'RLS disabled on %', table_name;
    end if;
  end loop;

  foreach client_role in array array['anon', 'authenticated'] loop
    execute format('set local role %I', client_role);
    foreach statement in array array[
      'select * from public.roles',
      'select * from public.role_permissions',
      'select * from public.user_roles',
      'insert into public.roles(id, description) values (''self-promoted'', ''attack'')',
      'insert into public.role_permissions(role_id, permission) values (''administrator'', ''attack'')',
      'insert into public.user_roles(user_id, role_id) values (''00000000-0000-0000-0000-000000000045'', ''administrator'')',
      'update public.roles set description = ''attack'' where id = ''administrator''',
      'update public.role_permissions set permission = ''attack'' where role_id = ''administrator''',
      'update public.user_roles set role_id = ''administrator''',
      'delete from public.roles where id = ''administrator''',
      'delete from public.role_permissions where role_id = ''administrator''',
      'delete from public.user_roles'
    ] loop
      begin
        execute statement;
        raise exception 'Unexpectedly allowed for %: %', client_role, statement;
      exception when insufficient_privilege then
        null; -- Required failure: SQLSTATE 42501, not a foreign-key error.
      end;
    end loop;
    reset role;
  end loop;
end $$;

set local role service_role;
do $$
begin
  if not exists (select 1 from public.role_permissions
                 where role_id = 'administrator' and permission = 'admin.access') then
    raise exception 'Missing administrator permission or service read access';
  end if;

  insert into public.roles (id, description) values ('issue45-test', 'Synthetic test role');
  insert into public.role_permissions (role_id, permission) values ('issue45-test', 'test.access');
  update public.roles set description = 'Updated test role' where id = 'issue45-test';
  delete from public.roles where id = 'issue45-test';
  if exists (select 1 from public.role_permissions where role_id = 'issue45-test') then
    raise exception 'Role permission cascade failed';
  end if;
end $$;
reset role;

rollback;

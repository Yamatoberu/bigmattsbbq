-- Application permissions are server-controlled, never derived from user metadata.
create table public.roles (
  id text primary key check (length(trim(id)) > 0),
  description text not null,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id text not null references public.roles(id) on delete cascade,
  permission text not null check (length(trim(permission)) > 0),
  primary key (role_id, permission)
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id text not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create index user_roles_role_id_idx on public.user_roles(role_id);

-- No client policies: even authenticated administrators use a guarded server.
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;

revoke all on public.roles, public.role_permissions, public.user_roles
  from public, anon, authenticated;
grant select, insert, update, delete
  on public.roles, public.role_permissions, public.user_roles to service_role;

insert into public.roles (id, description)
values ('administrator', 'Access to the administrative application');
insert into public.role_permissions (role_id, permission)
values ('administrator', 'admin.access');

-- Owner assignment is intentionally an explicit out-of-band operation.

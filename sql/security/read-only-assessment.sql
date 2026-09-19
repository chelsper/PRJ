-- Run with the app credentials. No credentials or donor records are returned.
begin read only;
select current_user, rolsuper, rolcreaterole, rolcreatedb, rolbypassrls
from pg_roles where rolname = current_user;

select n.nspname as schema_name, c.relname as owned_table
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and c.relowner = (select oid from pg_roles where rolname = current_user);

select to_regclass('public.audit_log') as audit_table,
       to_regclass('public.rate_limit_events') as rate_limit_table;

select has_table_privilege(current_user, 'public.audit_log', 'UPDATE') as can_alter_audit,
       has_table_privilege(current_user, 'public.audit_log', 'DELETE') as can_delete_audit;

select ssl, version, cipher from pg_stat_ssl where pid = pg_backend_pid();
rollback;

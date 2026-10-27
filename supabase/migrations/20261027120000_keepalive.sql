-- Liveness probe for the scheduled keep-alive job.
-- Supabase pauses a free project after seven days without a database query, and
-- the project URL alone is answered by the edge. This runs a trivial statement
-- in Postgres and exposes no data; the anon role may execute it.
create function public.harf_keepalive()
returns integer language sql set search_path='' as $$ select 1 $$;
revoke all on function public.harf_keepalive() from public;
grant execute on function public.harf_keepalive() to anon, authenticated;

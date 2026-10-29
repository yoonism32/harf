-- Run only in an empty, disposable PostgreSQL database using psql -v ON_ERROR_STOP=1.
\if :{?skip_setup}
\else
create role anon;
create role authenticated;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$
 select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid;
$$;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
\ir ../supabase/migrations/20261002192022_account_sync.sql
\ir ../supabase/migrations/20261028235500_passage_learning.sql
\endif

do $$
declare response jsonb;
begin
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
 response := public.harf_sync_v3(0,0,'[
  {"collection":"notes","key":"ayah-1-5","value":{"id":"ayah-1-5","text":"My reflection","updatedAt":"2026-10-28T23:00:00Z"}},
  {"collection":"meta","key":"passageLearning","value":{"range":{"reference":"1:5","end":7,"current":6},"assessments":[]}},
  {"collection":"passageCards","key":"1:5|1:6","value":{"id":"1:5|1:6"}}
 ]');
 if response->>'version' <> '1' then raise exception 'Upload failed'; end if;
 response := public.harf_sync_v3(0);
 if jsonb_array_length(response->'changes') <> 3 then raise exception 'Round trip failed'; end if;
 response := public.harf_sync_v3(0,0,'[]');
 if response->>'conflict' <> 'true' then raise exception 'Stale device was accepted'; end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
 response := public.harf_sync_v3(0);
 if jsonb_array_length(response->'changes') <> 0 then raise exception 'Account isolation failed'; end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
 response := public.harf_sync_v3(1,1,'[{"collection":"notes","key":"ayah-1-5","value":null},{"collection":"meta","key":"passageLearning","value":null},{"collection":"passageCards","key":"1:5|1:6","value":null}]');
 response := public.harf_sync_v3(1);
 if jsonb_array_length(response->'changes') <> 3 or exists(select 1 from jsonb_array_elements(response->'changes') item where item->'value' <> 'null'::jsonb) then raise exception 'Tombstones lost'; end if;
 if has_function_privilege('anon','public.harf_sync_v3(bigint,bigint,jsonb)','execute') then raise exception 'Anonymous access allowed'; end if;
 if has_table_privilege('authenticated','harf_private.records','select') then raise exception 'Direct table access allowed'; end if;
 perform set_config('request.jwt.claim.sub','',true);
 begin
  perform public.harf_sync_v3(0);
  raise exception 'Missing account accepted';
 exception when insufficient_privilege then null;
 end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
set role authenticated;
select public.harf_sync_v3(0)->>'version' as authenticated_round_trip_version;
reset role;

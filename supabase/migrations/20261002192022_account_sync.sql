-- Private storage; the only public interface is the authenticated RPC below.
create schema if not exists harf_private;
revoke all on schema harf_private from public, anon;
grant usage on schema harf_private to authenticated;
create table harf_private.accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 version bigint not null default 0 check(version >= 0),
 updated_at timestamptz not null default now()
);
create table harf_private.records (
 user_id uuid not null references harf_private.accounts(user_id) on delete cascade,
 collection text not null check(collection in ('meta','cards','reviews','sessions','notes','bookmarks')),
 key text not null check(length(key) between 1 and 120),
 value jsonb,
 version bigint not null,
 primary key(user_id, collection, key)
);
create index records_user_version on harf_private.records(user_id, version);
alter table harf_private.accounts enable row level security;
alter table harf_private.records enable row level security;
create policy own_account on harf_private.accounts for select to authenticated using ((select auth.uid())=user_id);
create policy own_records on harf_private.records for select to authenticated using ((select auth.uid())=user_id);
revoke all on harf_private.accounts, harf_private.records from public, anon, authenticated;

-- One account lock serializes changes and produces a consistent incremental read.
-- Conflicting devices must resolve explicitly; never silently overwrite reviews.
create function harf_private.sync(since_version bigint, expected_version bigint default null, changes jsonb default '[]')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 owner_id uuid := auth.uid();
 current_version bigint;
 item jsonb;
 result jsonb;
begin
 if owner_id is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if since_version is null or since_version<0 or (expected_version is not null and expected_version<0)
   or changes is null or jsonb_typeof(changes)<>'array' then raise exception 'Invalid sync request'; end if;
 if jsonb_array_length(changes)>1000 or octet_length(changes::text)>2097152 then raise exception 'Sync batch too large'; end if;
 insert into harf_private.accounts(user_id) values(owner_id) on conflict do nothing;
 select version into current_version from harf_private.accounts where user_id=owner_id for update;
 if expected_version is not null and expected_version<>current_version then
   return jsonb_build_object('conflict',true,'version',current_version,'changes','[]'::jsonb);
 end if;
 if jsonb_array_length(changes)>0 then
  if expected_version is null then raise exception 'Expected version required'; end if;
  for item in select value from jsonb_array_elements(changes) loop
   if jsonb_typeof(item)<>'object' or not(item ? 'collection' and item ? 'key' and item ? 'value')
     or item->>'collection' not in ('meta','cards','reviews','sessions','notes','bookmarks')
     or jsonb_typeof(item->'key')<>'string' or length(item->>'key') not between 1 and 120
     or item->>'key' in ('__proto__','constructor','prototype') then raise exception 'Invalid sync record'; end if;
   if item->>'collection'='meta' and item->>'key' not in ('settings','activeSessionId','priorityEntries','lastVerse') then raise exception 'Invalid preference'; end if;
   if item->>'collection'<>'meta' and item->'value'<>'null'::jsonb and
     (jsonb_typeof(item->'value')<>'object' or (item->'value'->>'id') is distinct from item->>'key') then raise exception 'Record ID mismatch'; end if;
  end loop;
  current_version:=current_version+1;
  for item in select value from jsonb_array_elements(changes) loop
   insert into harf_private.records(user_id,collection,key,value,version)
   values(owner_id,item->>'collection',item->>'key',nullif(item->'value','null'::jsonb),current_version)
   on conflict(user_id,collection,key) do update set value=excluded.value,version=excluded.version;
  end loop;
  update harf_private.accounts set version=current_version,updated_at=now() where user_id=owner_id;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('collection',collection,'key',key,'value',value) order by collection,key),'[]'::jsonb)
 into result from harf_private.records where user_id=owner_id and version>since_version;
 return jsonb_build_object('conflict',false,'version',current_version,'changes',result);
end $$;
revoke all on function harf_private.sync(bigint,bigint,jsonb) from public, anon;
grant execute on function harf_private.sync(bigint,bigint,jsonb) to authenticated;
create function public.harf_sync(since_version bigint, expected_version bigint default null, changes jsonb default '[]')
returns jsonb language sql security invoker set search_path='' as $$
 select harf_private.sync(since_version,expected_version,changes);
$$;
revoke all on function public.harf_sync(bigint,bigint,jsonb) from public, anon;
grant execute on function public.harf_sync(bigint,bigint,jsonb) to authenticated;

create function harf_private.delete_account() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 delete from auth.users where id=auth.uid();
end $$;
revoke all on function harf_private.delete_account() from public, anon;
grant execute on function harf_private.delete_account() to authenticated;
create function public.harf_delete_account() returns void language sql security invoker set search_path='' as $$
 select harf_private.delete_account();
$$;
revoke all on function public.harf_delete_account() from public, anon;
grant execute on function public.harf_delete_account() to authenticated;

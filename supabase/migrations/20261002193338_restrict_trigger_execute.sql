-- The platform-created event trigger is not an application RPC.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

import {createClient, type SupabaseClient} from '@supabase/supabase-js';
export const accountConfigured=!!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
let client:SupabaseClient|undefined;
export function accountClient(){
 if(!accountConfigured)throw Error('Account connection is not configured.');
 return client??=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{
  auth:{flowType:'pkce',detectSessionInUrl:false},
  global:{fetch:(input,init)=>fetch(input,{...init,signal:init?.signal?AbortSignal.any([init.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)})},
 });
}
export type Identity={id:string;email:string}|null;
let initialized:Promise<Identity>|undefined;
let owner:Identity=null;
let changed=false;
export function currentOwner(){return owner;}
export function ensureIdentity(){
 if(typeof window==='undefined'||!accountConfigured)return Promise.resolve(null);
 return initialized??=(async()=>{
  const client=accountClient();
  const {data,error}=await client.auth.getSession();
  if(error)throw error;
  owner=data.session?{id:data.session.user.id,email:data.session.user.email??''}:null;
  client.auth.onAuthStateChange((_event,session)=>{
   if((session?.user.id??null)!==(owner?.id??null)){
    changed=true;
    // Reload makes every mounted view and pending command release the old identity.
    window.location.replace('/profile');
   }
  });
  return owner;
 })();
}
export async function databaseIdentity(){
 const identity=await ensureIdentity();
 if(changed)throw Error('Your account changed. Reload before continuing.');
 return identity;
}

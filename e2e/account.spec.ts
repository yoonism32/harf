import {test,expect,type BrowserContext} from '@playwright/test';
import { loadEnvConfig } from '@next/env';
test.use({serviceWorkers:'block'});
test.beforeEach(async({context})=>{await context.route('https://*.supabase.co/**',route=>route.abort());});
loadEnvConfig(process.cwd());
const project=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co').hostname.split('.')[0];
const email='personal@example.test';
const password='A unique test passphrase 42!';
function session(expires=Math.floor(Date.now()/1000)+3600) {
 const id='00000000-0000-4000-8000-000000000001';
 const user={id,email,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
 const access_token=[{alg:'HS256',typ:'JWT'},{sub:id,exp:expires,role:'authenticated'},'signature'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.');
 return {access_token,refresh_token:'test-refresh',expires_in:3600,expires_at:expires,token_type:'bearer',user};
}
async function mockAccount(context:BrowserContext) {
 // An unhandled auth request must never reach the real project.
 await context.route('https://*.supabase.co/**',route=>route.abort());
 await context.route('**/auth/v1/user',route=>route.fulfill({json:{user:session().user}}));
 let version=0;
 const records=new Map<string,{collection:string;key:string;value:unknown;version:number}>();
 // Deliberately model a legacy server without v3 to keep fallback coverage after the live migration.
 await context.route('**/rest/v1/rpc/harf_sync_v3',route=>route.fulfill({status:404,json:{code:'PGRST202',message:'Could not find the function public.harf_sync_v3'}}));
 await context.route('**/rest/v1/rpc/harf_sync',async route=>{
  const body=route.request().postDataJSON();
  if(body.expected_version!==null&&body.expected_version!==version){await route.fulfill({json:{conflict:true,version,changes:[]}});return;}
  if(body.changes.length){version++;for(const record of body.changes)records.set(`${record.collection}/${record.key}`,{...record,version});}
  await route.fulfill({json:{conflict:false,version,changes:[...records.values()].filter(r=>r.version>body.since_version)}});
 });
}

test('password sign-in survives reload, a new tab, and an expired access token without email',async({page,context})=>{
 await mockAccount(context);
 let signIns=0,refreshes=0,emailRequests=0;
 await context.route('**/auth/v1/token**',async route=>{
  const grant=new URL(route.request().url()).searchParams.get('grant_type');
  const body=route.request().postDataJSON();
  if(grant==='password'){signIns++;expect(body.email).toBe(email);expect(body.password).toBe(password);}
  else {expect(grant).toBe('refresh_token');expect(body.refresh_token).toBe('test-refresh');refreshes++;}
  await route.fulfill({json:session()});
 });
 context.on('request',request=>{if(/\/auth\/v1\/(otp|signup|recover|resend)/.test(request.url()))emailRequests++;});
 await page.goto('/profile');
 await page.getByRole('link',{name:'Sign in or create an account'}).click();
 await page.getByLabel('Email address').fill(email);
 await page.getByLabel('Password',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page).toHaveURL(/\/profile$/);
 await expect(page.getByText(email,{exact:true})).toBeVisible();
 await expect(page.getByRole('status')).toHaveText('Progress synced.');
 await page.reload();
 await expect(page.getByText(email,{exact:true})).toBeVisible();
 await page.goto('/today');
 await expect(page.locator('footer')).toContainText('Signed in. Progress saves on this device');
 await expect(page.locator('footer')).not.toContainText('Guest progress');
 await page.goto('/login');
 await expect(page).toHaveURL(/\/profile$/);
 const second=await context.newPage();
 await second.goto('/profile');
 await expect(second.getByText(email,{exact:true})).toBeVisible();
 await second.close();
 await page.goto('/offline.html');
 await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:`sb-${project}-auth-token`,value:session(Math.floor(Date.now()/1000)-120)});
 await page.goto('/profile');
 await expect(page.getByText(email,{exact:true})).toBeVisible();
 await expect(page.getByRole('status')).toHaveText('Progress synced.');
 expect(signIns).toBe(1);expect(refreshes).toBeGreaterThan(0);expect(emailRequests).toBe(0);
});

test('new account validates passwords and completes email confirmation',async({page,context,baseURL})=>{
 await mockAccount(context);
 let registrations=0;
 await context.route('**/auth/v1/signup**',async route=>{
  registrations++;
  expect(route.request().postDataJSON()).toMatchObject({email,password});
  expect(new URL(route.request().url()).searchParams.get('redirect_to')).toBe(new URL('/auth/callback',baseURL).href);
  await route.fulfill({json:{user:session().user,session:null}});
 });
 await context.route('**/auth/v1/token**',async route=>{
  expect(new URL(route.request().url()).searchParams.get('grant_type')).toBe('pkce');
  expect(route.request().postDataJSON().code_verifier).toBeTruthy();
  await route.fulfill({json:session()});
 });
 await page.goto('/signup');
 await page.getByLabel('Email address').fill(email);
 await page.getByLabel('New password',{exact:true}).fill(password);
 await page.getByLabel('Confirm new password').fill('Does not match');
 await page.getByRole('button',{name:'Create account'}).click();
 await expect(page.getByRole('main').getByRole('alert')).toHaveText('The passwords do not match.');expect(registrations).toBe(0);
 await page.getByLabel('Confirm new password').fill(password);
 await page.getByRole('button',{name:'Create account'}).click();
 await expect(page.getByRole('status')).toContainText('Check your email');expect(registrations).toBe(1);
 await page.goto('/auth/callback?code=test-confirmation');
 await expect(page).toHaveURL(/\/profile$/);
 await expect(page.getByText(email,{exact:true})).toBeVisible();
});

test('recovery opens password setup and updates the same account',async({page,context,baseURL})=>{
 await mockAccount(context);
 let updates=0;
 await context.route('**/auth/v1/recover**',async route=>{
  expect(route.request().postDataJSON().email).toBe(email);
  expect(new URL(route.request().url()).searchParams.get('redirect_to')).toBe(new URL('/auth/callback',baseURL).href);
  await route.fulfill({json:{}});
 });
 await context.route('**/auth/v1/token**',route=>route.fulfill({json:session()}));
 await context.route('**/auth/v1/user',async route=>{
  if(route.request().method()==='PUT'){updates++;expect(route.request().postDataJSON()).toMatchObject({password});}
  await route.fulfill({json:{user:session().user}});
 });
 // Start on Profile to exercise the existing guest identity listener too.
 await page.goto('/profile');
 await page.getByRole('link',{name:'Sign in or create an account'}).click();
 await page.getByRole('link',{name:'Forgot your password or previously used email links?'}).click();
 // Wait for client navigation, or the email lands in the outgoing login form.
 await expect(page).toHaveURL(/\/forgot-password$/);
 await page.getByLabel('Email address').fill(email);
 await page.getByRole('button',{name:'Send password recovery email'}).click();
 await expect(page.getByRole('status')).toContainText('If an account exists');
 await page.goto('/auth/callback?code=test-recovery');
 await expect(page).toHaveURL(/\/account\/password$/);
 await expect(page.getByText(`Account: ${email}`)).toBeVisible();
 await page.getByLabel('New password',{exact:true}).fill(password);
 await page.getByLabel('Confirm new password').fill(password);
 await page.getByRole('button',{name:'Save password'}).click();
 await expect(page.getByRole('status')).toContainText('Password saved');expect(updates).toBe(1);
 await page.getByRole('link',{name:'Back to Profile'}).click();
 await expect(page.getByText(email,{exact:true})).toBeVisible();
 await expect(page.getByRole('status')).toHaveText('Progress synced.');
});

test('existing email-link accounts can set a password from Profile without another email',async({page,context})=>{
 await mockAccount(context);
 await page.goto('/offline.html');
 await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:`sb-${project}-auth-token`,value:session()});
 let updates=0;
 await context.route('**/auth/v1/user',async route=>{
  if(route.request().method()==='PUT'){updates++;expect(route.request().postDataJSON().password).toBe(password);}
  await route.fulfill({json:{user:session().user}});
 });
 await page.goto('/profile');
 await page.getByRole('link',{name:'Set or change password'}).click();
 await page.getByLabel('New password',{exact:true}).fill(password);
 await page.getByLabel('Confirm new password').fill(password);
 await page.getByRole('button',{name:'Save password'}).click();
 await expect(page.getByRole('status')).toContainText('Password saved');expect(updates).toBe(1);
});

test('invalid passwords, email limits, expired links and signed-out password setup have clear errors',async({page})=>{
 await page.route('**/auth/v1/token**',route=>route.fulfill({status:400,json:{error_code:'invalid_credentials',msg:'Invalid login credentials'}}));
 await page.goto('/login');
 await page.getByLabel('Email address').fill(email);
 await page.getByLabel('Password',{exact:true}).fill('wrong password');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page.getByRole('main').getByRole('alert')).toContainText('Email or password not recognised');
 await page.route('**/auth/v1/token**',route=>route.fulfill({status:400,json:{error_code:'email_not_confirmed',msg:'Email not confirmed'}}));
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page.getByRole('button',{name:'Resend confirmation email'})).toBeVisible();
 await page.route('**/auth/v1/resend**',route=>route.fulfill({json:{}}));
 await page.getByRole('button',{name:'Resend confirmation email'}).click();
 await expect(page.getByRole('status')).toContainText('confirmation link');
 await page.goto('/forgot-password');
 await page.route('**/auth/v1/recover**',route=>route.fulfill({status:429,json:{error_code:'over_email_send_rate_limit',msg:'email rate limit exceeded'}}));
 await page.getByLabel('Email address').fill(email);
 await page.getByRole('button',{name:'Send password recovery email'}).click();
 await expect(page.getByRole('main').getByRole('alert')).toContainText('Password sign-in is still available');
 await page.goto('/auth/callback?error_code=otp_expired#error=access_denied');
 await expect(page.getByRole('main').getByRole('alert')).toContainText('invalid or has expired');
 await expect(page).toHaveURL(/\/auth\/callback$/);
 await page.goto('/account/password');
 await expect(page.getByText('Sign in or open a password recovery email before choosing a password.')).toBeVisible();
 await expect(page.getByRole('button',{name:'Save password'})).toHaveCount(0);
});

test('account settings save offline and sync after reconnecting',async({page,context})=>{
 const id='00000000-0000-4000-8000-000000000001';
 const user={id,email:'personal@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:new Date().toISOString()};
 const expires=Math.floor(Date.now()/1000)+3600;
 const jwt=[{alg:'HS256',typ:'JWT'},{sub:id,exp:expires,role:'authenticated'},'signature'].map(x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url')).join('.');
 await page.addInitScript(({key,session})=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem(key,JSON.stringify(session));sessionStorage.setItem('seeded','yes');}}, {key:`sb-${project}-auth-token`,session:{access_token:jwt,refresh_token:'test-refresh',expires_in:3600,expires_at:expires,token_type:'bearer',user}});
 let version=0;
 const records=new Map<string,{collection:string;key:string;value:unknown;version:number}>();
 await page.route('**/auth/v1/**',route=>route.fulfill({json:{user}}));
 await page.route('**/rest/v1/rpc/harf_sync_v3',route=>route.fulfill({status:404,json:{code:'PGRST202',message:'Could not find the function public.harf_sync_v3'}}));
 await page.route('**/rest/v1/rpc/harf_sync',async route=>{
  const body=route.request().postDataJSON();
  if(body.expected_version!==null&&body.expected_version!==version){await route.fulfill({json:{conflict:true,version,changes:[]}});return;}
  if(body.changes.length){version++;for(const record of body.changes)records.set(`${record.collection}/${record.key}`,{...record,version});}
  await route.fulfill({json:{conflict:false,version,changes:[...records.values()].filter(r=>r.version>body.since_version)}});
 });
 await page.goto('/profile');
 await expect(page.getByText('personal@example.test',{exact:true})).toBeVisible();
 await expect(page.getByRole('status')).toHaveText('Progress synced.');
 await page.goto('/settings');
 await context.setOffline(true);
 await page.getByLabel('New vocabulary per day').selectOption('3');
 await expect(page.getByText('Preference saved.',{exact:true})).toBeVisible();
 await context.setOffline(false);
 await page.getByRole('link',{name:'Profile',exact:true}).first().click();
 await page.getByRole('button',{name:'Sync now'}).click();
 await expect(page.getByRole('status')).toHaveText('Progress synced.');
 expect((records.get('meta/settings')!.value as {dailyNew:number}).dailyNew).toBe(3);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();
 await expect(page.getByText('You are studying as a guest.')).toBeVisible();
});

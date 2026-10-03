import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
test.beforeEach(async({context})=>{await context.route('https://*.supabase.co/**',route=>route.abort());});
const project='yudbwuaurqhgtkewiwjh';
test('guest profile links to accessible email sign-in and handles a sent link',async({page})=>{
 await page.goto('/profile');
 await expect(page.getByText('You are studying as a guest.')).toBeVisible();
 await page.getByRole('link',{name:'Sign in or create an account'}).click();
 await page.route('**/auth/v1/otp**',route=>route.fulfill({json:{}}));
 await page.getByLabel('Email address').fill('personal@example.test');
 await page.getByRole('button',{name:'Send sign-in link'}).click();
 await expect(page.getByRole('status')).toContainText('Check your email');
 await page.goto('/auth/callback');
 await expect(page.getByRole('main').getByRole('alert')).toContainText('missing or expired');
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

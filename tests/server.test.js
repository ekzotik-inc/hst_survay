import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const temp = await mkdtemp(join(tmpdir(),'hst-unlock-'));
process.env.PORT = '0';
process.env.DATA_FILE = join(temp,'app.json');
const mod = await import('../server.js');
if (!mod.server.listening) await once(mod.server,'listening');
const base = `http://127.0.0.1:${mod.server.address().port}`;

test('password hashing is salted and verifiable',()=>{
  const a=mod.hashPassword('correct horse battery staple');
  const b=mod.hashPassword('correct horse battery staple');
  assert.notEqual(a,b);
  assert.equal(mod.verifyPassword('correct horse battery staple',a),true);
  assert.equal(mod.verifyPassword('wrong',a),false);
});

test('health endpoint and security headers',async()=>{
  const res=await fetch(`${base}/api/health`);
  assert.equal(res.status,200);
  assert.equal(res.headers.get('x-content-type-options'),'nosniff');
  assert.deepEqual(await res.json(),{ok:true,version:'1.0.0'});
});

test('login, session and dashboard flow',async()=>{
  const login=await fetch(`${base}/api/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({login:'hst01',password:'Demo-HST-2026!'})});
  assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const payload=await login.json();
  assert.ok(payload.csrf);
  const dash=await fetch(`${base}/api/dashboard`,{headers:{cookie}});
  assert.equal(dash.status,200);
  const data=await dash.json();
  assert.equal(data.stats.total,3);
  assert.equal(data.logs.length,4);
  const created=await fetch(`${base}/api/surveys`,{method:'POST',headers:{cookie,'content-type':'application/json','x-csrf-token':payload.csrf},body:JSON.stringify({audience:'LAS',startedAt:new Date(Date.now()-120000).toISOString(),completedAt:new Date().toISOString(),durationSec:120,status:'completed',consent:true,brand:'Winston',taste:'classic',problem:'odor',recommendation:'TEREA SILVER'})});
  assert.equal(created.status,201);
  const dash2=await fetch(`${base}/api/dashboard`,{headers:{cookie}});
  assert.equal((await dash2.json()).stats.total,4);
});

test.after(async()=>{ await new Promise(resolve=>mod.server.close(resolve)); await rm(temp,{recursive:true,force:true}); });

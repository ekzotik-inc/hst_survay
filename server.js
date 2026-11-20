import http from 'node:http';
import { readFile, writeFile, mkdir, rename, stat } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const DATA_DIR = join(ROOT, 'data');
const DB_PATH = process.env.DATA_FILE || join(DATA_DIR, 'app.json');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const SESSION_TTL = 8 * 60 * 60 * 1000;
const MAX_BODY = 64 * 1024;
const sessions = new Map();
const loginAttempts = new Map();
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon' };

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
function verifyPassword(password, stored) {
  const [salt, hex] = String(stored).split(':');
  if (!salt || !hex) return false;
  const a = Buffer.from(hex, 'hex');
  const b = scryptSync(password, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

const seed = () => ({
  version: 1,
  users: [{ id:'usr_hst01', login:'hst01', name:'Азиз Каримов', role:'HST', territory:'Ташкент · Юнусабад', passwordHash:hashPassword(process.env.DEMO_PASSWORD || 'Demo-HST-2026!'), active:true }],
  surveys: [
    { id:'cnt_demo_1', userId:'usr_hst01', audience:'LAS', startedAt:'2026-11-20T05:14:00.000Z', completedAt:'2026-11-20T05:18:12.000Z', durationSec:252, status:'completed', brand:'Winston', taste:'classic', problem:'odor', recommendation:'TEREA AMBER', consent:true },
    { id:'cnt_demo_2', userId:'usr_hst01', audience:'LAU', startedAt:'2026-11-19T11:03:00.000Z', completedAt:'2026-11-19T11:05:05.000Z', durationSec:125, status:'completed', currentStick:'TEREA TURQUOISE', satisfaction:'satisfied', consent:true },
    { id:'cnt_demo_3', userId:'usr_hst01', audience:'LAS', startedAt:'2026-11-19T08:41:00.000Z', completedAt:'2026-11-19T08:45:40.000Z', durationSec:280, status:'completed', brand:'Marlboro', taste:'intense', problem:'ash', recommendation:'TEREA AMBER', consent:true },
    { id:'cnt_demo_4', userId:'usr_hst01', audience:'LAS', startedAt:'2026-11-18T14:12:00.000Z', completedAt:null, durationSec:91, status:'abandoned', brand:'Other', taste:null, problem:null, recommendation:null, consent:true }
  ],
  audit: []
});

let db;
async function initDb() {
  await mkdir(DATA_DIR, { recursive:true });
  if (!existsSync(DB_PATH)) {
    db = seed();
    await persist();
  } else {
    db = JSON.parse(await readFile(DB_PATH, 'utf8'));
  }
}
let writeChain = Promise.resolve();
function persist() {
  writeChain = writeChain.then(async () => {
    const temp = `${DB_PATH}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(db, null, 2), { mode:0o600 });
    await rename(temp, DB_PATH);
  });
  return writeChain;
}

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
  if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
}
function json(res, code, body) {
  securityHeaders(res);
  res.statusCode = code;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.end(JSON.stringify(body));
}
function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(v => { const i=v.indexOf('='); return [v.slice(0,i).trim(), decodeURIComponent(v.slice(i+1))]; }));
}
function setCookie(res, name, value, options={}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', `SameSite=${options.sameSite || 'Strict'}`];
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}
function auth(req) {
  const token = cookies(req).hst_session;
  const session = token && sessions.get(token);
  if (!session || session.expiresAt < Date.now()) { if(token) sessions.delete(token); return null; }
  session.expiresAt = Date.now() + SESSION_TTL;
  return session;
}
function requireAuth(req, res) {
  const session = auth(req);
  if (!session) { json(res, 401, { error:'Требуется вход' }); return null; }
  return session;
}
function requireCsrf(req, res, session) {
  if (req.headers['x-csrf-token'] !== session.csrf) { json(res, 403, { error:'Недействительный защитный токен' }); return false; }
  return true;
}
async function body(req) {
  let size = 0; const chunks=[];
  for await (const chunk of req) { size += chunk.length; if (size > MAX_BODY) throw Object.assign(new Error('Слишком большой запрос'),{status:413}); chunks.push(chunk); }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw Object.assign(new Error('Некорректный JSON'),{status:400}); }
}
function cleanText(value, max=120) { return String(value ?? '').trim().slice(0,max); }
function clientKey(req, login='') { return `${req.socket.remoteAddress}|${login.toLowerCase()}`; }
function isLimited(key) {
  const now=Date.now(); const row=loginAttempts.get(key);
  if (!row || row.reset < now) { loginAttempts.set(key,{count:0,reset:now+10*60*1000}); return false; }
  return row.count >= 7;
}
function recordFailure(key) { const row=loginAttempts.get(key) || {count:0,reset:Date.now()+10*60*1000}; row.count++; loginAttempts.set(key,row); }
function audit(action, userId, details={}) { db.audit.unshift({ id:`aud_${randomBytes(6).toString('hex')}`, action, userId, at:new Date().toISOString(), details }); db.audit=db.audit.slice(0,500); }

const allowed = {
  audience:new Set(['LAS','LAU']), status:new Set(['completed','abandoned']),
  tastes:new Set(['classic','intense','soft','fresh','berry','citrus','capsule']),
  problems:new Set(['odor','ash','smoke','fire','taste','routine','wellbeing']),
  brands:new Set(['Winston','Camel','Sobranie','LD','Marlboro','L&M','Parliament','Other'])
};

async function api(req,res,url) {
  if (req.method==='GET' && url.pathname==='/api/health') return json(res,200,{ok:true,version:'1.0.0'});
  if (req.method==='POST' && url.pathname==='/api/login') {
    const data=await body(req); const login=cleanText(data.login,60); const password=String(data.password||''); const key=clientKey(req,login);
    if (isLimited(key)) return json(res,429,{error:'Слишком много попыток. Повторите позже.'});
    const user=db.users.find(u=>u.active && u.login.toLowerCase()===login.toLowerCase());
    if (!user || !verifyPassword(password,user.passwordHash)) { recordFailure(key); return json(res,401,{error:'Неверный логин или пароль'}); }
    loginAttempts.delete(key); const token=randomBytes(32).toString('base64url'); const csrf=randomBytes(24).toString('base64url');
    sessions.set(token,{userId:user.id,csrf,expiresAt:Date.now()+SESSION_TTL}); audit('login',user.id); await persist();
    setCookie(res,'hst_session',token,{httpOnly:true,maxAge:SESSION_TTL/1000});
    return json(res,200,{user:{name:user.name,role:user.role,territory:user.territory},csrf});
  }
  if (req.method==='GET' && url.pathname==='/api/session') {
    const session=requireAuth(req,res); if(!session) return; const user=db.users.find(u=>u.id===session.userId);
    return json(res,200,{user:{name:user.name,role:user.role,territory:user.territory},csrf:session.csrf});
  }
  if (req.method==='POST' && url.pathname==='/api/logout') {
    const session=requireAuth(req,res); if(!session) return; if(!requireCsrf(req,res,session)) return;
    const token=cookies(req).hst_session; sessions.delete(token); audit('logout',session.userId); await persist(); setCookie(res,'hst_session','',{httpOnly:true,maxAge:0}); return json(res,200,{ok:true});
  }
  if (req.method==='GET' && url.pathname==='/api/dashboard') {
    const session=requireAuth(req,res); if(!session) return; const rows=db.surveys.filter(s=>s.userId===session.userId).sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt));
    const dateKey=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tashkent',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
    const completed=rows.filter(s=>s.status==='completed'); const today=dateKey(new Date()); const todayCount=completed.filter(s=>s.completedAt&&dateKey(s.completedAt)===today).length;
    const last7=Array.from({length:7},(_,i)=>{ const d=new Date(); d.setUTCDate(d.getUTCDate()-(6-i)); const date=dateKey(d); return {date,count:completed.filter(s=>s.completedAt&&dateKey(s.completedAt)===date).length}; });
    return json(res,200,{stats:{total:completed.length,today:todayCount,las:completed.filter(s=>s.audience==='LAS').length,lau:completed.filter(s=>s.audience==='LAU').length,conversion:rows.length?Math.round(completed.length/rows.length*100):0,avgDuration:completed.length?Math.round(completed.reduce((a,s)=>a+(s.durationSec||0),0)/completed.length):0},last7,logs:rows.slice(0,12).map(({id,audience,startedAt,completedAt,durationSec,status,brand,recommendation})=>({id,audience,startedAt,completedAt,durationSec,status,brand,recommendation}))});
  }
  if (req.method==='POST' && url.pathname==='/api/surveys') {
    const session=requireAuth(req,res); if(!session) return; if(!requireCsrf(req,res,session)) return; const d=await body(req);
    if(!allowed.audience.has(d.audience) || !allowed.status.has(d.status)) return json(res,400,{error:'Некорректные данные опроса'});
    const started=new Date(d.startedAt); const completed=d.completedAt?new Date(d.completedAt):null; if(Number.isNaN(started.valueOf()) || (completed && Number.isNaN(completed.valueOf()))) return json(res,400,{error:'Некорректная дата'});
    const row={id:`cnt_${randomBytes(8).toString('hex')}`,userId:session.userId,audience:d.audience,startedAt:started.toISOString(),completedAt:completed?.toISOString()||null,durationSec:Math.max(0,Math.min(7200,Number(d.durationSec)||0)),status:d.status,consent:d.consent===true};
    if(!row.consent) return json(res,400,{error:'Не подтверждён возраст и согласие'});
    if(d.audience==='LAS') { row.brand=allowed.brands.has(d.brand)?d.brand:'Other'; row.taste=allowed.tastes.has(d.taste)?d.taste:null; row.problem=allowed.problems.has(d.problem)?d.problem:null; row.recommendation=cleanText(d.recommendation,60); }
    else { row.currentStick=cleanText(d.currentStick,60); row.satisfaction=cleanText(d.satisfaction,40); row.priority=cleanText(d.priority,60); }
    db.surveys.push(row); audit('survey_saved',session.userId,{surveyId:row.id,audience:row.audience,status:row.status}); await persist(); return json(res,201,{ok:true,id:row.id});
  }
  return json(res,404,{error:'Маршрут не найден'});
}

async function staticFile(req,res,url) {
  let pathname=decodeURIComponent(url.pathname); if(pathname==='/') pathname='/index.html';
  const candidate=normalize(join(PUBLIC,pathname)); if(!candidate.startsWith(PUBLIC)) { res.statusCode=403; return res.end('Forbidden'); }
  try { const s=await stat(candidate); if(!s.isFile()) throw new Error(); securityHeaders(res); res.statusCode=200; res.setHeader('Content-Type',mime[extname(candidate)]||'application/octet-stream'); res.setHeader('Cache-Control', extname(candidate)==='.html'?'no-cache':'public, max-age=3600'); createReadStream(candidate).pipe(res); }
  catch { securityHeaders(res); res.statusCode=404; res.setHeader('Content-Type','text/plain; charset=utf-8'); res.end('Not found'); }
}

await initDb();
const server=http.createServer(async (req,res)=>{
  try { const url=new URL(req.url,`http://${req.headers.host||'localhost'}`); if(url.pathname.startsWith('/api/')) await api(req,res,url); else if(req.method==='GET' || req.method==='HEAD') await staticFile(req,res,url); else json(res,405,{error:'Метод не поддерживается'}); }
  catch(error) { console.error(error); if(!res.headersSent) json(res,error.status||500,{error:error.status?error.message:'Внутренняя ошибка сервера'}); else res.end(); }
});
server.listen(PORT,HOST,()=>console.log(`HST Unlock running at http://${HOST}:${PORT}`));
export { server, hashPassword, verifyPassword };

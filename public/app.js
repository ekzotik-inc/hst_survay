const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const views = { login:$('#loginView'), app:$('#appView'), survey:$('#surveyView'), dashboard:$('#dashboardView'), contacts:$('#contactsView') };
let csrf = '';
let dashboard = null;
let activeFilter = 'all';
let toastTimer;
let survey = null;

const brands = [
  {id:'Winston', cls:'winston', desc:'Классический профиль'},
  {id:'Camel', cls:'camel', desc:'Табачный профиль'},
  {id:'Sobranie', cls:'sobranie', desc:'Выразительный профиль'},
  {id:'LD', cls:'ld', desc:'Сбалансированный профиль'},
  {id:'Marlboro', cls:'marlboro', desc:'Насыщенный профиль'},
  {id:'L&M', cls:'lm', desc:'Мягкий профиль'},
  {id:'Parliament', cls:'parliament', desc:'Сбалансированный профиль'},
  {id:'Other', cls:'other', desc:'Другой бренд'}
];
const tastes = [
  {id:'classic', label:'Классический табачный'}, {id:'intense', label:'Насыщенный'}, {id:'soft', label:'Мягкий'},
  {id:'fresh', label:'Освежающий / ментол'}, {id:'berry', label:'Ягодный'}, {id:'citrus', label:'Цитрус / травы'}, {id:'capsule', label:'С капсулой'}
];
const problems = [
  {id:'odor', icon:'≈', title:'Запах на одежде и волосах', desc:'Долго остаётся после сигареты'},
  {id:'ash', icon:'✦', title:'Пепел и загрязнение', desc:'Пепельница, крошки и уборка'},
  {id:'smoke', icon:'≋', title:'Сигаретный дым', desc:'Дым и его запах вокруг'},
  {id:'fire', icon:'△', title:'Открытый огонь', desc:'Зажигалка и тлеющий конец'},
  {id:'taste', icon:'◌', title:'Вкус стал однообразным', desc:'Хочется другой вкусовой профиль'},
  {id:'routine', icon:'↻', title:'Неудобный ритуал', desc:'Перерывы, пепельница, зажигалка'},
  {id:'wellbeing', icon:'♡', title:'Беспокоит влияние на здоровье', desc:'Хочу принять более осознанное решение'}
];
const solutions = {
  odor:{title:'Без сигаретного дыма — другой след запаха',body:'IQOS нагревает табак, а не сжигает его. Поэтому сигаретный дым не образуется. Аэрозоль всё равно имеет запах, но это не запах дыма от горящей сигареты.',facts:[['Нагрев','вместо горения'],['Нет пепла','после сеанса'],['Важно','аэрозоль не безвреден']]},
  ash:{title:'Нагревание не создаёт пепла',body:'При использовании IQOS табак в TEREA нагревается без горения. После сеанса нет сигаретного пепла. Стик нужно утилизировать целиком и хранить вдали от детей.',facts:[['0','пепла'],['TEREA','только для ILUMA'],['21+','только взрослым']]},
  smoke:{title:'Не сигаретный дым, а табачный аэрозоль',body:'IQOS не сжигает табак, поэтому не образует сигаретный дым. Он создаёт никотинсодержащий аэрозоль — это не «чистый воздух» и не безвредный пар.',facts:[['Нет','горения'],['Есть','аэрозоль'],['Никотин','вызывает зависимость']]},
  fire:{title:'Без открытого пламени и тлеющего конца',body:'Для сеанса IQOS не нужна зажигалка: устройство нагревает TEREA изнутри. Это исключает открытое пламя в процессе использования, но устройство нужно применять строго по инструкции.',facts:[['Без','зажигалки'],['Без','тлеющего конца'],['По инструкции','обязательно']]},
  taste:{title:'Линейка разных вкусовых профилей',body:'В Узбекистане представлены TEREA с табачными, древесными, ореховыми, пряными, освежающими, ягодными и цитрусовыми нотами. Следующий шаг подберёт профиль по вашим ответам.',facts:[['14','профилей в каталоге'],['ILUMA','совместимое устройство'],['Выбор','по предпочтению']]},
  routine:{title:'Сеанс без пепельницы и зажигалки',body:'IQOS ILUMA нагревает специально предназначенный стик TEREA. В процессе нет пепла и не требуется открытый огонь. Устройство нужно заряжать, а использованный стик — правильно утилизировать.',facts:[['Без','пепельницы'],['Нужна','зарядка'],['Стик','одноразовый']]},
  wellbeing:{title:'Честный ответ: лучший выбор — полный отказ',body:'IQOS не является средством лечения или отказа от курения и не исключает риски. Он содержит никотин, вызывающий зависимость. Если вас беспокоит здоровье, наиболее эффективное решение — полностью отказаться от табака и никотина.',facts:[['Не без','риска'],['Не лечит','симптомы'],['Лучший выбор','полный отказ']]}
};
const sticks = {
  intense:{name:'TEREA AMBER', color:'amber', desc:'Табачный вкус с древесными и ореховыми нотами'},
  classic:{name:'TEREA SILVER', color:'silver', desc:'Табачный вкус с нотами пряных трав'},
  soft:{name:'TEREA YELLOW', color:'yellow', desc:'Мягкий табачный вкус с пикантными нотами'},
  fresh:{name:'TEREA TURQUOISE', color:'turquoise', desc:'Охлаждающий табачный вкус с ментоловой свежестью'},
  berry:{name:'TEREA PURPLE WAVE', color:'purple', desc:'Табачный вкус с нотами лесных ягод'},
  citrus:{name:'TEREA ZING WAVE', color:'green', desc:'Освежающий табачный вкус с цитрусом и пряными травами'},
  capsule:{name:'TEREA TIDAL PEARL', color:'berry', desc:'Мягкий табачный вкус, древесные оттенки и освежающая мятная капсула'}
};
const altSticks = { intense:'classic', classic:'soft', soft:'classic', fresh:'capsule', berry:'capsule', citrus:'fresh', capsule:'fresh' };
const lauSticks = ['TEREA AMBER','TEREA SILVER','TEREA YELLOW','TEREA TURQUOISE','TEREA ZING WAVE','TEREA PURPLE WAVE','TEREA SUMMER WAVE','Другой вкус'];

async function api(path, options={}) {
  const headers = {'Content-Type':'application/json', ...(options.headers||{})};
  if (options.method && options.method !== 'GET') headers['X-CSRF-Token'] = csrf;
  const res = await fetch(path,{...options,headers});
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error || 'Не удалось выполнить действие');
  return data;
}
function notify(message){ const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2800); }
function show(view){ Object.values(views).forEach(v=>v.classList.add('hidden')); view.classList.remove('hidden'); }
function initials(name='HST'){ return name.split(/\s+/).slice(0,2).map(v=>v[0]).join('').toUpperCase(); }
function fmtDate(value){ if(!value)return '—'; return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value)).replace(',',' ·'); }
function duration(sec=0){ const m=Math.floor(sec/60),s=sec%60; return m?`${m} мин ${s?`${s} сек`:''}`:`${s} сек`; }
function shortId(id){ return `#${String(id).replace('cnt_','').slice(-6).toUpperCase()}`; }
function escapeHtml(v=''){ return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

async function restore(){
  try{ const data=await api('/api/session'); csrf=data.csrf; enterApp(data.user); }
  catch{ show(views.login); }
}
function enterApp(user){
  show(views.app); navigate('dashboard'); $('#profileName').textContent=user.name; $('#profileTerritory').textContent=user.territory; $('#profileAvatar').textContent=initials(user.name);
  const hour=Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hour12:false,timeZone:'Asia/Tashkent'}).format(new Date())); $('#greeting').textContent=hour<12?'Доброе утро':hour<18?'Добрый день':'Добрый вечер';
  $('#dateLabel').textContent=new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long',timeZone:'Asia/Tashkent'}).format(new Date()).toUpperCase();
  loadDashboard();
}
async function loadDashboard(){
  try{ dashboard=await api('/api/dashboard'); renderDashboard(); }
  catch(e){ if(e.message==='Требуется вход')show(views.login); else notify(e.message); }
}
function renderDashboard(){
  const s=dashboard.stats; $('#statTotal').textContent=s.total; $('#statToday').textContent=s.today; $('#statLas').textContent=s.las; $('#statLau').textContent=s.lau; $('#statConversion').textContent=`${s.conversion}%`; $('#avgDuration').textContent=`≈ ${Math.max(1,Math.round(s.avgDuration/60))} мин.`;
  $('#donutTotal').textContent=s.total; $('#legendLas').textContent=s.las; $('#legendLau').textContent=s.lau; const pct=s.total?Math.round(s.las/s.total*100):50; $('#donut').style.background=`conic-gradient(var(--purple) 0 ${pct}%,var(--lime) ${pct}% 100%)`;
  const max=Math.max(1,...dashboard.last7.map(v=>v.count)); $('#chart').innerHTML=dashboard.last7.map(v=>`<div class="bar-item"><i data-count="${v.count}" style="height:${Math.max(5,Math.round(v.count/max*90))}%"></i><span>${new Intl.DateTimeFormat('ru-RU',{weekday:'short'}).format(new Date(v.date+'T12:00:00Z'))}</span></div>`).join('');
  renderLogs($('#logsBody'),dashboard.logs.slice(0,5)); renderLogs($('#allLogsBody'),filteredLogs()); $('#emptyLogs').classList.toggle('hidden',dashboard.logs.length>0);
}
function resultLabel(r){ if(r.status==='abandoned')return '—'; if(r.audience==='LAS')return r.recommendation||r.brand||'Завершён'; return 'Опыт IQOS'; }
function renderLogs(target,rows){ target.textContent=''; rows.forEach(r=>{ const tr=document.createElement('tr'); const cells=[shortId(r.id),r.audience,fmtDate(r.startedAt),duration(r.durationSec),resultLabel(r),r.status==='completed'?'Завершён':'Прерван']; cells.forEach((v,i)=>{const td=document.createElement('td'); if(i===1){const span=document.createElement('span');span.className=`audience-badge ${String(v).toLowerCase()}`;span.textContent=v;td.append(span);}else if(i===5){const span=document.createElement('span');span.className=`status-badge ${r.status}`;span.textContent=v;td.append(span);}else td.textContent=v;tr.append(td);}); target.append(tr); }); }
function filteredLogs(){ if(!dashboard)return[]; return dashboard.logs.filter(r=>activeFilter==='all'||r.audience===activeFilter||r.status===activeFilter); }
function navigate(section){
  const dashboardActive=section==='dashboard'; views.dashboard.classList.toggle('hidden',!dashboardActive); views.contacts.classList.toggle('hidden',dashboardActive); $$('.nav-item[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===section)); if(!dashboardActive)renderLogs($('#allLogsBody'),filteredLogs());
}

$('#loginForm').addEventListener('submit',async e=>{ e.preventDefault(); $('#loginError').textContent=''; const btn=e.submitter; btn.disabled=true; try{const fd=new FormData(e.currentTarget);const data=await api('/api/login',{method:'POST',body:JSON.stringify({login:fd.get('login'),password:fd.get('password')})});csrf=data.csrf;enterApp(data.user);}catch(err){$('#loginError').textContent=err.message;}finally{btn.disabled=false;}});
$('#togglePassword').addEventListener('click',()=>{const p=$('#password');p.type=p.type==='password'?'text':'password';});
$('#logoutButton').addEventListener('click',async()=>{try{await api('/api/logout',{method:'POST'});}catch{}csrf='';show(views.login);});
$$('[data-nav]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.nav)));
$$('[data-action="new-contact"]').forEach(b=>b.addEventListener('click',()=>{ $('#adultConsent').checked=false;$('#consentError').textContent='';$('#audienceDialog').showModal(); }));
$('#showAllLogs').addEventListener('click',()=>navigate('contacts'));
$$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{activeFilter=b.dataset.filter;$$('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderLogs($('#allLogsBody'),filteredLogs());}));
$('#sourcesButton').addEventListener('click',()=>$('#sourcesDialog').showModal());
$$('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.closeDialog).close()));

['selectLas','selectLau'].forEach(id=>$('#'+id).addEventListener('click',e=>{e.preventDefault();if(!$('#adultConsent').checked){$('#consentError').textContent='Подтвердите возраст и статус потребителя.';return;}$('#audienceDialog').close();startSurvey(e.currentTarget.value);}));
$('#exitSurvey').addEventListener('click',()=>$('#exitDialog').showModal());
$('#confirmExit').addEventListener('click',()=>abortSurvey());

function startSurvey(audience){ survey={audience,step:1,startedAt:new Date().toISOString(),consent:true,brand:null,taste:null,problem:null,recommendation:null,currentStick:null,satisfaction:null,priority:null,saved:false}; show(views.survey); updateSurvey(); window.scrollTo(0,0); }
function progressInfo(){ const total=survey.audience==='LAS'?5:4; return {total,current:Math.min(survey.step,total)}; }
function updateSurvey(){ const p=progressInfo();$('#progressLabel').textContent=`Шаг ${p.current} из ${p.total}`;$('#progressBar').style.width=`${p.current/p.total*100}%`; const lockStage=survey.audience==='LAS'?Math.max(0,survey.step-1):Math.max(0,survey.step-1);$('#lock').dataset.stage=survey.step>p.total?5:String(Math.min(4,lockStage)); renderSurvey(); }
function setContent(html){const c=$('#surveyContent');c.innerHTML=html;c.scrollTop=0;}
function kicker(text){return `<div class="survey-kicker"><i></i>${text}</div>`;}
function nextButton(label='Продолжить'){return `<button id="nextStep" class="button survey-button" type="button">${label} <b>→</b></button>`;}
function renderSurvey(){ if(survey.audience==='LAS')renderLas(); else renderLau(); }

function renderLas(){
  if(survey.step===1){setContent(`${kicker('Персональный интерактив')}<h1>Несколько ответов.<br><em>Один подходящий профиль.</em></h1><p class="lead">Ответьте на короткие вопросы о привычном вкусе и опыте. В конце мы покажем вариант из актуального ассортимента — без обещаний и медицинских утверждений.</p><div class="intro-points"><span><i>1</i>≈ 3 минуты</span><span><i>2</i>Без имени и телефона</span><span><i>3</i>Можно остановиться</span></div>${nextButton('Начать опрос')}`);$('#lockCaption').textContent='Ответы откроют персональную рекомендацию';$('#nextStep').onclick=()=>{survey.step=2;updateSurvey();};}
  else if(survey.step===2)renderLasTaste();
  else if(survey.step===3)renderLasProblem();
  else if(survey.step===4)renderLasSolution();
  else if(survey.step===5)renderLasRecommendation();
  else renderCompletion();
}
function renderLasTaste(){
  const brandCards=brands.map(b=>`<button class="choice-card brand-choice ${survey.brand===b.id?'selected':''}" data-value="${b.id}"><span class="packshot pack-${b.cls}">${b.id==='Other'?'?':escapeHtml(b.id)}</span><b>${escapeHtml(b.id==='Other'?'Другое':b.id)}</b><small>${b.desc}</small></button>`).join('');
  const tastePills=tastes.map(t=>`<button class="choice-pill taste-choice ${survey.taste===t.id?'selected':''}" data-value="${t.id}">${t.label}</button>`).join('');
  setContent(`${kicker('Ваш привычный выбор')}<h1 class="question-title">Какие сигареты<br>вы курите?</h1><p class="question-sub">Бренды, представленные на рынке Узбекистана. Выберите один вариант.</p><div class="brand-grid">${brandCards}</div><div id="tasteBlock" class="follow-up ${survey.brand?'':'hidden'}"><h3>Какой вкус вам обычно ближе?</h3><div class="choice-row">${tastePills}</div><div class="next-row">${nextButton()}<span id="stepError" class="validation"></span></div></div>`);
  $$('.brand-choice').forEach(b=>b.onclick=()=>{survey.brand=b.dataset.value;renderLasTaste();});
  $$('.taste-choice').forEach(b=>b.onclick=()=>{survey.taste=b.dataset.value;renderLasTaste();});
  $('#nextStep')?.addEventListener('click',()=>{if(!survey.brand||!survey.taste){$('#stepError').textContent='Выберите бренд и вкусовой профиль.';return;}survey.step=3;updateSurvey();});
  $('#lockCaption').textContent=survey.taste?'Ключ на месте. Осталось понять, что важно.':'Сначала выберите привычный профиль';
}
function renderLasProblem(){
  setContent(`${kicker('Что хочется изменить')}<h1 class="question-title">Что вас больше всего<br>не устраивает?</h1><p class="question-sub">Выберите одну главную проблему — ту, что возникает чаще всего.</p><div class="problem-grid">${problems.map(p=>`<button class="problem-card ${survey.problem===p.id?'selected':''}" data-value="${p.id}"><i>${p.icon}</i><span><b>${p.title}</b><small>${p.desc}</small></span></button>`).join('')}</div><div class="next-row">${nextButton()}<span id="stepError" class="validation"></span></div>`);
  $$('.problem-card').forEach(b=>b.onclick=()=>{survey.problem=b.dataset.value;renderLasProblem();});$('#nextStep').onclick=()=>{if(!survey.problem){$('#stepError').textContent='Выберите один вариант.';return;}survey.step=4;updateSurvey();};$('#lockCaption').textContent='Ключ начал поворачиваться';
}
function renderLasSolution(){
  const x=solutions[survey.problem]||solutions.wellbeing;setContent(`${kicker('Проверяемый факт')}<h1 class="question-title">Как меняется<br>сам процесс?</h1><div class="fact-card"><span class="fact-label">IQOS · ФАКТЫ</span><h3>${x.title}</h3><p>${x.body}</p><div class="fact-points">${x.facts.map(f=>`<span><b>${f[0]}</b>${f[1]}</span>`).join('')}</div></div><div class="warning-box"><b>Важно:</b> IQOS не без риска. Он содержит никотин, который вызывает зависимость. Не начинайте использовать табачную или никотинсодержащую продукцию, если не используете её сейчас.</div><div class="next-row">${nextButton('Увидеть рекомендацию')}</div>`);$('#nextStep').onclick=()=>{survey.step=5;updateSurvey();};$('#lockCaption').textContent='Ещё немного — профиль почти открыт';
}
function renderLasRecommendation(){
  const best=sticks[survey.taste]||sticks.classic, alt=sticks[altSticks[survey.taste]]||sticks.soft;survey.recommendation=best.name;
  setContent(`${kicker('Ваш вкусовой профиль')}<h1 class="question-title">Подходящий выбор<br>по вашим ответам</h1><p class="question-sub">Это вкусовая рекомендация, а не медицинская оценка.</p><div class="recommend-grid"><article class="recommend-main"><span class="recommend-label">ЛУЧШЕЕ СОВПАДЕНИЕ</span><span class="score">92%</span><div class="terea-pack" data-color="${best.color}">TEREA</div><h3>${best.name}</h3><p>${best.desc}</p></article><article class="recommend-alt"><span class="recommend-label">АЛЬТЕРНАТИВА</span><div class="terea-pack" data-color="${alt.color}">TEREA</div><h3>${alt.name}</h3><p>${alt.desc}</p></article></div><div class="warning-box">TEREA содержит никотин, вызывающий зависимость, и предназначена только для IQOS ILUMA. Не глотать и не разбирать: внутри есть острая металлическая деталь. Хранить вдали от детей.</div><div class="next-row">${nextButton('Завершить опрос')}</div>`);
  $('#nextStep').onclick=()=>completeSurvey();$('#lockCaption').textContent='Поверните ключ — завершите опрос';
}

function renderLau(){
  if(survey.step===1){setContent(`${kicker('Для пользователей IQOS')}<h1>Расскажите о своём<br><em>текущем опыте.</em></h1><p class="lead">Короткий опрос поможет понять, какой вкус и формат вам ближе. Мы не собираем имя или номер телефона.</p><div class="intro-points"><span><i>1</i>≈ 2 минуты</span><span><i>2</i>Только опыт продукта</span><span><i>3</i>21+</span></div>${nextButton('Начать опрос')}`);$('#nextStep').onclick=()=>{survey.step=2;updateSurvey();};}
  else if(survey.step===2){setContent(`${kicker('Текущий выбор')}<h1 class="question-title">Какой TEREA вы<br>используете чаще?</h1><div class="choice-row">${lauSticks.map(v=>`<button class="choice-pill lau-stick ${survey.currentStick===v?'selected':''}" data-value="${v}">${v}</button>`).join('')}</div><div class="next-row">${nextButton()}<span id="stepError" class="validation"></span></div>`);$$('.lau-stick').forEach(b=>b.onclick=()=>{survey.currentStick=b.dataset.value;renderLau();});$('#nextStep').onclick=()=>{if(!survey.currentStick){$('#stepError').textContent='Выберите один вариант.';return;}survey.step=3;updateSurvey();};}
  else if(survey.step===3){const opts=[['very','◎','Очень устраивает'],['satisfied','◉','Скорее устраивает'],['neutral','◌','Нейтрально'],['change','○','Хочу изменить']];setContent(`${kicker('Оценка опыта')}<h1 class="question-title">Насколько вас устраивает<br>текущий выбор?</h1><div class="lau-scale">${opts.map(v=>`<button class="choice-card lau-satisfaction ${survey.satisfaction===v[0]?'selected':''}" data-value="${v[0]}"><i>${v[1]}</i><b>${v[2]}</b></button>`).join('')}</div><div class="next-row">${nextButton()}<span id="stepError" class="validation"></span></div>`);$$('.lau-satisfaction').forEach(b=>b.onclick=()=>{survey.satisfaction=b.dataset.value;renderLau();});$('#nextStep').onclick=()=>{if(!survey.satisfaction){$('#stepError').textContent='Выберите оценку.';return;}survey.step=4;updateSurvey();};}
  else if(survey.step===4){const priorities=['Более насыщенный вкус','Более мягкий вкус','Больше свежести','Ягодные ноты','Цитрус и травы','Вкус с капсулой'];setContent(`${kicker('Следующий выбор')}<h1 class="question-title">Что хочется попробовать<br>в следующий раз?</h1><div class="choice-row">${priorities.map(v=>`<button class="choice-pill lau-priority ${survey.priority===v?'selected':''}" data-value="${v}">${v}</button>`).join('')}</div><div class="fact-card"><span class="fact-label">НАПОМИНАНИЕ</span><h3>Используйте только совместимые стики</h3><p>TEREA разработана для IQOS ILUMA и не должна использоваться с предыдущими поколениями устройств IQOS.</p></div><div class="next-row">${nextButton('Завершить опрос')}<span id="stepError" class="validation"></span></div>`);$$('.lau-priority').forEach(b=>b.onclick=()=>{survey.priority=b.dataset.value;renderLau();});$('#nextStep').onclick=()=>{if(!survey.priority){$('#stepError').textContent='Выберите один приоритет.';return;}completeSurvey();};}
  else renderCompletion();
}
async function completeSurvey(){ survey.step=progressInfo().total+1;$('#lock').dataset.stage='5';$('#progressBar').style.width='100%';$('#progressLabel').textContent='Готово';renderCompletion();try{await saveSurvey('completed');survey.saved=true;notify('Контакт сохранён');}catch(e){notify(`Не удалось сохранить: ${e.message}`);} }
function renderCompletion(){setContent(`<div class="completion"><div class="completion-ring">✓</div>${kicker('Профиль открыт')}<h1>Спасибо за<br><em>ваши ответы.</em></h1><p class="lead">Опрос завершён. Передайте планшет специалисту HST.</p><div class="completion-actions"><button id="backDashboard" class="button survey-button">Вернуться в кабинет <b>→</b></button></div></div>`);$('#lockCaption').textContent='Готово — персональный маршрут завершён';$('#backDashboard').onclick=finishToDashboard;}
async function saveSurvey(status){const end=new Date();const payload={...survey,status,completedAt:status==='completed'?end.toISOString():null,durationSec:Math.round((end-new Date(survey.startedAt))/1000)};return api('/api/surveys',{method:'POST',body:JSON.stringify(payload)});}
async function abortSurvey(){try{if(survey&&!survey.saved)await saveSurvey('abandoned');}catch(e){notify(e.message);}finishToDashboard();}
function finishToDashboard(){survey=null;show(views.app);navigate('dashboard');loadDashboard();}

window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!views.survey.classList.contains('hidden')&&!$('#exitDialog').open){e.preventDefault();$('#exitDialog').showModal();}});
restore();

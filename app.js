(() => {
'use strict';

const STORAGE='mandarin-bao-v1';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const uid=()=>crypto.randomUUID?.()||Date.now()+'-'+Math.random().toString(16).slice(2);
const now=()=>new Date().toISOString();
const clean=s=>String(s||'').replace(/[\s，。！？!?]/g,'');
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const initial=()=>({
  theme:'system',tab:'home',profile:null,currentLesson:0,completed:[],events:[],streak:1,sound:true,pinyin:'new'
});
let state=load();
function load(){try{return {...initial(),...(JSON.parse(localStorage.getItem(STORAGE))||{})}}catch{return initial()}}
function save(){localStorage.setItem(STORAGE,JSON.stringify(state))}
function theme(){return state.theme==='system'?(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):state.theme}
function applyTheme(){document.documentElement.dataset.theme=theme();const m=$('meta[name="theme-color"]');if(m)m.content=theme()==='dark'?'#10171a':'#FFF7ED'}
applyTheme();

const lessons=[
 {id:1,title:'Your First Mandarin',goal:'Understand and reply to 你好',duration:'6–8 min',steps:[
  {t:'intro',title:'Your first Mandarin',body:'In a few minutes, you’ll understand and say your first Chinese greeting.'},
  {t:'concept',hanzi:'你',py:'nǐ',tr:'you',body:'你 is Hanzi. nǐ is Pinyin, a pronunciation guide. Mandarin also uses tones.'},
  {t:'phrase',hanzi:'你好',py:'nǐ hǎo',tr:'Hello!',audio:'你好',body:'Listen to the whole phrase first. Don’t worry about tone theory yet.'},
  {t:'mcq',title:'What does this mean?',audio:'你好',opts:['Hello','Thank you','Goodbye'],correct:0,target:'你好',dim:'listening_meaning',cap:'greet'},
  {t:'speak',title:'Repeat 你好',show:'你好',py:'nǐ hǎo',expect:'greet',target:'你好',dim:'spoken_production',cap:'greet',ind:'guided'},
  {t:'speak',title:'Bao says 你好！ Reply in Chinese.',audio:'你好',expect:'greet',target:'你好',dim:'spoken_recall',cap:'greet',ind:'independent'},
  {t:'done',title:'You can greet someone in Mandarin.'}
 ]},
 {id:2,title:'Introduce Yourself',goal:'Say 我叫 + your name',duration:'7–9 min',steps:[
  {t:'retrieve',title:'Warm up',body:'Bao greets you. Reply from memory.',audio:'你好',expect:'greet',target:'你好',dim:'retrieval',cap:'greet',ind:'independent'},
  {t:'concept',hanzi:'我',py:'wǒ',tr:'I / me',body:'You’ll use 我 inside a useful sentence instead of memorizing it alone.'},
  {t:'phrase',hanzi:'我叫…',py:'wǒ jiào…',tr:'My name is…',audio:'我叫小雨',body:'叫 works like “be called”. Your actual name can stay your actual name.'},
  {t:'mcq',title:'Which one means “My name is Lina”?',opts:['我叫 Lina。','你好 Lina。','你叫 Lina？'],correct:0,target:'我叫',dim:'pattern_comprehension',cap:'introduce'},
  {t:'speak',title:'Introduce yourself',show:'我叫…',py:'wǒ jiào…',expect:'introduce',target:'我叫',dim:'spoken_production',cap:'introduce',ind:'independent'},
  {t:'done',title:'You can introduce yourself.'}
 ]},
 {id:3,title:"Ask Someone’s Name",goal:'Ask 你叫什么名字？',duration:'8–10 min',steps:[
  {t:'phrase',hanzi:'你叫什么名字？',py:'nǐ jiào shénme míngzi?',tr:"What’s your name?",audio:'你叫什么名字',body:'什么 already makes this a question here. You do not need 吗.'},
  {t:'mcq',title:'What is the speaker asking?',audio:'你叫什么名字',opts:['Where are you from?','What is your name?','How old are you?'],correct:1,target:'你叫什么名字',dim:'listening_meaning',cap:'ask_name'},
  {t:'speak',title:"Ask Bao’s name",show:'你叫什么名字？',py:'nǐ jiào shénme míngzi?',expect:'ask_name',target:'你叫什么名字',dim:'spoken_production',cap:'ask_name',ind:'supported'},
  {t:'speak',title:'Now ask without seeing the Chinese',expect:'ask_name',target:'你叫什么名字',dim:'spoken_recall',cap:'ask_name',ind:'independent'},
  {t:'done',title:'You can ask someone’s name.'}
 ]}
];

const arcs=['First Communication','People & Objects','Numbers & Quantity','Time & Events','Place & Movement','Actions & Routine','Aspect & Change','Wants & Ability','Help & Interaction','Food & Ordering','Shopping & Money','Travel & Transport','Weather & State','Health & Care','Study & Work','Transfer & Capability'];

function log(type,p={}){state.events.push({id:uid(),at:now(),type,...p});if(state.events.length>600)state.events=state.events.slice(-600);save()}
function cap(name){
 const es=state.events.filter(e=>e.cap===name&&e.result);
 if(!es.length)return'NEW';
 let w=0,s=0,ind=0;
 for(const e of es){const ww={guided:.45,supported:.65,independent:.9,spontaneous:1}[e.ind]||.5;w+=ww;s+=(e.result==='SUCCESS'?1:e.result==='PARTIAL'?.45:0)*ww;if(e.result==='SUCCESS'&&['independent','spontaneous'].includes(e.ind))ind++}
 const q=s/(w||1); if(q>.8&&ind>=2)return'STRONG'; if(q>.55&&ind>=1)return'FAMILIAR'; return'LEARNING'
}
const label=s=>({NEW:'Not started',LEARNING:'Learning',FAMILIAR:'Familiar',STRONG:'Strong'})[s]||s;
const pill=s=>'<span class="pill '+(s==='STRONG'||s==='FAMILIAR'?'sage':'')+'">'+label(s)+'</span>';

function speak(text,slow=false){
 if(!('speechSynthesis'in window)){toast('Speech playback is not supported on this device');return}
 speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.rate=slow?.62:.88;speechSynthesis.speak(u)
}
function speech(onResult,onError){
 const R=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!R){onError?.();return}
 const r=new R();r.lang='zh-CN';r.interimResults=false;r.maxAlternatives=3;
 r.onresult=e=>onResult?.(e.results[0][0].transcript);
 r.onerror=()=>onError?.();
 try{r.start()}catch{onError?.()}
}
function evaluate(text,kind){
 const t=clean(text);
 if(kind==='greet')return t.includes('你好')||t.includes('您好');
 if(kind==='introduce')return t.includes('我叫')&&t.length>2;
 if(kind==='ask_name')return t.includes('叫什么名字')||t.includes('你叫什么');
 return false
}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1600)}

function top(){
 return '<div class="top"><div class="brand"><div class="bao-logo">🦊</div><div>Mandarin Lab</div></div><button class="icon" id="themeBtn" title="Theme">◐</button></div>'
}
function nav(){
 const items=[['home','⌂','Home'],['learn','◎','Learn'],['practice','◫','Practice'],['ai','✦','AI'],['progress','▥','Progress']];
 return '<nav class="nav">'+items.map(([id,i,n])=>'<button data-tab="'+id+'" class="'+(state.tab===id?'active':'')+'"><span class="nicon">'+i+'</span>'+n+'</button>').join('')+'</nav>'
}
function shell(content){return '<div class="app">'+top()+content+'</div>'+nav()}

function home(){
 const c1=cap('greet'),c2=cap('introduce'),c3=cap('ask_name');
 const next=lessons.find(l=>!state.completed.includes(l.id))||lessons[2];
 return shell(
 '<div class="hero"><div><div class="eyebrow">HSK framework · Level 1</div><h1>Learn Chinese with Bao.</h1><p class="muted" style="margin-top:7px">Serious learning underneath. Warm, playful practice on top.</p></div><div class="hero-art">🦊</div></div>'+
 '<div class="card"><div class="row"><div><div class="eyebrow">Next experience</div><h2 style="margin-top:4px">'+next.title+'</h2></div><span class="pill">'+next.duration+'</span></div><p class="muted" style="margin:8px 0 14px">'+next.goal+'</p><button class="btn primary full" data-start="'+next.id+'">'+(state.completed.length?'Continue learning':'Start learning')+'</button></div>'+
 '<div class="section"><div class="sectionhead"><div><div class="eyebrow">Your abilities</div><h2>What Bao sees</h2></div></div><div class="stack">'+
 ability('Greeting someone',c1)+ability('Introducing yourself',c2)+ability("Asking someone's name",c3)+'</div></div>'+
 '<div class="section"><div class="grid2"><div class="card"><div class="muted">Evidence events</div><div class="metric">'+state.events.length+'</div></div><div class="card"><div class="muted">Lessons completed</div><div class="metric">'+state.completed.length+'/3</div></div></div></div>'+
 '<div class="section"><div class="card soft row"><div><b>Real Chinese</b><div class="muted">Read a simple profile card.</div></div><button class="btn secondary" data-real>Try</button></div></div>'
 )
}
function ability(name,s){return '<div class="card soft row"><div><b>'+name+'</b><div class="muted">Based on observed practice, not lesson completion.</div></div>'+pill(s)+'</div>'}

function learn(){
 return shell('<div class="hero"><div><div class="eyebrow">Curriculum</div><h1>Level 1 journey</h1><p class="muted" style="margin-top:7px">The roadmap is a progression of abilities, not a rigid 12-week lock.</p></div><div class="hero-art">📚</div></div>'+
 '<div class="stack">'+lessons.map(l=>'<div class="lesson '+(state.completed.includes(l.id)?'done':'')+'"><div class="lessonnum">'+(state.completed.includes(l.id)?'✓':l.id)+'</div><div style="flex:1"><b>'+l.title+'</b><div class="muted">'+l.goal+'</div></div><button class="btn secondary" data-start="'+l.id+'">'+(state.completed.includes(l.id)?'Review':'Open')+'</button></div>').join('')+'</div>'+
 '<div class="section"><div class="sectionhead"><div><div class="eyebrow">Level 1 spine</div><h2>What comes next</h2></div></div><div class="stack">'+arcs.map((a,i)=>'<div class="card soft row"><div><b>'+(i+1)+'. '+a+'</b><div class="muted">'+(i<3?'Vertical slice ready':'Curriculum mapped · implementation next')+'</div></div><span class="pill">'+(i<3?'Active':'Planned')+'</span></div>').join('')+'</div></div>')
}
function practice(){
 const weak=[['Greeting','greet'],['Self-introduction','introduce'],['Ask a name','ask_name']].sort((a,b)=>rank(cap(a[1]))-rank(cap(b[1])))[0];
 return shell('<div class="hero"><div><div class="eyebrow">Skill practice</div><h1>Practice what matters.</h1><p class="muted" style="margin-top:7px">Review is selected from your evidence, not a hardcoded weak score.</p></div><div class="hero-art">🎯</div></div>'+
 '<div class="card"><div class="eyebrow">Adaptive focus</div><h2 style="margin-top:4px">'+weak[0]+'</h2><p class="muted" style="margin:7px 0 14px">Current state: '+label(cap(weak[1]))+'</p><button class="btn primary full" data-review="'+weak[1]+'">Start targeted retrieval</button></div>'+
 '<div class="section"><div class="grid2"><button class="skill btn secondary" data-practice="listen">🎧<br><b>Listening</b></button><button class="skill btn secondary" data-practice="speak">🗣️<br><b>Speaking</b></button><button class="skill btn secondary" data-practice="read">📖<br><b>Reading</b></button><button class="skill btn secondary" data-practice="write">✍️<br><b>Writing</b></button></div></div>')
}
function rank(s){return {NEW:0,LEARNING:1,FAMILIAR:2,STRONG:3}[s]||0}
function ai(){
 return shell('<div class="hero"><div><div class="eyebrow">Conversation room</div><h1>Talk with Bao.</h1><p class="muted" style="margin-top:7px">A constrained beginner conversation using only language you have learned.</p></div><div class="hero-art">🦊</div></div>'+
 '<div class="card"><div class="bao-inline"><div class="bao-face">🦊</div><div><b>Goal: meet Bao</b><div class="muted">Greet → introduce yourself → ask Bao’s name.</div></div></div><div class="notice" style="margin:15px 0">This demo uses real browser speech recognition when available. Conversation logic is constrained rather than pretending to be a free-form AI tutor.</div><button class="btn primary full" data-convo>Start voice conversation</button></div>')
}
function progress(){
 const cs=[['Greeting someone','greet'],['Introducing yourself','introduce'],["Asking someone's name",'ask_name']];
 return shell('<div class="hero"><div><div class="eyebrow">Progress</div><h1>Evidence, not vanity scores.</h1><p class="muted" style="margin-top:7px">Introduced, practiced and demonstrated are kept separate.</p></div><div class="hero-art">📈</div></div>'+
 '<div class="stack">'+cs.map(([n,k])=>'<div class="card row"><div><b>'+n+'</b><div class="muted">'+summary(k)+'</div></div>'+pill(cap(k))+'</div>').join('')+'</div>'+
 '<div class="section"><div class="card soft"><div class="eyebrow">Recent evidence</div>'+recentEvents()+'</div></div>')
}
function summary(k){
 const es=state.events.filter(e=>e.cap===k); if(!es.length)return'No evidence yet';
 const independent=es.filter(e=>e.result==='SUCCESS'&&['independent','spontaneous'].includes(e.ind)).length;
 return es.length+' observations · '+independent+' independent successes'
}
function recentEvents(){
 const es=state.events.slice(-6).reverse(); if(!es.length)return'<p class="muted" style="margin-top:8px">Complete a lesson to generate evidence.</p>';
 return es.map(e=>'<div style="padding:10px 0;border-bottom:1px solid var(--line)"><b>'+esc(e.target||e.type)+'</b><div class="muted">'+esc(e.dim||'learning event')+' · '+esc(e.result||'recorded')+'</div></div>').join('')
}

function onboarding(){
 document.body.innerHTML='<div class="onboard"><div class="onboard-card"><div class="hero-art" style="width:110px;min-height:110px;margin-bottom:18px">🦊</div><div class="eyebrow">Meet Bao</div><h1>How should we start?</h1><p class="muted" style="margin-top:8px">We’ll personalize the starting point without pretending one score captures your Mandarin.</p><div class="choice"><button class="btn primary" data-level="new">I’m completely new</button><button class="btn secondary" data-level="some">I’ve studied a little</button><button class="btn secondary" data-level="hsk">I know my HSK level</button></div><div class="footer-note">You can change your path later.</div></div></div><div id="toast" class="toast"></div>';
 $$('[data-level]').forEach(b=>b.onclick=()=>{state.profile={background:b.dataset.level,startedAt:now()};save();render()})
}

function render(){
 if(!state.profile){onboarding();return}
 document.body.innerHTML='<div id="app"></div><div id="overlay" class="overlay" aria-hidden="true"><div id="overlayInner" class="overlay-inner"></div></div><div id="toast" class="toast"></div>';
 $('#app').outerHTML = state.tab==='home'?home():state.tab==='learn'?learn():state.tab==='practice'?practice():state.tab==='ai'?ai():progress();
 bind(); applyTheme()
}
function bind(){
 $$('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;save();render()});
 $('#themeBtn')?.addEventListener('click',()=>{state.theme=state.theme==='system'?'dark':state.theme==='dark'?'light':'system';save();applyTheme();toast('Theme: '+state.theme)});
 $$('[data-start]').forEach(b=>b.onclick=()=>startLesson(+b.dataset.start));
 $('[data-real]')?.addEventListener('click',realChinese);
 $$('[data-review]').forEach(b=>b.onclick=()=>targetReview(b.dataset.review));
 $$('[data-practice]').forEach(b=>b.onclick=()=>quickPractice(b.dataset.practice));
 $('[data-convo]')?.addEventListener('click',conversation)
}
function open(html){const o=$('#overlay');$('#overlayInner').innerHTML=html;o.classList.add('open');o.setAttribute('aria-hidden','false')}
function close(){const o=$('#overlay');o?.classList.remove('open');speechSynthesis?.cancel?.()}

function startLesson(id,step=0){
 const l=lessons.find(x=>x.id===id); if(!l)return;
 state.currentLesson=id;save(); renderStep(l,step)
}
function renderStep(l,i){
 const s=l.steps[i]; const pct=Math.round(((i+1)/l.steps.length)*100);
 let body='';
 if(s.t==='intro'||s.t==='concept'||s.t==='phrase'){
  body='<div class="bao-inline"><div class="bao-face">🦊</div><div><div class="eyebrow">'+(s.t==='intro'?'Lesson '+l.id:'Learn')+'</div><h2>'+esc(s.title||l.title)+'</h2></div></div>'+
  (s.hanzi?'<div class="hanzi">'+s.hanzi+'</div><div class="pinyin">'+esc(s.py||'')+'</div><div class="translation">'+esc(s.tr||'')+'</div>':'')+
  '<p class="muted">'+(s.body||'')+'</p>'+(s.audio?'<button class="btn secondary full" data-hear>🔊 Hear it</button>':'');
 } else if(s.t==='mcq'){
  body='<div class="eyebrow">Understand</div><h2>'+esc(s.title)+'</h2>'+(s.audio?'<button class="btn secondary full" data-hear>🔊 Play audio</button>':'')+'<div class="option-list">'+s.opts.map((o,k)=>'<button class="option" data-opt="'+k+'">'+esc(o)+'</button>').join('')+'</div><div id="fb"></div>';
 } else if(s.t==='speak'||s.t==='retrieve'){
  body='<div class="bao-inline"><div class="bao-face">🦊</div><div><div class="eyebrow">Speaking</div><h2>'+esc(s.title)+'</h2></div></div>'+
  (s.show?'<div class="hanzi" style="font-size:52px">'+s.show+'</div><div class="pinyin">'+esc(s.py||'')+'</div>':'')+
  (s.audio?'<button class="btn secondary full" data-hear>🔊 Hear Bao</button>':'')+
  '<button class="btn primary full" data-mic>🎙 Start speaking</button><div id="fb"></div>';
 } else if(s.t==='done'){
  body='<div style="text-align:center;padding:50px 0"><div style="font-size:72px">🦊</div><h1>'+esc(s.title)+'</h1><p class="muted" style="margin-top:8px">Bao saved what you demonstrated as evidence.</p></div>';
 }
 open('<div class="overlay-top"><button class="icon" data-close>←</button><div style="flex:1"><div class="eyebrow">'+l.title+'</div><div class="progress"><span style="width:'+pct+'%"></span></div></div></div><div class="lesson-panel">'+body+'<div style="margin-top:auto"><button class="btn '+(s.t==='done'?'sage':'primary')+' full" data-next>'+(s.t==='done'?'Finish':'Continue')+'</button></div></div>');
 $('[data-close]').onclick=close;
 $('[data-hear]')?.addEventListener('click',()=>speak(s.audio||s.show||s.hanzi));
 if(s.t==='mcq'){
  let answered=false;
  $$('[data-opt]').forEach(b=>b.onclick=()=>{if(answered)return;answered=true;const ok=+b.dataset.opt===s.correct;b.classList.add(ok?'correct':'wrong');$$('[data-opt]')[s.correct].classList.add('correct');log('ANSWER',{target:s.target,dim:s.dim,cap:s.cap,result:ok?'SUCCESS':'NEEDS_REVIEW',ind:'independent'});$('#fb').innerHTML='<div class="feedback '+(ok?'good':'bad')+'"><b>'+(ok?'Correct.':'Not quite.')+'</b><div class="muted">'+(ok?'Meaning understood.':'The correct answer is highlighted. Listen once more before continuing.')+'</div></div>';});
 }
 if(s.t==='speak'||s.t==='retrieve'){
  $('[data-mic]').onclick=()=>{const fb=$('#fb');fb.innerHTML='<div class="notice">Bao is listening…</div>';speech(text=>{const ok=evaluate(text,s.expect);log('SPEAK',{target:s.target,dim:s.dim,cap:s.cap,result:ok?'SUCCESS':'NEEDS_REVIEW',ind:s.ind||'independent',transcript:text});fb.innerHTML='<div class="feedback '+(ok?'good':'bad')+'"><b>'+(ok?'Nice — I caught it.':'I didn’t catch the target clearly.')+'</b><div class="muted">Heard: '+esc(text)+'</div></div>'},()=>fb.innerHTML='<div class="notice">Speech recognition is unavailable here. This attempt is recorded as no evidence, not a failure.</div>')};
 }
 $('[data-next]').onclick=()=>{
  if(s.t==='done'){if(!state.completed.includes(l.id))state.completed.push(l.id);save();close();render();return}
  renderStep(l,i+1)
 };
 if(s.audio&&['phrase','mcq'].includes(s.t))setTimeout(()=>speak(s.audio),250)
}

function targetReview(capName){
 const map={greet:{title:'Reply to Bao',audio:'你好',expect:'greet',target:'你好'},introduce:{title:'Introduce yourself',expect:'introduce',target:'我叫'},ask_name:{title:"Ask Bao’s name",expect:'ask_name',target:'你叫什么名字'}};
 const x=map[capName]||map.ask_name;
 open('<div class="overlay-top"><button class="icon" data-close>←</button><div><div class="eyebrow">Adaptive retrieval</div><h2>'+x.title+'</h2></div></div><div class="lesson-panel"><div class="bao-inline"><div class="bao-face">🦊</div><div><b>No answer shown first.</b><div class="muted">Independent retrieval gives stronger evidence.</div></div></div>'+(x.audio?'<button class="btn secondary full" data-hear>🔊 Hear Bao</button>':'')+'<button class="btn primary full" data-mic>🎙 Answer</button><div id="fb"></div></div>');
 $('[data-close]').onclick=close;$('[data-hear]')?.addEventListener('click',()=>speak(x.audio)); $('[data-mic]').onclick=()=>speech(t=>{const ok=evaluate(t,x.expect);log('REVIEW',{target:x.target,dim:'independent_retrieval',cap:capName,result:ok?'SUCCESS':'NEEDS_REVIEW',ind:'independent',transcript:t});$('#fb').innerHTML='<div class="feedback '+(ok?'good':'bad')+'"><b>'+(ok?'Retrieved independently.':'Needs one more supported pass.')+'</b><div class="muted">Heard: '+esc(t)+'</div></div>'},()=>$('#fb').innerHTML='<div class="notice">Mic unavailable — no evidence recorded.</div>');
}
function quickPractice(type){
 if(type==='write'){
  open('<div class="overlay-top"><button class="icon" data-close>←</button><div><div class="eyebrow">Writing foundation</div><h2>Learn the stroke before the character</h2></div></div><div class="lesson-panel"><div class="hanzi">一</div><div class="notice">Start on the left → move right → finish cleanly. Full handwriting recognition comes later.</div><button class="btn primary full" data-done>Record guided attempt</button></div>');
  $('[data-close]').onclick=close;$('[data-done]').onclick=()=>{log('WRITE',{target:'一',dim:'stroke_direction',result:'SUCCESS',ind:'guided'});toast('Guided writing evidence saved')};return
 }
 if(type==='read'){
  open('<div class="overlay-top"><button class="icon" data-close>←</button><div><div class="eyebrow">Reading</div><h2>What does 名字 mean?</h2></div></div><div class="lesson-panel"><div class="hanzi">名字</div><div class="option-list"><button class="option" data-r="1">name</button><button class="option" data-r="0">hello</button><button class="option" data-r="0">teacher</button></div><div id="fb"></div></div>');
  $('[data-close]').onclick=close;$$('[data-r]').forEach(b=>b.onclick=()=>{const ok=b.dataset.r==='1';b.classList.add(ok?'correct':'wrong');log('READ',{target:'名字',dim:'reading_recognition',result:ok?'SUCCESS':'NEEDS_REVIEW',ind:'independent'});$('#fb').innerHTML='<div class="feedback '+(ok?'good':'bad')+'">'+(ok?'Correct.':'Review 名字 = name.')+'</div>'});return
 }
 if(type==='listen'){
  open('<div class="overlay-top"><button class="icon" data-close>←</button><div><div class="eyebrow">Listening</div><h2>What do you hear?</h2></div></div><div class="lesson-panel"><button class="btn secondary full" data-hear>🔊 Play</button><div class="option-list"><button class="option" data-l="1">What’s your name?</button><button class="option" data-l="0">Hello!</button><button class="option" data-l="0">Thank you.</button></div><div id="fb"></div></div>');
  $('[data-close]').onclick=close;$('[data-hear]').onclick=()=>speak('你叫什么名字');$$('[data-l]').forEach(b=>b.onclick=()=>{const ok=b.dataset.l==='1';b.classList.add(ok?'correct':'wrong');log('LISTEN',{target:'你叫什么名字',dim:'listening_meaning',cap:'ask_name',result:ok?'SUCCESS':'NEEDS_REVIEW',ind:'independent'});$('#fb').innerHTML='<div class="feedback '+(ok?'good':'bad')+'">'+(ok?'Meaning understood.':'Listen for the complete question pattern.')+'</div>'});setTimeout(()=>speak('你叫什么名字'),250);return
 }
 targetReview('greet')
}
function conversation(){
 let phase=0;
 open('<div class="overlay-top"><button class="icon" data-close>←</button><div><div class="eyebrow">Bao Conversation</div><h2>Meet Bao</h2></div></div><div class="lesson-panel"><div class="conversation" id="chat"><div class="msg">你好！<small>nǐ hǎo · hello</small></div></div><div class="conversation-actions"><input id="reply" class="text-reply" placeholder="Type Chinese if mic is unavailable"><button class="btn primary" data-mic>🎙</button></div><button class="btn secondary full" data-send>Send reply</button><div id="fb"></div></div>');
 $('[data-close]').onclick=close;setTimeout(()=>speak('你好'),250);
 const respond=text=>{
  const chat=$('#chat');chat.insertAdjacentHTML('beforeend','<div class="msg me">'+esc(text)+'</div>');let response='';
  if(phase===0){const ok=evaluate(text,'greet');log('CONVERSATION',{target:'你好',dim:'spontaneous_usage',cap:'greet',result:ok?'SUCCESS':'PARTIAL',ind:'spontaneous',transcript:text});response='你好！你叫什么名字？';phase=1}
  else if(phase===1){const ok=evaluate(text,'introduce');log('CONVERSATION',{target:'我叫',dim:'responsive_production',cap:'introduce',result:ok?'SUCCESS':'NEEDS_REVIEW',ind:'spontaneous',transcript:text});response=ok?'很好！你可以问我叫什么名字。':'你可以说：我叫…';if(ok)phase=2}
  else if(phase===2){const ok=evaluate(text,'ask_name');log('CONVERSATION',{target:'你叫什么名字',dim:'initiated_production',cap:'ask_name',result:ok?'SUCCESS':'NEEDS_REVIEW',ind:'spontaneous',transcript:text});response=ok?'我叫 Bao。很高兴认识你！':'你可以问：你叫什么名字？';if(ok)phase=3}
  else response='很好！今天先到这里。';
  chat.insertAdjacentHTML('beforeend','<div class="msg">'+response+'</div>');speak(response.replace('Bao','包包'));chat.scrollTop=chat.scrollHeight;
  if(phase===3)$('#fb').innerHTML='<div class="feedback good"><b>Conversation goal completed.</b><div class="muted">You responded, provided information, and initiated a question.</div></div>'
 };
 $('[data-send]').onclick=()=>{const v=$('#reply').value.trim();if(v){$('#reply').value='';respond(v)}};
 $('[data-mic]').onclick=()=>speech(respond,()=>$('#fb').innerHTML='<div class="notice">Mic unavailable. Type your reply instead.</div>')
}
function realChinese(){
 open('<div class="overlay-top"><button class="icon" data-close>←</button><div><div class="eyebrow">Real Chinese</div><h2>Read for a purpose</h2></div></div><div class="lesson-panel"><div class="card soft"><div class="eyebrow">新朋友 · New friend</div><div style="font-size:32px;font-weight:900;margin-top:8px">姓名：小雨</div><div style="font-size:25px;font-weight:800">你好！</div></div><h3>What is this person’s name?</h3><div class="option-list"><button class="option" data-x="1">Xiaoyu</button><button class="option" data-x="0">Bao</button><button class="option" data-x="0">Lina</button></div><div id="fb"></div></div>');
 $('[data-close]').onclick=close;$$('[data-x]').forEach(b=>b.onclick=()=>{const ok=b.dataset.x==='1';b.classList.add(ok?'correct':'wrong');log('REAL_CHINESE',{target:'name_slot',dim:'reading_information_extraction',result:ok?'SUCCESS':'NEEDS_REVIEW',ind:'independent'});$('#fb').innerHTML='<div class="feedback '+(ok?'good':'bad')+'">'+(ok?'You extracted the useful information.':'Look at 姓名：小雨.')+'</div>'})
}

matchMedia('(prefers-color-scheme:dark)').addEventListener?.('change',()=>{if(state.theme==='system')applyTheme()});
render();
})();
/* Local recordings are in sample-data.js. No network requests or dependencies. */
'use strict';
const $ = id => document.getElementById(id);
const STYLES = {
  bulerias: {label:'Bulerías', name:'BULERÍAS', fillKind:'filler', bpm:210, order:[12,1,2,3,4,5,6,7,8,9,10,11], note:'Счёт с 12 · группы 3 + 3 + 2 + 2 + 2', bass:[12,6], slap:[3,8,10]},
  solea: {
    label:'Soleá', name:'SOLEÁ', bpm:90, resolution:4,
    order:[1,2,3,4,5,6,7,8,9,10,11,12],
    note:'Счёт с 1 · акценты 3, 6, 8, 10, 12 · 4 удара пульса на долю',
    reference:'https://www.youtube.com/watch?v=r7K65A_W46k',
    practice:'Слушай тихую пульсацию кахона между крупными ударами. На 1 и 4 крупные удары отдыхают, а пульс продолжается.',
    // Main voices and soft cajon are separate. Four positions per counted beat.
    steps:[
      [0,0,0], [0,0,0], [0.3,0,0.1], [0,0,0], // 1
      [0.25,0,0.09], [0,0,0], [0,0,0], [0,0,0], // 2
      [0.2,0.9,0], [0,0,0], [0,0,0], [0,0,0], // 3
      [0,0,0], [0,0,0], [0.32,0,0.12], [0,0,0], // 4
      [0.25,0,0.09], [0,0,0], [0,0,0], [0,0,0], // 5
      [0.08,0,0.72], [0,0,0], [0,0,0], [0,0,0], // 6
      [0.1,0.56,0], [0,0,0], [0.08,0.56,0], [0,0,0], // 7
      [0.12,0,0.82], [0,0,0], [0,0,0], [0,0,0], // 8
      [0.22,0,0.1], [0,0,0], [0.18,0,0.06], [0,0,0], // 9
      [0.1,0,0.7], [0,0,0], [0,0,0], [0,0,0], // 10
      [0.3,0,0.1], [0,0,0], [0,0,0], [0,0,0], // 11
      [0.18,0.86,0], [0,0,0], [0,0,0], [0,0,0] // 12
    ],
    pulseSteps:[0.101,0.058,0.084,0.054,0.09,0.052,0.075,0.048,0.09,0.052,0.075,0.048,0.101,0.058,0.084,0.054,0.09,0.052,0.075,0.048,0.09,0.052,0.075,0.048,0.09,0.052,0.075,0.048,0.09,0.052,0.075,0.048,0.09,0.052,0.075,0.048,0.09,0.052,0.075,0.048,0.09,0.052,0.075,0.048,0.09,0.052,0.075,0.048]
  },
  soleaPorBulerias: {
    label:'Soleá por bulerías', name:'SOLEÁ POR BULERÍAS', fillKind:'filler', bpm:132,
    order:[12,1,2,3,4,5,6,7,8,9,10,11], accents:[12,3,7,8,10],
    note:'Счёт с 12 · акценты 12, 3, 7, 8, 10',
    reference:'https://www.youtube.com/watch?v=AkWUHNNhH0E',
    // 24 half-beat positions, beginning on count 12. Silence is intentional.
    // Each entry: [palmas velocity, bass velocity, slap velocity].
    steps:[
      [.88,.78,0], [0,0,0], // 12
      [0,0,0], [.48,0,0], // 1, and
      [.46,0,0], [0,0,0], // 2
      [.90,.80,0], [0,0,0], // 3
      [.42,0,0], [0,0,0], // 4
      [.43,0,0], [.46,0,0], // 5, and
      [.40,0,0], [.22,0,0], // 6, and
      [.76,0,.70], [.36,0,0], // 7, and
      [.80,0,.74], [0,0,0], // 8
      [.58,0,0], [.40,0,0], // 9, and
      [.86,0,.78], [0,0,0], // 10
      [.52,0,0], [.32,0,0] // 11, and
    ]
  },
  tanguillos: window.COMPAS_IPHONE_PATTERNS.tanguillos
};
const PRESETS = {};
for(const [id, definition] of Object.entries(window.COMPAS_IPHONE_STYLES)){
  PRESETS[id]=definition.presets.map(p=>({...p,pattern:window.COMPAS_IPHONE_PATTERNS[p.key]}));
  if(!STYLES[id])STYLES[id]=PRESETS[id][0].pattern;
}
PRESETS.bulerias.unshift({id:'variant1',label:'Вариант 1',pattern:STYLES.bulerias});
PRESETS.solea.splice(1,0,{id:'reference',label:'Вариант 2',pattern:STYLES.solea});
const BASE_ACCENTS = [3,6,8,10,12];
function currentPattern(){
  return PRESETS[style]?.find(p=>p.id===stylePresets[style])?.pattern || PRESETS[style]?.[0].pattern || STYLES[style];
}
function tickForCount(pattern,count){
  const position=pattern.order.indexOf(count);
  return position<0?null:position*8/(pattern.tempoFraction || 1);
}
function isAccent(beat,position){
  const pattern=currentPattern();
  return pattern.accentPositions&&position!==undefined?pattern.accentPositions.includes(position):(pattern.accents||BASE_ACCENTS).includes(beat);
}
let saved = {}; try { saved = JSON.parse(localStorage.getItem('compas-settings') || '{}') || {}; } catch {}
let style = Object.hasOwn(STYLES,saved.style) ? saved.style : 'bulerias';
let soundBank = ['iphone','studio'].includes(saved.soundBank) ? saved.soundBank : 'iphone';
const stylePresets = {...(saved.stylePresets || {})};
if(!stylePresets.solea)stylePresets.solea=saved.soleaPreset==='reference'?'reference':'moderno';
if(!stylePresets.bulerias)stylePresets.bulerias=['moderno','antigua'].includes(saved.buleriasPreset)?saved.buleriasPreset:'variant1';
let bpm = validBpm(saved.bpm ?? currentPattern().bpm);
const levels = {palmas:validLevel(saved.palmas,80),cajon:validLevel(saved.cajon,65),pandereta:validLevel(saved.pandereta,60)};
const muted = {palmas:false,cajon:false,pandereta:false};
let fillHalfBeats = saved.fillHalfBeats !== false;
let pulseLevel = Math.max(0,Math.min(200,Number.isFinite(Number(saved.pulseLevel))?Number(saved.pulseLevel):100));
let context, buffers, gains, master, loadPromise, pulseGain;
let playing=false, starting=false, token=0, nextTime=0, index=0, timer, worker, queue=[], active=null;
const sources=new Set(), variants={soft:0,hard:0,bass:0,slap:0,tap:0,bright:0,filler:0,double:0,softer:0,pandereta:0};
function validBpm(n){return Math.max(40,Math.min(300,Math.round(Number(n)||90)));}
function validLevel(n,fallback){return Number.isFinite(Number(n))?Math.max(0,Math.min(100,Number(n))):fallback;}
function persist(){try{localStorage.setItem('compas-settings',JSON.stringify({style,bpm,...levels,fillHalfBeats,pulseLevel,soundBank,stylePresets}));}catch{}}
function setBpm(n){bpm=validBpm(n);$('bpm').value=bpm;$('tempo').value=bpm;$('playTempo').textContent=bpm+' BPM';persist();}
function renderWheel(){
  const pattern=currentPattern();
  const hasNine=tickForCount(pattern,9)!==null;
  $('startNine').hidden=!hasNine;$('transport').classList.toggle('has-nine',hasNine);
  document.querySelectorAll('.beat').forEach(el=>el.remove());
  pattern.order.forEach((beat,i)=>{
    const angle=(i/pattern.order.length)*Math.PI*2-Math.PI/2, el=document.createElement('span');
    el.className='beat'+(isAccent(beat,i)?' accent':'');el.dataset.position=i;el.dataset.beat=beat;el.textContent=beat || '·';el.classList.toggle('subdivision',typeof beat==='string');
    el.style.left=(50+40*Math.cos(angle))+'%';el.style.top=(50+40*Math.sin(angle))+'%';
    $('wheel').append(el);
  });
  $('wheel').classList.toggle('dense',pattern.order.length>12);
  $('cycleLabel').textContent=pattern.cycleLabel || '12 ДОЛЕЙ';
  $('tempoHint').textContent=pattern.tempoHint || 'BPM = отдельных долей в минуту';
  const options=PRESETS[style] || [];
  $('patternPresetControl').hidden=options.length<2;
  $('patternPreset').replaceChildren(...options.map(p=>{const option=document.createElement('option');option.value=p.id;option.textContent=p.label;return option;}));
  $('patternPreset').value=options.find(p=>p.id===stylePresets[style])?.id || options[0]?.id;
  $('panderetaControl').hidden=!pattern.hasPandereta;
  $('fillControl').hidden=Boolean(pattern.eventGrid);
  $('fillLabel').textContent=style==='solea'?'Промежуточные удары':'Заполнять полудоли';
  $('pulseControl').hidden=!pattern.pulseSteps;
  $('pulse').disabled=!fillHalfBeats;
  $('fillHint').textContent=style==='solea'?'Четыре позиции на долю: пульсация кахона и выбранные контрвремена.':STYLES[style].steps?'Мягкие пальмас на выбранных «и» между основными долями.':'Тихие пальмас на «и»: 12 и 1 и 2 и… Темп остаётся прежним.';
  $('halfBeats').checked=fillHalfBeats;
  $('currentStyle').textContent=STYLES[style].label;
  $('centerLabel').classList.toggle('long-label',style==='soleaPorBulerias');
  $('practiceText').textContent=pattern.practice || (style==='soleaPorBulerias'?'Вариант с акцентом на 7, паузами и контрвременами. Слушай, как промежуточные удары соединяют основные доли.':'Базовый учебный рисунок с акцентами на 3, 6, 8, 10 и 12. Начни медленно и добавляй темп, когда компас станет привычным.');
  $('centerLabel').textContent=pattern.name;$('patternNote').textContent=pattern.note;
  document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.style===style)));
  $('mobileStyle').value=style;
  active=null;$('currentBeat').textContent='—';
}
async function initAudio(){
  if(!context){
    context=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
    master=context.createGain();master.gain.value=.7;master.connect(context.destination);
    gains={};for(const name of ['palmas','cajon','pandereta']){gains[name]=context.createGain();gains[name].connect(master);updateLevel(name);}
    pulseGain=context.createGain();pulseGain.connect(gains.cajon);updatePulseLevel();
    context.addEventListener('statechange',()=>{if(playing&&context.state!=='running'){stop();$('status').textContent='Звук приостановлен. Нажми «Начать».';}});
  }
  const resumed=context.resume();
  if(!loadPromise){loadPromise=(async()=>{
    const result={};
    const banks={studio:{...window.COMPAS_SAMPLES,bright:window.COMPAS_SAMPLES.hard,filler:window.COMPAS_SAMPLES.soft,double:window.COMPAS_SAMPLES.hard,softer:window.COMPAS_SAMPLES.soft,pandereta:window.COMPAS_IPHONE_SAMPLES.pandereta},iphone:window.COMPAS_IPHONE_SAMPLES};
    await Promise.all(Object.entries(banks).map(async([bankId,recordings])=>{
      const bank={};
      await Promise.all(Object.entries(recordings).map(async([key,files])=>{
        bank[key]=await Promise.all(files.map(async b64=>{
          const raw=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
          const decoded=await context.decodeAudioData(raw.buffer);
          let peak=0;for(let c=0;c<decoded.numberOfChannels;c++){for(const value of decoded.getChannelData(c))peak=Math.max(peak,Math.abs(value));}
          if(peak<.0001)throw Error('Пустая запись');
          let onset=0;
          if(bankId==='studio'){
            const threshold=peak*.015;
            outer:for(let i=0;i<decoded.length;i++){for(let c=0;c<decoded.numberOfChannels;c++)if(Math.abs(decoded.getChannelData(c)[i])>=threshold){onset=Math.max(0,i-Math.round(.001*decoded.sampleRate));break outer;}}
          }
          // Imported recordings keep their authored dynamics, attack and relative level.
          return {buffer:decoded,offset:onset/decoded.sampleRate,scale:bankId==='iphone'?1:.78/peak};
        }));
      }));
      result[bankId]=bank;
    }));buffers=result;
  })().catch(e=>{loadPromise=null;throw e;});}
  await Promise.all([resumed,loadPromise]);
}
function updateLevel(name){
  const level=muted[name]?0:levels[name]/100;
  if(gains)gains[name].gain.setTargetAtTime(level,context.currentTime,.012);
  $(name+'Value').textContent=muted[name]?'Выкл.':Math.round(levels[name])+'%';
  $(name+'Mute').setAttribute('aria-pressed',String(muted[name]));
  $(name+'Mute').setAttribute('aria-label',(muted[name]?'Включить ':'Выключить ')+({palmas:'пальмас',cajon:'кахон',pandereta:'пандерету'}[name]));
}
function hit(kind,instrument,time,velocity){
  const choices=buffers[soundBank][kind], sample=choices[variants[kind]++%choices.length];
  const source=context.createBufferSource(), gain=context.createGain();
  source.buffer=sample.buffer;
  const level=sample.scale*velocity*(currentPattern().outputGain || 1);
  gain.gain.value=level;
  source.connect(gain);gain.connect(kind==='tap'?pulseGain:gains[instrument]);sources.add(source);
  source.onended=()=>{sources.delete(source);source.disconnect();gain.disconnect();};
  source.start(time,sample.offset);
  if(kind==='tap'&&soundBank==='studio'){
    gain.gain.setValueAtTime(level,time);
    gain.gain.setTargetAtTime(0,time+.06,.025);
    source.stop(time+.18);
  }
}
function schedule(){
  if(!playing)return;
  if(nextTime<context.currentTime-.05){nextTime=context.currentTime+.04;queue=[];}
  while(nextTime<context.currentTime+.15){
    // Eighth-of-a-count clock accommodates the original app's short rolls.
    const pattern=currentPattern(), ticksPerPosition=8/(pattern.tempoFraction || 1);
    const part=index%ticksPerPosition, position=Math.floor(index/ticksPerPosition)%pattern.order.length;
    const rawBeat=pattern.order[position], beat=typeof rawBeat==='number'?rawBeat:pattern.order.slice(0,position+1).filter(n=>typeof n==='number').at(-1), half=part>0||typeof rawBeat==='string', accent=isAccent(beat,position);
    let voiced=false;
    if(pattern.eventGrid){
      for(const event of pattern.eventGrid[index]){
        hit(event.kind,event.instrument,nextTime,event.velocity);voiced=true;
      }
    }else if(pattern.steps){
      const stride=pattern.resolution===4?2:4;
      const entry=index%stride===0?pattern.steps[index/stride]:null;
      if(entry&&(!half||fillHalfBeats)){
        const [palm,bass,slap]=entry;
        if(palm)hit(accent&&!half?'hard':(pattern.fillKind || 'soft'),'palmas',nextTime,palm);
        if(bass)hit('bass','cajon',nextTime,bass);
        if(slap)hit('slap','cajon',nextTime,slap);
        voiced=Boolean(palm||bass||slap);
      }
    }else if(part===0){
      hit(accent?'hard':(pattern.fillKind || 'soft'),'palmas',nextTime,accent ? .9 : .58);
      if(pattern.bass.includes(beat))hit('bass','cajon',nextTime,.8);
      if(pattern.slap.includes(beat))hit('slap','cajon',nextTime,.72);
      voiced=true;
    }else if(part===4&&fillHalfBeats){
      hit(pattern.fillKind || 'soft','palmas',nextTime,.34);voiced=true;
    }
    if(pattern.pulseSteps&&fillHalfBeats&&index%2===0){
      hit('tap','cajon',nextTime,pattern.pulseSteps[index/2]);voiced=true;
    }
    if(part===0||voiced)queue.push({time:nextTime,beat,half,part,position});
    index=(index+1)%(pattern.eventGrid?pattern.eventGrid.length:96);nextTime+=7.5/bpm;
  }
}
function startTimer(){
  try{
    const url=URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),25)'],{type:'text/javascript'}));
    worker=new Worker(url);URL.revokeObjectURL(url);worker.onmessage=schedule;
    worker.onerror=()=>{worker?.terminate();worker=null;if(!timer)timer=setInterval(schedule,25);};
  }catch{timer=setInterval(schedule,25);}
}
function uiFrame(){
  if(!playing)return;
  // Align the display with the output clock when the browser supplies it.
  const stamp=context.getOutputTimestamp?.();
  const heard=stamp?.contextTime>0?stamp.contextTime+(performance.now()-stamp.performanceTime)/1000:context.currentTime;
  let latest;while(queue.length&&queue[0].time<=heard)latest=queue.shift();
  if(latest&&(latest.position+':'+latest.part)!==active){
    document.querySelector('.beat.active')?.classList.remove('active','offbeat');
    active=latest.position+':'+latest.part;
    const node=document.querySelector(`[data-position="${latest.position}"]`);
    node.classList.add('active');node.classList.toggle('offbeat',latest.half);
    $('currentBeat').textContent=latest.beat;
  }
  requestAnimationFrame(uiFrame);
}
async function start(count){
  if(starting||playing)return;
  const startTick=count===undefined?0:tickForCount(currentPattern(),count);
  if(startTick===null)return;
  starting=true;const run=++token;
  $('play').disabled=true;$('startNine').disabled=true;$('status').textContent='Подготовка живых записей…';
  try{
    await initAudio();if(run!==token)return;
    if(context.state!=='running')throw Error('Аудио недоступно');
    playing=true;index=startTick;queue=[];nextTime=context.currentTime+.09;
    $('playText').textContent='Остановить';$('playIcon').textContent='■';$('status').textContent='Живые записи · без интернета';
    schedule();startTimer();requestAnimationFrame(uiFrame);
  }catch(e){$('status').textContent='Не удалось включить звук. Нажми «Начать» ещё раз.';console.error(e);}
  finally{starting=false;$('play').disabled=false;$('startNine').disabled=false;}
}
function stop(){
  ++token;playing=false;clearInterval(timer);timer=null;worker?.terminate();worker=null;
  for(const source of sources){try{source.stop();}catch{}}sources.clear();queue=[];
  $('playText').textContent='Начать';$('playIcon').textContent='▶';renderWheel();
}
$('play').addEventListener('click',()=>playing?stop():start());
$('startNine').addEventListener('click',()=>{if(starting)return;if(playing)stop();start(9);});
$('patternPreset').addEventListener('change',e=>{const selected=e.target.value;stop();stylePresets[style]=selected;persist();renderWheel();});
$('soundBank').value=soundBank;
$('soundBank').addEventListener('change',e=>{soundBank=e.target.value;persist();});
$('halfBeats').addEventListener('change',e=>{fillHalfBeats=e.target.checked;$('pulse').disabled=!fillHalfBeats;persist();});
function updatePulseLevel(){
  if(pulseGain)pulseGain.gain.setTargetAtTime(pulseLevel/100,context.currentTime,.012);
  $('pulseValue').textContent=Math.round(pulseLevel)+'%';
}
$('pulse').value=pulseLevel;updatePulseLevel();
$('pulse').addEventListener('input',e=>{pulseLevel=Number(e.target.value);updatePulseLevel();persist();});
$('tempo').addEventListener('input',e=>setBpm(e.target.value));
$('bpm').addEventListener('change',e=>setBpm(e.target.value));
$('bpm').addEventListener('keydown',e=>{if(e.key==='Enter'){setBpm(e.target.value);e.target.blur();}});
$('minus').addEventListener('click',()=>setBpm(bpm-1));$('plus').addEventListener('click',()=>setBpm(bpm+1));
function selectStyle(selected){
  if(selected===style)return;
  stop();style=selected;setBpm(currentPattern().bpm);renderWheel();taps=[];
}
const styleButtons=[...document.querySelectorAll('[data-style]')];
$('mobileStyle').replaceChildren(...styleButtons.map(button=>{
  const option=document.createElement('option');option.value=button.dataset.style;
  option.textContent=STYLES[button.dataset.style].label;return option;
}));
$('mobileStyle').addEventListener('change',e=>selectStyle(e.target.value));
styleButtons.forEach(button=>button.addEventListener('click',()=>selectStyle(button.dataset.style)));
for(const name of ['palmas','cajon','pandereta']){
  $(name).value=levels[name];updateLevel(name);
  $(name).addEventListener('input',e=>{levels[name]=Number(e.target.value);updateLevel(name);persist();});
  $(name+'Mute').addEventListener('click',()=>{muted[name]=!muted[name];updateLevel(name);});
}
let taps=[];
$('tap').addEventListener('click',()=>{
  const now=performance.now();if(taps.length&&now-taps.at(-1)>2000)taps=[];
  taps.push(now);taps=taps.slice(-7);
  if(taps.length>=2)setBpm(60000/((now-taps[0])/(taps.length-1)));
  $('tap').textContent=taps.length<2?'Ещё…':'Тап';
});
document.addEventListener('keydown',e=>{
  if(e.code==='Space'&&!e.repeat&&!$('credits').open&&!['INPUT','BUTTON','TEXTAREA','SELECT','A'].includes(document.activeElement.tagName)){
    e.preventDefault();playing?stop():start();
  }
});
$('creditsButton').addEventListener('click',()=>$('credits').showModal());
window.addEventListener('pagehide',stop);
setBpm(bpm);renderWheel();

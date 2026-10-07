'use strict';
(() => {
const root=document.documentElement;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
let manualReduced=false;
const motionOff=()=>manualReduced||reduced.matches;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const hero=document.querySelector('.hero');
const region=document.querySelector('.regional');
const stories=[...document.querySelectorAll('[data-service]')];
const images=[...document.querySelectorAll('[data-service-media]')];
const gallery=document.querySelector('.service-gallery');
const topbar=document.getElementById('topbar');
const labels={airport:['01','Flughafentransfer'],business:['02','Businessfahrten'],private:['03','Private Anlässe']};
let ticking=false;
function update(){
 ticking=false;const vh=window.innerHeight;
 root.style.setProperty('--progress',clamp(window.scrollY/Math.max(1,document.documentElement.scrollHeight-vh)));
 topbar?.classList.toggle('is-scrolled',window.scrollY>30);
 if(hero&&!motionOff()){
 const r=hero.getBoundingClientRect();
 if(r.bottom>0&&r.top<vh){const p=clamp(-r.top/Math.max(1,hero.offsetHeight-vh));hero.style.setProperty('--hero-scale',1.04+p*.16);hero.style.setProperty('--hero-y',`${-p*22}px`);hero.style.setProperty('--hero-copy-y',`${-p*45}px`);hero.style.setProperty('--hero-opacity',1-p*.18);}
 }
 if(region&&!motionOff()){const r=region.getBoundingClientRect();if(r.bottom>0&&r.top<vh)region.style.setProperty('--region-y',`${((vh-r.top)/(vh+r.height)-.5)*70}px`);}
 if(stories.length){
 const mobile=window.innerWidth<=700;const reference=mobile?Math.min(vh*.8,72+(gallery?.offsetHeight||0)+(vh-72-(gallery?.offsetHeight||0))*.4):vh*.52;
 let active=stories[0],distance=Infinity;
 for(const story of stories){const r=story.getBoundingClientRect();const d=Math.abs((r.top+r.height*.45)-reference);if(d<distance){distance=d;active=story;}}
 const key=active.dataset.service;const r=active.getBoundingClientRect();const p=clamp((reference-r.top)/r.height);
 gallery?.style.setProperty('--chapter-progress',p);
 images.forEach(img=>{const isActive=img.dataset.serviceMedia===key;img.classList.toggle('is-active',isActive);if(isActive)img.style.transform=motionOff()?'none':`scale(${1.025+p*.075}) translateY(${-p*10}px)`;});
 const count=document.querySelector('.service-gallery-number'),name=document.querySelector('.service-gallery-name');if(count)count.textContent=labels[key][0];if(name)name.textContent=labels[key][1];
 }
}
function request(){if(!ticking){ticking=true;requestAnimationFrame(update);}}
const reveals=[...document.querySelectorAll('.reveal')];
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting){e.target.classList.add('is-visible');observer.unobserve(e.target);}}},{threshold:.08});reveals.forEach(el=>observer.observe(el));}else{reveals.forEach(el=>el.classList.add('is-visible'));}
const motionButton=document.getElementById('motionToggle');
function syncMotion(){const off=motionOff();root.classList.toggle('no-motion',off);if(off)reveals.forEach(el=>el.classList.add('is-visible'));if(motionButton){motionButton.setAttribute('aria-pressed',String(off));motionButton.textContent=reduced.matches?'Systemeinstellung: wenig Bewegung':off?'Bewegung aktivieren':'Bewegung reduzieren';motionButton.disabled=reduced.matches;}request();}
motionButton?.addEventListener('click',()=>{manualReduced=!manualReduced;syncMotion();});reduced.addEventListener('change',syncMotion);
window.addEventListener('scroll',request,{passive:true});window.addEventListener('resize',request,{passive:true});
const menu=document.querySelector('.mobile-nav');
menu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.open=false;}));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu?.open){menu.open=false;menu.querySelector('summary').focus();}});
document.addEventListener('click',event=>{if(menu?.open&&!menu.contains(event.target))menu.open=false;});
document.querySelectorAll('[data-kind]').forEach(a=>a.addEventListener('click',()=>{const select=document.getElementById('kind');if(select)select.value=a.dataset.kind;}));
const form=document.getElementById('requestForm');
if(form){
const from=form.elements.from,to=form.elements.to,date=form.elements.date,people=form.elements.people;
const status=document.getElementById('formStatus'),result=document.getElementById('requestResult'),text=document.getElementById('requestText'),email=document.getElementById('preparedEmail');
function dateMin(){const now=new Date();date.min=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
dateMin();date.addEventListener('focus',dateMin);
form.addEventListener('submit',e=>e.preventDefault());
[from,to].forEach(input=>input.addEventListener('input',()=>input.setCustomValidity('')));
function prepare(){
 dateMin();[from,to].forEach(input=>input.setCustomValidity(input.value.trim()?'':'Bitte geben Sie einen Ort an.'));
 if(!form.reportValidity())return null;
 const data=new FormData(form);const formattedDate=date.value?date.value.split('-').reverse().join('.'):'Noch offen';
 const lines=['Hallo Herr Hansen,','ich möchte unverbindlich folgende Fahrt anfragen:','',`Anlass: ${data.get('kind')}`,`Abholort: ${from.value.trim()}`,`Ziel: ${to.value.trim()}`,`Datum: ${formattedDate}`,`Uhrzeit: ${data.get('time')||'Noch offen'}`,`Fahrgäste: ${people.value||'Noch offen'}`];
 const note=String(data.get('note')||'').trim();if(note)lines.push(`Weitere Wünsche: ${note}`);lines.push('','Bitte teilen Sie mir die Verfügbarkeit und den Preis mit.','Vielen Dank!');
 const body=lines.join('\n');text.value=body;email.href=`mailto:info_hansen@gmx.de?subject=${encodeURIComponent('Unverbindliche Fahrtanfrage')}&body=${encodeURIComponent(body)}`;result.hidden=false;return body;
}
document.getElementById('emailRequest').addEventListener('click',()=>{if(!prepare())return;status.textContent='Ihr Text ist vorbereitet. Öffnen Sie unten Ihr E-Mail-Programm. Es wurde noch keine Nachricht gesendet.';result.scrollIntoView({behavior:motionOff()?'instant':'smooth',block:'nearest'});email.focus({preventScroll:true});});
document.getElementById('copyRequest').addEventListener('click',async()=>{const body=prepare();if(!body)return;try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(body);status.textContent='Anfragetext kopiert. Sie können ihn jetzt in eine E-Mail oder Nachricht einfügen.';}catch{status.textContent='Bitte den markierten Text selbst kopieren und in Ihre Nachricht einfügen.';text.focus();text.select();}});
form.querySelectorAll('input,select,textarea:not([readonly])').forEach(el=>el.addEventListener('input',()=>{if(!result.hidden){result.hidden=true;status.textContent='Angaben geändert. Bitte den Anfragetext erneut vorbereiten.';}}));
}
const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
root.classList.add('js');syncMotion();request();
})();

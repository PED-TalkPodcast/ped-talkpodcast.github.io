/* v89 — unified app appearance, devotional flow, Explore daily visual system. */
let deferredAppInstallPrompt = null;
const appInstallButton = document.getElementById('appInstallButton');
const installGuide = document.getElementById('installGuide');
const installStatus = document.getElementById('installStatus');
const appIsInstalled = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
if (new URLSearchParams(window.location.search).get('install') === '1' && installGuide) installGuide.hidden = false;
if (appIsInstalled() && appInstallButton) {
 appInstallButton.hidden = true;
 if (installStatus) installStatus.textContent = 'PED-Talk is already installed on this device.';
}
window.addEventListener('beforeinstallprompt', event => {
 event.preventDefault();
 deferredAppInstallPrompt = event;
 if (appInstallButton) { appInstallButton.hidden = false; appInstallButton.textContent = 'Install'; }
 if (installStatus) installStatus.textContent = 'PED-Talk is ready to install. Tap Install to add it to your home screen.';
});
appInstallButton?.addEventListener('click', async () => {
 if (appIsInstalled()) {
  appInstallButton.hidden = true;
  if (installStatus) installStatus.textContent = 'PED-Talk is already installed on this device.';
  return;
 }
 if (!deferredAppInstallPrompt) {
  if (installStatus) installStatus.textContent = /iphone|ipad|ipod/i.test(navigator.userAgent)
   ? 'On your iPhone, tap Share, then choose Add to Home Screen.'
   : 'In Chrome, open the ⋮ menu and choose Install app or Add to Home screen. If that option is missing, make sure you are online and try again shortly.';
  if (installGuide) installGuide.hidden = false;
  return;
 }
 const promptEvent = deferredAppInstallPrompt;
 deferredAppInstallPrompt = null;
 try {
  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  if (installStatus) installStatus.textContent = choice?.outcome === 'accepted'
   ? 'Installation accepted. Follow the phone prompt to finish adding PED-Talk.'
   : 'Installation was cancelled. You can tap Install whenever you are ready.';
 } catch (error) {
  console.warn('PED-Talk install prompt was not completed', error);
  if (installStatus) installStatus.textContent = 'Open Chrome’s ⋮ menu and choose Install app or Add to Home screen.';
 }
});
window.addEventListener('appinstalled', () => {
 deferredAppInstallPrompt = null;
 if (appInstallButton) appInstallButton.hidden = true;
 if (installGuide) installGuide.hidden = false;
 if (installStatus) installStatus.textContent = 'PED-Talk has been added to your phone.';
});
const appUpcomingList=document.getElementById('appUpcomingList');
let upcomingScheduleRows=[];
async function renderAppUpcoming(){
 const list=document.getElementById('appUpcomingList');
 if(!list)return;
 try{
  const response=await fetch('../upcoming.json?refresh='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw new Error('Upcoming schedule unavailable');
  const schedule=await response.json();
  const rows=(Array.isArray(schedule.episodes)?schedule.episodes:[]).slice(0,5);
  upcomingScheduleRows=rows;
  const count=document.getElementById('upcomingCount');
  if(count)count.textContent=rows.length+' upcoming';
  list.innerHTML=rows.length?rows.map((episode,index)=>{
   const number=String(Number(episode.number)||index+1).padStart(2,'0');
   return '<article class="upcoming-row"><span class="upcoming-episode">EP '+number+'</span><span class="upcoming-row-copy"><strong class="upcoming-title">'+escapeBibleHTML(episode.title||'Upcoming conversation')+'</strong>'+(episode.subtitle?'<small class="upcoming-subtitle">'+escapeBibleHTML(episode.subtitle)+'</small>':'')+'</span><span class="upcoming-row-arrow" aria-hidden="true">↗</span></article>';
  }).join(''):'<p class="upcoming-empty">New conversations will appear here when they are announced.</p>';
  list.hidden=false;
 }catch(error){
  list.innerHTML='<p class="upcoming-empty">Upcoming conversations are temporarily unavailable. Please try again shortly.</p>';
  list.hidden=false;
  console.warn('Upcoming schedule could not be refreshed',error);
 }
}
renderAppUpcoming();
// Keep the featured artwork visible even when image decoding is delayed or the asset cannot load.
const upcomingGraphic=document.getElementById('appUpcomingGraphic');
if(upcomingGraphic){
 const markArtworkReady=()=>{upcomingGraphic.classList.add('is-loaded');upcomingGraphic.classList.remove('is-unavailable');};
 const markArtworkUnavailable=()=>{upcomingGraphic.classList.remove('is-loaded');upcomingGraphic.classList.add('is-unavailable');upcomingGraphic.setAttribute('aria-label','Upcoming episode artwork is temporarily unavailable');};
 upcomingGraphic.addEventListener('load',markArtworkReady,{once:true});
 upcomingGraphic.addEventListener('error',markArtworkUnavailable,{once:true});
 if(upcomingGraphic.complete){
  if(upcomingGraphic.naturalWidth>0)markArtworkReady();
  else markArtworkUnavailable();
 }else if(typeof upcomingGraphic.decode==='function'){
  upcomingGraphic.decode().then(markArtworkReady).catch(()=>{if(upcomingGraphic.complete&&upcomingGraphic.naturalWidth===0)markArtworkUnavailable();});
 }
}
const showcase=document.getElementById('appShowcase');
let dwoopTransitionToken=0;
let lastDwoopTrigger=null;
let activeAppView='home';
function currentAppView(){return activeAppView;}
function ensureAppHistory(){
 if(!window.history?.state?.pedTalkApp)window.history.replaceState({pedTalkApp:true,view:currentAppView()},'',window.location.href);
}
function pushOverlayHistory(overlay){
 ensureAppHistory();
 if(window.history.state?.overlay!==overlay)window.history.pushState({...window.history.state,pedTalkApp:true,overlay},'',window.location.href);
}
if(window.history&&!window.history.state?.pedTalkApp)window.history.replaceState({pedTalkApp:true,view:'home'},'',window.location.href);
function openDwoopModal(kind='upcoming'){
 const transitionToken=++dwoopTransitionToken;
 const overlay=document.getElementById('dwoopOverlay'),title=document.getElementById('dwoopTitle'),eyebrow=document.getElementById('dwoopEyebrow'),intro=document.getElementById('dwoopIntro'),content=document.getElementById('dwoopContent');
 if(!overlay||!title||!content)return;
 const activePlayer=document.getElementById('pedtalkAudioEngine');
 const detailCard=overlay.querySelector('.dwoop-card-expanded');detailCard?.classList.toggle('dwoop-light',document.body.classList.contains('app-light'));
 const indicator=document.querySelector('.coming-soon-indicator');if(indicator)indicator.hidden=false;
 const artwork=document.getElementById('dwoopArtwork');if(artwork){artwork.replaceChildren();const source=kind==='upcoming'?document.querySelector('.app-showcase-upcoming .upcoming-artwork'):kind==='anagkazo'?document.querySelector('.app-showcase-anagkazo .anagkazo-artwork'):kind==='world'?document.querySelector('.app-showcase-world img'):kind==='real'?document.querySelector('.app-showcase-real img'):document.querySelector('.app-showcase-voice img');if(source){const clone=source.cloneNode(true);clone.querySelectorAll?.('[id]').forEach(node=>node.removeAttribute('id'));clone.removeAttribute?.('id');artwork.appendChild(clone);}}
 if(kind==='upcoming'){
  eyebrow.textContent='PED-TALK · COMING UP NEXT';title.textContent='Upcoming episodes';intro.textContent='A look at the conversations being prepared for you.';
  content.innerHTML=upcomingScheduleRows.length?upcomingScheduleRows.map((ep,index)=>'<article class="dwoop-episode"><span class="dwoop-episode-number">EP '+String(Number(ep.number)||index+1).padStart(2,'0')+'</span><div><h3>'+escapeBibleHTML(ep.title||'Upcoming conversation')+'</h3>'+(ep.subtitle?'<p>'+escapeBibleHTML(ep.subtitle)+'</p>':'')+'</div><span class="dwoop-status">COMING SOON</span></article>').join(''):'<p class="dwoop-empty">The next conversations will appear here when they are announced.</p>';
 }else if(kind==='anagkazo'){
  eyebrow.textContent='THE HOUSE BEHIND THE VOICE';title.textContent='ANAGKAZO.';intro.textContent='Christian · Broadcasting · Media';content.innerHTML='<p class="dwoop-feature-copy">Stories that help the world see a brighter day. A growing media house for conversations, creativity and meaningful stories.</p>';
 }else if(kind==='real'){
   eyebrow.textContent='PED-TALK · ANAGKAZO MEDIA';title.textContent='Real conversations. Brighter days.';intro.textContent='Honest voices, meaningful stories and conversations that help us grow.';content.innerHTML='<p class="dwoop-feature-copy">PED-Talk creates room for honest conversations about faith, family, friendship, relationships and everyday life — helping people see a brighter day.</p>';
  }else if(kind==='world'){
  eyebrow.textContent='ACROSS EVERY ROOM';title.textContent='Brighter conversations for a wider world.';intro.textContent='Stories that travel beyond one room, one voice and one moment.';content.innerHTML='<p class="dwoop-feature-copy">PED-Talk carries honest conversations into more rooms, more homes and more hearts — always making space for a brighter day.</p>';
 }else{
  eyebrow.textContent='VOICE OF HEALING';title.textContent='There is power in being heard.';intro.textContent='Stories, sound and stillness for the moments that need a gentler place to land.';content.innerHTML='<p class="dwoop-feature-copy">A space for thoughtful conversations and stories that meet people with care.</p>';
 }
 const overlayWasOpen=!overlay.hidden;
 if(!overlayWasOpen){lastDwoopTrigger=document.activeElement&&document.activeElement!==document.body?document.activeElement:document.querySelector('.app-showcase-slide[aria-hidden="false"]');pushOverlayHistory('dwoop');window.PEDShowcase?.pause();const scrollY=window.scrollY||window.pageYOffset||0;document.body.style.setProperty('--dwoop-scroll-top',(-scrollY)+'px');document.body.dataset.dwoopScrollY=String(scrollY);document.body.classList.add('dwoop-locked');}
 overlay.querySelector('.dwoop-card-expanded')?.classList.remove('dwoop-page-card','episode-swipe-next','episode-swipe-prev');overlay.classList.remove('dwoop-page-mode','dwoop-reading-mode','dwoop-episode-mode');
 overlay.hidden=false;requestAnimationFrame(()=>{if(transitionToken===dwoopTransitionToken)overlay.classList.add('active');});document.getElementById('dwoopClose')?.focus({preventScroll:true});
}
function closeDwoopModal(fromHistory=false){
 const overlay=document.getElementById('dwoopOverlay');if(!overlay||overlay.hidden)return;
 if(!fromHistory&&window.history?.state?.overlay==='dwoop'){window.history.back();return;}
 const transitionToken=++dwoopTransitionToken;
 const player=document.getElementById('pedtalkAudioEngine');
 overlay.querySelector('.dwoop-card-expanded')?.classList.remove('dwoop-light','dwoop-page-card','episode-swipe-next','episode-swipe-prev');
 overlay.classList.remove('dwoop-page-mode','dwoop-reading-mode','dwoop-episode-mode');
 const indicator=document.querySelector('.coming-soon-indicator');if(indicator)indicator.hidden=false;
 overlay.classList.remove('active');
 const y=Number(document.body.dataset.dwoopScrollY)||0;
 window.setTimeout(()=>{if(transitionToken!==dwoopTransitionToken)return;overlay.hidden=true;document.body.classList.remove('dwoop-locked');document.body.style.removeProperty('--dwoop-scroll-top');delete document.body.dataset.dwoopScrollY;window.scrollTo(0,y);if(lastDwoopTrigger?.isConnected)lastDwoopTrigger.focus?.({preventScroll:true});lastDwoopTrigger=null;window.PEDShowcase?.resume();},320);
}
document.getElementById('dwoopClose')?.addEventListener('click',closeDwoopModal);
const dwoopOverlay=document.getElementById('dwoopOverlay');
dwoopOverlay?.addEventListener('click',event=>{if(event.target===dwoopOverlay)closeDwoopModal();});
let dwoopSwipeStart=null;
const dwoopCard=dwoopOverlay?.querySelector('.dwoop-card-expanded');
dwoopCard?.addEventListener('touchstart',event=>{
 const touch=event.changedTouches[0];if(!touch)return;
 const target=event.target;
 if(target.closest('button,a,summary,input,textarea,select,audio,[contenteditable="true"]')){dwoopSwipeStart=null;return;}
 dwoopSwipeStart={x:touch.clientX,y:touch.clientY,scrollTop:dwoopCard.scrollTop};
},{passive:true});
dwoopCard?.addEventListener('touchend',event=>{
 if(!dwoopSwipeStart)return;
 const start=dwoopSwipeStart;dwoopSwipeStart=null;const touch=event.changedTouches[0];if(!touch)return;
 const dx=touch.clientX-start.x,dy=touch.clientY-start.y;
 if(start.scrollTop<=2&&dwoopCard.scrollTop<=2&&dy>92&&dy>Math.abs(dx)*1.25)closeDwoopModal();
},{passive:true});
document.addEventListener('keydown',event=>{
 const overlay=document.getElementById('dwoopOverlay');
 if(overlay&&!overlay.hidden&&event.key==='Escape'){closeDwoopModal();return;}
 if(overlay&&!overlay.hidden&&event.key==='Tab'){
  const focusable=[...overlay.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(node=>!node.hidden&&node.getClientRects().length);
  if(!focusable.length){event.preventDefault();overlay.querySelector('.dwoop-card-expanded')?.focus();return;}
  const first=focusable[0],last=focusable[focusable.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }
});
if(showcase){
 const track=document.getElementById('appShowcaseTrack'),slides=[...track.querySelectorAll('.app-showcase-slide')],slideCount=slides.length;
 slides.forEach(slide=>{slide.setAttribute('role','button');slide.setAttribute('aria-haspopup','dialog');});
 let slideIndex=0,slideTimer=null,pointerStart=null,suppressClickUntil=0;
 function stopShowcaseTimer(){if(slideTimer){window.clearTimeout(slideTimer);slideTimer=null;}}
 function canAutoplay(){return !document.hidden&&!pointerStart&&!document.getElementById('homeView')?.hidden&&document.getElementById('dwoopOverlay')?.hidden!==false&&document.getElementById('hopeModal')?.hidden!==false&&document.getElementById('appSettingsModal')?.hidden!==false;}
 function scheduleShowcaseAdvance(){stopShowcaseTimer();if(!canAutoplay()||!slideCount)return;slideTimer=window.setTimeout(()=>showShowcaseSlide(slideIndex+1),8000);}
 function showShowcaseSlide(index){
  if(!slideCount)return;
  slideIndex=((index%slideCount)+slideCount)%slideCount;
  track.style.transform='translate3d(-'+(slideIndex*100)+'%,0,0)';
  slides.forEach((slide,i)=>{const active=i===slideIndex;slide.setAttribute('aria-hidden',active?'false':'true');slide.tabIndex=active?0:-1;slide.inert=!active;});
  scheduleShowcaseAdvance();
 }
 showcase.addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  pointerStart={id:event.pointerId,x:event.clientX,y:event.clientY};stopShowcaseTimer();
 },{passive:true});
 showcase.addEventListener('pointerup',event=>{
  if(!pointerStart||event.pointerId!==pointerStart.id)return;
  const dx=event.clientX-pointerStart.x,dy=event.clientY-pointerStart.y;pointerStart=null;
  if(Math.abs(dx)>42&&Math.abs(dx)>Math.abs(dy)*1.15){suppressClickUntil=Date.now()+500;showShowcaseSlide(slideIndex+(dx<0?1:-1));}
  else scheduleShowcaseAdvance();
 },{passive:true});
 showcase.addEventListener('pointercancel',()=>{pointerStart=null;scheduleShowcaseAdvance();},{passive:true});
 showcase.addEventListener('click',event=>{
  if(Date.now()<suppressClickUntil||event.target.closest('button,a,input,textarea,select,[data-view]'))return;
  const slide=event.target.closest('.app-showcase-slide');if(!slide||slides.indexOf(slide)!==slideIndex)return;
  openDwoopModal(slides[slideIndex].dataset.showcaseKind||(['upcoming','anagkazo','voice','world'][slideIndex]||'real'));
 });
 showcase.addEventListener('keydown',event=>{
  if(event.key==='ArrowRight'){event.preventDefault();showShowcaseSlide(slideIndex+1);return;}
  if(event.key==='ArrowLeft'){event.preventDefault();showShowcaseSlide(slideIndex-1);return;}
  if((event.key==='Enter'||event.key===' ')&&event.target.classList.contains('app-showcase-slide')){event.preventDefault();openDwoopModal(slides[slideIndex].dataset.showcaseKind||(['upcoming','anagkazo','voice','world','real'][slideIndex]||'upcoming'));}
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopShowcaseTimer();else scheduleShowcaseAdvance();});
 window.PEDShowcase={pause:stopShowcaseTimer,resume:scheduleShowcaseAdvance,goTo:showShowcaseSlide,get activeIndex(){return slideIndex;}};
 showShowcaseSlide(0);
}
const groupRoot=document.getElementById('episodeGroups');
const archiveRoot=document.getElementById('archiveEpisodeGroups');
[groupRoot,archiveRoot].forEach(root=>root?.addEventListener('click',event=>{
 const card=event.target.closest('[data-episode-index]');if(!card)return;
 const ep=allEpisodes[Number(card.dataset.episodeIndex)];if(ep)openEpisodeModal(ep,allEpisodes.filter(item=>episodeSeason(item)===episodeSeason(ep)));
}));
let allEpisodes=[];let activeCategory='All';let archiveCategory='All';
function plainText(html=''){const node=document.createElement('div');node.innerHTML=html;return(node.textContent||'').replace(/\s+/g,' ').trim()}
function categoryFor(ep){const text=(ep.title+' '+plainText(ep.description)).toLowerCase();if(/relationship|marriage|dating|couple|family|partner/.test(text))return'Relationships';if(/friend|friendship|companionship|together/.test(text))return'Friendship';if(/love|loving|beloved|compassion/.test(text))return'Love';return'Leadership'}
function episodeSeason(ep){const match=(ep.title||'').match(/S(\d+)E\d+/i);return match?parseInt(match[1],10):1}
function episodeNumber(ep){const match=(ep.title||'').match(/S\d+E(\d+)/i);return match?parseInt(match[1],10):null}
function displayEpisodeTitle(ep){const title=(ep.title||'').trim();if(/^S\d+E\d+/i.test(title)){const n=episodeNumber(ep);const known={3:'Character Becomes Destiny',4:'Mistakes Are Inevitable',5:'Discussion: Lilian & Dave'};return known[n]||'PED-Talk Conversation'}return title}
function sortedEpisodes(list){return [...list].sort((a,b)=>episodeSeason(b)-episodeSeason(a)||(episodeNumber(b)||0)-(episodeNumber(a)||0)||String(b.published||'').localeCompare(String(a.published||'')))}
function renderEpisodeGroups(root,list,emptyMessage){
 if(!root)return;
 if(!list.length){root.innerHTML='<p class="empty">'+emptyMessage+'</p>';return}
 const groups=new Map();
 sortedEpisodes(list).forEach(ep=>{const season=episodeSeason(ep);if(!groups.has(season))groups.set(season,[]);groups.get(season).push(ep)});
 root.innerHTML=[...groups.entries()].sort((a,b)=>b[0]-a[0]).map(([season,eps])=>{
  const seasonLabel='SEASON '+String(season).padStart(2,'0');
  return '<section class="season"><div class="season-heading"><div><p class="eyebrow">'+seasonLabel+'</p><h3 class="season-title">Season '+season+'</h3></div><span class="season-count">'+eps.length+' '+(eps.length===1?'episode':'episodes')+'</span></div><div class="episode-grid">'+eps.map(ep=>{
   const index=allEpisodes.indexOf(ep),number=episodeNumber(ep),title=displayEpisodeTitle(ep);
   const meta=(number?'EPISODE '+String(number).padStart(2,'0')+' · ':'')+categoryFor(ep).toUpperCase();
   const date=ep.published?new Date(ep.published).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'PED-Talk';
   const duration=ep.duration?(' · '+String(ep.duration)) : '';
   const rowMeta='SEASON '+String(episodeSeason(ep)).padStart(2,'0')+' · '+date+duration;
   return '<button type="button" class="episode episode-open-card" data-episode-index="'+index+'" aria-label="Open '+escapeBibleHTML(title)+' episode details"><span class="episode-art"><img loading="lazy" src="'+escapeBibleHTML(episodeArtworkUrl(ep.image))+'" alt=""></span><span class="episode-info"><strong class="episode-card-title">'+escapeBibleHTML(title)+'</strong><span class="tag">'+rowMeta+'</span></span></button>'
  }).join('')+'</div></section>'
 }).join('');
}
let activeEpisodeSequence=[],activeEpisodeIndex=0;
const persistentAudio=document.getElementById('pedtalkAudioEngine'),miniPlayer=document.getElementById('miniPlayer');
const PLAYBACK_POSITION_KEY='pedtalk-playback-position-v1';
function activePlaybackIdentity(){const ep=window.pedTalkActiveEpisode||{};return ep.audio||ep.title||'';}
function persistPlaybackPosition(){
 if(!persistentAudio||!persistentAudio.src||!activePlaybackIdentity()||!Number.isFinite(persistentAudio.currentTime))return;
 try{localStorage.setItem(PLAYBACK_POSITION_KEY,JSON.stringify({identity:activePlaybackIdentity(),time:persistentAudio.currentTime}));}catch(error){}
}
persistentAudio?.addEventListener('timeupdate',persistPlaybackPosition);
persistentAudio?.addEventListener('pause',persistPlaybackPosition);
function syncMiniPlayer(){
 if(!persistentAudio||!miniPlayer||!persistentAudio.src)return;
 miniPlayer.hidden=false;
 const ep=window.pedTalkActiveEpisode||{},art=document.getElementById('miniPlayerArtwork'),name=document.getElementById('miniPlayerTitle'),state=document.getElementById('miniPlayerState'),progress=document.getElementById('miniPlayerProgress'),toggle=document.getElementById('miniPlayerToggle'),icon=document.getElementById('miniPlayerToggleIcon');
 if(art&&art.src!==episodeArtworkUrl(ep.image))art.src=episodeArtworkUrl(ep.image);
 if(name)name.textContent=displayEpisodeTitle(ep);
 if(state)state.textContent=persistentAudio.paused?'Ready to listen':'Now playing';
 if(progress)progress.style.width=(persistentAudio.duration?persistentAudio.currentTime/persistentAudio.duration*100:0)+'%';
 if(toggle)toggle.setAttribute('aria-label',persistentAudio.paused?'Play episode':'Pause episode');
 if(icon)icon.textContent=persistentAudio.paused?'▶':'Ⅱ';
}
persistentAudio?.addEventListener('play',syncMiniPlayer);persistentAudio?.addEventListener('pause',syncMiniPlayer);persistentAudio?.addEventListener('timeupdate',syncMiniPlayer);persistentAudio?.addEventListener('loadedmetadata',syncMiniPlayer);
document.getElementById('miniPlayerToggle')?.addEventListener('click',()=>{if(!persistentAudio)return;if(persistentAudio.paused)persistentAudio.play().catch(()=>{});else persistentAudio.pause();});
document.getElementById('miniPlayerOpen')?.addEventListener('click',()=>{const ep=window.pedTalkActiveEpisode;if(ep)openEpisodeModal(ep,window.pedTalkActiveEpisodeSequence||[ep]);});

/* Artwork-led episode palette. Canvas sampling is best-effort; remote images without CORS safely use the neutral studio palette. */
function applyEpisodeArtworkTheme(imageUrl, token){
 const overlay=document.getElementById('dwoopOverlay'),card=overlay?.querySelector('.dwoop-card-expanded');
 if(!card)return;
 const fallback={r:18,g:35,b:56};
 const apply=(rgb)=>{
  if(!card.isConnected||card.dataset.paletteToken!==token)return;
  let [r,g,b]=rgb.map(value=>Math.max(0,Math.min(255,Math.round(value))));
  // Keep the artwork's saturation and brightness, but move green hues into Anagkazo blue.
  const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
  let hue=0;if(delta){if(max===r)hue=60*(((g-b)/delta)%6);else if(max===g)hue=60*((b-r)/delta+2);else hue=60*((r-g)/delta+4);}if(hue<0)hue+=360;
  if(hue>=78&&hue<=168&&delta>18){const light=(max+min)/510,sat=delta/(255-(Math.abs(2*light-1)*255)),c=(1-Math.abs(2*light-1))*sat,x=c*(1-Math.abs((214/60)%2-1)),m=light-c/2;let q=[0,0,0];if(214<60)q=[c,x,0];else if(214<120)q=[x,c,0];else if(214<180)q=[0,c,x];else if(214<240)q=[0,x,c];else if(214<300)q=[x,0,c];else q=[c,0,x];[r,g,b]=q.map(v=>Math.round((v+m)*255));}
  const root=document.documentElement;
  root.style.setProperty('--episode-rgb',r+','+g+','+b);
  root.style.setProperty('--episode-color','rgb('+r+' '+g+' '+b+')');
  root.style.setProperty('--episode-color-soft','rgba('+r+','+g+','+b+',.34)');
  root.style.setProperty('--episode-color-deep','rgb('+Math.round(r*.24)+' '+Math.round(g*.24)+' '+Math.round(b*.24)+')');
  root.style.setProperty('--episode-accent','rgb('+r+' '+g+' '+b+')');
  root.style.setProperty('--episode-glow','rgba('+r+','+g+','+b+',.24)');
  root.style.setProperty('--episode-surface','rgb('+Math.round(r*.10)+' '+Math.round(g*.10)+' '+Math.round(b*.10)+')');
  card.style.setProperty('--episode-rgb',r+','+g+','+b);
  card.style.setProperty('--episode-color','rgb('+r+' '+g+' '+b+')');
  card.style.setProperty('--episode-color-soft','rgba('+r+','+g+','+b+',.34)');
  card.style.setProperty('--episode-color-deep','rgb('+Math.round(r*.24)+' '+Math.round(g*.24)+' '+Math.round(b*.24)+')');
 };
 card.dataset.paletteToken=token;apply([fallback.r,fallback.g,fallback.b]);
 if(!imageUrl)return;
 const image=new Image();image.decoding='async';
 image.onload=()=>{
  try{
   const canvas=document.createElement('canvas'),size=36;canvas.width=size;canvas.height=size;
   const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return;
   context.drawImage(image,0,0,size,size);const pixels=context.getImageData(0,0,size,size).data;
   let r=0,g=0,b=0,count=0;
   for(let i=0;i<pixels.length;i+=16){const alpha=pixels[i+3]/255;if(alpha<.6)continue;const brightness=(pixels[i]+pixels[i+1]+pixels[i+2])/3;if(brightness<22||brightness>238)continue;r+=pixels[i];g+=pixels[i+1];b+=pixels[i+2];count++;}
   if(count){r/=count;g/=count;b/=count;const max=Math.max(r,g,b),min=Math.min(r,g,b);if(max-min<18){r=Math.min(255,r+12);g=Math.min(255,g+18);b=Math.min(255,b+14);}apply([r,g,b]);}
  }catch(error){/* Cross-origin artwork may disallow canvas sampling. Keep the neutral palette. */}
 };
 image.onerror=()=>apply([fallback.r,fallback.g,fallback.b]);image.src=imageUrl;
}
function openEpisodeModal(ep,seasonEpisodes,slideDirection=0){
 const transitionToken=++dwoopTransitionToken;
 const overlay=document.getElementById('dwoopOverlay'),card=overlay?.querySelector('.dwoop-card-expanded');
 if(!overlay||!card||!ep)return;
 const overlayWasOpen=!overlay.hidden;
 if(!overlayWasOpen){lastDwoopTrigger=document.activeElement&&document.activeElement!==document.body?document.activeElement:null;pushOverlayHistory('dwoop');window.PEDShowcase?.pause();}
 const wasOpen=overlayWasOpen&&overlay.classList.contains('dwoop-episode-mode');
 const previousIndex=activeEpisodeIndex;
 activeEpisodeSequence=sortedEpisodes(seasonEpisodes&&seasonEpisodes.length?seasonEpisodes:[ep]);
 activeEpisodeIndex=Math.max(0,activeEpisodeSequence.findIndex(item=>item===ep));
 const direction=slideDirection||(wasOpen&&activeEpisodeIndex!==previousIndex?(activeEpisodeIndex>previousIndex?1:-1):0);
 const title=displayEpisodeTitle(ep),number=episodeNumber(ep),image=episodeArtworkUrl(ep.image);
 const audio=typeof ep.audio==='string'&&/^https:\/\//i.test(ep.audio)?ep.audio:'';
 const link=typeof ep.link==='string'&&/^https:\/\//i.test(ep.link)?ep.link:'';
 const persistentAudio=document.getElementById('pedtalkAudioEngine');if(persistentAudio&&audio){
  const resolvedAudio=new URL(audio,window.location.href).href;
  window.pedTalkActiveEpisode=ep;window.pedTalkActiveEpisodeSequence=activeEpisodeSequence;window.pedTalkActiveEpisodeIndex=activeEpisodeIndex;
  if(persistentAudio.src!==resolvedAudio){
   persistentAudio.pause();persistentAudio.src=resolvedAudio;
   persistentAudio.addEventListener('loadedmetadata',()=>{
    try{const saved=JSON.parse(localStorage.getItem(PLAYBACK_POSITION_KEY)||'null');if(saved&&saved.identity===activePlaybackIdentity()&&Number.isFinite(Number(saved.time))&&Number(saved.time)>0&&Number(saved.time)<persistentAudio.duration)persistentAudio.currentTime=Number(saved.time);}catch(error){}
    syncMiniPlayer();
   },{once:true});
   persistentAudio.load();
  }
  syncMiniPlayer();
 }
 card.classList.add('dwoop-light');card.classList.remove('dwoop-page-card');overlay.classList.remove('dwoop-page-mode','dwoop-reading-mode');overlay.classList.add('dwoop-episode-mode');
 document.getElementById('dwoopEyebrow').textContent='PED-TALK · SEASON '+episodeSeason(ep);
 document.getElementById('dwoopTitle').textContent=title;
 document.getElementById('dwoopIntro').textContent=(number?'EPISODE '+String(number).padStart(2,'0')+' · ':'')+categoryFor(ep);
 const artwork=document.getElementById('dwoopArtwork');
 if(artwork)artwork.innerHTML='<img class="episode-feature-art" src="'+escapeBibleHTML(image)+'" alt="'+escapeBibleHTML(title)+' artwork">';
 applyEpisodeArtworkTheme(image, String(transitionToken));
 const description=plainText(ep.description),others=activeEpisodeSequence.filter(item=>item!==ep);
 const content=document.getElementById('dwoopContent');
 const waveform='<div class="episode-live-waveform" aria-hidden="true">'+Array.from({length:36},(_,i)=>'<i style="--wave-index:'+i+'"></i>').join('')+'</div>';
 const player=audio?'<div class="episode-player-window" data-episode-swipe-area><div class="episode-player-controls"><button type="button" class="episode-play-button" data-episode-play aria-label="Play episode"><span class="episode-play-symbol" aria-hidden="true">▶</span></button><div class="episode-player-meta"><div class="episode-player-track" data-player-seek role="slider" tabindex="0" aria-label="Seek through episode" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div><div class="episode-player-times"><span data-player-current>0:00</span><span data-player-duration>--:--</span></div></div></div>'+waveform+'<div class="episode-transport-controls"><button type="button" data-skip-back aria-label="Skip back 15 seconds">↶<small>15</small></button><button type="button" data-play-main aria-label="Play episode" class="episode-main-play"><span class="episode-play-symbol" aria-hidden="true">▶</span></button><button type="button" data-skip-forward aria-label="Skip forward 30 seconds">↷<small>30</small></button></div><div class="episode-secondary-controls"><button type="button" data-playback-speed>1×</button><button type="button" data-episode-favorite aria-pressed="false">♡ Save</button><button type="button" data-episode-share>↗ Share</button></div><p class="episode-player-hint">Swipe left or right to change episodes</p></div>':'<p class="episode-audio-unavailable">Audio will be available here when it is published.</p>'
 content.innerHTML='<div class="episode-feature-panel">'+player+(description?'<p class="episode-feature-description">'+escapeBibleHTML(description)+'</p>':'<p class="episode-feature-description">A PED-Talk conversation. Press play when you are ready to listen.</p>')+(link?'<a class="episode-detail-link" href="'+escapeBibleHTML(link)+'" target="_blank" rel="noopener">More episode details ↗</a>':'')+'</div>'+(others.length?'<div class="episode-more-heading"><span>CONTINUE EXPLORING</span><strong>More from Season '+episodeSeason(ep)+'</strong></div><div class="episode-more-tiles">'+others.map(item=>'<button type="button" class="episode-more-tile" data-episode-index="'+allEpisodes.indexOf(item)+'"><img src="'+escapeBibleHTML(episodeArtworkUrl(item.image))+'" alt=""><span><small>EPISODE '+String(episodeNumber(item)||'—').padStart(2,'0')+'</small><strong>'+escapeBibleHTML(displayEpisodeTitle(item))+'</strong></span><b aria-hidden="true">›</b></button>').join('')+'</div>':'');
 const audioEl=document.getElementById('pedtalkAudioEngine'),playButton=content.querySelector('[data-episode-play]'),mainPlayButton=content.querySelector('[data-play-main]');
 if(audioEl&&playButton){
  const symbol=playButton.querySelector('.episode-play-symbol'),current=content.querySelector('[data-player-current]'),duration=content.querySelector('[data-player-duration]'),track=content.querySelector('.episode-player-track span'),seek=content.querySelector('[data-player-seek]');
  const clock=value=>{if(!Number.isFinite(value))return'--:--';const m=Math.floor(value/60),s=Math.floor(value%60);return m+':'+String(s).padStart(2,'0');};
  const paint=()=>{const ratio=audioEl.duration?audioEl.currentTime/audioEl.duration:0;current.textContent=clock(audioEl.currentTime);track.style.width=(ratio*100)+'%';seek?.setAttribute('aria-valuenow',String(Math.round(ratio*100)));};
  const togglePlayback=()=>{if(audioEl.paused){const result=audioEl.play();if(result?.catch)result.catch(()=>{playButton.setAttribute('aria-label','Playback unavailable — try again');});}else audioEl.pause();};
  playButton.addEventListener('click',togglePlayback);mainPlayButton?.addEventListener('click',togglePlayback);
  const back=content.querySelector('[data-skip-back]'),forward=content.querySelector('[data-skip-forward]'),speed=content.querySelector('[data-playback-speed]'),favorite=content.querySelector('[data-episode-favorite]'),share=content.querySelector('[data-episode-share]');
  back?.addEventListener('click',()=>{audioEl.currentTime=Math.max(0,audioEl.currentTime-15);paint();});forward?.addEventListener('click',()=>{audioEl.currentTime=Math.min(audioEl.duration||Infinity,audioEl.currentTime+30);paint();});
  const rates=[1,1.25,1.5,2];let rateIndex=Math.max(0,rates.indexOf(audioEl.playbackRate||1));if(speed){speed.textContent=String(rates[rateIndex])+'×';speed.addEventListener('click',()=>{rateIndex=(rateIndex+1)%rates.length;audioEl.playbackRate=rates[rateIndex];speed.textContent=String(rates[rateIndex])+'×';});}
  const savedKey='pedtalk-saved-episodes-v1';const readSaved=()=>{try{return JSON.parse(localStorage.getItem(savedKey)||'[]')}catch(e){return[]}};const episodeKey=ep.title||link||title;const paintFavorite=()=>{const saved=readSaved().includes(episodeKey);if(favorite){favorite.setAttribute('aria-pressed',String(saved));favorite.textContent=saved?'♥ Saved':'♡ Save';}};paintFavorite();favorite?.addEventListener('click',()=>{const saved=readSaved(),next=saved.includes(episodeKey)?saved.filter(item=>item!==episodeKey):[...saved,episodeKey];try{localStorage.setItem(savedKey,JSON.stringify(next));}catch(e){}paintFavorite();if(currentAppView()==='saved')renderSavedEpisodes();});
  share?.addEventListener('click',async()=>{const shareData={title, text:'Listen to '+title+' on PED-Talk',url:link||window.location.href};try{if(navigator.share)await navigator.share(shareData);else if(navigator.clipboard)await navigator.clipboard.writeText(shareData.url);share.textContent='✓ Shared';}catch(e){}});
  const updatePlayState=()=>{const playing=!audioEl.paused;playButton.setAttribute('aria-label',playing?'Pause episode':'Play episode');symbol.textContent=playing?'Ⅱ':'▶';content.querySelector('.episode-live-waveform')?.classList.toggle('is-playing',playing);if(mainPlayButton){mainPlayButton.setAttribute('aria-label',playing?'Pause episode':'Play episode');mainPlayButton.querySelector('.episode-play-symbol').textContent=playing?'Ⅱ':'▶';}};
  audioEl.onplay=updatePlayState;audioEl.onpause=updatePlayState;audioEl.onloadedmetadata=()=>{duration.textContent=clock(audioEl.duration);paint();};audioEl.ontimeupdate=paint;audioEl.onended=()=>{playButton.setAttribute('aria-label','Play episode again');symbol.textContent='↻';};
  updatePlayState();if(audioEl.readyState>=1){duration.textContent=clock(audioEl.duration);paint();}
  const seekTo=clientX=>{if(!audioEl.duration||!seek)return;const rect=seek.getBoundingClientRect();audioEl.currentTime=Math.max(0,Math.min(1,(clientX-rect.left)/rect.width))*audioEl.duration;paint();};
  seek?.addEventListener('click',event=>seekTo(event.clientX));
  seek?.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const step=audioEl.duration?audioEl.duration*.02:5;if(event.key==='Home')audioEl.currentTime=0;else if(event.key==='End'&&Number.isFinite(audioEl.duration))audioEl.currentTime=audioEl.duration;else audioEl.currentTime=Math.max(0,Math.min(audioEl.duration||Infinity,audioEl.currentTime+(event.key==='ArrowRight'?step:-step)));paint();});
  let swipeStart=null;const swipeArea=content.querySelector('[data-episode-swipe-area]');
  swipeArea?.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'&&event.button!==0)return;swipeStart={x:event.clientX,y:event.clientY};},{passive:true});
  swipeArea?.addEventListener('pointerup',event=>{if(!swipeStart)return;const dx=event.clientX-swipeStart.x,dy=event.clientY-swipeStart.y;swipeStart=null;if(Math.abs(dx)<65||Math.abs(dx)<Math.abs(dy)*1.2)return;const next=activeEpisodeIndex+(dx<0?1:-1);if(next>=0&&next<activeEpisodeSequence.length)openEpisodeModal(activeEpisodeSequence[next],activeEpisodeSequence,dx<0?1:-1);},{passive:true});
  swipeArea?.addEventListener('pointercancel',()=>{swipeStart=null;},{passive:true});
 }
 const indicator=document.querySelector('.coming-soon-indicator');if(indicator)indicator.hidden=true;
 if(!overlayWasOpen){const y=window.scrollY||window.pageYOffset||0;document.body.style.setProperty('--dwoop-scroll-top',(-y)+'px');document.body.dataset.dwoopScrollY=String(y);document.body.classList.add('dwoop-locked');}
 overlay.hidden=false;
 overlay.classList.remove('dwoop-reading-mode');
 card.scrollTop=0;
 if(wasOpen){card.classList.remove('episode-swipe-next','episode-swipe-prev');void card.offsetWidth;card.classList.add(direction<0?'episode-swipe-prev':'episode-swipe-next');}
 requestAnimationFrame(()=>{if(transitionToken===dwoopTransitionToken)overlay.classList.add('active');});
 if(!wasOpen)document.getElementById('dwoopClose')?.focus({preventScroll:true});
}
document.getElementById('dwoopContent')?.addEventListener('click',event=>{
 const tile=event.target.closest('[data-episode-index]');if(!tile)return;
 const ep=allEpisodes[Number(tile.dataset.episodeIndex)];if(ep)openEpisodeModal(ep,allEpisodes.filter(item=>episodeSeason(item)===episodeSeason(ep)));
});
// Enlarged-card gestures: downward swipe dismisses; horizontal swipe changes episodes.
(()=>{
 const overlay=document.getElementById('dwoopOverlay'),card=overlay?.querySelector('.dwoop-card-expanded');if(!overlay||!card)return;
 let startX=0,startY=0,startTarget=null,startScrollTop=0;
 card.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'&&event.button!==0)return;startX=event.clientX;startY=event.clientY;startTarget=event.target;startScrollTop=card.scrollTop;},{passive:true});
 card.addEventListener('pointerup',event=>{
  if(!startTarget)return;const dx=event.clientX-startX,dy=event.clientY-startY,target=startTarget;startTarget=null;
  if(target.closest('button,a,audio,input,textarea,select,summary,[data-no-episode-swipe],[data-episode-swipe-area],[data-episode-swipe-area]'))return;
  if(dy>88&&dy>Math.abs(dx)*1.25&&startScrollTop<=2){closeDwoopModal();return;}
  if(!overlay.classList.contains('dwoop-episode-mode')||Math.abs(dx)<64||Math.abs(dx)<Math.abs(dy)*1.25)return;
  const nextIndex=activeEpisodeIndex+(dx<0?1:-1);if(nextIndex<0||nextIndex>=activeEpisodeSequence.length)return;
  openEpisodeModal(activeEpisodeSequence[nextIndex],activeEpisodeSequence,dx<0?1:-1);
 },{passive:true});
 card.addEventListener('pointercancel',()=>{startTarget=null;},{passive:true});
 let touchStart=null;
 card.addEventListener('touchstart',event=>{const t=event.changedTouches[0];if(!t)return;touchStart={x:t.clientX,y:t.clientY,scrollTop:card.scrollTop,target:event.target};},{passive:true});
 card.addEventListener('touchend',event=>{if(!touchStart)return;const t=event.changedTouches[0],start=touchStart;touchStart=null;if(!t||start.scrollTop>2||start.target.closest('button,a,audio,input,textarea,select,summary,[data-no-episode-swipe]'))return;const dx=t.clientX-start.x,dy=t.clientY-start.y;if(dy>88&&dy>Math.abs(dx)*1.25)closeDwoopModal();},{passive:true});
})();
function renderHomeSeason(){
 const currentSeason=allEpisodes.reduce((max,ep)=>Math.max(max,episodeSeason(ep)),1);
 const current=allEpisodes.filter(ep=>episodeSeason(ep)===currentSeason&& (activeCategory==='All'||categoryFor(ep)===activeCategory));
 const heading=document.getElementById('currentSeasonHeading');
 if(heading)heading.textContent='Season '+currentSeason;
 renderEpisodeGroups(groupRoot,current,'No episodes in this season and category yet.');
}
function renderArchive(){
 const filtered=allEpisodes.filter(ep=>archiveCategory==='All'||categoryFor(ep)===archiveCategory);
 renderEpisodeGroups(archiveRoot,filtered,'No archived episodes in this category yet.');
}
function renderSavedEpisodes(){
 const root=document.getElementById('savedEpisodeGroups');if(!root)return;
 root.onclick=event=>{if(event.target.closest('[data-saved-explore]'))showView('episodes');};
 let keys=[];try{keys=JSON.parse(localStorage.getItem('pedtalk-saved-episodes-v1')||'[]')}catch(error){}
 const saved=allEpisodes.filter(ep=>keys.includes(ep.title));
 if(!saved.length){root.innerHTML='<div class="saved-empty-state"><span class="saved-empty-mark" aria-hidden="true">♡</span><h3>Your listening library starts here.</h3><p>Save an episode from its player and it will be kept here for your next quiet moment.</p><button type="button" class="saved-empty-action" data-saved-explore>Explore episodes <span aria-hidden="true">→</span></button></div>';return;}
 renderEpisodeGroups(root,saved,'');
}
function renderTheShowOverview(){
 const count=document.getElementById('showMessageCount'),rhythm=document.getElementById('showWeeklyRhythm'),year=document.getElementById('showStartYear');
 if(!count||!rhythm||!year)return;
 const dates=allEpisodes.map(ep=>new Date(ep.published)).filter(date=>Number.isFinite(date.getTime())).sort((a,b)=>a-b);
 count.textContent=String(allEpisodes.length);
 if(dates.length>=2){
  const weeks=Math.max(1,(dates[dates.length-1]-dates[0])/(7*24*60*60*1000));
  const rate=allEpisodes.length/weeks;
  rhythm.textContent=rate>=0.75?'Weekly':rate>=0.35?'Regular':'Growing';
 }else rhythm.textContent='Growing';
 year.textContent=dates.length?String(dates[0].getFullYear()):'—';
}
function render(){renderHomeSeason();renderArchive();renderSavedEpisodes();renderTheShowOverview()}
document.getElementById('archiveFilters').addEventListener('click',event=>{const button=event.target.closest('button[data-category]');if(!button)return;archiveCategory=button.dataset.category;document.querySelectorAll('#archiveFilters .filter').forEach(item=>item.classList.toggle('active',item===button));renderArchive()});
let episodeCatalogueUpdated='';
function episodeArtworkUrl(source){
 const value=typeof source==='string'&&source?source:'../icons/ped-talk-icon.svg';
 try{const url=new URL(value,window.location.href);if(episodeCatalogueUpdated)url.searchParams.set('pedtalk-art',episodeCatalogueUpdated);return url.href;}catch(error){return value;}
}
async function refreshEpisodeCatalogue(showError=false){
 try{
  const response=await fetch('../episodes.json?refresh='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw new Error('Could not load episodes');
  const data=await response.json();
  const updated=String(data.updated||'');
  if(updated!==episodeCatalogueUpdated||!allEpisodes.length){
   episodeCatalogueUpdated=updated||String(Date.now());
   allEpisodes=Array.isArray(data.episodes)?data.episodes:[];
   render();
  }
  return true;
 }catch(error){
  if(showError||!allEpisodes.length){
   groupRoot.innerHTML='<p class="empty">Your episode library could not load just now. Please check your connection and try again.</p>';
   archiveRoot.innerHTML='<p class="empty">The season archive could not load just now. Please try again.</p>';
  }
  console.warn('Episode catalogue refresh failed',error);
  return false;
 }
}
refreshEpisodeCatalogue(true);
// Check for newly published Spotify episodes frequently while the app is visible.
window.setInterval(()=>{if(!document.hidden)refreshEpisodeCatalogue(false);},15*1000);
window.addEventListener('focus',()=>refreshEpisodeCatalogue(false));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshEpisodeCatalogue(false);});

const homeView=document.getElementById('homeView');
const episodesView=document.getElementById('episodesView');
const savedEpisodesView=document.getElementById('savedEpisodesView');
const theShowView=document.getElementById('theShowView');
const bibleView=document.getElementById('bibleView');
const bibleLibraryView=document.getElementById('bibleLibraryView');
const bibleBooks=[
["GEN","Genesis","OT"],["EXO","Exodus","OT"],["LEV","Leviticus","OT"],["NUM","Numbers","OT"],["DEU","Deuteronomy","OT"],["JOS","Joshua","OT"],["JDG","Judges","OT"],["RUT","Ruth","OT"],["1SA","1 Samuel","OT"],["2SA","2 Samuel","OT"],["1KI","1 Kings","OT"],["2KI","2 Kings","OT"],["1CH","1 Chronicles","OT"],["2CH","2 Chronicles","OT"],["EZR","Ezra","OT"],["NEH","Nehemiah","OT"],["EST","Esther","OT"],["JOB","Job","OT"],["PSA","Psalms","OT"],["PRO","Proverbs","OT"],["ECC","Ecclesiastes","OT"],["SNG","Song of Solomon","OT"],["ISA","Isaiah","OT"],["JER","Jeremiah","OT"],["LAM","Lamentations","OT"],["EZK","Ezekiel","OT"],["DAN","Daniel","OT"],["HOS","Hosea","OT"],["JOL","Joel","OT"],["AMO","Amos","OT"],["OBA","Obadiah","OT"],["JON","Jonah","OT"],["MIC","Micah","OT"],["NAM","Nahum","OT"],["HAB","Habakkuk","OT"],["ZEP","Zephaniah","OT"],["HAG","Haggai","OT"],["ZEC","Zechariah","OT"],["MAL","Malachi","OT"],["MAT","Matthew","NT"],["MRK","Mark","NT"],["LUK","Luke","NT"],["JHN","John","NT"],["ACT","Acts","NT"],["ROM","Romans","NT"],["1CO","1 Corinthians","NT"],["2CO","2 Corinthians","NT"],["GAL","Galatians","NT"],["EPH","Ephesians","NT"],["PHP","Philippians","NT"],["COL","Colossians","NT"],["1TH","1 Thessalonians","NT"],["2TH","2 Thessalonians","NT"],["1TI","1 Timothy","NT"],["2TI","2 Timothy","NT"],["TIT","Titus","NT"],["PHM","Philemon","NT"],["HEB","Hebrews","NT"],["JAS","James","NT"],["1PE","1 Peter","NT"],["2PE","2 Peter","NT"],["1JN","1 John","NT"],["2JN","2 John","NT"],["3JN","3 John","NT"],["JUD","Jude","NT"],["REV","Revelation","NT"]];
const bibleFileByCode={"GEN":"Gen","EXO":"Exod","LEV":"Lev","NUM":"Num","DEU":"Deut","JOS":"Josh","JDG":"Judg","RUT":"Ruth","1SA":"1Sam","2SA":"2Sam","1KI":"1Kgs","2KI":"2Kgs","1CH":"1Chr","2CH":"2Chr","EZR":"Ezra","NEH":"Neh","EST":"Esth","JOB":"Job","PSA":"Ps","PRO":"Prov","ECC":"Eccl","SNG":"Song","ISA":"Isa","JER":"Jer","LAM":"Lam","EZK":"Ezek","DAN":"Dan","HOS":"Hos","JOL":"Joel","AMO":"Amos","OBA":"Obad","JON":"Jonah","MIC":"Mic","NAM":"Nah","HAB":"Hab","ZEP":"Zeph","HAG":"Hag","ZEC":"Zech","MAL":"Mal","MAT":"Matt","MRK":"Mark","LUK":"Luke","JHN":"John","ACT":"Acts","ROM":"Rom","1CO":"1Cor","2CO":"2Cor","GAL":"Gal","EPH":"Eph","PHP":"Phil","COL":"Col","1TH":"1Thess","2TH":"2Thess","1TI":"1Tim","2TI":"2Tim","TIT":"Titus","PHM":"Phlm","HEB":"Heb","JAS":"Jas","1PE":"1Pet","2PE":"2Pet","1JN":"1John","2JN":"2John","3JN":"3John","JUD":"Jude","REV":"Rev"};
let activeBibleBook=null, activeBibleChapter=1, activeBibleData=null, bibleCache={};
function bibleVerseNumber(verse,index){return verse?.number??verse?.verse??verse?.id??index+1;}
function bibleVerseText(verse){const value=verse?.text??verse?.content??verse?.value??verse?.verseText??'';return typeof value==='string'?value:String(value??'');}
const bibleBookSelect=document.getElementById('bibleBook');
const bibleChapterSelect=document.getElementById('bibleChapter');
const booksView=document.getElementById('booksView');
const exploreBibleView=document.getElementById('exploreBibleView');
const fictionDetailView=document.createElement('section');
fictionDetailView.id='fictionDetailView';fictionDetailView.className='fiction-detail-view';fictionDetailView.hidden=true;fictionDetailView.setAttribute('aria-labelledby','fictionDetailTitle');
fictionDetailView.innerHTML=`
<header class="fiction-detail-header"><button type="button" class="fiction-page-back" data-detail-back>‹ Books</button><p class="eyebrow">ANAGKAZO MEDIA LIBRARY</p></header>
<article class="fiction-detail-card">
<button type="button" class="fiction-detail-cover-button" aria-expanded="false" aria-controls="fictionDetailDescription" aria-label="Show or hide the book summary"><span class="fiction-detail-cover-frame"><img class="fiction-detail-cover" src="./assets/books/the-black-mans-jesus-cover.jpg?v=2" alt="The Black Man’s Jesus by Antwi Bosiako Papa Kofi book cover"></span><span class="fiction-detail-cover-hint">Tap cover to view story summary</span></button>
<div class="fiction-detail-copy"><p class="fiction-book-series">FICTION · ANAGKAZO MEDIA</p><h2 id="fictionDetailTitle">THE BLACK MAN’S JESUS</h2><p class="fiction-book-author">By Antwi Bosiako Papa Kofi</p>
<div id="fictionDetailDescription" class="fiction-detail-description" hidden><p>Two lives, centuries apart: from Cape Coast Castle in 1767 to a Ghanaian-American student in 2025. A moving story about faith, history and the true message of Jesus.</p></div>
<button type="button" class="fiction-read-book-button" data-open-fiction-reader>Read Book <span aria-hidden="true">→</span></button></div></article><p class="fiction-detail-note">Read the complete story inside PED-Talk. Your reading progress is saved on this device.</p>`;
document.getElementById('fictionView')?.before(fictionDetailView);
const fictionDetailStyle=document.createElement('style');
fictionDetailStyle.textContent=`
.fiction-detail-view{min-height:calc(100dvh - 110px);padding:clamp(18px,4vw,42px) clamp(15px,4vw,38px) 70px;background:var(--app-bg);color:var(--pt-text-primary)}
.fiction-detail-header{display:flex;align-items:center;gap:18px;padding-bottom:18px;border-bottom:1px solid var(--app-border)}.fiction-detail-header .eyebrow{margin:0;font-size:10px;letter-spacing:.15em}
.fiction-detail-card{width:min(100%,620px);margin:clamp(28px,8vh,76px) auto 0;padding:20px;display:flex;flex-direction:row;gap:20px;align-items:center;background:var(--pt-surface,#fff);border:1px solid var(--app-border);border-radius:18px;box-shadow:0 12px 36px rgba(0,0,0,.07)}
.fiction-detail-cover-button{display:flex;flex:0 0 132px;flex-direction:column;align-items:center;width:132px;padding:0;border:0;background:transparent;color:inherit;text-align:center;cursor:pointer}
.fiction-detail-cover-frame{display:grid;place-items:center;width:124px;height:186px;overflow:hidden;border-radius:8px;background:#080b09;box-shadow:0 9px 22px rgba(0,0,0,.2)}
.fiction-detail-cover{display:block;width:100%;height:100%;object-fit:contain;object-position:center;border-radius:8px;background:#080b09}
.fiction-detail-cover-hint{display:block;width:112px;margin-top:9px;font-size:9px;line-height:1.4;color:var(--pt-text-secondary)}
.fiction-detail-copy{min-width:0;flex:1}.fiction-detail-copy .fiction-book-series{font-size:9px;letter-spacing:.15em;color:#6e9b50;font-weight:800}.fiction-detail-copy h2{margin:8px 0;font:700 clamp(18px,3vw,25px)/1.15 'Playfair Display',Georgia,serif;color:var(--pt-text-primary)}.fiction-detail-copy .fiction-book-author{color:var(--pt-text-secondary);font-size:12px;margin:0}
.fiction-detail-description{margin:16px 0 0;padding:13px 14px;border-left:3px solid #8caf67;background:color-mix(in srgb,var(--pt-surface,#fff) 90%,#8caf67 10%);border-radius:0 10px 10px 0}.fiction-detail-description p{margin:0;color:var(--pt-text-primary);font:400 13px/1.75 'DM Sans',sans-serif}
.fiction-read-book-button{display:flex;align-items:center;justify-content:space-between;gap:24px;width:100%;max-width:250px;margin-top:16px;padding:13px 18px;border:0;border-radius:999px;background:#739b55;color:#fff;font:700 13px 'DM Sans',sans-serif;cursor:pointer}.fiction-read-book-button[hidden]{display:none!important}
.fiction-detail-note{max-width:620px;margin:16px auto;color:var(--pt-text-secondary);font-size:10px;line-height:1.6;text-align:center}
@media(max-width:430px){.fiction-detail-card{gap:14px;padding:14px}.fiction-detail-cover-button{flex-basis:124px;width:124px}.fiction-detail-cover-frame{width:124px;height:186px}.fiction-detail-cover-hint{width:124px;font-size:8px}.fiction-detail-copy h2{font-size:18px}.fiction-detail-copy .fiction-book-author{font-size:11px}}
.fiction-detail-cover-button:focus-visible{outline:2px solid #8caf67;outline-offset:5px;border-radius:8px}
`;
fictionDetailStyle.textContent+=" \n/* v141 — compact book tile, readable reflow text and clear reader navigation. */\n.fiction-reflow-content{max-width:760px;margin:0 auto;padding:clamp(22px,5vw,48px) clamp(20px,5vw,54px);background:var(--pt-surface,#fff);color:var(--pt-text-primary);font-family:Georgia,'Times New Roman',serif;font-size:var(--fiction-reader-font-size,18px);line-height:1.9;letter-spacing:.005em}\n.fiction-reflow-content p{margin:0 0 1.25em;text-align:left;white-space:normal;overflow-wrap:anywhere}\n.fiction-reflow-content p:last-child{margin-bottom:0}\n.fiction-view .fiction-pdf-page{background:var(--pt-surface,#fff);border-color:var(--app-border);border-radius:10px}\n.fiction-view .fiction-pdf-page-number{background:transparent;color:var(--pt-text-tertiary);padding:12px 20px 0;font-size:9px}\n.fiction-view .fiction-pdf-page-canvas{min-height:90px}\n.fiction-reader-topbar button,.fiction-reader-bottombar button{min-width:34px;min-height:34px}\n.fiction-reader-bottombar button{border:1px solid var(--app-border);border-radius:50%;background:transparent;color:var(--pt-text-primary);font-size:18px;line-height:1}\n.fiction-reader-bottombar{gap:7px}\n.fiction-reader-bottombar span{font-variant-numeric:tabular-nums}\n.fiction-view .fiction-featured-book{padding-top:16px;padding-bottom:0}\n.fiction-view .fiction-cover-stage{width:min(100%,116px);margin:0 auto 12px}\n.fiction-view .fiction-cover-frame{max-height:none}\n.fiction-view .fiction-cover-frame canvas{max-height:none}\n.fiction-view .fiction-cover-desk{margin-top:7px}\n.fiction-view .fiction-featured-copy{padding-bottom:4px}\n.fiction-view .fiction-featured-copy h3{font-size:18px}\n@media(max-width:520px){.fiction-reflow-content{padding:22px 19px;font-size:var(--fiction-reader-font-size,18px);line-height:1.85}.fiction-reader-topbar{flex-wrap:wrap}.fiction-reader-topbar strong{flex-basis:100%;order:-1}.fiction-reader-bottombar{gap:5px}.fiction-reader-bottombar span{font-size:9px}}\n";

/* v141 — premium library finish and a genuinely scrollable reader viewport. */
fictionDetailStyle.textContent+="\n.fiction-detail-view{background:#080b0a!important;color:#f3f5f1!important}\n.fiction-detail-header{border-color:rgba(255,255,255,.1)!important}\n.fiction-detail-header .eyebrow{color:#aab5ad!important}\n.fiction-detail-card{width:min(100%,700px);margin:clamp(24px,6vh,54px) auto 0;padding:clamp(16px,3vw,26px);background:linear-gradient(145deg,#151b18 0%,#0b100d 100%)!important;border:1px solid rgba(255,255,255,.1)!important;box-shadow:0 24px 60px rgba(0,0,0,.42)!important}\n.fiction-detail-cover-button{flex-basis:132px!important;width:132px!important;max-width:124px!important}\n.fiction-detail-cover-frame{width:124px!important;height:186px!important;background:#080b09!important;box-shadow:0 16px 34px rgba(0,0,0,.48)!important}\n.fiction-detail-cover{object-fit:contain!important;background:#080b09!important}\n.fiction-detail-copy .fiction-book-series{color:#a9c98c!important}\n.fiction-detail-copy h2{color:#f4f5f2!important}\n.fiction-detail-copy .fiction-book-author,.fiction-detail-cover-hint,.fiction-detail-note{color:#aeb8b1!important}\n.fiction-detail-description{margin:12px 0 0!important;padding:0!important;border:0!important;background:transparent!important}\n.fiction-detail-description p{color:#c8d0ca!important;font-size:12px!important;line-height:1.65!important}\n.fiction-read-book-button{max-width:none!important;margin-top:18px!important;background:linear-gradient(110deg,#315d43,#537b5b)!important;box-shadow:0 10px 28px rgba(0,0,0,.3)!important}\n.fiction-detail-note{margin-top:18px!important}\n.fiction-view{height:calc(100dvh - 118px)!important;max-height:calc(100dvh - 118px)!important;min-height:0!important;overflow-y:auto!important;overscroll-behavior:contain!important;background:#080b0a!important;color:#f3f5f1!important}\n.fiction-view .fiction-page-header{background:#080b0a!important}\n.fiction-reader-chrome{background:rgba(16,21,18,.94)!important;border-color:rgba(255,255,255,.12)!important;box-shadow:0 12px 30px rgba(0,0,0,.3)!important}\n.fiction-reader-topbar strong,.fiction-reader-topbar button,.fiction-reader-bottombar button{color:#edf1ed!important}\n.fiction-reader-topbar button,.fiction-reader-bottombar button{border-color:rgba(255,255,255,.16)!important}\n.fiction-reader-bottombar input{accent-color:#b7d58a}\n.fiction-reader-search input,.fiction-reader-options button{background:#0b100d!important;color:#edf1ed!important;border-color:rgba(255,255,255,.16)!important}\n.fiction-view .fiction-pdf-page{background:#f8f6f0!important;border-color:rgba(255,255,255,.08)!important}\n.fiction-view .fiction-reflow-content{background:#f8f6f0!important;color:#262a27!important}\n.fiction-view .fiction-reflow-content p{color:#262a27!important}\n@media(max-width:560px){.fiction-detail-card{align-items:flex-start!important}.fiction-detail-cover-button{flex-basis:124px!important;width:124px!important}.fiction-detail-cover-frame{width:124px!important;height:186px!important}.fiction-detail-copy h2{font-size:19px!important}.fiction-view{height:calc(100dvh - 126px)!important;max-height:calc(100dvh - 126px)!important;padding:12px 10px calc(20px + env(safe-area-inset-bottom))!important}}\n";
document.head.appendChild(fictionDetailStyle);
let viewTransitionToken=0;
function showView(view,reference=null,preserveBible=false,options={}){
 const target=['home','episodes','saved','the-show','bible','bible-library','reading-stats','books','explore-bible','fiction-detail','fiction','hope'].includes(view)?view:'home';
 activeAppView=target;
 const historyMode=options.history||'push';
 if(historyMode!=='none'){
  ensureAppHistory();
  if(window.history.state?.overlay)window.history.replaceState({pedTalkApp:true,view:window.history.state.view||currentAppView()},'',window.location.href);
  const routeUrl=new URL(window.location.href);
  if(target==='home')routeUrl.searchParams.delete('view');else routeUrl.searchParams.set('view',target);
  const routeHref=routeUrl.pathname+routeUrl.search+routeUrl.hash;
  if(historyMode==='replace')window.history.replaceState({pedTalkApp:true,view:target},'',routeHref);
  else if((window.history.state?.view||'home')!==target)window.history.pushState({pedTalkApp:true,view:target},'',routeHref);
 }
 const readingStatsView=document.getElementById('readingStatsView');
 const next=target==='episodes'?episodesView:target==='saved'?savedEpisodesView:target==='the-show'?theShowView:target==='bible'?bibleView:target==='bible-library'?bibleLibraryView:target==='reading-stats'?readingStatsView:target==='books'?booksView:target==='explore-bible'?exploreBibleView:target==='fiction-detail'?fictionDetailView:target==='fiction'?document.getElementById('fictionView'):target==='hope'?hopeModal:homeView;
 if(target!=='bible'&&typeof finishReadingSession==='function')finishReadingSession();
 [homeView,episodesView,savedEpisodesView,theShowView,bibleView,bibleLibraryView,readingStatsView,booksView,exploreBibleView,fictionDetailView,document.getElementById('fictionView')].forEach(el=>{if(el){el.hidden=target==='hope'?el!==homeView:el!==next;el.classList.remove('view-enter');}});
 hopeModal.hidden=target!=='hope';
 document.body.classList.toggle('hope-open',target==='hope');
 document.body.classList.remove('modal-open');
 if(target!=='bible')document.body.classList.remove('scripture-reading');
 const navTarget=['bible','bible-library','reading-stats','books','explore-bible','fiction-detail','fiction'].includes(target)?'the-show':target;
 document.querySelectorAll('.bottom-nav [data-view]').forEach(button=>{const active=button.dataset.view===navTarget;button.classList.toggle('selected',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
 const token=++viewTransitionToken;
 if(target!=='hope')requestAnimationFrame(()=>{if(token!==viewTransitionToken)return;next.classList.remove('view-enter');void next.offsetWidth;next.classList.add('view-enter');window.setTimeout(()=>{if(token===viewTransitionToken)next.classList.remove('view-enter');},420);});
 window.scrollTo({top:0,behavior:'smooth'});
 if(target==='bible'){if(reference)openBibleReference(reference);else if(!preserveBible)resetBibleFlow();}
 if(target==='saved')renderSavedEpisodes();
 if(target==='reading-stats')renderReadingDashboard();
 if(target==='explore-bible')renderExploreBible('stories');
 if(target==='home')window.PEDShowcase?.resume();else window.PEDShowcase?.pause();
 window.PEDDevotional?.sync();
 if(target==='home'&&options.restoreFocus)requestAnimationFrame(()=>document.querySelector('.hope-card')?.focus({preventScroll:true}));
}


/* Explore the Bible: original, Scripture-grounded stories and historical overview. */
const exploreBibleCollections={
 stories:{
  eyebrow:'PEOPLE & THEIR JOURNEYS',title:'Stories of faith, courage & purpose',
  description:'Discover the lives behind some of Scripture’s most unforgettable moments.',
  items:[
   {id:'joseph',title:'Joseph',subtitle:'From the pit to the palace',period:'Genesis 37–50',tag:'FORGIVENESS · PURPOSE',art:'joseph',lead:'A painful chapter does not have to become the final word. Joseph’s life traces the long road from betrayal to responsibility, and from deep wounds to costly forgiveness.',sections:[
    ['A dream that stirred a storm','Joseph was seventeen when Scripture introduces him. He was loved by his father Jacob, and the special robe he received made that affection visible. His brothers already struggled with jealousy; then Joseph shared dreams in which his family bowed before him. The dreams hinted at a future he could not yet understand, but the way they were shared intensified the resentment around him. His brothers’ anger grew until they could no longer speak peacefully to him.','Genesis 37:1–11'],
    ['The pit was not the end','Sent by his father to check on his brothers, Joseph found himself surrounded by the very people who resented him. They stripped off his robe, threw him into an empty pit and sold him to passing traders. He was carried to Egypt, far from home and everything familiar. His brothers returned with a lie, and Jacob grieved as though his son were dead. Joseph’s circumstances changed in a moment, but his worth did not. The pit was real; the betrayal was real. Yet neither could place a limit on what God could still do with his life.','Genesis 37:12–36'],
    ['Faithfulness in an unseen season','In Egypt, Joseph was sold to Potiphar and entrusted with responsibility because he served faithfully. When Potiphar’s wife tried to draw him into wrongdoing, Joseph refused. He chose integrity even when that decision cost him his freedom. Falsely accused, he was sent to prison. There, too, he served well and earned the trust of the keeper. He interpreted the dreams of two royal officials, asking one to remember him. The man was restored—but forgot Joseph. Another season of waiting followed. Joseph’s story teaches that integrity is not a shortcut to quick reward; it is a way of honouring God when no one seems to be keeping score.','Genesis 39:1–23; 40:1–23'],
    ['From forgotten prisoner to trusted leader','When Pharaoh was troubled by dreams no one could interpret, the cupbearer finally remembered Joseph. Brought from prison, Joseph stood before the king and made it clear that the interpretation belonged to God, not to his own brilliance. The dreams warned of seven years of abundance followed by seven years of famine. Joseph proposed a practical plan: store grain during the years of plenty so that people could survive the years of scarcity. Pharaoh recognised the wisdom in the counsel and placed Joseph over the work. The prisoner became a leader, but the character that could carry that responsibility had been formed through years no one applauded.','Genesis 41'],
    ['The test of power—and the grace of forgiveness','The famine reached Canaan, and Joseph’s brothers came to Egypt seeking grain. They bowed before the governor without recognising the brother they had sold. Joseph recognised them immediately. Their reunion unfolded slowly, through difficult questions and a test that brought their old guilt into the open. When Joseph finally revealed himself, he wept. He did not pretend their actions were harmless, but he saw that God had been at work to preserve life through the very journey intended to destroy him. He welcomed his family and provided for them. Later, when his brothers feared revenge, Joseph reassured them that he would not take the place of God. His forgiveness did not call evil good; it refused to let evil have the last word.','Genesis 42–50'],
    ['What Joseph’s life asks of us','Joseph’s story is not a promise that every injustice will be reversed in the same way or on our preferred timetable. It is a witness to God’s ability to sustain a person through betrayal, temptation, delay and responsibility. Keep your integrity in the unseen season. Use influence to preserve life. Tell the truth about harm without surrendering to bitterness. And when the full picture is still hidden, keep walking faithfully with the light you have.','Read and reflect: Genesis 37–50; Psalm 105:16–22']
   ]},
   {id:'david',title:'David',subtitle:'A shepherd with a courageous heart',period:'1 Samuel 16 – 1 Kings 2',tag:'COURAGE · WORSHIP',art:'david',lead:'The journey of a shepherd who learned that true strength begins with a heart turned toward God.',sections:[
    ['The one overlooked','When Samuel came to Jesse’s house to anoint Israel’s next king, the first sons who appeared seemed more likely candidates. David was not even called in at first; he was tending the sheep. But God directed Samuel beyond outward appearance. David was anointed while still young, and the Spirit of the Lord came upon him. His calling began long before the crown, in ordinary work few people noticed.','1 Samuel 16:1–13'],
    ['Courage before the giant','Israel’s army stood paralysed by Goliath’s threats. David arrived carrying provisions for his brothers and heard the giant defy the armies of the living God. Remembering how God had helped him protect his flock from a lion and a bear, David stepped forward with a sling and stones. His confidence was not in a weapon or in his own fame; he declared that the battle belonged to the Lord. Goliath fell, and Israel found courage again.','1 Samuel 17'],
    ['A crown delayed','David’s victory brought public attention, but it also stirred Saul’s jealousy. David served the king, yet became the target of repeated attempts on his life. He spent years in wilderness places, often with opportunities to strike back. Twice he had the chance to kill Saul, and twice he refused to seize the throne through revenge. David understood that a promise from God did not give him permission to abandon the character God desired. Waiting became part of his preparation.','1 Samuel 18–26'],
    ['A king who worshipped—and a king who failed','After Saul’s death, David became king and eventually established Jerusalem as the centre of his kingdom. He desired to honour God and brought the ark to the city with celebration. Yet David’s story is not polished into perfection. His adultery with Bathsheba and the arranged death of Uriah were grave sins. When Nathan confronted him, David acknowledged his wrongdoing. Forgiveness did not erase every consequence, but confession opened the way for repentance. His life shows both the beauty of wholehearted worship and the danger of believing success makes us untouchable.','2 Samuel 5–7; 11–12'],
    ['A legacy beyond the throne','David’s later years included family conflict and painful consequences, yet God’s covenant promise continued. David’s story became part of Israel’s hope for a righteous king, a hope Christians see fulfilled in Jesus, the Son of David. The shepherd who was overlooked reminds us that God sees beyond appearances; the young man who faced Goliath reminds us that courage can rise from trust; and the king who repented reminds us to respond honestly when confronted by truth.','2 Samuel 7:12–16; Luke 1:32–33']
   ]},
   {id:'moses',title:'Moses',subtitle:'Called to lead a people to freedom',period:'Exodus 1–Deuteronomy 34',tag:'DELIVERANCE · LEADERSHIP',art:'moses',lead:'A reluctant messenger whose encounter with God changed the direction of a nation.',sections:[
    ['A life preserved','Born during a season of oppression, Moses was hidden by his family and placed in a basket among the reeds. Pharaoh’s daughter found him and raised him in the royal household. Later, after killing an Egyptian who was beating a Hebrew, Moses fled to Midian. His early life moved between two worlds, but his calling was still ahead.','Exodus 1–2'],
    ['The voice from the fire','In the wilderness, God called Moses from a bush that burned without being consumed. God had heard the cries of Israel and sent Moses to confront Pharaoh. Moses felt inadequate and raised objections, but God promised to be with him and gave Aaron to help. The mission would depend on God’s presence, not Moses’ eloquence.','Exodus 3–4'],
    ['Freedom and the wilderness','Through signs and plagues, Pharaoh’s resistance was broken and Israel departed Egypt. The sea opened before them, and the people crossed to freedom. Yet freedom did not make the journey effortless. The wilderness exposed fear, impatience and the need to trust God daily. Moses led, interceded and received the law while learning the weight of caring for a people.','Exodus 5–20; 32–34'],
    ['A calling larger than one lifetime','Moses led Israel toward the promised land but did not enter it. He viewed the land from a mountain and entrusted the next chapter to Joshua. His story reminds us that leadership is service, that God can work through hesitant people, and that faithfulness matters even when we do not personally see every promise completed.','Deuteronomy 31–34']
   ]},
   {id:'esther',title:'Esther',subtitle:'Courage for a defining moment',period:'Esther 1–10',tag:'COURAGE · ADVOCACY',art:'esther',lead:'A young woman whose courage helped protect her people when silence would have been costly.',sections:[
    ['An unexpected place','Esther was a Jewish orphan raised by her cousin Mordecai. She became queen in Persia, but kept her people’s identity private at Mordecai’s counsel. Her position seemed distant from the struggles of ordinary Jewish families, until a decree threatened their lives.','Esther 2–3'],
    ['For such a time','Mordecai urged Esther to approach the king, though entering his presence uninvited could mean death. Esther called the Jewish community to fast and chose to go. Her question—whether she had come to the kingdom for such a time as this—became a summons to courageous responsibility.','Esther 4'],
    ['Courage with wisdom','Esther approached the king, invited him and Haman to banquets, and carefully exposed the plot against her people. The king acted, Haman’s scheme was overturned, and the Jewish people were given a means to defend themselves. The book celebrates deliverance while showing how courage can work alongside patience, timing and wise speech.','Esther 5–10']
   ]},
   {id:'daniel',title:'Daniel',subtitle:'Faithfulness in a foreign land',period:'Daniel 1–12',tag:'CONVICTION · FAITH',art:'daniel',lead:'A life of steady conviction, prayer and hope in the middle of powerful empires.',sections:[
    ['A conviction carried into exile','Daniel and other young Judeans were taken to Babylon. Offered food from the king’s table, Daniel resolved not to defile himself. He asked for a different arrangement and proved faithful in a small daily decision before facing larger tests.','Daniel 1'],
    ['Wisdom under pressure','Daniel served through changing rulers and interpreted dreams when human wisdom failed. He consistently pointed beyond himself to God as the source of revelation. His influence grew, but he remained a servant rather than worshipping power.','Daniel 2–5'],
    ['Prayer that would not be silenced','When a decree prohibited prayer to anyone but the king, Daniel continued his regular practice of praying to God. He was thrown into the lions’ den, but God preserved him. Daniel’s story encourages steadfast faith without pretending that obedience always makes the road easy.','Daniel 6']
   ]},
   {id:'ruth',title:'Ruth',subtitle:'Loyal love in an uncertain season',period:'Ruth 1–4',tag:'LOYALTY · REDEMPTION',art:'ruth',lead:'A story of grief, loyalty and unexpected belonging in the ordinary fields of Bethlehem.',sections:[
    ['A costly choice','After the deaths of their husbands, Naomi urged her daughters-in-law to return to their families. Ruth chose to remain with Naomi, binding her future to hers. Her loyalty was not a grand speech alone; it became a daily commitment to walk with a grieving woman into an uncertain future.','Ruth 1'],
    ['Grace in the fields','In Bethlehem, Ruth gathered leftover grain to provide for them both. She worked in the field of Boaz, a relative of Naomi’s family, who treated her with generosity and protection. What looked like an ordinary day of labour became part of a larger story of care.','Ruth 2'],
    ['A family restored','Boaz acted as a family redeemer, and Ruth became part of his household. Their son Obed became the grandfather of David. The book closes a story of loss with belonging and places Ruth, a Moabite woman, within the family line of Israel’s king—and, in the New Testament genealogy, Jesus.','Ruth 3–4; Matthew 1:5']
   ]}
  ]
 },
 history:{
  eyebrow:'THE BIBLE’S HISTORICAL JOURNEY',title:'The moments that shaped the story',
  description:'Follow the major movements of biblical history, from creation to the early Church.',
  items:[
   {id:'beginnings',title:'Creation & the early world',subtitle:'The beginning of the biblical story',period:'Genesis 1–11',tag:'BEGINNINGS',art:'creation',lead:'The opening chapters of Genesis introduce the Creator, humanity, the fracture of sin and the beginnings of God’s redemptive promise.',sections:[['Creation','Genesis presents God as the maker of heaven and earth. The world is declared good, and human beings are created in God’s image with dignity and responsibility. The creation account gives the Bible its foundation: life is a gift held before its Creator.','Genesis 1–2'],['The fall and the spread of violence','Human disobedience fractures trust and brings shame, alienation and death into the human story. The accounts of Cain, the flood and Babel show how sin spreads through relationships and societies. Yet judgment is not the only note: God preserves life and continues to work toward restoration.','Genesis 3–11']]},
   {id:'patriarchs',title:'The patriarchs',subtitle:'A family and a promise',period:'Genesis 12–50',tag:'COVENANT',art:'patriarchs',lead:'God calls Abraham and forms a covenant family through whom blessing is promised to the nations.',sections:[['Abraham’s call','God called Abram to leave his country and go to a land God would show him. The promise included land, descendants and blessing that would reach all families of the earth. Abraham’s journey was marked by trust, uncertainty and repeated encounters with God.','Genesis 12; 15; 17'],['Isaac, Jacob and Joseph','The promise continued through Isaac and Jacob. Jacob’s family grew into the tribes of Israel, and Joseph’s journey to Egypt brought the family there during famine. Genesis ends with the family preserved in Egypt, setting the scene for Exodus.','Genesis 21–50']]},
   {id:'exodus',title:'The Exodus & the wilderness',subtitle:'From slavery to covenant',period:'Exodus – Deuteronomy',tag:'DELIVERANCE',art:'exodus',lead:'Israel is delivered from Egypt, formed as a covenant people and prepared for life in the promised land.',sections:[['Deliverance from Egypt','The book of Exodus tells how God heard Israel’s suffering, confronted Pharaoh and brought the people out of slavery. The Passover and crossing of the sea become defining memories of deliverance.','Exodus 1–15'],['A people shaped in the wilderness','At Sinai, Israel received the covenant and instructions for worship and community life. The wilderness years exposed the people’s fears and failures, yet God provided, guided and remained present. Moses’ final words prepare the next generation to enter the land.','Exodus 19–40; Numbers; Deuteronomy']]},
   {id:'kingdom',title:'The united kingdom',subtitle:'Saul, David and Solomon',period:'1 Samuel – 1 Kings 11',tag:'KINGDOM',art:'kingdom',lead:'Israel moves from judges to monarchy, reaching a high point under David and Solomon before division.',sections:[['The first kings','Israel asked for a king, and Saul became the first. David followed, establishing Jerusalem and receiving a covenant promise. Solomon built the temple and presided over a period of great wealth and influence.','1 Samuel 8–31; 2 Samuel; 1 Kings 1–10'],['The kingdom’s fracture','Solomon’s later unfaithfulness set the stage for division. After his death, the kingdom split into Israel in the north and Judah in the south. The divided monarchy would face repeated warnings from prophets and growing political instability.','1 Kings 11–12']]},
   {id:'exile-return',title:'Exile & return',subtitle:'Loss, hope and rebuilding',period:'2 Kings – Nehemiah',tag:'RESTORATION',art:'return',lead:'The kingdoms fall, the people are carried away, and a remnant returns to rebuild worship and community.',sections:[['The fall of the kingdoms','Despite prophetic warnings, Israel and Judah pursued injustice and idolatry. Assyria conquered the northern kingdom; later Babylon captured Jerusalem and destroyed the temple. Many people were deported, and exile became a defining crisis of identity and faith.','2 Kings 17; 24–25'],['A people return','Persian rule opened the way for groups of Judeans to return. They rebuilt the temple and, under leaders such as Ezra and Nehemiah, restored the city and renewed their commitment to the law.','Ezra 1–6; Nehemiah 1–13']]},
   {id:'jesus-church',title:'Jesus & the early Church',subtitle:'The gospel goes out to the nations',period:'The Gospels – Acts',tag:'GOSPEL · MISSION',art:'church',lead:'Jesus’ life, death and resurrection stand at the centre of the New Testament; the Spirit empowers the Church to carry the message outward.',sections:[['The ministry of Jesus','The four Gospels tell of Jesus’ teaching, compassion, miracles, death and resurrection. They present him as Israel’s Messiah and the one through whom God’s kingdom is announced. His resurrection becomes the foundation of Christian hope.','Matthew 1–4; Mark 1–3; Luke 1–4; John 1'],['The Church is sent','Acts records the coming of the Holy Spirit at Pentecost and the spread of the gospel from Jerusalem outward. The message crosses cultural boundaries, communities are formed, and Paul and others carry the witness across the Roman world.','Acts 1–28']]}
  ]
 }
};

const EXPLORE_MANIFEST_URL='./explore-assets.json';
const EXPLORE_CACHE_KEY='pedtalk-explore-daily-v1';
function exploreLocalDate(timeZone='Africa/Accra'){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const part=type=>parts.find(entry=>entry.type===type)?.value||'';
 return part('year')+'-'+part('month')+'-'+part('day');
}
function exploreEasterDate(year){
 const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
 return new Date(Date.UTC(year,month-1,day)).toISOString().slice(0,10);
}
function exploreCalendarOverride(date,manifest){
 const year=Number(date.slice(0,4)),easter=exploreEasterDate(year);
 const goodFriday=new Date(Date.parse(easter+'T00:00:00Z')-2*86400000).toISOString().slice(0,10);
 const easterAssets=manifest.themes.filter(theme=>theme.id.startsWith('NT-CROSS-'));
 const crownAssets=manifest.themes.filter(theme=>theme.id.startsWith('CAL-CHRISTMAS-'));
 const nativityAssets=manifest.themes.filter(theme=>theme.id.startsWith('CAL-NATIVITY-'));
 if(date===easter)return easterAssets[0]||null;
 if(date===goodFriday)return crownAssets[0]||null;
 if(date===year+'-12-25')return nativityAssets[0]||null;
 if(date===year+'-12-24')return nativityAssets[2]||nativityAssets[0]||null;
 return null;
}
function selectExploreDailyTheme(date,manifest){
 const override=exploreCalendarOverride(date,manifest);
 if(override)return {...override,calendar_override:true};
 const day=Math.floor(Date.parse(date+'T00:00:00Z')/86400000);
 const testament=day%2===0?'OT':'NT';
 const themes=manifest.themes.filter(theme=>theme.testament===testament&&theme.category!=='special_calendar');
 const selected=themes[((day%themes.length)+themes.length)%themes.length];
 return {...selected,calendar_override:false};
}
function validExploreAssetUrl(value){
 if(typeof value!=='string')return null;
 const candidate=value.trim();
 if(!candidate||/^(?:undefined|null|false)$/i.test(candidate))return null;
 try{
  const url=new URL(candidate,window.location.href);
  if(!['http:','https:'].includes(url.protocol))return null;
  if(/(?:^|\/)(?:undefined|null)(?:$|[?#])/i.test(url.pathname))return null;
  return url.href;
 }catch{return null;}
}
function applyExploreDailyVisual(theme,date,opacity=0.68){
 const panel=document.getElementById('exploreDailyVisual');if(!panel||!theme)return;
 document.getElementById('exploreDailyEyebrow').textContent=theme.calendar_override?'SACRED DAY · SPECIAL REFLECTION':'TODAY’S BIBLE MOMENT';
 document.getElementById('exploreDailyTestament').textContent=theme.testament==='OT'?'OLD TESTAMENT':theme.testament==='NT'?'NEW TESTAMENT':'SCRIPTURE REFLECTION';
 document.getElementById('exploreDailyTitle').textContent=theme.name||'A moment in Scripture';
 document.getElementById('exploreDailyReference').textContent=theme.scripture_reference||'Explore the Bible';
 document.getElementById('exploreDailyDate').textContent=new Intl.DateTimeFormat('en',{dateStyle:'long',timeZone:'Africa/Accra'}).format(new Date(date+'T12:00:00Z'));
 const numericOpacity=Number(opacity);panel.style.setProperty('--explore-overlay-opacity',String(Number.isFinite(numericOpacity)?Math.max(0,Math.min(1,numericOpacity)):0.68));
 panel.dataset.testament=theme.testament||'NT';
 panel.dataset.themeId=theme.id||'';
 panel.dataset.imageState='fallback';
 const url=validExploreAssetUrl(theme.asset_url||theme.asset?.url);
 if(!url)return;
 const image=new Image();
 image.onload=()=>{panel.style.setProperty('--explore-daily-image','url("'+url.replace(/["\\]/g,'')+'")');panel.dataset.imageState='loaded';};
 image.onerror=()=>{panel.style.removeProperty('--explore-daily-image');panel.dataset.imageState='fallback';};
 image.src=url;
}
async function loadExploreDailyVisual(){
 const panel=document.getElementById('exploreDailyVisual');if(!panel)return null;
 try{
  const response=await fetch(EXPLORE_MANIFEST_URL,{cache:'no-cache'});
  if(!response.ok)throw new Error('Explore theme manifest unavailable');
  const manifest=await response.json();
  if(!Array.isArray(manifest.themes)||!manifest.themes.length)throw new Error('Explore theme manifest is empty');
  window.__PEDExploreManifest=manifest;
  const date=exploreLocalDate(manifest.timezone||'Africa/Accra');
  let payload=null;
  const endpoint=window.PED_EXPLORE_TODAY_ENDPOINT;
  if(typeof endpoint==='string'&&endpoint.trim()){
   try{
    const apiResponse=await fetch(endpoint,{headers:{Accept:'application/json'},cache:'no-cache'});
    if(apiResponse.ok){const candidate=await apiResponse.json();if(candidate?.date===date&&candidate?.theme&&candidate?.asset&&candidate?.ui)payload=candidate;}
   }catch(error){console.warn('Explore daily API unavailable; using local rotation.',error);}
  }
  const theme=payload?{...payload.theme,id:payload.theme.id||payload.theme.name,testament:payload.testament,asset_url:payload.asset.url,calendar_override:!!payload.rotation?.calendar_override}:selectExploreDailyTheme(date,manifest);
  applyExploreDailyVisual(theme,date,payload?.ui?.overlay_gradient_opacity??0.68);
  try{localStorage.setItem(EXPLORE_CACHE_KEY,JSON.stringify({date,theme,opacity:payload?.ui?.overlay_gradient_opacity??0.68}));}catch{}
  return {date,theme,source:payload?'api':'local',imageState:panel.dataset.imageState};
 }catch(error){
  let cached=null;try{cached=JSON.parse(localStorage.getItem(EXPLORE_CACHE_KEY)||'null');}catch{}
  if(cached?.theme&&cached?.date){applyExploreDailyVisual(cached.theme,cached.date,cached.opacity);panel.dataset.cacheState='stale-fallback';return {date:cached.date,theme:cached.theme,source:'cache',imageState:panel.dataset.imageState};}
  console.warn('Explore daily visual could not load; keeping the accessible fallback.',error);
  panel.dataset.imageState='fallback';
  return null;
 }
}
window.PEDExploreBible={loadToday:loadExploreDailyVisual,selectTheme:selectExploreDailyTheme,easterDate:exploreEasterDate};

function renderExploreBible(category='stories'){
 const data=exploreBibleCollections[category]||exploreBibleCollections.stories;
 document.querySelectorAll('[data-explore-category]').forEach(button=>{const active=button.dataset.exploreCategory===category;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});
 document.getElementById('exploreCategoryEyebrow').textContent=data.eyebrow;
 document.getElementById('exploreCategoryTitle').textContent=data.title;
 document.getElementById('exploreCategoryDescription').textContent=data.description;
 const grid=document.getElementById('exploreStoryGrid');grid.hidden=false;document.getElementById('exploreStoryDetail').hidden=true;
 grid.innerHTML=data.items.map((item,index)=>'<button type="button" class="explore-story-card explore-art-'+item.art+'" data-explore-item="'+category+':'+item.id+'"><span class="explore-artwork" aria-hidden="true"><i></i><b></b><em></em><small>'+String(index+1).padStart(2,'0')+'</small></span><span class="explore-card-copy"><span class="explore-card-tag">'+item.tag+'</span><strong>'+item.title+'</strong><span>'+item.subtitle+'</span><small>'+item.period+' <b>↗</b></small></span></button>').join('');
}
function openExploreStory(category,id){
 const item=exploreBibleCollections[category]?.items.find(entry=>entry.id===id);if(!item)return;
 document.getElementById('exploreStoryGrid').hidden=true;document.getElementById('exploreStoryDetail').hidden=false;
 document.getElementById('exploreStoryArticle').innerHTML='<header class="explore-article-hero explore-art-'+item.art+'"><p class="eyebrow">'+item.tag+'</p><h2>'+item.title+'</h2><p>'+item.subtitle+'</p><span>'+item.period+'</span></header><p class="explore-article-lead">'+item.lead+'</p><div class="explore-article-sections">'+item.sections.map((section,index)=>'<section><span class="explore-section-number">'+String(index+1).padStart(2,'0')+'</span><div><h3>'+section[0]+'</h3><p>'+section[1]+'</p><small>READ IN SCRIPTURE · '+section[2]+'</small></div></section>').join('')+'</div><aside class="explore-reflection"><p class="eyebrow">TAKE A MOMENT TO REFLECT</p><p>What does this part of God’s story reveal about His character, and what response might it invite from you today?</p><button type="button" id="exploreOpenScripture">Open the Bible <span>→</span></button></aside>';
 document.getElementById('exploreOpenScripture')?.addEventListener('click',()=>{const ref=item.sections[0][2].match(/^(.+?)\s+(\d+)/);if(!ref)return;const aliases={'Genesis':'GEN','Exodus':'EXO','Deuteronomy':'DEU','1 Samuel':'1SA','2 Samuel':'2SA','1 Kings':'1KI','2 Kings':'2KI','Matthew':'MAT','Luke':'LUK','Daniel':'DAN','Esther':'EST','Ruth':'RUT','Acts':'ACT'};const code=aliases[ref[1]];if(code)showView('bible',code+':'+ref[2]);});
 document.getElementById('exploreDetailBack').textContent='‹ Back to '+(category==='stories'?'stories':'history');
}
document.querySelectorAll('[data-explore-category]').forEach(button=>button.addEventListener('click',()=>renderExploreBible(button.dataset.exploreCategory)));
document.getElementById('exploreStoryGrid')?.addEventListener('click',event=>{const card=event.target.closest('[data-explore-item]');if(!card)return;const [category,id]=card.dataset.exploreItem.split(':');openExploreStory(category,id);});
document.getElementById('exploreDetailBack')?.addEventListener('click',()=>renderExploreBible(document.querySelector('[data-explore-category].active')?.dataset.exploreCategory||'stories'));
document.getElementById('exploreDetailBottom')?.addEventListener('click',()=>renderExploreBible(document.querySelector('[data-explore-category].active')?.dataset.exploreCategory||'stories'));

function fillBibleBooks(){
 const testament=document.getElementById('bibleTestament').value,list=bibleBooks.filter(book=>book[2]===testament);
 bibleBookSelect.innerHTML=list.map(book=>'<option value="'+book[0]+'">'+book[1]+'</option>').join('');
 if(!list.some(book=>book[0]===activeBibleBook))activeBibleBook=list[0][0];
 bibleBookSelect.value=activeBibleBook;
 document.getElementById('bibleBookTiles').innerHTML=list.map(book=>'<button type="button" class="bible-book-tile" data-book="'+book[0]+'"><span>'+book[1]+'</span></button>').join('');
 document.getElementById('booksStageTitle').textContent=testament==='OT'?'Old Testament':'New Testament';
}
function setBibleStage(stage){
 document.body.classList.remove('scripture-reading');
 const showTestaments=stage==='testamentStage';
 const heading=document.querySelector('.bible-picker-heading');
 const tiles=document.getElementById('testamentTiles');
 if(heading)heading.hidden=!showTestaments;
 if(tiles)tiles.hidden=!showTestaments;
 document.getElementById('booksStage').hidden=stage!=='booksStage';
 document.getElementById('chaptersStage').hidden=stage!=='chaptersStage';
 document.getElementById('bibleReader').hidden=stage!=='scripture';
 window.scrollTo({top:0,behavior:'smooth'});
}
function resetBibleFlow(){
 activeBibleBook=null;activeBibleChapter=1;activeBibleData=null;setBibleStage('testamentStage');
 document.getElementById('bibleTitle').textContent='Scripture';
 document.getElementById('bibleVerses').innerHTML='<p class="loading">Choose a book and chapter to begin reading.</p>';
}
function clearBibleSearch(){
 const input=document.getElementById('bibleSearch'),results=document.getElementById('bibleSearchResults');
 if(input)input.value='';if(results){results.hidden=true;results.replaceChildren();}
}
function openBibleReference(reference){
 clearBibleSearch();
 const parts=String(reference||'').split(':'),name=parts[0]||'John';
 const meta=bibleBooks.find(book=>book[0]===name||book[1].toLowerCase()===name.toLowerCase());
 if(!meta){resetBibleFlow();return;}
 document.getElementById('bibleTestament').value=meta[2];fillBibleBooks();
 document.querySelector('.bible-picker-heading').hidden=true;document.getElementById('testamentTiles').hidden=true;document.getElementById('booksStage').hidden=true;document.getElementById('chaptersStage').hidden=true;
 loadBibleBook(meta[0],Math.max(1,Number(parts[1]||1)),parts[2]?Number(parts[2]):null,true);
}
function fillBibleChapters(){
 if(!activeBibleData)return;
 bibleChapterSelect.innerHTML=activeBibleData.chapters.map(ch=>'<option value="'+ch.number+'">Chapter '+ch.number+'</option>').join('');
 bibleChapterSelect.value=String(activeBibleChapter);
 document.getElementById('bibleChapterTiles').innerHTML=activeBibleData.chapters.map(ch=>'<button type="button" class="bible-chapter-tile" data-chapter="'+ch.number+'">'+ch.number+'</button>').join('');
 document.getElementById('chaptersStageTitle').textContent=bibleBooks.find(book=>book[0]===activeBibleBook)?.[1]||'Choose a chapter';
}
let bibleLoadToken=0;
function escapeBibleHTML(value=''){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
async function loadBibleBook(code,chapter=1,verseToFocus=null,openReader=false){
 clearBibleSearch();
 const meta=bibleBooks.find(book=>book[0]===code);if(!meta)return;
 const token=++bibleLoadToken;activeBibleBook=code;
 const title=document.getElementById('bibleTitle'),verses=document.getElementById('bibleVerses');
 title.textContent='Loading '+meta[1]+'…';verses.innerHTML='<p class="loading">Preparing scripture…</p>';
 try{
  if(!bibleCache[code]){
   const response=await fetch('../data/web-bible/'+encodeURIComponent(code)+'.json',{cache:'no-store'});
   if(!response.ok)throw new Error('Book not available');
   const data=await response.json();if(!Array.isArray(data.chapters)||!data.chapters.length)throw new Error('Book has no chapters');bibleCache[code]=data;
  }
  if(token!==bibleLoadToken)return;
  activeBibleData=bibleCache[code];document.getElementById('bibleTestament').value=meta[2];
  const chapterData=activeBibleData.chapters.find(item=>Number(item.number)===Number(chapter))||activeBibleData.chapters[0];
  activeBibleChapter=Number(chapterData.number);fillBibleBooks();fillBibleChapters();
  bibleBookSelect.value=code;bibleChapterSelect.value=String(activeBibleChapter);
  title.textContent=meta[1]+' '+activeBibleChapter;
  document.getElementById('biblePosition').textContent='Chapter '+activeBibleChapter+' of '+activeBibleData.chapters.length;
  document.getElementById('biblePrev').disabled=activeBibleChapter<=1;document.getElementById('bibleNext').disabled=activeBibleChapter>=activeBibleData.chapters.length;
  if(!Array.isArray(chapterData.verses))throw new Error('This chapter has no readable verse list');
  selectedBibleVerses.clear();
  verses.innerHTML=chapterData.verses.map((verse,index)=>{
   const number=escapeBibleHTML(bibleVerseNumber(verse,index)),text=escapeBibleHTML(bibleVerseText(verse));
   return '<span class="bible-verse" role="button" tabindex="0" aria-pressed="false" data-verse="'+number+'" id="bible-verse-'+number+'"><sup class="verse-number">'+number+'</sup><span class="verse-text">'+text+'</span></span>';
  }).join(' ');
  applyBibleHighlightsToDOM();
  const selectVerse=element=>{
   const verse=element.closest('.bible-verse');if(!verse)return;
   const key=code+':'+activeBibleChapter+':'+Number(verse.dataset.verse);
   if(selectedBibleVerses.has(key))selectedBibleVerses.delete(key);
   else selectedBibleVerses.set(key,{id:key,book:code,bookName:meta[1],chapter:activeBibleChapter,verse:Number(verse.dataset.verse),text:verse.querySelector('.verse-text')?.textContent||''});
   verse.classList.toggle('verse-selected',selectedBibleVerses.has(key));
   verse.setAttribute('aria-pressed',String(selectedBibleVerses.has(key)));
   updateBibleSelectionUI();
  };
  verses.onclick=event=>selectVerse(event.target);
  verses.onkeydown=event=>{
   if((event.key==='Enter'||event.key===' ')&&event.target.closest('.bible-verse')){event.preventDefault();selectVerse(event.target);}
  };
  document.querySelector('.bible-picker-heading').hidden=true;document.getElementById('testamentTiles').hidden=true;document.getElementById('booksStage').hidden=true;
  document.getElementById('chaptersStage').hidden=openReader;document.getElementById('bibleReader').hidden=!openReader;
  document.body.classList.toggle('scripture-reading',openReader);
  selectedBibleVerses.clear();updateBibleSelectionUI();
  if(verseToFocus){
   document.getElementById('bibleReader').hidden=false;document.getElementById('chaptersStage').hidden=true;document.body.classList.add('scripture-reading');
   const reader=document.getElementById('bibleReader');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{const target=document.getElementById('bible-verse-'+Number(verseToFocus));if(!target||!reader)return;const targetRect=target.getBoundingClientRect(),readerRect=reader.getBoundingClientRect();reader.scrollTo({top:reader.scrollTop+targetRect.top-readerRect.top-(reader.clientHeight*0.34),behavior:'smooth'});target.classList.add('verse-focus-arrival');window.setTimeout(()=>target.classList.remove('verse-focus-arrival'),1800);}));
  }
  if(openReader||verseToFocus)startBibleReadingSession(meta[0],meta[1],activeBibleChapter,chapterData.verses.length,verseToFocus);
 }catch(error){
  if(token!==bibleLoadToken)return;
  title.textContent=meta[1]+' unavailable';verses.innerHTML='<p class="loading">This book could not load. Please check your connection and try again.</p>';console.error(error);
 }
}
document.getElementById('testamentTiles').addEventListener('click',event=>{
 const button=event.target.closest('[data-testament]');if(!button)return;
 clearBibleSearch();
 document.getElementById('bibleSearchResults').hidden=true;
 document.getElementById('bibleTestament').value=button.dataset.testament;
 activeBibleBook=null;fillBibleBooks();setBibleStage('booksStage');
},true);
document.getElementById('bibleBookTiles').addEventListener('click',event=>{
 const button=event.target.closest('[data-book]');if(!button)return;loadBibleBook(button.dataset.book,1,null,false);
});
document.getElementById('bibleChapterTiles').addEventListener('click',event=>{
 const button=event.target.closest('[data-chapter]');if(!button)return;loadBibleBook(activeBibleBook,Number(button.dataset.chapter),null,true);
});
document.querySelectorAll('[data-bible-back]').forEach(button=>button.addEventListener('click',()=>{
 const stage=button.dataset.bibleBack;
 if(stage==='testaments')setBibleStage('testamentStage');
 else if(stage==='books')setBibleStage('booksStage');
 else if(stage==='chapters')setBibleStage('chaptersStage');
}));
document.getElementById('biblePrev').addEventListener('click',()=>loadBibleBook(activeBibleBook,activeBibleChapter-1,null,true));
document.getElementById('bibleNext').addEventListener('click',()=>loadBibleBook(activeBibleBook,activeBibleChapter+1,null,true));
function normalizeBibleText(value=''){return value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘']/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');}
function resolveBibleReference(query){
 const cleaned=query.trim().replace(/[.]/g,':').replace(/\s*:\s*/g,':').replace(/\s+/g,' ');
 const match=cleaned.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);if(!match)return null;
 const name=normalizeBibleText(match[1]);
 const aliases={'gen':'GEN','ex':'EXO','psalm':'PSA','ps':'PSA','song of songs':'SNG','song of solomon':'SNG','matt':'MAT','mk':'MRK','lk':'LUK','jn':'JHN','rom':'ROM','rev':'REV'};
 const meta=bibleBooks.find(b=>normalizeBibleText(b[1])===name||b[0].toLowerCase()===name||aliases[name]===b[0]);
 return meta?{meta,chapter:Number(match[2]),verse:match[3]?Number(match[3]):null}:null;
}
async function searchInBible(){
 const q=document.getElementById('bibleSearch').value.trim();const out=document.getElementById('bibleSearchResults');if(!q){out.hidden=true;return;}
 const ref=resolveBibleReference(q);
  if(ref){out.hidden=false;out.textContent='Opening '+ref.meta[1]+' '+ref.chapter+(ref.verse?':'+ref.verse:'')+'…';openBibleReference(ref.meta[0]+':'+ref.chapter+(ref.verse?':'+ref.verse:''));return;}
  const needle=normalizeBibleText(q);if(needle.length<2){out.hidden=false;out.textContent='Enter at least two letters to search the Bible.';return;}
 out.hidden=false;out.textContent='Searching all 66 books…';
 try{
  const books=await Promise.all(bibleBooks.map(async meta=>{
   if(!bibleCache[meta[0]]){
    const response=await fetch('../data/web-bible/'+encodeURIComponent(meta[0])+'.json');
    if(!response.ok)throw new Error('Could not load '+meta[1]);
    bibleCache[meta[0]]=await response.json();
   }
   return {meta,data:bibleCache[meta[0]]};
  }));
  const hits=[];
  for(const book of books){
   for(const chapter of book.data.chapters){
    for(let verseIndex=0;verseIndex<chapter.verses.length;verseIndex++){const verse=chapter.verses[verseIndex];
     const verseText=bibleVerseText(verse);if(normalizeBibleText(verseText).includes(needle)){hits.push({meta:book.meta,chapter:chapter.number,verse:bibleVerseNumber(verse,verseIndex),text:verseText});if(hits.length>=40)break;}
    }
    if(hits.length>=40)break;
   }
   if(hits.length>=40)break;
  }
  out.innerHTML=hits.length?'<strong>'+hits.length+(hits.length===40?'+':'')+' matching verses</strong>'+hits.map(hit=>'<button type="button" data-ref="'+hit.meta[0]+':'+hit.chapter+':'+hit.verse+'"><b>'+hit.meta[1]+' '+hit.chapter+':'+hit.verse+'</b><span>'+hit.text+'</span></button>').join(''):'No matches found. Try a different word or phrase.';
  out.querySelectorAll('[data-ref]').forEach(btn=>btn.addEventListener('click',()=>{
   const parts=btn.dataset.ref.split(':');const meta=bibleBooks.find(b=>b[0]===parts[0]);
   document.getElementById('bibleTestament').value=meta[2];fillBibleBooks();bibleBookSelect.value=meta[0];
   clearBibleSearch();loadBibleBook(meta[0],Number(parts[1]),Number(parts[2]),true);
  }));
 }catch(error){out.textContent='Search could not finish. Please check your connection and try again.';console.error(error);}
}
// Bible selections, brush highlights and saved scriptures are independent collections.
const BIBLE_HIGHLIGHTS_KEY='ped-talk-bible-highlights-v1';
const BIBLE_SAVED_SCRIPTURES_KEY='ped-talk-bible-saved-scriptures-v1';
let activeBibleHighlight='pink';
const selectedBibleVerses=new Map();
const bibleHighlightPalette=document.getElementById('bibleHighlightPalette');
const bibleHighlightsPanel=document.getElementById('bibleHighlightsPanel');
const bibleHighlightsList=document.getElementById('bibleHighlightsList');
const bibleHighlightsCount=document.getElementById('bibleHighlightsCount');
const bibleSavedPanel=document.getElementById('bibleSavedPanel');
const bibleSavedList=document.getElementById('bibleSavedList');
const bibleSavedCount=document.getElementById('bibleSavedCount');
const bibleSelectionActions=document.getElementById('bibleSelectionActions');
const bibleSelectionCount=document.getElementById('bibleSelectionCount');
const bibleHighlightButton=document.getElementById('bibleHighlightButton');
function readBibleCollection(key){try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[];}catch(error){return[];}}
function writeBibleCollection(key,items){try{localStorage.setItem(key,JSON.stringify(items));return true;}catch(error){alert('Your Bible collection could not be saved on this device.');return false;}}
function getBibleHighlights(){return readBibleCollection(BIBLE_HIGHLIGHTS_KEY);}
function saveBibleHighlights(items){return writeBibleCollection(BIBLE_HIGHLIGHTS_KEY,items);}
function getSavedBibleScriptures(){return readBibleCollection(BIBLE_SAVED_SCRIPTURES_KEY);}
function resolveSavedBibleTarget(item){
 if(!item||typeof item!=='object')return null;
 const parts=String(item.id||'').split(':');
 for(const candidate of [item.bookCode,item.book,parts[0],item.bookName]){
  if(candidate===undefined||candidate===null||String(candidate).trim()==='')continue;
  const value=String(candidate).trim();
  const meta=bibleBooks.find(book=>book[0]===value.toUpperCase()||normalizeBibleText(book[1])===normalizeBibleText(value));
  if(meta){
   const chapter=Number(item.chapter||parts[1]||1),verse=Number(item.verse||parts[2]||1);
   return {book:meta[0],testament:meta[2],chapter:Number.isFinite(chapter)&&chapter>0?chapter:1,verse:Number.isFinite(verse)&&verse>0?verse:1};
  }
 }
 return null;
}
function openSavedBibleItem(item){
 const target=resolveSavedBibleTarget(item);
 if(!target){console.warn('Saved Bible reference could not be resolved',item);return;}
 document.getElementById('bibleTestament').value=target.testament;
 showView('bible',null,true);
 loadBibleBook(target.book,target.chapter,target.verse,true);
}
function applyBibleHighlightsToDOM(){
 const saved=new Map(getBibleHighlights().map(item=>[item.id,item]));
 document.querySelectorAll('#bibleVerses .bible-verse').forEach(verse=>{
  const key=activeBibleBook+':'+activeBibleChapter+':'+Number(verse.dataset.verse),item=saved.get(key);
  verse.classList.toggle('verse-highlighted',!!item);
  if(item)verse.dataset.highlight=item.color;else delete verse.dataset.highlight;
 });
}
function updateBibleSelectionUI(){
 const count=selectedBibleVerses.size;
 bibleSelectionActions.hidden=count===0;
 bibleHighlightPalette.hidden=true;
 document.getElementById('bibleVerseCommentBox').hidden=true;
 bibleSelectionCount.textContent=count+' selected';
 document.getElementById('bibleSelectedVerse').textContent=count?'Choose an action below · '+count+' selected':'Tap a verse to select it';
}
function renderBibleHighlights(){
 const items=getBibleHighlights();bibleHighlightsCount.textContent=String(items.length);
 bibleHighlightsList.innerHTML=items.length?items.map(item=>'<article class="bible-saved-highlight"><button type="button" class="bible-saved-highlight-open" data-open-highlight="'+escapeBibleHTML(item.id)+'"><span class="saved-highlight-ref">'+escapeBibleHTML(item.bookName+' '+item.chapter+':'+item.verse)+'</span><span class="saved-highlight-text">'+escapeBibleHTML(item.text)+'</span><small><i class="saved-highlight-dot '+escapeBibleHTML(item.color)+'"></i> '+escapeBibleHTML(item.color.charAt(0).toUpperCase()+item.color.slice(1))+'</small></button><button type="button" class="bible-saved-highlight-delete" data-delete-highlight="'+escapeBibleHTML(item.id)+'" aria-label="Delete highlight">×</button></article>').join(''):'<p class="bible-highlights-empty">Your brush highlights will appear here.</p>';
}
function renderSavedBibleScriptures(){
 const items=getSavedBibleScriptures();bibleSavedCount.textContent=String(items.length);
 bibleSavedList.innerHTML=items.length?items.map(item=>'<article class="bible-saved-highlight"><button type="button" class="bible-saved-highlight-open" data-open-saved-scripture="'+escapeBibleHTML(item.id)+'"><span class="saved-highlight-ref">'+escapeBibleHTML(item.bookName+' '+item.chapter+':'+item.verse)+'</span><span class="saved-highlight-text">'+escapeBibleHTML(item.text)+'</span></button><button type="button" class="bible-saved-highlight-delete" data-delete-saved-scripture="'+escapeBibleHTML(item.id)+'" aria-label="Delete saved scripture">×</button></article>').join(''):'<p class="bible-highlights-empty">Your saved scriptures will appear here.</p>';
}
bibleHighlightButton?.addEventListener('click',()=>{
 if(!selectedBibleVerses.size)return;
 bibleHighlightPalette.hidden=false;
 bibleHighlightPalette.querySelectorAll('[data-highlight-color]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.highlightColor===activeBibleHighlight)));
});
bibleHighlightPalette?.addEventListener('click',event=>{
 const choice=event.target.closest('[data-highlight-color]');if(!choice||!selectedBibleVerses.size)return;
 activeBibleHighlight=choice.dataset.highlightColor;
 const existing=getBibleHighlights(),byId=new Map(existing.map(item=>[item.id,item]));
 selectedBibleVerses.forEach(verse=>byId.set(verse.id,{...verse,color:activeBibleHighlight}));
 if(!saveBibleHighlights([...byId.values()]))return;
 selectedBibleVerses.clear();applyBibleHighlightsToDOM();updateBibleSelectionUI();renderBibleHighlights();
 document.getElementById('bibleSelectedVerse').textContent='Brush highlight saved on the scripture';
});
document.getElementById('bibleSaveSelection')?.addEventListener('click',()=>{
 if(!selectedBibleVerses.size)return;
 const existing=getSavedBibleScriptures(),byId=new Map(existing.map(item=>[item.id,item]));
 selectedBibleVerses.forEach(verse=>byId.set(verse.id,verse));
 if(!writeBibleCollection(BIBLE_SAVED_SCRIPTURES_KEY,[...byId.values()]))return;
 selectedBibleVerses.clear();updateBibleSelectionUI();renderSavedBibleScriptures();
 document.getElementById('bibleSelectedVerse').textContent='Saved to Saved Scriptures';
});
const BIBLE_COMMENTS_KEY='ped-talk-bible-verse-comments-v1';
function getBibleVerseComments(){return readBibleCollection(BIBLE_COMMENTS_KEY);}
document.getElementById('bibleCommentSelection')?.addEventListener('click',()=>{
 if(!selectedBibleVerses.size)return;
 document.getElementById('bibleVerseCommentBox').hidden=false;
 document.getElementById('bibleVerseCommentInput').focus();
});
document.getElementById('bibleSaveComment')?.addEventListener('click',()=>{
 const note=document.getElementById('bibleVerseCommentInput').value.trim();if(!note||!selectedBibleVerses.size)return;
 const existing=getBibleVerseComments(),byId=new Map(existing.map(item=>[item.id,item]));
 selectedBibleVerses.forEach(verse=>{const prior=byId.get(verse.id)||{...verse,comments:[]};prior.comments=prior.comments||[];prior.comments.push({text:note,date:new Date().toISOString()});byId.set(verse.id,prior);});
 if(!writeBibleCollection(BIBLE_COMMENTS_KEY,[...byId.values()]))return;
 document.getElementById('bibleVerseCommentInput').value='';document.getElementById('bibleVerseCommentBox').hidden=true;renderBibleNotes();
 document.getElementById('bibleSelectedVerse').textContent='Comment saved with selected scripture';
});
function showBibleLibraryTab(tab){
 const panels={highlights:bibleHighlightsPanel,saved:bibleSavedPanel,notes:document.getElementById('bibleNotesPanel')};
 Object.entries(panels).forEach(([key,panel])=>panel.hidden=key!==tab);
 const ids={highlights:'bibleHighlightsToggle',saved:'bibleSavedToggle',notes:'bibleNotesToggle'};
 document.querySelectorAll('#bibleLibraryView .bible-library-tabs button').forEach(button=>button.classList.toggle('active',button.id===ids[tab]));
 if(tab==='highlights')renderBibleHighlights();if(tab==='saved')renderSavedBibleScriptures();if(tab==='notes')renderBibleNotes();
}
document.getElementById('bibleLibraryToggle')?.addEventListener('click',()=>{renderBibleHighlights();renderSavedBibleScriptures();renderBibleNotes();showBibleLibraryTab('saved');showView('bible-library');});
document.getElementById('bibleLibraryReturn')?.addEventListener('click',()=>showView('bible',null,true));
document.getElementById('bibleHighlightsToggle')?.addEventListener('click',()=>showBibleLibraryTab('highlights'));
document.getElementById('bibleSavedToggle')?.addEventListener('click',()=>showBibleLibraryTab('saved'));
function renderBibleNotes(){
 const list=document.getElementById('bibleNotesList'),items=getBibleVerseComments();
 const notes=items.flatMap(item=>(item.comments||[]).map((comment,index)=>({...comment,id:item.id,bookName:item.bookName,chapter:item.chapter,verse:item.verse,noteIndex:index}))).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 list.innerHTML=notes.length?notes.map(note=>'<article class="bible-saved-highlight"><div class="bible-saved-highlight-open"><span class="saved-highlight-ref">'+escapeBibleHTML(note.bookName+' '+note.chapter+':'+note.verse)+'</span><span class="saved-highlight-text">'+escapeBibleHTML(note.text)+'</span></div><button type="button" class="bible-saved-highlight-delete" data-delete-note="'+escapeBibleHTML(note.id)+'" data-note-index="'+note.noteIndex+'" aria-label="Delete note">×</button></article>').join(''):'<p class="bible-highlights-empty">Your scripture comments will appear here.</p>';
}
document.getElementById('bibleNotesToggle')?.addEventListener('click',()=>showBibleLibraryTab('notes'));
document.getElementById('bibleNotesList')?.addEventListener('click',event=>{
 const remove=event.target.closest('[data-delete-note]');if(!remove)return;
 const items=getBibleVerseComments(),item=items.find(entry=>entry.id===remove.dataset.deleteNote);if(!item)return;
 item.comments.splice(Number(remove.dataset.noteIndex),1);writeBibleCollection(BIBLE_COMMENTS_KEY,items.filter(entry=>entry.comments.length));renderBibleNotes();
});
bibleHighlightsList?.addEventListener('click',event=>{
 const remove=event.target.closest('[data-delete-highlight]');
 if(remove){saveBibleHighlights(getBibleHighlights().filter(item=>item.id!==remove.dataset.deleteHighlight));renderBibleHighlights();applyBibleHighlightsToDOM();return;}
 const open=event.target.closest('[data-open-highlight]');if(!open)return;
 const item=getBibleHighlights().find(saved=>saved.id===open.dataset.openHighlight);if(!item)return;
 openSavedBibleItem(item);
});
bibleSavedList?.addEventListener('click',event=>{
 const remove=event.target.closest('[data-delete-saved-scripture]');
 if(remove){writeBibleCollection(BIBLE_SAVED_SCRIPTURES_KEY,getSavedBibleScriptures().filter(item=>item.id!==remove.dataset.deleteSavedScripture));renderSavedBibleScriptures();return;}
 const open=event.target.closest('[data-open-saved-scripture]');if(!open)return;
 const item=getSavedBibleScriptures().find(saved=>saved.id===open.dataset.openSavedScripture);if(!item)return;
 openSavedBibleItem(item);
});
renderBibleHighlights();renderSavedBibleScriptures();
document.getElementById('bibleSearchButton').addEventListener('click',searchInBible);
document.getElementById('bibleSearch').addEventListener('keydown',event=>{if(event.key==='Enter')searchInBible();});
resetBibleFlow();
const bibleModeButton=document.getElementById('bibleModeToggle'),bibleSunIcon=document.getElementById('bibleSunIcon'),bibleMoonIcon=document.getElementById('bibleMoonIcon');
function setBibleMode(mode){
 const dark=mode==='dark';document.body.classList.toggle('bible-dark',dark);
 if(bibleSunIcon)bibleSunIcon.hidden=dark;if(bibleMoonIcon)bibleMoonIcon.hidden=!dark;
 if(bibleModeButton){bibleModeButton.setAttribute('aria-label',dark?'Switch the whole app to light mode':'Switch the whole app to dark mode');bibleModeButton.title=dark?'Switch the whole app to light mode':'Switch the whole app to dark mode';}
}
setBibleMode('light');
bibleModeButton?.addEventListener('click',()=>applyAppTheme(document.body.classList.contains('app-dark')?'light':'dark'));
document.querySelectorAll('.bottom-nav [data-view],.bible-home').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();showView(button.dataset.view||'home',null,false,{history:button.closest('.bottom-nav')?'replace':'push'});}));
document.querySelectorAll('[data-show-view]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.showView)));
document.querySelectorAll('[data-view="explore-bible"],[data-view="home"]:not(.bottom-nav button),[data-view="episodes"]:not(.bottom-nav button)').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();showView(button.dataset.view||'home');}));
const exploreHomeTile=document.querySelector('.explore-promo');
if(exploreHomeTile){exploreHomeTile.tabIndex=0;exploreHomeTile.setAttribute('role','button');exploreHomeTile.setAttribute('aria-label','Explore Bible stories and history');exploreHomeTile.addEventListener('click',()=>showView('explore-bible'));exploreHomeTile.addEventListener('keydown',event=>{if(event.target===exploreHomeTile&&(event.key==='Enter'||event.key===' ')){event.preventDefault();showView('explore-bible');}});}
const readingHomeTile=document.querySelector('.reading-stats-promo');
if(readingHomeTile){readingHomeTile.tabIndex=0;readingHomeTile.setAttribute('role','button');readingHomeTile.setAttribute('aria-label','Open reading statistics');readingHomeTile.addEventListener('click',()=>showView('reading-stats'));readingHomeTile.addEventListener('keydown',event=>{if(event.target===readingHomeTile&&(event.key==='Enter'||event.key===' ')){event.preventDefault();showView('reading-stats');}});}

document.getElementById('bibleReaderHome')?.addEventListener('click',()=>showView('home',null,false,{history:'replace'}));
document.querySelectorAll('.reading-stats-open,[data-reading-home]').forEach(button=>button.addEventListener('click',()=>showView(button.hasAttribute('data-reading-home')?'home':'reading-stats')));


/* PED-Talk appearance controller: one saved preference, one live system listener. */
const APP_THEME_KEY='ped-talk-app-theme';
const APP_THEME_ASSETS={
 light:{giftOfHope:'../assets/gift-of-hope-day.svg',voiceOfHealing:'../assets/ped-talk-healing-story.jpg'},
 dark:{giftOfHope:'../assets/gift-of-hope-sky.svg',voiceOfHealing:'../assets/voice-of-healing.jpg'}
};
const appSettingsModal=document.getElementById('appSettingsModal');
const appThemeButtons=[...document.querySelectorAll('[data-app-theme]')];
function systemPrefersDark(){return !!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);}
function applyAppTheme(choice){
 const theme=['system','light','dark'].includes(choice)?choice:'system';
 const effective=theme==='system'?(systemPrefersDark()?'dark':'light'):theme;
 document.body.dataset.appTheme=effective;document.documentElement.dataset.appTheme=effective;document.documentElement.style.colorScheme=effective;
 document.body.classList.toggle('app-light',effective==='light');document.body.classList.toggle('app-dark',effective==='dark');
 const assets=APP_THEME_ASSETS[effective];
 document.documentElement.style.setProperty('--gift-of-hope-image','url("'+assets.giftOfHope+'")');
 document.documentElement.style.setProperty('--voice-of-healing-image','url("'+assets.voiceOfHealing+'")');
 document.documentElement.style.setProperty('--voice-of-healing-filter',effective==='light'?'brightness(1.2) saturate(1.08) contrast(1.02)':'brightness(.96) saturate(.98) contrast(1.05)');
 const voiceImage=document.querySelector('.app-showcase-voice>img');
 if(voiceImage&&voiceImage.getAttribute('src')!==assets.voiceOfHealing){
  voiceImage.setAttribute('src',assets.voiceOfHealing);
  voiceImage.alt=effective==='light'?'A moment of comfort and care in warm natural light':'A person speaking into a microphone in a quiet recording studio';
 }
 if(typeof setBibleMode==='function')setBibleMode(effective);
 appThemeButtons.forEach(button=>{const active=button.dataset.appTheme===theme;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
 const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=effective==='dark'?'#0A0A0A':'#f5f8f5';
 try{localStorage.setItem(APP_THEME_KEY,theme);}catch(error){}
 window.PEDDevotional?.sync();
}
let preferredAppTheme='dark';try{preferredAppTheme=localStorage.getItem(APP_THEME_KEY)||'dark';}catch(error){}
applyAppTheme(preferredAppTheme);
const colorSchemeQuery=window.matchMedia?.('(prefers-color-scheme: dark)');
const onSystemThemeChange=()=>{let choice='system';try{choice=localStorage.getItem(APP_THEME_KEY)||'dark';}catch(error){}if(choice==='system')applyAppTheme('system');};
if(colorSchemeQuery?.addEventListener)colorSchemeQuery.addEventListener('change',onSystemThemeChange);else colorSchemeQuery?.addListener?.(onSystemThemeChange);
function openAppSettings(){
 if(!appSettingsModal||!appSettingsModal.hidden)return;
 pushOverlayHistory('settings');appSettingsModal.hidden=false;document.body.classList.add('settings-open');
 document.getElementById('settingsHome')?.focus({preventScroll:true});window.PEDShowcase?.pause();window.PEDDevotional?.sync();
}
document.getElementById('appSettingsButton')?.addEventListener('click',openAppSettings);
function closeAppSettings(fromHistory=false){
 if(!appSettingsModal||appSettingsModal.hidden)return;
 if(!fromHistory&&window.history?.state?.overlay==='settings'){window.history.back();return;}
 appSettingsModal.hidden=true;document.body.classList.remove('settings-open');
 document.getElementById('appSettingsButton')?.focus({preventScroll:true});window.PEDShowcase?.resume();window.PEDDevotional?.sync();
}
function settingsNavigateHome(event){
 event?.preventDefault();event?.stopPropagation();
 if(!appSettingsModal)return;
 if(!appSettingsModal.hidden)closeAppSettings(true);
 if(window.history)window.history.replaceState({pedTalkApp:true,view:'home'},'',window.location.href);
 showView('home',null,false,{history:'none',restoreFocus:true});
 window.PEDShowcase?.resume();window.PEDDevotional?.sync();
}
document.getElementById('settingsHome')?.addEventListener('click',settingsNavigateHome);
appSettingsModal?.addEventListener('click',event=>{if(event.target===appSettingsModal)closeAppSettings();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&appSettingsModal&&!appSettingsModal.hidden)closeAppSettings();});
appThemeButtons.forEach(button=>button.addEventListener('click',()=>applyAppTheme(button.dataset.appTheme)));
document.getElementById('subscriptionEntry')?.addEventListener('click',()=>{const note=document.getElementById('subscriptionNotice');if(note){note.hidden=false;note.textContent='PED-Talk subscriptions are being prepared. Membership options will appear here when available.';note.scrollIntoView({block:'nearest',behavior:'smooth'});}});

// Gift of Hope: Scripture → Amazing Grace reflection → WEB victory promise.
const hopeModal=document.getElementById('hopeModal'),giftVerse=document.getElementById('giftVerse'),giftReference=document.getElementById('giftReference'),modalDevotional=document.getElementById('modalGiftDevotional');
const hopeCard=document.querySelector('.hope-card'),giftDevotional=document.getElementById('giftDevotional'),giftVerseLabel=document.getElementById('giftVerseLabel');
const devotionalStages=[
 {label:"TODAY'S SCRIPTURE",text:'“For God so loved the world, that he gave his one and only Son…”',reference:'John 3:16 · World English Bible',bible:'John:3:16',phase:'scripture'},
 {label:'AMAZING GRACE',text:'“Amazing grace! how sweet the sound, that saved a wretch like me! I once was lost, but now am found; was blind, but now I see.” Grace meets us in our weakness, carries us through every trial, and leads us home in hope.',reference:'John Newton · Amazing Grace (public-domain hymn)',bible:'REV:3:21',phase:'grace'},
 {label:'A PROMISE OF VICTORY',text:'He who overcomes, I will give to him to sit down with me on my throne, as I also overcame, and sat down with my Father on his throne.',reference:'Revelation 3:21 · World English Bible',bible:'REV:3:21',phase:'victory'}
];
let devotionalIndex=0,devotionalTimer=null,hopeCardVisible=true;
function renderDevotionalStage(index){
 const stage=devotionalStages[index];
 // Both presentation variants share the devotional stage but retain independent layouts.
 // Compact Home geometry is CSS-constrained so long reflections cannot reflow the hero.
 if(giftVerseLabel)giftVerseLabel.textContent=stage.label;
 if(giftVerse)giftVerse.textContent=stage.text;
 if(giftReference)giftReference.textContent=stage.reference;
 const modalLabel=document.getElementById('modalGiftVerseLabel'),modalVerse=document.getElementById('modalGiftVerse'),modalRef=document.getElementById('modalGiftReference'),modalLink=document.getElementById('hopeModalBibleLink');
 if(modalLabel)modalLabel.textContent=stage.label;if(modalVerse)modalVerse.textContent=stage.text;if(modalRef)modalRef.textContent=stage.reference;
 if(modalLink){modalLink.hidden=!stage.bible;if(stage.bible)modalLink.dataset.openBible=stage.bible;else modalLink.removeAttribute('data-open-bible');}
}
function devotionalCanRun(){return !document.hidden&&((!homeView.hidden&&hopeCardVisible)||!hopeModal.hidden)&&appSettingsModal.hidden&&document.getElementById('dwoopOverlay')?.hidden!==false;}
function pauseDevotional(){if(devotionalTimer){window.clearTimeout(devotionalTimer);devotionalTimer=null;}giftDevotional?.classList.remove('is-leaving','is-entering');modalDevotional?.classList.remove('is-leaving','is-entering');}
function scheduleDevotional(){if(!devotionalTimer&&devotionalCanRun())devotionalTimer=window.setTimeout(advanceDevotional,7200);}
function advanceDevotional(){
 devotionalTimer=null;if(!devotionalCanRun())return;
 // Fade the Home scripture and expanded scripture together; neither surface is left behind.
 [giftDevotional,modalDevotional].forEach(el=>{if(el){el.classList.remove('is-entering');el.classList.add('is-leaving');}});
 devotionalTimer=window.setTimeout(()=>{
  devotionalTimer=null;if(!devotionalCanRun()){pauseDevotional();return;}
  devotionalIndex=(devotionalIndex+1)%devotionalStages.length;renderDevotionalStage(devotionalIndex);
  [giftDevotional,modalDevotional].forEach(el=>{if(el){el.classList.remove('is-leaving');el.classList.add('is-entering');}});
  scheduleDevotional();
 },680);
}
[giftDevotional,modalDevotional].forEach(el=>el?.addEventListener('animationend',event=>{if(event.animationName==='hopeScriptureEnter')el.classList.remove('is-entering');}));
if('IntersectionObserver' in window){const hopeObserver=new IntersectionObserver(entries=>{hopeCardVisible=!!entries[0]?.isIntersecting;if(hopeCardVisible)scheduleDevotional();else pauseDevotional();},{threshold:.12});hopeObserver.observe(hopeCard);}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseDevotional();else scheduleDevotional();});
renderDevotionalStage(devotionalIndex);scheduleDevotional();
window.PEDDevotional={sync:()=>{if(devotionalCanRun())scheduleDevotional();else pauseDevotional();},get phase(){return devotionalStages[devotionalIndex].phase;}};
function openGiftHope(){
 hopeModal.dataset.presentation='expanded';
 if(!hopeModal||!homeView||!hopeCard||!giftVerse||!giftVerseLabel||!giftReference){
  console.error('Gift of Hope could not open: required devotional elements are missing.');
  return;
 }
 if(!Array.isArray(devotionalStages)||!devotionalStages.length||!devotionalStages[devotionalIndex]){
  console.error('Gift of Hope could not open: devotional stage data is unavailable.');
  return;
 }
 renderDevotionalStage(devotionalIndex);
 renderHopeComments();
 showView('hope');
 const panel=hopeModal.querySelector('.hope-modal-panel');
 const title=document.getElementById('hopeModalTitle');
 if(panel)panel.scrollTop=0;
 requestAnimationFrame(()=>{
  if(!hopeModal.hidden)return;
  if(panel)panel.scrollTop=0;
  title?.focus({preventScroll:true});
 });
}
hopeCard.setAttribute('tabindex','0');hopeCard.setAttribute('role','button');hopeCard.setAttribute('aria-label','Open Gift of Hope');
hopeCard.addEventListener('click',event=>{if(event.target.closest('a,button'))return;openGiftHope();});
hopeCard.addEventListener('keydown',event=>{if(event.target===hopeCard&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openGiftHope();}});
function closeHope(){if(window.history?.state?.pedTalkApp&&window.history.state.view==='hope'){window.history.back();return;}showView('home',null,false,{history:'replace',restoreFocus:true});}
hopeModal.addEventListener('click',event=>{if(event.target===hopeModal)closeHope();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!hopeModal.hidden)closeHope();});
let hopeSwipeStart=null;
hopeModal.querySelector('.hope-modal-panel')?.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'&&event.button!==0)return;hopeSwipeStart={y:event.clientY,x:event.clientX,scrollTop:event.currentTarget.scrollTop,target:event.target};},{passive:true});
hopeModal.querySelector('.hope-modal-panel')?.addEventListener('pointerup',event=>{if(!hopeSwipeStart)return;const start=hopeSwipeStart;hopeSwipeStart=null;if(start.scrollTop>2||start.target.closest('button,a,summary,input,textarea,select'))return;const dy=event.clientY-start.y,dx=event.clientX-start.x;if(dy>88&&dy>Math.abs(dx)*1.25)closeHope();},{passive:true});
let hopeTouchStart=null;
hopeModal.querySelector('.hope-modal-panel')?.addEventListener('touchstart',event=>{const t=event.changedTouches[0];if(t)hopeTouchStart={x:t.clientX,y:t.clientY,scrollTop:event.currentTarget.scrollTop,target:event.target};},{passive:true});
hopeModal.querySelector('.hope-modal-panel')?.addEventListener('touchend',event=>{if(!hopeTouchStart)return;const t=event.changedTouches[0],start=hopeTouchStart;hopeTouchStart=null;if(!t||start.scrollTop>2||start.target.closest('button,a,summary,input,textarea,select'))return;const dx=t.clientX-start.x,dy=t.clientY-start.y;if(dy>88&&dy>Math.abs(dx)*1.25)closeHope();},{passive:true});
const likeButton=document.getElementById('hopeLike'),likeKey='ped-talk-gift-hope-liked';
function safeStorageGet(key,fallback=null){try{const value=localStorage.getItem(key);return value===null?fallback:value;}catch(error){return fallback;}}
function safeStorageSet(key,value){try{localStorage.setItem(key,value);return true;}catch(error){return false;}}
function syncHopeLike(){const liked=safeStorageGet(likeKey)==='true';likeButton.setAttribute('aria-pressed',String(liked));likeButton.innerHTML=(liked?'♥':'♡')+' <span>'+(liked?'Liked':'Like')+'</span>';}
likeButton.addEventListener('click',()=>{safeStorageSet(likeKey,likeButton.getAttribute('aria-pressed')!=='true'?'true':'false');syncHopeLike();});syncHopeLike();
const commentsKey='ped-talk-gift-hope-comments';
function getHopeComments(){try{const parsed=JSON.parse(safeStorageGet(commentsKey,'[]'));return Array.isArray(parsed)?parsed:[];}catch(error){return[];}}
function renderHopeComments(){const list=document.getElementById('hopeCommentList');if(!list)return;const comments=getHopeComments();list.innerHTML=comments.length?comments.map(item=>'<article class="hope-comment"><p>'+String(item.text||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))+'</p><small>'+new Date(item.date).toLocaleString()+'</small></article>').join(''):'<p class="empty">Be the first to share a thought.</p>';}
document.getElementById('hopeCommentToggle').addEventListener('click',()=>{const panel=document.getElementById('hopeComments'),button=document.getElementById('hopeCommentToggle');panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden){renderHopeComments();panel.scrollIntoView({block:'nearest',behavior:'smooth'});}});
document.getElementById('hopeCommentForm').addEventListener('submit',event=>{event.preventDefault();const input=document.getElementById('hopeCommentInput'),value=input.value.trim();if(!value)return;const comments=getHopeComments();comments.unshift({text:value,date:new Date().toISOString()});if(!safeStorageSet(commentsKey,JSON.stringify(comments.slice(0,100)))){alert('Comments cannot be saved on this device right now.');return;}input.value='';renderHopeComments();});
document.getElementById('hopeShare').addEventListener('click',async()=>{const shareData={title:'PED-Talk · Gift of Hope',text:giftVerse.textContent+' — '+giftReference.textContent,url:location.href};try{if(navigator.share)await navigator.share(shareData);else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(shareData.text+' '+shareData.url);alert('Gift of Hope copied to clipboard.');}else alert(shareData.text+' '+shareData.url);}catch(error){if(error.name!=='AbortError')console.warn('Share was not completed',error);}});
document.addEventListener('click',event=>{const link=event.target.closest('[data-open-bible]');if(!link)return;event.preventDefault();showView('bible',link.dataset.openBible);});
window.addEventListener('popstate',event=>{
 const state=event.state||{};
 if(!appSettingsModal.hidden&&state.overlay!=='settings')closeAppSettings(true);
 if(!document.getElementById('dwoopOverlay')?.hidden&&state.overlay!=='dwoop')closeDwoopModal(true);
 if(!hopeModal.hidden&&state.view!=='hope'){showView(state.view||'home',null,false,{history:'none',restoreFocus:true});return;}
 const routeView=state.view||new URLSearchParams(window.location.search).get('view')||'home';
 if(routeView!==currentAppView())showView(routeView,null,false,{history:'none'});
});

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('../service-worker.js').catch(()=>{}));}



/* Universal Library Progress & Reading Stats */
const UNIVERSAL_PROGRESS_KEY='pedtalk-universal-book-progress-v1';
const UNIVERSAL_SESSIONS_KEY='pedtalk-universal-reading-sessions-v1';
const UNIVERSAL_SNIPPETS_KEY='pedtalk-universal-reading-snippets-v1';
let activeUniversalSession=null;
let universalLastTick=0;
let universalLastActivity=Date.now();
const UNIVERSAL_IDLE_LIMIT=120000;
function readUniversalArray(key){try{const value=JSON.parse(safeStorageGet(key,'[]'));return Array.isArray(value)?value:[];}catch(error){return[];}}
function writeUniversalArray(key,value){return safeStorageSet(key,JSON.stringify(value));}
function universalProgressItems(){return readUniversalArray(UNIVERSAL_PROGRESS_KEY);}
function universalSessions(){return readUniversalArray(UNIVERSAL_SESSIONS_KEY);}
function universalEscape(value=''){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function universalSaveProgress(item){
 const items=universalProgressItems(),index=items.findIndex(entry=>entry.bookId===item.bookId);
 if(index>=0)items[index]={...items[index],...item};else items.unshift(item);
 writeUniversalArray(UNIVERSAL_PROGRESS_KEY,items.slice(0,100));
}
function universalTouch(){universalLastActivity=Date.now();}
function universalFlushTick(){
 if(!activeUniversalSession)return;
 const now=Date.now(),visible=!document.hidden&&(activeUniversalSession.sourceType==='bible'?document.getElementById('bibleReader')?.hidden===false:true);
 if(visible){
  const elapsed=Math.max(0,Math.min(30,Math.round((now-universalLastTick)/1000)));
  if(elapsed){
   activeUniversalSession.durationSeconds+=elapsed;
   activeUniversalSession.endTime=now;
   const sessions=universalSessions(),index=sessions.findIndex(item=>item.sessionId===activeUniversalSession.sessionId);
   if(index>=0)sessions[index]=activeUniversalSession;else sessions.push(activeUniversalSession);
   writeUniversalArray(UNIVERSAL_SESSIONS_KEY,sessions.slice(-1000));
   const progress=universalProgressItems().find(item=>item.bookId===activeUniversalSession.bookId);
   if(progress){progress.totalTimeSpentSeconds=(progress.totalTimeSpentSeconds||0)+elapsed;progress.lastAccessedTimestamp=now;universalSaveProgress(progress);}
  }
 }
 universalLastTick=now;
}
function finishReadingSession(){
 if(!activeUniversalSession)return;
 universalFlushTick();
 activeUniversalSession=null;
 universalLastTick=Date.now();
}
function universalBookTitle(bookId,fallback=''){
 const id=String(bookId||'');
 if(id.startsWith('bible-web-')){
  const code=id.slice('bible-web-'.length).toUpperCase();
  const book=bibleBooks.find(item=>item[0]===code);
  return book?.[1]||fallback||'Bible reading';
 }
 return fallback||id||'Reading';
}
function startUniversalReading(config){
 finishReadingSession();
 const now=Date.now(),bookId=String(config.bookId||'').trim();
 if(!bookId)return;
 const title=universalBookTitle(bookId,config.title||'');
 activeUniversalSession={sessionId:'rs-'+now+'-'+Math.random().toString(36).slice(2,8),bookId,title,bookTitle:title,userId:'local-device',sourceType:config.sourceType||'book',startTime:now,endTime:now,durationSeconds:0,startLocation:config.location||{},endLocation:config.location||{},wordsRead:config.wordsRead??null,pagesRead:config.pagesRead??null};
 universalLastTick=now;universalLastActivity=now;
 const previous=universalProgressItems().find(item=>item.bookId===bookId);
 universalSaveProgress({bookId,userId:'local-device',title:config.title||previous?.title||title,subtitle:config.subtitle||'',sourceType:config.sourceType||'book',completionPercentage:Math.max(0,Math.min(1,Number(config.progress)||0)),progressDisplayText:config.displayText||'',lastKnownLocation:config.location||{},isCompleted:Boolean(config.isCompleted),totalTimeSpentSeconds:previous?.totalTimeSpentSeconds||0,lastAccessedTimestamp:now});
}
function startBibleReadingSession(code,title,chapter,verseCount,focusVerse){
 const chapterCounts={GEN:50,EXO:40,LEV:27,NUM:36,DEU:34,JOS:24,JDG:21,RUT:4,'1SA':31,'2SA':24,'1KI':22,'2KI':25,'1CH':29,'2CH':36,EZR:10,NEH:13,EST:10,JOB:42,PSA:150,PRO:31,ECC:12,SNG:8,ISA:66,JER:52,LAM:5,EZK:48,DAN:12,HOS:14,JOL:3,AMO:9,OBA:1,JON:4,MIC:7,NAM:3,HAB:3,ZEP:3,HAG:2,ZEC:14,MAL:4,MAT:28,MRK:16,LUK:24,JHN:21,ACT:28,ROM:16,'1CO':16,'2CO':13,GAL:6,EPH:6,PHP:4,COL:4,'1TH':5,'2TH':3,'1TI':6,'2TI':4,TIT:3,PHM:1,HEB:13,JAS:5,'1PE':5,'2PE':3,'1JN':5,'2JN':1,'3JN':1,JUD:1,REV:22};
 const totalChapters=chapterCounts[code]||Number(chapter)||1;
 const withinChapter=focusVerse?Math.max(0,Math.min(1,(Number(focusVerse)-1)/Math.max(1,Number(verseCount)||1))):0;
 const chapterProgress=Math.max(0,Math.min(1,(Number(chapter)-1+withinChapter)/totalChapters));
 const bookName=title||code;
 startUniversalReading({bookId:'bible-web-'+code,title:bookName,subtitle:bookName+' · Chapter '+chapter,sourceType:'bible',location:{bookCode:code,bookName,chapter,verse:focusVerse||1},progress:chapterProgress,displayText:'Chapter '+chapter+' of '+totalChapters,wordsRead:null});
}
function formatUniversalTime(seconds){
 const value=Math.max(0,Math.floor(Number(seconds)||0)),mins=Math.floor(value/60),hours=Math.floor(mins/60),remaining=mins%60;
 if(value<60)return value+'s';
 return hours?hours+'h '+remaining+'m':mins+'m';
}
function formatDetailedReadingTime(seconds){
 const value=Math.max(0,Math.floor(Number(seconds)||0)),hours=Math.floor(value/3600),mins=Math.floor((value%3600)/60),secs=value%60;
 return hours?hours+'h '+mins+'m':mins?mins+'m '+secs+'s':secs+'s';
}
function universalDurationInRange(item,start,end){
 const sessionStart=Number(item.startTime),sessionEnd=Number(item.endTime),duration=Math.max(0,Number(item.durationSeconds)||0);
 const overlap=Math.max(0,Math.min(end,sessionEnd)-Math.max(start,sessionStart)),span=Math.max(0,sessionEnd-sessionStart);
 return span?Math.min(duration,Math.round(duration*overlap/span)):((sessionStart>=start&&sessionStart<=end)?duration:0);
}
function startOfLocalDay(date){return new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime();}
function startOfLocalWeek(date){const day=(date.getDay()+6)%7;return startOfLocalDay(new Date(date.getFullYear(),date.getMonth(),date.getDate()-day));}
function readingPeriodLabel(period){return period==='today'?'Today':period==='week'?'This week':'This month';}
function readingClock(timestamp){
 if(!Number.isFinite(Number(timestamp)))return '—';
 return new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(new Date(Number(timestamp)));
}
function readingDateTime(timestamp){
 if(!Number.isFinite(Number(timestamp)))return '—';
 return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(Number(timestamp)));
}
function readingSessionTitle(session,progress){
 const saved=progress.find(item=>item.bookId===session.bookId);
 return universalBookTitle(session.bookId,session.bookTitle||session.title||saved?.title||'Reading session');
}
function readingRangeSessions(start,end){
 return universalSessions().filter(item=>Number(item.endTime)>start&&Number(item.startTime)<end).map(item=>{
  const rawStart=Number(item.startTime),rawEnd=Number(item.endTime),duration=Math.max(0,Number(item.durationSeconds)||0),overlapStart=Math.max(start,rawStart),overlapEnd=Math.min(end,rawEnd),span=Math.max(0,rawEnd-rawStart),clipped=span>0?Math.min(duration,Math.round(duration*(overlapEnd-overlapStart)/span)):duration;
  return {...item,displayStart:overlapStart,displayEnd:overlapEnd,displayDuration:Math.max(0,clipped)};
 }).filter(item=>item.displayDuration>0).sort((a,b)=>a.displayStart-b.displayStart);
}
function readingRangeTotal(sessions){return sessions.reduce((sum,item)=>sum+item.displayDuration,0);}
function readingDayKey(date){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');}
function readingDateTitle(date,options={weekday:'long',month:'long',day:'numeric'}){return new Intl.DateTimeFormat(undefined,options).format(date);}
function readingSessionsMarkup(sessions,progress){
 const grouped=new Map();sessions.forEach(item=>{const name=readingSessionTitle(item,progress);grouped.set(name,(grouped.get(name)||0)+item.displayDuration);});
 return (grouped.size?'<section class="reading-detail-books"><h3>Books read</h3>'+[...grouped.entries()].map(([name,seconds])=>'<div class="reading-detail-book"><span>'+escapeBibleHTML(name)+'</span><strong>'+escapeBibleHTML(formatUniversalTime(seconds))+'</strong></div>').join('')+'</section>':'')+
 '<section class="reading-detail-sessions"><h3>Reading sessions</h3>'+(sessions.length?sessions.map(item=>'<article class="reading-session-row"><div><strong>'+escapeBibleHTML(readingSessionTitle(item,progress))+'</strong><span>'+escapeBibleHTML(readingDateTime(item.displayStart))+' – '+escapeBibleHTML(readingClock(item.displayEnd))+'</span></div><b>'+escapeBibleHTML(formatDetailedReadingTime(item.displayDuration))+'</b></article>').join(''):'<p class="reading-detail-empty">No reading sessions were recorded in this period.</p>')+'</section>';
}
function readingPeriodHeader(label,total,sessions,sub){
 return '<section class="reading-detail-total"><span>'+escapeBibleHTML(label)+'</span><strong>'+escapeBibleHTML(formatUniversalTime(total))+'</strong><small>'+sessions.length+' recorded '+(sessions.length===1?'session':'sessions')+(sub?' · '+escapeBibleHTML(sub):'')+'</small></section>';
}
let activeReadingPeriod='today';
function openReadingPeriod(period){
 const transitionToken=++dwoopTransitionToken;
 activeReadingPeriod=period;
 const now=new Date(),todayStart=startOfLocalDay(now),weekStart=startOfLocalWeek(now),monthStart=new Date(now.getFullYear(),now.getMonth(),1).getTime();
 const start=period==='today'?todayStart:period==='week'?weekStart:monthStart;
 const sessions=readingRangeSessions(start,now.getTime()),total=readingRangeTotal(sessions),progress=universalProgressItems();
 const overlay=document.getElementById('dwoopOverlay'),card=overlay?.querySelector('.dwoop-card-expanded');if(!overlay||!card)return;
 if(overlay.hidden){lastDwoopTrigger=document.activeElement&&document.activeElement!==document.body?document.activeElement:null;pushOverlayHistory('dwoop');window.PEDShowcase?.pause();}
 const existingPlayer=overlay.querySelector('.episode-page-audio');if(existingPlayer){existingPlayer.pause();existingPlayer.removeAttribute('src');}
 card.classList.remove('dwoop-page-card');overlay.classList.remove('dwoop-episode-mode');document.getElementById('dwoopArtwork')?.replaceChildren();
 card.classList.add('dwoop-light','dwoop-page-card');overlay.classList.add('dwoop-page-mode','dwoop-reading-mode');
 document.querySelector('.coming-soon-indicator')?.setAttribute('hidden','');
 document.getElementById('dwoopEyebrow').textContent='YOUR READING JOURNEY';
 document.getElementById('dwoopTitle').textContent=readingPeriodLabel(period);
 document.getElementById('dwoopIntro').textContent=period==='today'?readingDateTitle(now)+' · Daily reading breakdown':period==='week'?'Monday – Sunday · Daily reading breakdown':readingDateTitle(now,{month:'long',year:'numeric'})+' · Weekly reading breakdown';
 const content=document.getElementById('dwoopContent');
 let breakdown='';
 if(period==='today'){
  const hourRows=[];for(let h=0;h<=now.getHours();h++){const a=todayStart+h*3600000,b=Math.min(now.getTime(),a+3600000),part=readingRangeSessions(a,b),seconds=readingRangeTotal(part);if(seconds)hourRows.push('<article class="reading-breakdown-row"><div><strong>'+escapeBibleHTML(new Intl.DateTimeFormat(undefined,{hour:'numeric'}).format(new Date(a)))+'</strong><span>'+part.length+' '+(part.length===1?'session':'sessions')+'</span></div><b>'+escapeBibleHTML(formatUniversalTime(seconds))+'</b></article>');}
  breakdown='<section class="reading-breakdown"><h3>Today by hour</h3>'+(hourRows.length?hourRows.join(''):'<p class="reading-detail-empty">Your hourly reading activity will appear here as you read today.</p>')+'</section>'+readingSessionsMarkup(sessions,progress);
 }else if(period==='week'){
  const rows=[];for(let i=0;i<7;i++){const date=new Date(weekStart);date.setDate(date.getDate()+i);const a=startOfLocalDay(date),next=new Date(date);next.setDate(next.getDate()+1);const b=Math.min(now.getTime(),next.getTime());const isFuture=a>now.getTime(),part=isFuture?[]:readingRangeSessions(a,b),seconds=readingRangeTotal(part);rows.push('<button type="button" class="reading-breakdown-row reading-breakdown-button" '+(isFuture?'disabled':'data-reading-drill="day" data-range-start="'+a+'" data-range-end="'+b+'"')+'><div><strong>'+escapeBibleHTML(readingDateTitle(date,{weekday:'long'}))+'</strong><span>'+escapeBibleHTML(readingDateTitle(date,{month:'short',day:'numeric'}))+' · '+(isFuture?'Not yet started':part.length+' '+(part.length===1?'session':'sessions'))+'</span></div><b>'+escapeBibleHTML(formatUniversalTime(seconds))+(isFuture?'':' <i>›</i>')+'</b></button>');}
  breakdown='<section class="reading-breakdown"><h3>This week · each day</h3>'+rows.join('')+'</section><p class="reading-period-label">Tap any day to see its hourly activity, books and individual reading sessions.</p>';
 }else{
  const rows=[];let cursor=new Date(now.getFullYear(),now.getMonth(),1),weekNo=1;
  while(cursor.getTime()<=now.getTime()){const a=startOfLocalDay(cursor),next=new Date(cursor);const daysToMonday=7-((cursor.getDay()+6)%7);next.setDate(next.getDate()+daysToMonday);const b=Math.min(startOfLocalDay(next),now.getTime());const part=readingRangeSessions(a,b),seconds=readingRangeTotal(part),endDate=new Date(Math.max(a,b-1));rows.push('<button type="button" class="reading-breakdown-row reading-breakdown-button" data-reading-drill="week" data-range-start="'+a+'" data-range-end="'+b+'"><div><strong>Week '+weekNo+'</strong><span>'+escapeBibleHTML(readingDateTitle(cursor,{month:'short',day:'numeric'}))+' – '+escapeBibleHTML(readingDateTitle(endDate,{month:'short',day:'numeric'}))+' · '+part.length+' '+(part.length===1?'session':'sessions')+'</span></div><b>'+escapeBibleHTML(formatUniversalTime(seconds))+' <i>›</i></b></button>');cursor=next;weekNo++;}
  breakdown='<section class="reading-breakdown"><h3>This month · weekly totals</h3>'+rows.join('')+'</section><p class="reading-period-label">Tap a week to see each day and its reading sessions.</p>';
 }
 content.innerHTML=readingPeriodHeader('Total time read',total,sessions,period==='today'?'Today':period==='week'?'This week':'This month')+breakdown;
 if(overlay.hidden){const y=window.scrollY||window.pageYOffset||0;document.body.style.setProperty('--dwoop-scroll-top',(-y)+'px');document.body.dataset.dwoopScrollY=String(y);document.body.classList.add('dwoop-locked');}overlay.hidden=false;requestAnimationFrame(()=>{if(transitionToken===dwoopTransitionToken)overlay.classList.add('active');});document.getElementById('dwoopClose')?.focus({preventScroll:true});
}
function openReadingDrill(start,end,kind){
 const sessions=readingRangeSessions(start,end),total=readingRangeTotal(sessions),progress=universalProgressItems(),startDate=new Date(start),endDate=new Date(Math.max(start,end-1)),overlay=document.getElementById('dwoopOverlay'),card=overlay?.querySelector('.dwoop-card-expanded');
 if(!overlay||!card)return;
 const title=kind==='day'?readingDateTitle(startDate):readingDateTitle(startDate,{month:'short',day:'numeric'})+' – '+readingDateTitle(endDate,{month:'short',day:'numeric'});
 document.getElementById('dwoopEyebrow').textContent=kind==='day'?'DAILY READING DETAIL':'WEEKLY READING DETAIL';document.getElementById('dwoopTitle').textContent=title;document.getElementById('dwoopIntro').textContent='Detailed breakdown from your local reading history.';
 const content=document.getElementById('dwoopContent');
 let hourly='';
 if(kind==='day'){const rows=[];for(let h=0;h<24;h++){const a=start+h*3600000,b=Math.min(end,a+3600000);if(a>=end)break;const part=readingRangeSessions(a,b),seconds=readingRangeTotal(part);if(seconds)rows.push('<article class="reading-breakdown-row"><div><strong>'+escapeBibleHTML(new Intl.DateTimeFormat(undefined,{hour:'numeric'}).format(new Date(a)))+'</strong><span>'+part.length+' '+(part.length===1?'session':'sessions')+'</span></div><b>'+escapeBibleHTML(formatUniversalTime(seconds))+'</b></article>');}hourly='<section class="reading-breakdown"><h3>Hourly activity</h3>'+(rows.length?rows.join(''):'<p class="reading-detail-empty">No reading activity recorded for this day.</p>')+'</section>';}
 else{const rows=[];for(let t=start;t<end;t+=86400000){const a=t,b=Math.min(end,t+86400000),part=readingRangeSessions(a,b),seconds=readingRangeTotal(part),date=new Date(a);rows.push('<article class="reading-breakdown-row"><div><strong>'+escapeBibleHTML(readingDateTitle(date,{weekday:'long'}))+'</strong><span>'+escapeBibleHTML(readingDateTitle(date,{month:'short',day:'numeric'}))+'</span></div><b>'+escapeBibleHTML(formatUniversalTime(seconds))+'</b></article>');}hourly='<section class="reading-breakdown"><h3>Daily totals</h3>'+rows.join('')+'</section>';}
 content.innerHTML='<button type="button" class="reading-drill-back" data-reading-back>‹ Back to '+(activeReadingPeriod==='today'?'Today':activeReadingPeriod==='week'?'This week':'This month')+'</button>'+readingPeriodHeader('Total time read',total,sessions,kind==='day'?'Daily total':'Weekly total')+hourly+readingSessionsMarkup(sessions,progress);
 card.classList.add('dwoop-light','dwoop-page-card');overlay.classList.add('dwoop-page-mode','dwoop-reading-mode');
}
document.getElementById('dwoopContent')?.addEventListener('click',event=>{const back=event.target.closest('[data-reading-back]');if(back){openReadingPeriod(activeReadingPeriod);return;}const button=event.target.closest('[data-reading-drill]');if(!button||button.disabled)return;openReadingDrill(Number(button.dataset.rangeStart),Number(button.dataset.rangeEnd),button.dataset.readingDrill);});
document.querySelectorAll('[data-reading-period]').forEach(button=>button.addEventListener('click',()=>openReadingPeriod(button.dataset.readingPeriod)));
function renderReadingDashboard(){
 const sessions=universalSessions(),now=new Date(),todayStart=startOfLocalDay(now),weekStart=startOfLocalWeek(now),monthStart=new Date(now.getFullYear(),now.getMonth(),1).getTime();
 const totalSince=start=>sessions.reduce((sum,item)=>sum+universalDurationInRange(item,start,now.getTime()),0);
 const today=totalSince(todayStart),week=totalSince(weekStart),month=totalSince(monthStart);
 const progress=universalProgressItems().sort((a,b)=>(b.lastAccessedTimestamp||0)-(a.lastAccessedTimestamp||0));
 const activeBooks=new Set(sessions.filter(item=>Number(item.durationSeconds)>0&&Number(item.startTime)>=monthStart).map(item=>item.bookId));
 document.getElementById('readingToday').textContent=formatUniversalTime(today);
 document.getElementById('readingWeek').textContent=formatUniversalTime(week);
 document.getElementById('readingMonth').textContent=formatUniversalTime(month);
 document.getElementById('readingSummaryTitle').textContent=progress.length?'You are building a reading rhythm.':'Your reading journey starts here.';
 document.getElementById('readingSummaryDetail').textContent=month?formatUniversalTime(month)+' spent reading this month · '+activeBooks.size+' '+(activeBooks.size===1?'book or Bible book':'books and Bible books')+' opened':'Your reading time will appear here as you read scripture or books.';
 const continueList=document.getElementById('readingContinueList');
 const continueItems=progress.filter(item=>!item.isCompleted).slice(0,2);
 document.getElementById('readingProgressCount').textContent=progress.length+' '+(progress.length===1?'item':'items');
 continueList.innerHTML=continueItems.length?continueItems.map(item=>{
  const percent=Math.round(Math.max(0,Math.min(1,Number(item.completionPercentage)||0))*100);
  const location=item.lastKnownLocation||{};
  const bookMeta=bibleBooks.find(book=>book[0]===String(location.bookCode||'').toUpperCase())||bibleBooks.find(book=>book[1]===String(location.bookName||item.title||''));
  const resume=item.sourceType==='bible'&&bookMeta?'bible:'+encodeURIComponent(bookMeta[0]+':'+(location.chapter||1)+':'+(location.verse||1)):'';
  return '<article class="reading-progress-card"><div class="reading-card-type">'+(item.sourceType==='bible'?'BIBLE':'BOOK')+'</div><h4>'+universalEscape(item.title)+'</h4><p>'+universalEscape(item.subtitle||'Continue where you left off')+'</p><div class="reading-progress-track"><span style="width:'+percent+'%"></span></div><div class="reading-progress-meta"><span>'+universalEscape(item.progressDisplayText||'In progress')+'</span><strong>'+percent+'%</strong></div><button type="button" class="reading-continue-button" '+(resume?'data-reading-resume="'+universalEscape(resume)+'"':'disabled')+'>Continue reading</button></article>';
 }).join(''):'<p class="reading-empty">Your recently read books and Bible passages will appear here. Start reading to build your list.</p>';
 const snippets=readUniversalArray(UNIVERSAL_SNIPPETS_KEY),snippetList=document.getElementById('readingSnippetsList');
 snippetList.innerHTML=snippets.length?snippets.slice(0,8).map(item=>'<article class="reading-snippet"><span>▤</span><div><strong>'+universalEscape(item.title||'Saved snippet')+'</strong><p>'+universalEscape(item.text||'')+'</p></div></article>').join(''):'<p class="reading-empty">Saved articles and reading snippets will appear here when you add them.</p>';
 continueList.querySelectorAll('[data-reading-resume]').forEach(button=>button.addEventListener('click',()=>{const encoded=button.dataset.readingResume.slice(6);let reference='';try{reference=decodeURIComponent(encoded);}catch(error){return;}const [bookCode,chapter,verse]=reference.split(':');const meta=bibleBooks.find(book=>book[0]===bookCode);if(!meta)return;document.getElementById('bibleTestament').value=meta[2];showView('bible',bookCode+':'+(Number(chapter)||1)+':'+(Number(verse)||1),true);}));
}
window.PEDReadingProgress={
 start:config=>startUniversalReading(config||{}),
 update:config=>{if(!activeUniversalSession)return;const current=activeUniversalSession;current.endLocation=config?.location||current.endLocation;universalSaveProgress({bookId:current.bookId,...config,lastKnownLocation:current.endLocation,lastAccessedTimestamp:Date.now()});},
 finish:finishReadingSession,
 saveSnippet:(snippet)=>{const items=readUniversalArray(UNIVERSAL_SNIPPETS_KEY);items.unshift({...snippet,savedAt:Date.now()});writeUniversalArray(UNIVERSAL_SNIPPETS_KEY,items.slice(0,100));}
};
['pointerdown','touchstart','keydown','scroll'].forEach(type=>document.addEventListener(type,universalTouch,{passive:true}));
window.addEventListener('pagehide',finishReadingSession);
document.addEventListener('visibilitychange',()=>{if(document.hidden)finishReadingSession();});
window.setInterval(universalFlushTick,15000);

// Apply direct-link routes only after all reading and navigation state is initialized.
const initialRouteView=new URLSearchParams(window.location.search).get('view');
if(initialRouteView&&['home','episodes','saved','the-show','bible','bible-library','reading-stats','books','explore-bible','fiction-detail','fiction'].includes(initialRouteView)){
 showView(initialRouteView,null,false,{history:'replace'});
}

document.addEventListener('DOMContentLoaded',()=>{loadExploreDailyVisual();});

/* Unified-flow fiction reader: extract all selectable PDF text into one continuous document. */
(()=>{
 const page=document.getElementById('fictionView');
 const pagesRoot=document.getElementById('fictionPdfPages');
 const status=document.getElementById('fictionPdfStatus');
 const back=document.getElementById('fictionPageBack');
 const pdfUrl=new URL("./assets/books/I%20am%20sharing%20%27THE%20BLACK%20MAN%27S%20JESUS%27%20with%20you.pdf",document.baseURI).href;
 if(!page||!pagesRoot||!status)return;
 let documentPromise=null;
 const setStatus=message=>{status.textContent=message;};
 const loadPdfJs=()=>{
  if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
  if(window.__pedTalkPdfJsPromise)return window.__pedTalkPdfJsPromise;
  window.__pedTalkPdfJsPromise=new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
   script.onload=()=>window.pdfjsLib?resolve(window.pdfjsLib):reject(new Error('PDF.js did not initialise'));
   script.onerror=()=>reject(new Error('PDF reader library could not be loaded'));
   document.head.appendChild(script);
  }).catch(error=>{window.__pedTalkPdfJsPromise=null;throw error;});
  return window.__pedTalkPdfJsPromise;
 };
 const extractParagraphs=async(pdfPage)=>{
  const content=await pdfPage.getTextContent();
  const items=(content.items||[]).filter(item=>typeof item.str==='string'&&item.str.trim());
  if(!items.length)return [];
  const lines=[];
  items.forEach(item=>{
   const y=Number(item.transform?.[5]||0);
   let line=lines.find(candidate=>Math.abs(candidate.y-y)<3.2);
   if(!line){line={y,items:[]};lines.push(line);}
   line.items.push(item);
  });
  lines.sort((a,b)=>b.y-a.y);
  const heights=items.map(item=>Number(item.height)||10).filter(value=>value>0).sort((a,b)=>a-b);
  const typicalHeight=heights[Math.floor(heights.length/2)]||10;
  const paragraphs=[];let paragraph='',previousY=null;
  lines.forEach(line=>{
   line.items.sort((a,b)=>(Number(a.transform?.[4])||0)-(Number(b.transform?.[4])||0));
   const lineText=line.items.map(item=>item.str).join(' ').replace(/\\s+/g,' ').trim();
   if(!lineText)return;
   const gap=previousY===null?0:previousY-line.y;
   if(paragraph&&gap>typicalHeight*1.85){paragraph=paragraph.replace(/[-‐‑]$/,'').trim();if(paragraph)paragraphs.push(paragraph);paragraph='';}
   if(paragraph){paragraph+=/[-‐‑]$/.test(paragraph)?lineText:' '+lineText;}else paragraph=lineText;
   previousY=line.y;
  });
  if(paragraph.trim())paragraphs.push(paragraph.trim());
  return paragraphs;
 };
 const appendScanPage=async(pdf,pdfPage,number,article)=>{
  const figure=document.createElement('figure');figure.className='fiction-scan-page';figure.setAttribute('aria-label','Scanned page '+number);
  const width=Math.max(280,Math.min(article.clientWidth||760,1000));
  const base=pdfPage.getViewport({scale:1});
  const scale=Math.min(2.5,Math.max(1.25,width/base.width*(window.devicePixelRatio||1)*1.15));
  const viewport=pdfPage.getViewport({scale});
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Scanned page '+number+' of The Black Man’s Jesus');
  canvas.style.width='100%';canvas.style.height='auto';canvas.style.display='block';
  await pdfPage.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport}).promise;
  figure.appendChild(canvas);article.appendChild(figure);
 };
 const appendParagraph=(article,text)=>{
  const clean=text.trim();if(!clean)return;
  let previous=article.lastElementChild;
  while(previous?.classList?.contains('fiction-unified-page-anchor'))previous=previous.previousElementSibling;
  if(previous?.tagName==='P'){
   const oldText=previous.textContent||'';
   if(/[-‐‑]$/.test(oldText)){previous.textContent=oldText.replace(/[-‐‑]$/,'')+clean;return;}
   if(/^[a-z,;:)]/.test(clean)){previous.textContent=oldText+' '+clean;return;}
  }
  const p=document.createElement('p');p.textContent=clean;article.appendChild(p);
 };
 const prepare=async()=>{
  if(documentPromise)return documentPromise;
  setStatus('Opening the book and preparing its continuous text…');
  documentPromise=(async()=>{
   const pdfjs=await loadPdfJs();
   pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
   const pdf=await pdfjs.getDocument({url:pdfUrl}).promise;
   window.__pedTalkFictionPdf=pdf;
   pagesRoot.replaceChildren();
   const article=document.createElement('article');article.className='fiction-unified-text';
   article.setAttribute('aria-label','The Black Man’s Jesus — continuous reading text');
   pagesRoot.appendChild(article);
   const anchors=[];
   const batchSize=4;
   for(let first=1;first<=pdf.numPages;first+=batchSize){
    const last=Math.min(pdf.numPages,first+batchSize-1);
    const prepared=await Promise.all(Array.from({length:last-first+1},async(_,index)=>{
     const number=first+index;
     const pdfPage=await pdf.getPage(number);
     const paragraphs=await extractParagraphs(pdfPage);
     return {number,pdfPage,paragraphs};
    }));
    for(const item of prepared){
     const anchor=document.createElement('span');anchor.className='fiction-pdf-page fiction-unified-page-anchor';anchor.dataset.page=String(item.number);anchor.setAttribute('aria-label','Source PDF page '+item.number);anchor.id='fiction-source-page-'+item.number;
     article.appendChild(anchor);anchors.push(anchor);
     if(item.paragraphs.length){item.paragraphs.forEach(text=>appendParagraph(article,text));}
     else{await appendScanPage(pdf,item.pdfPage,item.number,article);}
    }
    setStatus('Preparing continuous text · '+last+' of '+pdf.numPages+' source pages');
   }
   if(!article.children.length)setStatus('No readable text was found in this PDF.');
   else setStatus('Your book is ready · '+pdf.numPages+' source pages in one continuous flow.');
   window.dispatchEvent(new Event('pedTalkFictionPdfReady'));
   return pdf;
  })().catch(error=>{
   documentPromise=null;
   pagesRoot.replaceChildren();
   status.textContent='The book could not be loaded. Check your connection and try again.';
   const retry=document.createElement('button');retry.type='button';retry.className='fiction-reader-retry';retry.textContent='Try again';
   retry.addEventListener('click',()=>{documentPromise=null;prepare().catch(()=>{});});status.appendChild(retry);
   console.warn('Fiction book could not be opened in-app',error);throw error;
  });
  return documentPromise;
 };
 fictionDetailView.querySelector('[data-detail-back]')?.addEventListener('click',()=>showView('books'));
 const coverButton=fictionDetailView.querySelector('.fiction-detail-cover-button');
 const coverImage=fictionDetailView.querySelector('.fiction-detail-cover');
 const readButton=fictionDetailView.querySelector('[data-open-fiction-reader]');
 const coverHint=coverButton?.querySelector('.fiction-detail-cover-hint');
 coverImage?.addEventListener('error',()=>{
  coverImage.hidden=true;const frame=coverImage.closest('.fiction-detail-cover-frame');
  if(frame){frame.textContent='THE BLACK MAN’S JESUS';frame.style.padding='10px';frame.style.textAlign='center';frame.style.font='700 10px/1.5 Georgia,serif';frame.style.color='#27382a';}
 });
 coverButton?.addEventListener('click',()=>{
  const description=fictionDetailView.querySelector('#fictionDetailDescription');const reveal=description.hidden;description.hidden=!reveal;
  if(readButton)readButton.hidden=false;coverButton.setAttribute('aria-expanded',String(reveal));
  if(coverHint)coverHint.textContent=reveal?'Book cover · tap to hide summary':'Book cover · tap to show summary';
 });
 readButton?.addEventListener('click',()=>{showView('fiction');prepare().catch(()=>{});});
 document.addEventListener('click',event=>{const trigger=event.target.closest('[data-open-fiction-archive]');if(trigger){event.preventDefault();showView('fiction-detail');}});
 document.addEventListener('keydown',event=>{const trigger=event.target.closest?.('[data-open-fiction-archive]');if(trigger&&(event.key==='Enter'||event.key===' ')){event.preventDefault();showView('fiction-detail');}});
 back?.addEventListener('click',()=>showView('fiction-detail'));
 document.querySelector('#fictionView [data-view="books"]')?.addEventListener('click',()=>showView('books'));
 const observerPage=new MutationObserver(()=>{if(!page.hidden)prepare().catch(()=>{});});
 observerPage.observe(page,{attributes:true,attributeFilter:['hidden']});
 if(!page.hidden)prepare().catch(()=>{});
})();


/* v140 — continuous-scroll reader controls: progress, bookmarks, search and auto-scroll. */
(()=>{
 const page=document.getElementById('fictionView');
 const pagesRoot=document.getElementById('fictionPdfPages');
 const reader=document.querySelector('#fictionView .fiction-pdf-reader');
 if(!page||!pagesRoot||!reader)return;
 const storageKey='pedtalk-fiction-black-mans-jesus-position-v1';
 const bookmarkKey='pedtalk-fiction-black-mans-jesus-bookmark-v1';
 const chrome=document.createElement('div');
 chrome.className='fiction-reader-chrome';
 chrome.innerHTML='<div class="fiction-reader-topbar"><button type="button" data-reader-back aria-label="Back to book details">‹</button><strong>THE BLACK MAN’S JESUS</strong><button type="button" data-reader-font-decrease aria-label="Decrease text size">A−</button><button type="button" data-reader-font-increase aria-label="Increase text size">A+</button><button type="button" data-reader-bookmark aria-label="Save bookmark">☆</button><button type="button" data-reader-search-toggle aria-label="Search in book">⌕</button><button type="button" data-reader-more aria-label="Reader options">⋯</button></div><div class="fiction-reader-search" hidden><input type="search" data-reader-search placeholder="Search this book…" aria-label="Search this book"><button type="button" data-reader-search-go>Find</button><span data-reader-search-status></span></div><div class="fiction-reader-options" hidden><label>Auto-scroll speed <input data-reader-speed type="range" min="1" max="8" value="2"></label><button type="button" data-reader-auto>Start auto-scroll</button><button type="button" data-reader-resume>Resume bookmark</button></div><div class="fiction-reader-bottombar"><button type="button" data-reader-prev aria-label="Previous page">‹</button><span data-reader-percent>0% read</span><input data-reader-progress type="range" min="0" max="1000" value="0" aria-label="Reading progress"><span data-reader-page>Scroll to read</span><button type="button" data-reader-next aria-label="Next page">›</button></div>';
 reader.prepend(chrome);
 const topbar=chrome.querySelector('.fiction-reader-topbar');
 const bottom=chrome.querySelector('.fiction-reader-bottombar');
 const searchPanel=chrome.querySelector('.fiction-reader-search');
 const options=chrome.querySelector('.fiction-reader-options');
 const progress=chrome.querySelector('[data-reader-progress]');
 const percent=chrome.querySelector('[data-reader-percent]');
 const pageLabel=chrome.querySelector('[data-reader-page]');
 const searchInput=chrome.querySelector('[data-reader-search]');
 const searchStatus=chrome.querySelector('[data-reader-search-status]');
 let autoFrame=0,lastFrame=0,autoRunning=false,hideTimer=0,scrollingFromSlider=false;
 const maxScroll=()=>Math.max(1,page.scrollHeight-page.clientHeight);
 const currentPercent=()=>Math.max(0,Math.min(1,page.scrollTop/maxScroll()));
 const update=()=>{
  const value=currentPercent();
  percent.textContent=Math.round(value*100)+'% read';
  if(!scrollingFromSlider)progress.value=String(Math.round(value*1000));
  const pages=pagesRoot.querySelectorAll('.fiction-pdf-page');
  let current=0;
  pages.forEach((el,index)=>{if(el.offsetTop-page.offsetTop<=page.scrollTop+page.clientHeight*.35)current=index+1;});
  pageLabel.textContent=pages.length?(current+' / '+pages.length):'Scroll to read';
  try{localStorage.setItem(storageKey,String(value));}catch(e){}
 };
 const reveal=()=>{page.classList.remove('fiction-chrome-hidden');clearTimeout(hideTimer);hideTimer=setTimeout(()=>page.classList.add('fiction-chrome-hidden'),2600);};
 let readerFontSize=18;
 const applyReaderFont=()=>{pagesRoot.style.setProperty('--fiction-reader-font-size',readerFontSize+'px');};
 try{readerFontSize=Math.max(14,Math.min(28,Number(localStorage.getItem('pedtalk-fiction-reader-font-size'))||18));}catch(e){}
 applyReaderFont();
 chrome.querySelector('[data-reader-font-decrease]').addEventListener('click',()=>{readerFontSize=Math.max(14,readerFontSize-1);applyReaderFont();try{localStorage.setItem('pedtalk-fiction-reader-font-size',String(readerFontSize));}catch(e){}reveal();});
 chrome.querySelector('[data-reader-font-increase]').addEventListener('click',()=>{readerFontSize=Math.min(28,readerFontSize+1);applyReaderFont();try{localStorage.setItem('pedtalk-fiction-reader-font-size',String(readerFontSize));}catch(e){}reveal();});
 const jumpPage=direction=>{const pages=[...pagesRoot.querySelectorAll('.fiction-pdf-page')];if(!pages.length)return;let index=0;pages.forEach((item,i)=>{if(item.offsetTop-page.offsetTop<=page.scrollTop+page.clientHeight*.35)index=i;});const target=pages[Math.max(0,Math.min(pages.length-1,index+direction))];if(target)page.scrollTo({top:Math.max(0,target.offsetTop-page.offsetTop-12),behavior:'smooth'});reveal();};
 chrome.querySelector('[data-reader-prev]').addEventListener('click',()=>jumpPage(-1));
 chrome.querySelector('[data-reader-next]').addEventListener('click',()=>jumpPage(1));
 const stopAuto=()=>{autoRunning=false;cancelAnimationFrame(autoFrame);chrome.querySelector('[data-reader-auto]').textContent='Start auto-scroll';};
 const autoStep=now=>{
  if(!autoRunning)return;
  if(!lastFrame)lastFrame=now;
  const delta=Math.min(40,now-lastFrame);lastFrame=now;
  const speed=Number(chrome.querySelector('[data-reader-speed]').value)||2;
  page.scrollTop+=delta*speed*.035;
  if(page.scrollTop>=maxScroll()-1){stopAuto();return;}
  autoFrame=requestAnimationFrame(autoStep);
 };
 const startAuto=()=>{if(autoRunning){stopAuto();return;}autoRunning=true;lastFrame=0;chrome.querySelector('[data-reader-auto]').textContent='Pause auto-scroll';autoFrame=requestAnimationFrame(autoStep);reveal();};
 chrome.querySelector('[data-reader-back]').addEventListener('click',()=>showView('fiction-detail'));
 chrome.querySelector('[data-reader-bookmark]').addEventListener('click',()=>{
  try{localStorage.setItem(bookmarkKey,String(currentPercent()));chrome.querySelector('[data-reader-bookmark]').textContent='★';}catch(e){}
  reveal();
 });
 chrome.querySelector('[data-reader-search-toggle]').addEventListener('click',()=>{searchPanel.hidden=!searchPanel.hidden;options.hidden=true;if(!searchPanel.hidden)searchInput.focus();reveal();});
 chrome.querySelector('[data-reader-more]').addEventListener('click',()=>{options.hidden=!options.hidden;searchPanel.hidden=true;reveal();});
 chrome.querySelector('[data-reader-auto]').addEventListener('click',startAuto);
 chrome.querySelector('[data-reader-resume]').addEventListener('click',()=>{
  try{const value=Number(localStorage.getItem(bookmarkKey));if(Number.isFinite(value))page.scrollTop=value*maxScroll();}catch(e){}
  reveal();update();
 });
 progress.addEventListener('input',()=>{scrollingFromSlider=true;page.scrollTop=(Number(progress.value)/1000)*maxScroll();scrollingFromSlider=false;update();reveal();});
 page.addEventListener('scroll',()=>{update();if(autoRunning)reveal();},{passive:true});
 page.addEventListener('click',event=>{
  if(event.target.closest('.fiction-reader-chrome,button,a,input'))return;
  if(event.target.closest('.fiction-pdf-page-canvas')){page.classList.toggle('fiction-chrome-hidden');if(!page.classList.contains('fiction-chrome-hidden'))reveal();}
 });
 const runSearch=async()=>{
  const term=searchInput.value.trim().toLowerCase();
  const pdf=window.__pedTalkFictionPdf;
  if(!term){searchStatus.textContent='Enter a word or phrase.';return;}
  if(!pdf){searchStatus.textContent='The book is still loading.';return;}
  searchStatus.textContent='Searching…';
  try{
   for(let n=1;n<=pdf.numPages;n++){
    const content=await (await pdf.getPage(n)).getTextContent();
    const text=content.items.map(item=>item.str||'').join(' ').toLowerCase();
    if(text.includes(term)){
     const target=pagesRoot.querySelectorAll('.fiction-pdf-page')[n-1];
     if(target){page.scrollTo({top:Math.max(0,target.offsetTop-page.offsetTop-18),behavior:'smooth'});searchStatus.textContent='Found on section '+n+'.';reveal();return;}
    }
   }
   searchStatus.textContent='No match found in the book.';
  }catch(e){searchStatus.textContent='Search is unavailable for this PDF.';}
 };
 chrome.querySelector('[data-reader-search-go]').addEventListener('click',runSearch);
 searchInput.addEventListener('keydown',event=>{if(event.key==='Enter')runSearch();});
 window.addEventListener('pedTalkFictionPdfReady',()=>{
  try{const saved=Number(localStorage.getItem(storageKey));if(Number.isFinite(saved)&&saved>0&&saved<1){setTimeout(()=>{page.scrollTop=saved*maxScroll();update();},250);}}catch(e){}
  try{if(localStorage.getItem(bookmarkKey)!==null)chrome.querySelector('[data-reader-bookmark]').textContent='★';}catch(e){}
 });
 update();
})();

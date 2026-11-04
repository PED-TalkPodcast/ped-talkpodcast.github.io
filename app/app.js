/* v87 — install the actual /app PWA, never the brochure website. */
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
 const output=document.getElementById('appUpcomingGraphic');
 if(!output)return;
 try{
  const response=await fetch('../upcoming.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Upcoming schedule unavailable');
  const schedule=await response.json();
  const rows=(Array.isArray(schedule.episodes)?schedule.episodes:[]).slice(0,5);
  upcomingScheduleRows=rows;
  const count=document.getElementById('upcomingCount');
  if(count)count.textContent=rows.length+' upcoming';
  if(!rows.length){output.alt='No upcoming PED-Talk episodes have been announced yet';return;}
  const template=new Image();
  template.onload=()=>{
   try{
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas is unavailable');
    ctx.drawImage(template,0,0,1024,1024);
    const rowY=[379,466,553,640,727];
    const rounded=(x,y,w,h,r)=>{
     ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
     ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
     ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
     ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
    };
    rows.forEach((episode,index)=>{
     const y=rowY[index],tileY=y+4,tileH=65;
     const title=String(episode.title||'UPCOMING EPISODE').toUpperCase();
     rounded(240,y,544,73,37);ctx.fillStyle='#17120f';ctx.fill();
     rounded(240,tileY,544,tileH,33);ctx.fillStyle='#211a15';ctx.fill();
     ctx.lineWidth=2;ctx.strokeStyle='#e9dfce';ctx.stroke();
     ctx.save();rounded(240,tileY,143,tileH,32);ctx.clip();
     ctx.fillStyle='#b8e64f';ctx.fillRect(240,tileY,143,tileH);ctx.restore();
     ctx.fillStyle='#10130c';ctx.font='900 27px Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
     ctx.fillText('EP '+String(Number(episode.number)||index+1).padStart(2,'0'),311,tileY+tileH/2);
     ctx.fillStyle='#fff1dc';ctx.textAlign='left';let size=25;
     ctx.font='900 '+size+'px Arial,sans-serif';
     while(ctx.measureText(title).width>335&&size>15){size--;ctx.font='900 '+size+'px Arial,sans-serif';}
     ctx.fillText(title,414,tileY+tileH/2);
    });
    output.src=canvas.toDataURL('image/jpeg',.94);
    output.alt='PED-Talk upcoming episodes: '+rows.map(e=>'Episode '+e.number+', '+e.title).join('; ');
   }catch(error){console.warn('Schedule artwork could not be updated',error);output.alt='PED-Talk upcoming schedule';}
  };
  template.onerror=()=>{output.alt='PED-Talk schedule artwork unavailable';};
  template.src='../assets/up-next-template.jpg';
 }catch(error){output.alt='PED-Talk upcoming schedule unavailable';console.warn(error);}
}
renderAppUpcoming();
const showcase=document.getElementById('appShowcase');
let dwoopTransitionToken=0;
function openDwoopModal(kind='upcoming'){
 const transitionToken=++dwoopTransitionToken;
 const overlay=document.getElementById('dwoopOverlay'),title=document.getElementById('dwoopTitle'),eyebrow=document.getElementById('dwoopEyebrow'),intro=document.getElementById('dwoopIntro'),content=document.getElementById('dwoopContent');
 if(!overlay||!title||!content)return;
 const activePlayer=overlay.querySelector('.episode-page-audio');if(activePlayer){activePlayer.pause();activePlayer.removeAttribute('src');}
 overlay.querySelector('.dwoop-card-expanded')?.classList.remove('dwoop-light');
 const indicator=document.querySelector('.coming-soon-indicator');if(indicator)indicator.hidden=false;
 const artwork=document.getElementById('dwoopArtwork');if(artwork){artwork.replaceChildren();const source=kind==='upcoming'?document.querySelector('.app-showcase-upcoming .upcoming-artwork'):kind==='anagkazo'?document.querySelector('.app-showcase-anagkazo .anagkazo-artwork'):document.querySelector('.app-showcase-voice img');if(source){const clone=source.cloneNode(true);clone.querySelectorAll?.('[id]').forEach(node=>node.removeAttribute('id'));clone.removeAttribute?.('id');artwork.appendChild(clone);}}
 if(kind==='upcoming'){
  eyebrow.textContent='PED-TALK · COMING UP NEXT';title.textContent='Upcoming episodes';intro.textContent='A look at the conversations being prepared for you.';
  content.innerHTML=upcomingScheduleRows.length?upcomingScheduleRows.map((ep,index)=>'<article class="dwoop-episode"><span class="dwoop-episode-number">EP '+String(Number(ep.number)||index+1).padStart(2,'0')+'</span><div><h3>'+escapeBibleHTML(ep.title||'Upcoming conversation')+'</h3>'+(ep.subtitle?'<p>'+escapeBibleHTML(ep.subtitle)+'</p>':'')+'</div><span class="dwoop-status">COMING SOON</span></article>').join(''):'<p class="dwoop-empty">The next conversations will appear here when they are announced.</p>';
 }else if(kind==='anagkazo'){
  eyebrow.textContent='THE HOUSE BEHIND THE VOICE';title.textContent='ANAGKAZO.';intro.textContent='Christian · Broadcasting · Media';content.innerHTML='<p class="dwoop-feature-copy">Stories that help the world see a brighter day. A growing media house for conversations, creativity and meaningful stories.</p>';
 }else{
  eyebrow.textContent='VOICE OF HEALING';title.textContent='There is power in being heard.';intro.textContent='Stories, sound and stillness for the moments that need a gentler place to land.';content.innerHTML='<p class="dwoop-feature-copy">A space for thoughtful conversations and stories that meet people with care.</p>';
 }
 const overlayWasOpen=!overlay.hidden;
 if(!overlayWasOpen){const scrollY=window.scrollY||window.pageYOffset||0;document.body.style.setProperty('--dwoop-scroll-top',(-scrollY)+'px');document.body.dataset.dwoopScrollY=String(scrollY);document.body.classList.add('dwoop-locked');}
 overlay.querySelector('.dwoop-card-expanded')?.classList.remove('dwoop-page-card','episode-swipe-next','episode-swipe-prev');overlay.classList.remove('dwoop-page-mode','dwoop-reading-mode','dwoop-episode-mode');
 overlay.hidden=false;requestAnimationFrame(()=>{if(transitionToken===dwoopTransitionToken)overlay.classList.add('active');});document.getElementById('dwoopClose')?.focus({preventScroll:true});
}
function closeDwoopModal(){
 const transitionToken=++dwoopTransitionToken;
 const overlay=document.getElementById('dwoopOverlay');if(!overlay||overlay.hidden)return;
 const player=overlay.querySelector('.episode-page-audio');if(player){player.pause();player.removeAttribute('src');}
 overlay.querySelector('.dwoop-card-expanded')?.classList.remove('dwoop-light','dwoop-page-card','episode-swipe-next','episode-swipe-prev');
 overlay.classList.remove('dwoop-page-mode','dwoop-reading-mode','dwoop-episode-mode');
 const indicator=document.querySelector('.coming-soon-indicator');if(indicator)indicator.hidden=false;
 overlay.classList.remove('active');
 const y=Number(document.body.dataset.dwoopScrollY)||0;
 window.setTimeout(()=>{if(transitionToken!==dwoopTransitionToken)return;overlay.hidden=true;document.body.classList.remove('dwoop-locked');document.body.style.removeProperty('--dwoop-scroll-top');delete document.body.dataset.dwoopScrollY;window.scrollTo(0,y);},320);
}
document.getElementById('dwoopClose')?.addEventListener('click',closeDwoopModal);
document.getElementById('dwoopOverlay')?.addEventListener('click',event=>{if(event.target.id==='dwoopOverlay')closeDwoopModal();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.getElementById('dwoopOverlay')?.hidden)closeDwoopModal();});
if(showcase){
 const track=document.getElementById('appShowcaseTrack'),slides=[...track.querySelectorAll('.app-showcase-slide')],slideCount=slides.length;
 slides.forEach(slide=>{slide.tabIndex=0;slide.setAttribute('role','button');slide.setAttribute('aria-haspopup','dialog');});
 let slideIndex=0,slideTimer=null,pointerStart=null,suppressClickUntil=0;
 function stopShowcaseTimer(){if(slideTimer){window.clearTimeout(slideTimer);slideTimer=null;}}
 function scheduleShowcaseAdvance(){stopShowcaseTimer();if(document.hidden||pointerStart||!slideCount)return;slideTimer=window.setTimeout(()=>showShowcaseSlide(slideIndex+1),8000);}
 function showShowcaseSlide(index){if(!slideCount)return;slideIndex=((index%slideCount)+slideCount)%slideCount;track.style.transform='translate3d(-'+(slideIndex*100)+'%,0,0)';slides.forEach((slide,i)=>slide.setAttribute('aria-hidden',i===slideIndex?'false':'true'));scheduleShowcaseAdvance();}
 showcase.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'&&event.button!==0)return;pointerStart={id:event.pointerId,x:event.clientX,y:event.clientY};stopShowcaseTimer();},{passive:true});
 showcase.addEventListener('pointerup',event=>{if(!pointerStart||event.pointerId!==pointerStart.id)return;const dx=event.clientX-pointerStart.x,dy=event.clientY-pointerStart.y;pointerStart=null;if(Math.abs(dx)>42&&Math.abs(dx)>Math.abs(dy)*1.15){suppressClickUntil=Date.now()+500;showShowcaseSlide(slideIndex+(dx<0?1:-1));}else scheduleShowcaseAdvance();},{passive:true});
 showcase.addEventListener('pointercancel',()=>{pointerStart=null;scheduleShowcaseAdvance();},{passive:true});
 showcase.addEventListener('click',event=>{if(Date.now()<suppressClickUntil)return;const slide=event.target.closest('.app-showcase-slide');if(!slide||slides.indexOf(slide)!==slideIndex)return;openDwoopModal(slideIndex===0?'upcoming':slideIndex===1?'anagkazo':'voice');});
 showcase.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.classList.contains('app-showcase-slide')){event.preventDefault();openDwoopModal(slideIndex===0?'upcoming':slideIndex===1?'anagkazo':'voice');}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopShowcaseTimer();else scheduleShowcaseAdvance();});
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
   return '<button type="button" class="episode episode-open-card" data-episode-index="'+index+'" aria-label="Open '+escapeBibleHTML(title)+' episode details"><span class="episode-art"><img loading="lazy" src="'+escapeBibleHTML(ep.image||'../icons/ped-talk-icon.svg')+'" alt=""></span><span class="episode-info"><span class="tag">'+meta+'</span><strong class="episode-card-title">'+escapeBibleHTML(title)+'</strong><span class="episode-card-prompt">'+(ep.audio?'Tap to listen':'Episode details')+' · Open episode</span></span></button>'
  }).join('')+'</div></section>'
 }).join('');
}
let activeEpisodeSequence=[],activeEpisodeIndex=0;
function openEpisodeModal(ep,seasonEpisodes,slideDirection=0){
 const transitionToken=++dwoopTransitionToken;
 const overlay=document.getElementById('dwoopOverlay'),card=overlay?.querySelector('.dwoop-card-expanded');
 if(!overlay||!card||!ep)return;
 const overlayWasOpen=!overlay.hidden;
 const wasOpen=overlayWasOpen&&overlay.classList.contains('dwoop-episode-mode');
 const previousIndex=activeEpisodeIndex;
 activeEpisodeSequence=sortedEpisodes(seasonEpisodes&&seasonEpisodes.length?seasonEpisodes:[ep]);
 activeEpisodeIndex=Math.max(0,activeEpisodeSequence.findIndex(item=>item===ep));
 const direction=slideDirection||(wasOpen&&activeEpisodeIndex!==previousIndex?(activeEpisodeIndex>previousIndex?1:-1):0);
 const title=displayEpisodeTitle(ep),number=episodeNumber(ep),image=ep.image||'../icons/ped-talk-icon.svg';
 const audio=typeof ep.audio==='string'&&/^https:\/\//i.test(ep.audio)?ep.audio:'';
 const link=typeof ep.link==='string'&&/^https:\/\//i.test(ep.link)?ep.link:'';
 const previousAudio=document.querySelector('.episode-page-audio');if(previousAudio){previousAudio.pause();previousAudio.removeAttribute('src');}
 card.classList.add('dwoop-light','dwoop-page-card');overlay.classList.add('dwoop-page-mode','dwoop-episode-mode');
 document.getElementById('dwoopEyebrow').textContent='PED-TALK · SEASON '+episodeSeason(ep);
 document.getElementById('dwoopTitle').textContent=title;
 document.getElementById('dwoopIntro').textContent=(number?'EPISODE '+String(number).padStart(2,'0')+' · ':'')+categoryFor(ep);
 const artwork=document.getElementById('dwoopArtwork');
 if(artwork)artwork.innerHTML='<img class="episode-feature-art" src="'+escapeBibleHTML(image)+'" alt="'+escapeBibleHTML(title)+' artwork">';
 const description=plainText(ep.description),others=activeEpisodeSequence.filter(item=>item!==ep);
 const content=document.getElementById('dwoopContent');
 const player=audio?'<div class="episode-player-window"><audio class="episode-page-audio" preload="none" playsinline src="'+escapeBibleHTML(audio)+'"></audio><button type="button" class="episode-play-button" data-episode-play aria-label="Play episode"><span class="episode-play-symbol">▶</span><span class="episode-play-label">Play episode</span></button><div class="episode-player-meta"><div class="episode-player-track"><span></span></div><div class="episode-player-times"><span data-player-current>0:00</span><span data-player-duration>--:--</span></div></div></div>':'<p class="episode-audio-unavailable">Audio will be available here when it is published.</p>';
 content.innerHTML='<div class="episode-feature-panel">'+(description?'<p class="episode-feature-description">'+escapeBibleHTML(description)+'</p>':'<p class="episode-feature-description">A PED-Talk conversation. Press play when you are ready to listen.</p>')+player+(link?'<a class="episode-detail-link" href="'+escapeBibleHTML(link)+'" target="_blank" rel="noopener">More episode details ↗</a>':'')+'</div>'+(others.length?'<div class="episode-more-heading"><span>CONTINUE EXPLORING</span><strong>More from Season '+episodeSeason(ep)+'</strong></div><div class="episode-more-tiles">'+others.map(item=>'<button type="button" class="episode-more-tile" data-episode-index="'+allEpisodes.indexOf(item)+'"><img src="'+escapeBibleHTML(item.image||'../icons/ped-talk-icon.svg')+'" alt=""><span><small>EPISODE '+String(episodeNumber(item)||'—').padStart(2,'0')+'</small><strong>'+escapeBibleHTML(displayEpisodeTitle(item))+'</strong></span><b aria-hidden="true">›</b></button>').join('')+'</div>':'');
 const audioEl=content.querySelector('.episode-page-audio'),playButton=content.querySelector('[data-episode-play]');
 if(audioEl&&playButton){
  const label=playButton.querySelector('.episode-play-label'),symbol=playButton.querySelector('.episode-play-symbol'),current=content.querySelector('[data-player-current]'),duration=content.querySelector('[data-player-duration]'),track=content.querySelector('.episode-player-track span');
  const clock=value=>{if(!Number.isFinite(value))return'--:--';const m=Math.floor(value/60),s=Math.floor(value%60);return m+':'+String(s).padStart(2,'0');};
  playButton.addEventListener('click',()=>{if(audioEl.paused){const result=audioEl.play();if(result?.catch)result.catch(()=>{label.textContent='Tap to try again';});}else audioEl.pause();});
  audioEl.addEventListener('play',()=>{label.textContent='Pause episode';symbol.textContent='Ⅱ';});
  audioEl.addEventListener('pause',()=>{label.textContent='Play episode';symbol.textContent='▶';});
  audioEl.addEventListener('loadedmetadata',()=>{duration.textContent=clock(audioEl.duration);});
  audioEl.addEventListener('timeupdate',()=>{current.textContent=clock(audioEl.currentTime);track.style.width=(audioEl.duration?audioEl.currentTime/audioEl.duration*100:0)+'%';});
  audioEl.addEventListener('ended',()=>{label.textContent='Play again';symbol.textContent='▶';});
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
// Swipe left for the next episode and right for the previous one.
(()=>{
 const overlay=document.getElementById('dwoopOverlay'),card=overlay?.querySelector('.dwoop-card-expanded');if(!overlay||!card)return;
 let startX=0,startY=0,startTarget=null;
 card.addEventListener('pointerdown',event=>{if(!overlay.classList.contains('dwoop-episode-mode')||event.pointerType==='mouse'&&event.button!==0)return;startX=event.clientX;startY=event.clientY;startTarget=event.target;},{passive:true});
 card.addEventListener('pointerup',event=>{
  if(!startTarget||!overlay.classList.contains('dwoop-episode-mode'))return;
  const dx=event.clientX-startX,dy=event.clientY-startY,target=startTarget;startTarget=null;
  if(target.closest('button,a,audio,input,textarea,select,[data-no-episode-swipe]'))return;
  if(Math.abs(dx)<64||Math.abs(dx)<Math.abs(dy)*1.25)return;
  const nextIndex=activeEpisodeIndex+(dx<0?1:-1);if(nextIndex<0||nextIndex>=activeEpisodeSequence.length)return;
  openEpisodeModal(activeEpisodeSequence[nextIndex],activeEpisodeSequence,dx<0?1:-1);
 },{passive:true});
 card.addEventListener('pointercancel',()=>{startTarget=null;},{passive:true});
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
function render(){renderHomeSeason();renderArchive()}
document.getElementById('archiveFilters').addEventListener('click',event=>{const button=event.target.closest('button[data-category]');if(!button)return;archiveCategory=button.dataset.category;document.querySelectorAll('#archiveFilters .filter').forEach(item=>item.classList.toggle('active',item===button));renderArchive()});
fetch('../episodes.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('Could not load episodes');return response.json()}).then(data=>{allEpisodes=data.episodes||[];render()}).catch(()=>{groupRoot.innerHTML='<p class="empty">Your episode library could not load just now. Please check your connection and try again.</p>';archiveRoot.innerHTML='<p class="empty">The season archive could not load just now. Please try again.</p>'});

const homeView=document.getElementById('homeView');
const episodesView=document.getElementById('episodesView');
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
let viewTransitionToken=0;
function showView(view,reference=null,preserveBible=false){
 const target=['home','episodes','bible','bible-library','reading-stats','books','hope'].includes(view)?view:'home';
 const readingStatsView=document.getElementById('readingStatsView');
 const next=target==='episodes'?episodesView:target==='bible'?bibleView:target==='bible-library'?bibleLibraryView:target==='reading-stats'?readingStatsView:target==='books'?booksView:target==='hope'?hopeModal:homeView;
 if(target!=='bible'&&typeof finishReadingSession==='function')finishReadingSession();
 [homeView,episodesView,bibleView,bibleLibraryView,readingStatsView,booksView].forEach(el=>{if(el){el.hidden=target==='hope'?el!==homeView:el!==next;el.classList.remove('view-enter');}});
 hopeModal.hidden=target!=='hope';
 document.body.classList.remove('modal-open');
 document.querySelectorAll('.bottom-nav [data-view]').forEach(button=>button.classList.toggle('selected',button.dataset.view===(target==='bible-library'?'bible':target)));
 const token=++viewTransitionToken;
 if(target!=='hope')requestAnimationFrame(()=>{if(token!==viewTransitionToken)return;next.classList.remove('view-enter');void next.offsetWidth;next.classList.add('view-enter');window.setTimeout(()=>{if(token===viewTransitionToken)next.classList.remove('view-enter');},420);});
 window.scrollTo({top:0,behavior:'smooth'});
 if(target==='bible'){if(reference)openBibleReference(reference);else if(!preserveBible)resetBibleFlow();}
 if(target==='reading-stats')renderReadingDashboard();
}

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
 if(bibleModeButton){bibleModeButton.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');bibleModeButton.title=dark?'Switch to light mode':'Switch to dark mode';}
 try{localStorage.setItem('ped-talk-bible-mode',mode);}catch(error){}
}
let savedBibleMode='light';try{savedBibleMode=localStorage.getItem('ped-talk-bible-mode')||'light';}catch(error){}
setBibleMode(savedBibleMode==='dark'?'dark':'light');
bibleModeButton?.addEventListener('click',()=>setBibleMode(document.body.classList.contains('bible-dark')?'light':'dark'));
document.querySelectorAll('.bottom-nav [data-view],.bible-home').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();showView(button.dataset.view||'home');}));
document.querySelectorAll('.reading-stats-open,[data-reading-home]').forEach(button=>button.addEventListener('click',()=>showView(button.hasAttribute('data-reading-home')?'home':'reading-stats')));


/* PED-Talk app settings: system, light and dark appearance. */
const APP_THEME_KEY='ped-talk-app-theme';
const appSettingsModal=document.getElementById('appSettingsModal');
const appThemeButtons=[...document.querySelectorAll('[data-app-theme]')];
function systemPrefersDark(){return !!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);}
function applyAppTheme(choice){
 const theme=['system','light','dark'].includes(choice)?choice:'system';
 const effective=theme==='system'?(systemPrefersDark()?'dark':'light'):theme;
 document.body.dataset.appTheme=effective;
 if(typeof setBibleMode==='function')setBibleMode(effective);
 document.body.classList.toggle('app-light',effective==='light');
 document.body.classList.toggle('app-dark',effective==='dark');
 appThemeButtons.forEach(button=>{const active=button.dataset.appTheme===theme;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
 const meta=document.querySelector('meta[name="theme-color"]');
 if(meta)meta.content=effective==='dark'?'#071b31':'#f5f8f5';
 try{localStorage.setItem(APP_THEME_KEY,theme);}catch(error){}
}
let preferredAppTheme='system';try{preferredAppTheme=localStorage.getItem(APP_THEME_KEY)||'system';}catch(error){}
applyAppTheme(preferredAppTheme);
const colorSchemeQuery=window.matchMedia?.('(prefers-color-scheme: dark)');
colorSchemeQuery?.addEventListener?.('change',()=>{let choice='system';try{choice=localStorage.getItem(APP_THEME_KEY)||'system';}catch(error){}if(choice==='system')applyAppTheme('system');});
document.getElementById('appSettingsButton')?.addEventListener('click',()=>{appSettingsModal.hidden=false;document.body.classList.add('settings-open');});
function closeAppSettings(){appSettingsModal.hidden=true;document.body.classList.remove('settings-open');}
document.getElementById('settingsClose')?.addEventListener('click',closeAppSettings);
appSettingsModal?.addEventListener('click',event=>{if(event.target===appSettingsModal)closeAppSettings();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&appSettingsModal&&!appSettingsModal.hidden)closeAppSettings();});
appThemeButtons.forEach(button=>button.addEventListener('click',()=>applyAppTheme(button.dataset.appTheme)));
document.getElementById('subscriptionEntry')?.addEventListener('click',()=>{const note=document.getElementById('subscriptionNotice');if(note){note.hidden=false;note.textContent='PED-Talk subscriptions are being prepared. Membership options will appear here when available.';}});

// Gift of Hope expanded reading tile and community actions.
const hopeModal=document.getElementById('hopeModal');
const giftVerse=document.getElementById('giftVerse');
const giftReference=document.getElementById('giftReference');
function openGiftHope(){
 document.getElementById('modalGiftVerse').textContent=giftVerse.textContent;
 document.getElementById('modalGiftReference').textContent=giftReference.textContent;
 showView('hope');renderHopeComments();
}
const hopeCard=document.querySelector('.hope-card');
hopeCard.setAttribute('tabindex','0');hopeCard.setAttribute('role','button');hopeCard.setAttribute('aria-label','Open Gift of Hope');
hopeCard.addEventListener('click',event=>{if(event.target.closest('a,button'))return;openGiftHope();});
hopeCard.addEventListener('keydown',event=>{if(event.target===hopeCard&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openGiftHope();}});
function closeHope(){showView('home');}
hopeModal.addEventListener('click',event=>{if(event.target===hopeModal)closeHope();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!hopeModal.hidden)closeHope();});
const likeButton=document.getElementById('hopeLike');
const likeKey='pedtalk-gift-hope-liked';
function safeStorageGet(key,fallback=null){try{const value=localStorage.getItem(key);return value===null?fallback:value;}catch(error){return fallback;}}
function safeStorageSet(key,value){try{localStorage.setItem(key,value);return true;}catch(error){return false;}}
function syncHopeLike(){const liked=safeStorageGet(likeKey)==='true';likeButton.setAttribute('aria-pressed',String(liked));likeButton.innerHTML=(liked?'♥':'♡')+' <span>'+(liked?'Liked':'Like')+'</span>';}
likeButton.addEventListener('click',()=>{safeStorageSet(likeKey,likeButton.getAttribute('aria-pressed')!=='true'?'true':'false');syncHopeLike();});
syncHopeLike();
const commentsKey='pedtalk-gift-hope-comments';
function getHopeComments(){try{const parsed=JSON.parse(safeStorageGet(commentsKey,'[]'));return Array.isArray(parsed)?parsed:[];}catch(error){return[];}}
function renderHopeComments(){const list=document.getElementById('hopeCommentList');const comments=getHopeComments();list.innerHTML=comments.length?comments.map(item=>'<article class="hope-comment"><p>'+String(item.text||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))+'</p><small>'+new Date(item.date).toLocaleString()+'</small></article>').join(''):'<p class="empty">Be the first to share a thought.</p>';}
document.getElementById('hopeCommentToggle').addEventListener('click',()=>{const panel=document.getElementById('hopeComments');panel.hidden=!panel.hidden;if(!panel.hidden)renderHopeComments();});
document.getElementById('hopeCommentForm').addEventListener('submit',event=>{event.preventDefault();const input=document.getElementById('hopeCommentInput');const value=input.value.trim();if(!value)return;const comments=getHopeComments();comments.unshift({text:value,date:new Date().toISOString()});if(!safeStorageSet(commentsKey,JSON.stringify(comments.slice(0,100)))){alert('Comments cannot be saved on this device right now.');return;}input.value='';renderHopeComments();});
document.getElementById('hopeShare').addEventListener('click',async()=>{const shareData={title:'PED-Talk · Gift of Hope',text:giftVerse.textContent+' — '+giftReference.textContent,url:location.href};try{if(navigator.share)await navigator.share(shareData);else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(shareData.text+' '+shareData.url);alert('Gift of Hope copied to clipboard.');}else alert(shareData.text+' '+shareData.url);}catch(error){if(error.name!=='AbortError')console.warn('Share was not completed',error);}});

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

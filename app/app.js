const appUpcomingList=document.getElementById('appUpcomingList');
async function renderAppUpcoming(){
 const output=document.getElementById('appUpcomingGraphic');
 if(!output)return;
 try{
  const response=await fetch('../upcoming.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Upcoming schedule unavailable');
  const schedule=await response.json();
  const rows=(Array.isArray(schedule.episodes)?schedule.episodes:[]).slice(0,5);
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
const groupRoot=document.getElementById('episodeGroups');
let allEpisodes=[];let activeCategory='All';
function plainText(html=''){const node=document.createElement('div');node.innerHTML=html;return(node.textContent||'').replace(/\s+/g,' ').trim()}
function categoryFor(ep){const text=(ep.title+' '+plainText(ep.description)).toLowerCase();if(/relationship|marriage|dating|couple|family|partner/.test(text))return'Relationships';if(/friend|friendship|companionship|together/.test(text))return'Friendship';if(/love|loving|beloved|compassion/.test(text))return'Love';return'Leadership'}
function seasonFor(ep){const match=(ep.title||'').match(/S(\d+)E\d+/i);return match?'Season '+parseInt(match[1],10):'Season 1'}
function episodeNumber(ep){const match=(ep.title||'').match(/S\d+E(\d+)/i);return match?parseInt(match[1],10):null}
function episodeSeason(ep){const match=(ep.title||'').match(/S(\d+)E\d+/i);return match?parseInt(match[1],10):null}
function displayEpisodeTitle(ep){const title=(ep.title||'').trim();if(/^S\d+E\d+$/i.test(title)){const n=episodeNumber(ep);const known={3:'Character Becomes Destiny',4:'Mistakes Are Inevitable',5:'Discussion: Lilian & Dave'};return known[n]||'PED-Talk Conversation'}return title}
function render(){
 const filtered=allEpisodes.filter(ep=>activeCategory==='All'||categoryFor(ep)===activeCategory);
 if(!filtered.length){groupRoot.innerHTML='<p class="empty">No episodes in this category yet. More conversations are on the way.</p>';return}
 const groups={};filtered.forEach(ep=>(groups[seasonFor(ep)]??=[]).push(ep));
 groupRoot.innerHTML=Object.entries(groups).map(([season,eps])=>{
  const seasonNum=episodeSeason(eps[0])||1;
  const seasonLabel='SEASON '+String(seasonNum).padStart(2,'0');
  return '<section class="season"><div class="season-heading"><div><p class="eyebrow">'+seasonLabel+'</p><h3 class="season-title">'+season+'</h3></div><span class="season-count">'+eps.length+' conversations</span></div><div class="episode-grid">'+eps.map(ep=>{
   const number=episodeNumber(ep),desc=plainText(ep.description),title=displayEpisodeTitle(ep);
   const meta=(number?'EPISODE '+String(number).padStart(2,'0')+' · ':'')+categoryFor(ep).toUpperCase();
   return '<article class="episode"><div class="episode-art"><img loading="lazy" src="'+(ep.image||'../icons/ped-talk-icon.svg')+'" alt=""></div><div class="episode-info"><p class="tag">'+meta+'</p><h3>'+title+'</h3><p class="desc">'+desc+'</p>'+(ep.audio?'<audio controls preload="none" src="'+ep.audio+'"></audio>':'')+(ep.link?'<a class="episode-more" href="'+ep.link+'" target="_blank" rel="noopener">Episode details ↗</a>':'')+'</div></article>'
  }).join('')+'</div></section>'
 }).join('')+'<section class="playlist-coming"><p class="eyebrow">ANAGKAZO MEDIA</p><h3>More conversations, beyond episodes.</h3><p>Curated Anagkazo Media playlists are being prepared and will appear here soon.</p><span>PLAYLISTS · COMING SOON</span></section>'
}
document.getElementById('filters').addEventListener('click',event=>{const button=event.target.closest('button[data-category]');if(!button)return;activeCategory=button.dataset.category;document.querySelectorAll('.filter').forEach(item=>item.classList.toggle('active',item===button));render()});
fetch('../episodes.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('Could not load episodes');return response.json()}).then(data=>{allEpisodes=data.episodes||[];render()}).catch(()=>{groupRoot.innerHTML='<p class="empty">Your episode library could not load just now. Please check your connection and try again.</p>'});

const homeView=document.getElementById('homeView');
const bibleView=document.getElementById('bibleView');
const bibleBooks=[
["GEN","Genesis","OT"],["EXO","Exodus","OT"],["LEV","Leviticus","OT"],["NUM","Numbers","OT"],["DEU","Deuteronomy","OT"],["JOS","Joshua","OT"],["JDG","Judges","OT"],["RUT","Ruth","OT"],["1SA","1 Samuel","OT"],["2SA","2 Samuel","OT"],["1KI","1 Kings","OT"],["2KI","2 Kings","OT"],["1CH","1 Chronicles","OT"],["2CH","2 Chronicles","OT"],["EZR","Ezra","OT"],["NEH","Nehemiah","OT"],["EST","Esther","OT"],["JOB","Job","OT"],["PSA","Psalms","OT"],["PRO","Proverbs","OT"],["ECC","Ecclesiastes","OT"],["SNG","Song of Solomon","OT"],["ISA","Isaiah","OT"],["JER","Jeremiah","OT"],["LAM","Lamentations","OT"],["EZK","Ezekiel","OT"],["DAN","Daniel","OT"],["HOS","Hosea","OT"],["JOL","Joel","OT"],["AMO","Amos","OT"],["OBA","Obadiah","OT"],["JON","Jonah","OT"],["MIC","Micah","OT"],["NAM","Nahum","OT"],["HAB","Habakkuk","OT"],["ZEP","Zephaniah","OT"],["HAG","Haggai","OT"],["ZEC","Zechariah","OT"],["MAL","Malachi","OT"],["MAT","Matthew","NT"],["MRK","Mark","NT"],["LUK","Luke","NT"],["JHN","John","NT"],["ACT","Acts","NT"],["ROM","Romans","NT"],["1CO","1 Corinthians","NT"],["2CO","2 Corinthians","NT"],["GAL","Galatians","NT"],["EPH","Ephesians","NT"],["PHP","Philippians","NT"],["COL","Colossians","NT"],["1TH","1 Thessalonians","NT"],["2TH","2 Thessalonians","NT"],["1TI","1 Timothy","NT"],["2TI","2 Timothy","NT"],["TIT","Titus","NT"],["PHM","Philemon","NT"],["HEB","Hebrews","NT"],["JAS","James","NT"],["1PE","1 Peter","NT"],["2PE","2 Peter","NT"],["1JN","1 John","NT"],["2JN","2 John","NT"],["3JN","3 John","NT"],["JUD","Jude","NT"],["REV","Revelation","NT"]];
const bibleFileByCode={"GEN":"Gen","EXO":"Exod","LEV":"Lev","NUM":"Num","DEU":"Deut","JOS":"Josh","JDG":"Judg","RUT":"Ruth","1SA":"1Sam","2SA":"2Sam","1KI":"1Kgs","2KI":"2Kgs","1CH":"1Chr","2CH":"2Chr","EZR":"Ezra","NEH":"Neh","EST":"Esth","JOB":"Job","PSA":"Ps","PRO":"Prov","ECC":"Eccl","SNG":"Song","ISA":"Isa","JER":"Jer","LAM":"Lam","EZK":"Ezek","DAN":"Dan","HOS":"Hos","JOL":"Joel","AMO":"Amos","OBA":"Obad","JON":"Jonah","MIC":"Mic","NAM":"Nah","HAB":"Hab","ZEP":"Zeph","HAG":"Hag","ZEC":"Zech","MAL":"Mal","MAT":"Matt","MRK":"Mark","LUK":"Luke","JHN":"John","ACT":"Acts","ROM":"Rom","1CO":"1Cor","2CO":"2Cor","GAL":"Gal","EPH":"Eph","PHP":"Phil","COL":"Col","1TH":"1Thess","2TH":"2Thess","1TI":"1Tim","2TI":"2Tim","TIT":"Titus","PHM":"Phlm","HEB":"Heb","JAS":"Jas","1PE":"1Pet","2PE":"2Pet","1JN":"1John","2JN":"2John","3JN":"3John","JUD":"Jude","REV":"Rev"};
let activeBibleBook=null, activeBibleChapter=1, activeBibleData=null, bibleCache={};
function bibleVerseNumber(verse,index){return verse?.number??verse?.verse??verse?.id??index+1;}
function bibleVerseText(verse){const value=verse?.text??verse?.content??verse?.value??verse?.verseText??'';return typeof value==='string'?value:String(value??'');}
const bibleBookSelect=document.getElementById('bibleBook');
const bibleChapterSelect=document.getElementById('bibleChapter');
function fillBibleBooks(){const testament=document.getElementById('bibleTestament').value;const list=bibleBooks.filter(b=>b[2]===testament);bibleBookSelect.innerHTML=list.map(b=>'<option value="'+b[0]+'">'+b[1]+'</option>').join('');if(!list.some(b=>b[0]===activeBibleBook))activeBibleBook=list[0][0];bibleBookSelect.value=activeBibleBook;}
function fillBibleChapters(){if(!activeBibleData)return;bibleChapterSelect.innerHTML=activeBibleData.chapters.map(ch=>'<option value="'+ch.chapter+'">Chapter '+ch.chapter+'</option>').join('');bibleChapterSelect.value=String(activeBibleChapter);}
async function loadBibleBook(code,chapter=1,verseToFocus=null){const meta=bibleBooks.find(b=>b[0]===code);if(!meta)return;activeBibleBook=code;activeBibleChapter=chapter;document.getElementById('bibleTitle').textContent='Loading '+meta[1]+'…';document.getElementById('bibleVerses').innerHTML='<p class="loading">Preparing scripture…</p>';try{if(!bibleCache[code]){const response=await fetch('../data/web/books/'+encodeURIComponent(bibleFileByCode[meta[0]])+'.json',{cache:'no-store'});if(!response.ok)throw new Error('Book not available');bibleCache[code]=await response.json();}activeBibleData=bibleCache[code];fillBibleChapters();const chapterData=activeBibleData.chapters.find(ch=>ch.chapter===Number(chapter))||activeBibleData.chapters[0];activeBibleChapter=chapterData.chapter;bibleChapterSelect.value=String(activeBibleChapter);document.getElementById('bibleTitle').textContent=meta[1]+' '+activeBibleChapter;document.getElementById('biblePosition').textContent='Chapter '+activeBibleChapter+' of '+activeBibleData.chapters.length;document.getElementById('biblePrev').disabled=activeBibleChapter===1;document.getElementById('bibleNext').disabled=activeBibleChapter===activeBibleData.chapters.length;if(!Array.isArray(chapterData.verses))throw new Error('This chapter has no readable verse list');
document.getElementById('bibleVerses').innerHTML=chapterData.verses.map((v,index)=>{const number=bibleVerseNumber(v,index);const text=bibleVerseText(v);return '<div class="bible-verse" id="bible-verse-'+number+'"><span>'+number+'</span><p>'+text+'</p></div>';}).join('');if(verseToFocus){setTimeout(()=>document.getElementById('bible-verse-'+verseToFocus)?.scrollIntoView({behavior:'smooth',block:'center'}),100);}}catch(error){document.getElementById('bibleTitle').textContent=meta[1]+' unavailable';document.getElementById('bibleVerses').innerHTML='<p class="loading">This book could not load. Please check your connection and try again.</p>';console.error(error);}}
const booksView=document.getElementById('booksView');
let viewTransitionToken=0;
function showView(view,reference=null){
 const target=['home','episodes','bible','books','hope'].includes(view)?view:'home';
 const previous=[homeView,bibleView,booksView,hopeModal].find(el=>!el.hidden);
 const next=target==='bible'?bibleView:target==='books'?booksView:target==='hope'?hopeModal:homeView;
 [homeView,bibleView,booksView,hopeModal].forEach(el=>{el.hidden=el!==next;el.classList.remove('view-enter');});
 document.body.classList.remove('modal-open');
 document.querySelectorAll('.bottom-nav [data-view]').forEach(button=>button.classList.toggle('selected',button.dataset.view===target||(target==='episodes'&&button.dataset.view==='episodes')));
 const token=++viewTransitionToken;
 requestAnimationFrame(()=>{
  if(token!==viewTransitionToken)return;
  next.classList.remove('view-enter');
  void next.offsetWidth;
  next.classList.add('view-enter');
  window.setTimeout(()=>{if(token===viewTransitionToken)next.classList.remove('view-enter');},420);
 });
 if(target==='episodes'){
  requestAnimationFrame(()=>document.getElementById('episodes').scrollIntoView({behavior:'smooth',block:'start'}));
 }else{
  window.scrollTo({top:0,behavior:'smooth'});
 }
 if(target==='bible'){
  const parts=reference?reference.split(':'):[];
  const bookName=parts[0]||activeBibleBook||'John';
  const meta=bibleBooks.find(book=>book[0]===bookName||book[1].toLowerCase()===bookName.toLowerCase());
  const code=meta?meta[0]:'JHN';
  const chapter=Math.max(1,Number(parts[1]||activeBibleChapter||1));
  const verse=parts[2]?Number(parts[2]):null;
  document.getElementById('bibleTestament').value=(bibleBooks.find(book=>book[0]===code)||bibleBooks[0])[2];
  fillBibleBooks();bibleBookSelect.value=code;loadBibleBook(code,chapter,verse);
 }
}
document.querySelectorAll('[data-open-bible]').forEach(button=>button.addEventListener('click',()=>showView('bible',button.dataset.openBible)));
document.getElementById('bibleTestament').addEventListener('change',()=>{fillBibleBooks();loadBibleBook(bibleBookSelect.value,1);});
bibleBookSelect.addEventListener('change',()=>loadBibleBook(bibleBookSelect.value,1));
bibleChapterSelect.addEventListener('change',()=>loadBibleBook(activeBibleBook,Number(bibleChapterSelect.value)));
document.getElementById('biblePrev').addEventListener('click',()=>loadBibleBook(activeBibleBook,activeBibleChapter-1));
document.getElementById('bibleNext').addEventListener('click',()=>loadBibleBook(activeBibleBook,activeBibleChapter+1));
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
 if(ref){
  out.hidden=false;out.textContent='Opening '+ref.meta[1]+' '+ref.chapter+(ref.verse?':'+ref.verse:'')+'…';
  document.getElementById('bibleTestament').value=ref.meta[2];fillBibleBooks();bibleBookSelect.value=ref.meta[0];
  await loadBibleBook(ref.meta[0],ref.chapter,ref.verse);return;
 }
 const needle=normalizeBibleText(q);if(needle.length<2){out.hidden=false;out.textContent='Enter at least two letters to search the Bible.';return;}
 out.hidden=false;out.textContent='Searching all 66 books…';
 try{
  const books=await Promise.all(bibleBooks.map(async meta=>{
   if(!bibleCache[meta[0]]){
    const response=await fetch('../data/web/books/'+encodeURIComponent(bibleFileByCode[meta[0]])+'.json');
    if(!response.ok)throw new Error('Could not load '+meta[1]);
    bibleCache[meta[0]]=await response.json();
   }
   return {meta,data:bibleCache[meta[0]]};
  }));
  const hits=[];
  for(const book of books){
   for(const chapter of book.data.chapters){
    for(let verseIndex=0;verseIndex<chapter.verses.length;verseIndex++){const verse=chapter.verses[verseIndex];
     const verseText=bibleVerseText(verse);if(normalizeBibleText(verseText).includes(needle)){hits.push({meta:book.meta,chapter:chapter.chapter,verse:bibleVerseNumber(verse,verseIndex),text:verseText});if(hits.length>=40)break;}
    }
    if(hits.length>=40)break;
   }
   if(hits.length>=40)break;
  }
  out.innerHTML=hits.length?'<strong>'+hits.length+(hits.length===40?'+':'')+' matching verses</strong>'+hits.map(hit=>'<button type="button" data-ref="'+hit.meta[0]+':'+hit.chapter+':'+hit.verse+'"><b>'+hit.meta[1]+' '+hit.chapter+':'+hit.verse+'</b><span>'+hit.text+'</span></button>').join(''):'No matches found. Try a different word or phrase.';
  out.querySelectorAll('[data-ref]').forEach(btn=>btn.addEventListener('click',()=>{
   const parts=btn.dataset.ref.split(':');const meta=bibleBooks.find(b=>b[0]===parts[0]);
   document.getElementById('bibleTestament').value=meta[2];fillBibleBooks();bibleBookSelect.value=meta[0];
   loadBibleBook(meta[0],Number(parts[1]),Number(parts[2]));
  }));
 }catch(error){out.textContent='Search could not finish. Please check your connection and try again.';console.error(error);}
}
document.getElementById('bibleSearchButton').addEventListener('click',searchInBible);
document.getElementById('bibleSearch').addEventListener('keydown',event=>{if(event.key==='Enter')searchInBible();});
fillBibleBooks();loadBibleBook('JHN',3,16);
document.querySelectorAll('.bottom-nav [data-view],.bible-home').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();showView(button.dataset.view||'home');}));

// Gift of Hope expanded reading tile and community actions.
const hopeModal=document.getElementById('hopeModal');
const giftVerse=document.getElementById('giftVerse');
const giftReference=document.getElementById('giftReference');
document.getElementById('openHope').addEventListener('click',()=>{
 document.getElementById('modalGiftVerse').textContent=giftVerse.textContent;
 document.getElementById('modalGiftReference').textContent=giftReference.textContent;
 showView('hope');renderHopeComments();
});
const hopeCard=document.querySelector('.hope-card');
hopeCard.setAttribute('tabindex','0');hopeCard.setAttribute('role','button');hopeCard.setAttribute('aria-label','Open Gift of Hope');
hopeCard.addEventListener('click',event=>{if(event.target.closest('button,a'))return;document.getElementById('openHope').click();});
hopeCard.addEventListener('keydown',event=>{if(event.target===hopeCard&&(event.key==='Enter'||event.key===' ')){event.preventDefault();document.getElementById('openHope').click();}});
function closeHope(){showView('home');}
document.getElementById('closeHope').addEventListener('click',closeHope);
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

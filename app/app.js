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
const showcase=document.getElementById('appShowcase');
if(showcase){
 const track=document.getElementById('appShowcaseTrack');
 let slideIndex=0,slideTimer=null,touchStart=0;
 function showShowcaseSlide(index){
  slideIndex=(index+3)%3;
  track.style.transform='translateX(-'+(slideIndex*100)+'%)';
  window.clearInterval(slideTimer);
  slideTimer=window.setInterval(()=>showShowcaseSlide(slideIndex+1),8000);
 }
 showcase.addEventListener('touchstart',event=>{touchStart=event.changedTouches[0].clientX;window.clearInterval(slideTimer);},{passive:true});
 showcase.addEventListener('touchend',event=>{const delta=event.changedTouches[0].clientX-touchStart;if(Math.abs(delta)>40)showShowcaseSlide(slideIndex+(delta<0?1:-1));else showShowcaseSlide(slideIndex);},{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)window.clearInterval(slideTimer);else showShowcaseSlide(slideIndex);});
 showShowcaseSlide(0);
}
const groupRoot=document.getElementById('episodeGroups');
const archiveRoot=document.getElementById('archiveEpisodeGroups');
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
   const number=episodeNumber(ep),desc=plainText(ep.description),title=displayEpisodeTitle(ep);
   const meta=(number?'EPISODE '+String(number).padStart(2,'0')+' · ':'')+categoryFor(ep).toUpperCase();
   return '<article class="episode"><div class="episode-art"><img loading="lazy" src="'+(ep.image||'../icons/ped-talk-icon.svg')+'" alt=""></div><div class="episode-info"><p class="tag">'+meta+'</p><h3>'+title+'</h3><p class="desc">'+desc+'</p>'+(ep.audio?'<audio controls preload="none" src="'+ep.audio+'"></audio>':'')+(ep.link?'<a class="episode-more" href="'+ep.link+'" target="_blank" rel="noopener">Episode details ↗</a>':'')+'</div></article>'
  }).join('')+'</div></section>'
 }).join('');
}
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
 const target=['home','episodes','bible','bible-library','books','hope'].includes(view)?view:'home';
 const next=target==='episodes'?episodesView:target==='bible'?bibleView:target==='bible-library'?bibleLibraryView:target==='books'?booksView:target==='hope'?hopeModal:homeView;
 [homeView,episodesView,bibleView,bibleLibraryView,booksView,hopeModal].forEach(el=>{el.hidden=el!==next;el.classList.remove('view-enter');});
 document.body.classList.remove('modal-open');
 document.querySelectorAll('.bottom-nav [data-view]').forEach(button=>button.classList.toggle('selected',button.dataset.view===(target==='bible-library'?'bible':target)));
 const token=++viewTransitionToken;
 requestAnimationFrame(()=>{if(token!==viewTransitionToken)return;next.classList.remove('view-enter');void next.offsetWidth;next.classList.add('view-enter');window.setTimeout(()=>{if(token===viewTransitionToken)next.classList.remove('view-enter');},420);});
 window.scrollTo({top:0,behavior:'smooth'});
 if(target==='bible'){if(reference)openBibleReference(reference);else if(!preserveBible)resetBibleFlow();}
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
document.getElementById('bibleLibraryBack')?.addEventListener('click',()=>showView('bible',null,true));
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
 showView('bible',null,true);loadBibleBook(item.book,item.chapter,item.verse,true);
});
bibleSavedList?.addEventListener('click',event=>{
 const remove=event.target.closest('[data-delete-saved-scripture]');
 if(remove){writeBibleCollection(BIBLE_SAVED_SCRIPTURES_KEY,getSavedBibleScriptures().filter(item=>item.id!==remove.dataset.deleteSavedScripture));renderSavedBibleScriptures();return;}
 const open=event.target.closest('[data-open-saved-scripture]');if(!open)return;
 const item=getSavedBibleScriptures().find(saved=>saved.id===open.dataset.openSavedScripture);if(!item)return;
 showView('bible',null,true);loadBibleBook(item.book,item.chapter,item.verse,true);
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

const groupRoot=document.getElementById('episodeGroups');
let allEpisodes=[];let activeCategory='All';
function plainText(html=''){const node=document.createElement('div');node.innerHTML=html;return(node.textContent||'').replace(/\s+/g,' ').trim()}
function categoryFor(ep){const text=(ep.title+' '+plainText(ep.description)).toLowerCase();if(/relationship|marriage|dating|couple|family|partner/.test(text))return'Relationships';if(/friend|friendship|companionship|together/.test(text))return'Friendship';if(/love|loving|beloved|compassion/.test(text))return'Love';return'Leadership'}
function seasonFor(ep){const match=(ep.title||'').match(/S(\d+)E\d+/i);return match?'Season '+parseInt(match[1],10):'More conversations'}
function render(){const filtered=allEpisodes.filter(ep=>activeCategory==='All'||categoryFor(ep)===activeCategory);if(!filtered.length){groupRoot.innerHTML='<p class="empty">No episodes in this category yet. More conversations are on the way.</p>';return}const groups={};filtered.forEach(ep=>(groups[seasonFor(ep)]??=[]).push(ep));groupRoot.innerHTML=Object.entries(groups).map(([season,eps])=>'<section class="season"><h3 class="season-title">'+season+'</h3><div class="episode-grid">'+eps.map(ep=>'<article class="episode"><img loading="lazy" src="'+(ep.image||'../icons/ped-talk-icon.svg')+'" alt=""><p class="tag">'+categoryFor(ep)+'</p><h3>'+plainText(ep.title)+'</h3><p class="desc">'+plainText(ep.description)+'</p>'+(ep.audio?'<audio controls preload="none" src="'+ep.audio+'"></audio>':'')+'</article>').join('')+'</div></section>').join('')}
document.getElementById('filters').addEventListener('click',event=>{const button=event.target.closest('button[data-category]');if(!button)return;activeCategory=button.dataset.category;document.querySelectorAll('.filter').forEach(item=>item.classList.toggle('active',item===button));render()});
fetch('../episodes.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('Could not load episodes');return response.json()}).then(data=>{allEpisodes=data.episodes||[];render()}).catch(()=>{groupRoot.innerHTML='<p class="empty">Your episode library could not load just now. Please check your connection and try again.</p>'});

const homeView=document.getElementById('homeView');
const bibleView=document.getElementById('bibleView');
const bibleBooks=[
["GEN","Genesis","OT"],["EXO","Exodus","OT"],["LEV","Leviticus","OT"],["NUM","Numbers","OT"],["DEU","Deuteronomy","OT"],["JOS","Joshua","OT"],["JDG","Judges","OT"],["RUT","Ruth","OT"],["1SA","1 Samuel","OT"],["2SA","2 Samuel","OT"],["1KI","1 Kings","OT"],["2KI","2 Kings","OT"],["1CH","1 Chronicles","OT"],["2CH","2 Chronicles","OT"],["EZR","Ezra","OT"],["NEH","Nehemiah","OT"],["EST","Esther","OT"],["JOB","Job","OT"],["PSA","Psalms","OT"],["PRO","Proverbs","OT"],["ECC","Ecclesiastes","OT"],["SNG","Song of Solomon","OT"],["ISA","Isaiah","OT"],["JER","Jeremiah","OT"],["LAM","Lamentations","OT"],["EZK","Ezekiel","OT"],["DAN","Daniel","OT"],["HOS","Hosea","OT"],["JOL","Joel","OT"],["AMO","Amos","OT"],["OBA","Obadiah","OT"],["JON","Jonah","OT"],["MIC","Micah","OT"],["NAM","Nahum","OT"],["HAB","Habakkuk","OT"],["ZEP","Zephaniah","OT"],["HAG","Haggai","OT"],["ZEC","Zechariah","OT"],["MAL","Malachi","OT"],["MAT","Matthew","NT"],["MRK","Mark","NT"],["LUK","Luke","NT"],["JHN","John","NT"],["ACT","Acts","NT"],["ROM","Romans","NT"],["1CO","1 Corinthians","NT"],["2CO","2 Corinthians","NT"],["GAL","Galatians","NT"],["EPH","Ephesians","NT"],["PHP","Philippians","NT"],["COL","Colossians","NT"],["1TH","1 Thessalonians","NT"],["2TH","2 Thessalonians","NT"],["1TI","1 Timothy","NT"],["2TI","2 Timothy","NT"],["TIT","Titus","NT"],["PHM","Philemon","NT"],["HEB","Hebrews","NT"],["JAS","James","NT"],["1PE","1 Peter","NT"],["2PE","2 Peter","NT"],["1JN","1 John","NT"],["2JN","2 John","NT"],["3JN","3 John","NT"],["JUD","Jude","NT"],["REV","Revelation","NT"]];
let activeBibleBook=null, activeBibleChapter=1, activeBibleData=null, bibleCache={};
const bibleBookSelect=document.getElementById('bibleBook');
const bibleChapterSelect=document.getElementById('bibleChapter');
function fillBibleBooks(){const testament=document.getElementById('bibleTestament').value;const list=bibleBooks.filter(b=>b[2]===testament);bibleBookSelect.innerHTML=list.map(b=>'<option value="'+b[0]+'">'+b[1]+'</option>').join('');if(!list.some(b=>b[0]===activeBibleBook))activeBibleBook=list[0][0];bibleBookSelect.value=activeBibleBook;}
function fillBibleChapters(){if(!activeBibleData)return;bibleChapterSelect.innerHTML=activeBibleData.chapters.map(ch=>'<option value="'+ch.number+'">Chapter '+ch.number+'</option>').join('');bibleChapterSelect.value=String(activeBibleChapter);}
async function loadBibleBook(code,chapter=1,verseToFocus=null){const meta=bibleBooks.find(b=>b[0]===code);if(!meta)return;activeBibleBook=code;activeBibleChapter=chapter;document.getElementById('bibleTitle').textContent='Loading '+meta[1]+'…';document.getElementById('bibleVerses').innerHTML='<p class="loading">Preparing scripture…</p>';try{if(!bibleCache[code]){const response=await fetch('../data/web-bible/'+code+'.json');if(!response.ok)throw new Error('Book not available');bibleCache[code]=await response.json();}activeBibleData=bibleCache[code];fillBibleChapters();const chapterData=activeBibleData.chapters.find(ch=>ch.number===Number(chapter))||activeBibleData.chapters[0];activeBibleChapter=chapterData.chapter;bibleChapterSelect.value=String(activeBibleChapter);document.getElementById('bibleTitle').textContent=meta[1]+' '+activeBibleChapter;document.getElementById('biblePosition').textContent='Chapter '+activeBibleChapter+' of '+activeBibleData.chapters.length;document.getElementById('biblePrev').disabled=activeBibleChapter===1;document.getElementById('bibleNext').disabled=activeBibleChapter===activeBibleData.chapterCount;document.getElementById('bibleVerses').innerHTML=chapterData.verses.map(v=>'<div class="bible-verse" id="bible-verse-'+v.verse+'"><span>'+v.verse+'</span><p>'+v.text+'</p></div>').join('');if(verseToFocus){setTimeout(()=>document.getElementById('bible-verse-'+verseToFocus)?.scrollIntoView({behavior:'smooth',block:'center'}),100);}}catch(error){document.getElementById('bibleTitle').textContent=meta[1]+' unavailable';document.getElementById('bibleVerses').innerHTML='<p class="loading">This book could not load. Please check your connection and try again.</p>';console.error(error);}}
function showView(view,reference=null){homeView.hidden=view==='bible';bibleView.hidden=view!=='bible';document.querySelectorAll('.bottom-nav button').forEach(button=>button.classList.toggle('selected',button.dataset.view===view));if(view==='episodes'){homeView.hidden=false;setTimeout(()=>document.getElementById('episodes').scrollIntoView({behavior:'smooth'}),20);}else if(view==='home'){window.scrollTo({top:0,behavior:'smooth'});}else if(view==='bible'){window.scrollTo({top:0,behavior:'smooth'});const parts=reference?reference.split(':'):[];const bookName=parts[0]||activeBibleBook||'John';const meta=bibleBooks.find(b=>b[0]===bookName||b[1].toLowerCase()===bookName.toLowerCase());const code=meta?meta[0]:'JHN';const chapter=Number(parts[1]||activeBibleChapter||1);const verse=parts[2]?Number(parts[2]):null;const testament=document.getElementById('bibleTestament');testament.value=(bibleBooks.find(b=>b[0]===code)||bibleBooks[0])[2];fillBibleBooks();bibleBookSelect.value=code;loadBibleBook(code,chapter,verse);}}
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
    const response=await fetch('../data/web/books/'+encodeURIComponent(meta[1])+'.json');
    if(!response.ok)throw new Error('Could not load '+meta[1]);
    bibleCache[meta[0]]=await response.json();
   }
   return {meta,data:bibleCache[meta[0]]};
  }));
  const hits=[];
  for(const book of books){
   for(const chapter of book.data.chapters){
    for(const verse of chapter.verses){
     if(normalizeBibleText(verse.text).includes(needle)){hits.push({meta:book.meta,chapter:chapter.chapter,verse:verse.number,text:verse.text});if(hits.length>=40)break;}
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
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.view)));

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('../service-worker.js').catch(()=>{}));}

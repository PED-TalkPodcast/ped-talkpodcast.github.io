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
const bibleFrame=document.getElementById('bibleFrame');
function showView(view){
  homeView.hidden=view==='bible';
  bibleView.hidden=view!=='bible';
  document.querySelectorAll('.bottom-nav button').forEach(button=>button.classList.toggle('selected',button.dataset.view===view));
  if(view==='episodes'){homeView.hidden=false;setTimeout(()=>document.getElementById('episodes').scrollIntoView({behavior:'smooth'}),20);}
  else if(view==='home'){window.scrollTo({top:0,behavior:'smooth'});}
  else if(view==='bible'&&!bibleFrame.dataset.loaded){
    bibleFrame.addEventListener('load',()=>{
      try{
        const doc=bibleFrame.contentDocument;
        const style=doc.createElement('style');
        style.textContent='header,.hero,.notice{display:none!important}body{background:#f4f1e9!important}.reader-shell{padding-top:14px!important;padding-bottom:35px!important}.panel{position:static!important}';
        doc.head.appendChild(style);
        const back=doc.querySelector('.back');if(back)back.style.display='none';
        bibleFrame.dataset.loaded='1';
      }catch(e){}
    },{once:true});
    bibleFrame.src='../bible.html';
  }
}
document.querySelectorAll('.bottom-nav button').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.view)));

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('../service-worker.js').catch(()=>{}));}

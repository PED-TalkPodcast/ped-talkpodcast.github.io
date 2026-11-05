const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png'};
const server = http.createServer((req,res)=>{
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname); } catch { res.writeHead(400).end(); return; }
  let file = path.resolve(root,'.'+pathname);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try { if (fs.statSync(file).isDirectory()) file = path.join(file,'index.html'); } catch {}
  fs.readFile(file,(error,data)=>{
    if(error){res.writeHead(404).end('Not found');return;}
    res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});
    res.end(data);
  });
});

(async()=>{
  let browser;
  const errors=[];
  try{
    await new Promise(resolve=>server.listen(4173,'127.0.0.1',resolve));
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    const context=await browser.newContext({viewport:{width:390,height:844},colorScheme:'light',serviceWorkers:'block'});
    // Install before navigation so every page (including route and wide-viewport pages)
    // records the code path that assigns an invalid image URL.
    await context.addInitScript(()=>{
      const report=(kind,value,stack)=>{
        const raw=String(value??'');
        if(!/(?:^|\/)undefined(?:$|[?#])|^undefined$/i.test(raw))return;
        const detail={kind,value:raw,stack:stack||new Error('invalid image source').stack,url:location.href,time:performance.now()};
        (window.__invalidImageTrace||(window.__invalidImageTrace=[])).push(detail);
        console.error('INVALID_IMAGE_TRACE '+JSON.stringify(detail));
      };
      const srcDescriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
      if(srcDescriptor?.set&&srcDescriptor?.get){
        Object.defineProperty(HTMLImageElement.prototype,'src',{configurable:srcDescriptor.configurable,enumerable:srcDescriptor.enumerable,get:srcDescriptor.get,set(value){report('img.src',value,new Error('img.src assignment').stack);return srcDescriptor.set.call(this,value);}});
      }
      const setAttribute=Element.prototype.setAttribute;
      Element.prototype.setAttribute=function(name,value){
        if(this instanceof HTMLImageElement&&String(name).toLowerCase()==='src')report('setAttribute(src)',value,new Error('setAttribute(src)').stack);
        return setAttribute.call(this,name,value);
      };
      const innerHTML=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
      if(innerHTML?.set&&innerHTML?.get){
        Object.defineProperty(Element.prototype,'innerHTML',{configurable:innerHTML.configurable,enumerable:innerHTML.enumerable,get:innerHTML.get,set(value){
          const html=String(value??'');
          if(/<img\b[^>]*\bsrc\s*=\s*["'][^"']*undefined/i.test(html))report('innerHTML',html.match(/<img\b[^>]*>/i)?.[0]||html,new Error('innerHTML assignment').stack);
          return innerHTML.set.call(this,value);
        }});
      }
      const observer=new MutationObserver(records=>{
        for(const record of records){
          if(record.type==='attributes'&&record.target instanceof HTMLImageElement)report('mutated img src',record.target.getAttribute('src'),new Error('image src mutation').stack);
          for(const node of record.addedNodes||[]){
            if(node instanceof HTMLImageElement)report('inserted img',node.getAttribute('src'),new Error('image insertion').stack);
            if(node.querySelectorAll)for(const img of node.querySelectorAll('img'))report('inserted descendant img',img.getAttribute('src'),new Error('image insertion').stack);
          }
        }
      });
      const start=()=>observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
      if(document.documentElement)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
    });
    context.on('page',diagnosticPage=>{
      diagnosticPage.on('console',message=>{if(message.type()==='error'&&message.text().startsWith('INVALID_IMAGE_TRACE '))errors.push(message.text());});
      diagnosticPage.on('response',response=>{if(response.status()>=400)errors.push('HTTP '+response.status()+': '+response.url());});
      diagnosticPage.on('pageerror',error=>errors.push(error.message));
    });
    const page=await context.newPage();
    const cdp=await context.newCDPSession(page);
    await cdp.send('Network.enable');
    cdp.on('Network.requestWillBeSent',event=>{
      if(event.request.url.endsWith('/app/undefined')){
        const frames=event.initiator?.stack?.callFrames||[];
        errors.push('UNDEFINED_RESOURCE_INITIATOR '+JSON.stringify({type:event.type,initiator:event.initiator?.type,frames:frames.map(frame=>({url:frame.url,lineNumber:frame.lineNumber,functionName:frame.functionName}))}));
      }
    });
    page.on('request',async request=>{
      if(request.url().endsWith('/app/undefined')){
        let snapshot={url:request.url(),pageUrl:page.url(),images:[],elements:[]};
        try{snapshot=await page.evaluate(url=>{
          const describe=el=>({tag:el.tagName,id:el.id,className:typeof el.className==='string'?el.className:'',outerHTML:el.outerHTML.slice(0,700),src:el.getAttribute('src'),currentSrc:el.currentSrc||'',style:el.getAttribute('style')});
          return{url,pageUrl:location.href,images:[...document.images].map(describe),elements:[...document.querySelectorAll('[src],[style],link[rel*=preload]')].filter(el=>/undefined|null/.test((el.getAttribute('src')||'')+' '+(el.getAttribute('style')||''))).map(describe),bodyExcerpt:document.body?.innerHTML.match(/.{0,180}undefined.{0,180}/is)?.[0]||''};
        },request.url());}catch(error){snapshot.captureError=error.message;}
        errors.push('UNDEFINED_IMAGE_DOM_AT_REQUEST '+JSON.stringify(snapshot));
      }
    });
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{if(response.status()>=400)errors.push('HTTP '+response.status()+': '+response.url());});
    page.on('console',message=>{if(message.type()==='error'&&!/Failed to load resource/.test(message.text()))errors.push('console: '+message.text());});
    await page.goto('http://127.0.0.1:4173/app/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.PEDShowcase&&!!window.PEDDevotional,null,{timeout:15000});
    await page.waitForFunction(()=>!!window.PEDExploreBible,null,{timeout:5000});
    await page.waitForFunction(()=>document.querySelector('#exploreDailyVisual')?.dataset.themeId||document.querySelector('#exploreDailyVisual')?.dataset.imageState==='fallback',null,{timeout:5000});
    const exploreVisual=await page.evaluate(()=>({state:document.querySelector('#exploreDailyVisual')?.dataset.imageState,title:document.querySelector('#exploreDailyTitle')?.textContent,reference:document.querySelector('#exploreDailyReference')?.textContent,theme:document.querySelector('#exploreDailyVisual')?.dataset.themeId,opacity:getComputedStyle(document.querySelector('#exploreDailyVisual')).getPropertyValue('--explore-overlay-opacity'),width:document.querySelector('#exploreDailyVisual')?.getBoundingClientRect().width}));
    assert.ok(exploreVisual.title&&exploreVisual.reference,'Explore daily visual must expose theme title and Scripture reference');
    assert.ok(Number(exploreVisual.opacity)>=0&&Number(exploreVisual.opacity)<=1,'Explore overlay opacity must remain within 0–1');
    const exploreCalendar=await page.evaluate(()=>{
      const manifest=window.__PEDExploreManifest;
      return {
        easter:window.PEDExploreBible.easterDate(2026),
        easterTheme:window.PEDExploreBible.selectTheme('2026-04-05',manifest).id,
        goodFridayTheme:window.PEDExploreBible.selectTheme('2026-04-03',manifest).id,
        christmasTheme:window.PEDExploreBible.selectTheme('2026-12-25',manifest).id,
        nativityEveTheme:window.PEDExploreBible.selectTheme('2026-12-24',manifest).id
      };
    });
    assert.equal(exploreCalendar.easter,'2026-04-05','Easter override calculation must use the Gregorian computus');
    assert.match(exploreCalendar.easterTheme,/^NT-CROSS-/,'Easter Sunday must select an empty-cross theme');
    assert.match(exploreCalendar.goodFridayTheme,/^CAL-CHRISTMAS-/,'Good Friday must select the crown-of-thorns override');
    assert.match(exploreCalendar.christmasTheme,/^CAL-NATIVITY-/,'Christmas Day must select a Nativity theme');
    assert.match(exploreCalendar.nativityEveTheme,/^CAL-NATIVITY-/,'Christmas Eve must select a Nativity theme');
    const hidden=async selector=>{await page.waitForFunction(sel=>document.querySelector(sel)?.hidden===true,selector,{timeout:5000});assert.equal(await page.locator(selector).evaluate(el=>el.hidden),true,selector+' should be hidden');}
    const visible=async selector=>assert.equal(await page.locator(selector).evaluate(el=>!el.hidden),true,selector+' should be visible');
    const visibleOnWide=async(widePage,selector)=>assert.equal(await widePage.locator(selector).evaluate(el=>!el.hidden),true,selector+' should be visible at 430px');
    const setTheme=async theme=>{await page.locator('#appSettingsButton').click();await page.locator('button[data-app-theme="'+theme+'"]').click();};
    const bodyHas=async cls=>assert.equal(await page.locator('body').evaluate((el,name)=>el.classList.contains(name),cls),true,'body should have '+cls);

    await page.locator('.bottom-nav [data-view="the-show"]').click();
    await visible('#theShowView');
    await page.locator('#theShowView [data-show-view="explore-bible"]').click();
    await visible('#exploreBibleView');
    const exploreVisualWidth=await page.locator('#exploreDailyVisual').evaluate(el=>el.getBoundingClientRect().width);
    assert.ok(exploreVisualWidth>0&&exploreVisualWidth<=390,'Explore daily visual must fit a narrow mobile viewport when displayed');
    await page.waitForFunction(()=>!!document.querySelector('#exploreDailyTitle')?.textContent);
    assert.ok(await page.locator('#exploreStoryGrid .explore-story-card').count()>0,'Explore story library must remain available below the daily visual');
    await page.locator('.explore-story-card').first().click();
    await visible('#exploreStoryDetail');
    await page.locator('#exploreDetailBack').click();
    await visible('#exploreStoryGrid');
    await page.locator('.bottom-nav [data-view="home"]').click();

    // Settings Home and Android Back.
    await page.locator('#appSettingsButton').click();
    await visible('#appSettingsModal');
    assert.equal(await page.locator('.bottom-nav').evaluate(el=>getComputedStyle(el).display),'none','bottom navigation must not sit above Settings');
    assert.ok(await page.locator('#appSettingsModal').evaluate(el=>Number(getComputedStyle(el).zIndex)>Number(getComputedStyle(document.querySelector('.bottom-nav')).zIndex)),'Settings must stack above app navigation');
    await page.locator('#settingsHome').click();
    await hidden('#appSettingsModal');
    await visible('#homeView');
    await page.waitForFunction(()=>document.querySelector('.bottom-nav [data-view="home"]')?.classList.contains('selected'));
    assert.equal(await page.evaluate(()=>history.state?.view),'home');
    assert.equal(await page.locator('main#homeView > .hope-card').count(),1,'Gift of Hope must be the primary Home feature');
    const routePage=await context.newPage();
    await routePage.goto('http://127.0.0.1:4173/app/?view=saved',{waitUntil:'domcontentloaded'});
    await routePage.waitForFunction(()=>!document.querySelector('#savedEpisodesView')?.hidden,null,{timeout:10000});
    assert.equal(new URL(routePage.url()).searchParams.get('view'),'saved','Saved direct link must encode the view');
    await routePage.reload({waitUntil:'domcontentloaded'});
    await routePage.waitForFunction(()=>!document.querySelector('#savedEpisodesView')?.hidden,null,{timeout:10000});
    await routePage.goto('http://127.0.0.1:4173/app/?view=the-show',{waitUntil:'domcontentloaded'});
    await routePage.waitForFunction(()=>!document.querySelector('#theShowView')?.hidden,null,{timeout:10000});
    await routePage.waitForFunction(()=>document.querySelector('#showMessageCount')?.textContent!=='—',null,{timeout:10000});
    assert.ok(Number(await routePage.locator('#showMessageCount').textContent())>0,'The Show must display the synced published-message count');
    assert.ok(await routePage.locator('#showWeeklyRhythm').textContent(),'The Show must display its publishing rhythm');
    assert.ok(await routePage.locator('#showStartYear').textContent(),'The Show must display its data-derived start year');
    await routePage.close();
    assert.equal(await page.locator('.bottom-nav [data-view]').count(),4,'bottom navigation must follow Home, Archive, Saved and The Show');
    assert.deepEqual(await page.locator('.bottom-nav [data-view] span').allTextContents(),['Home','Archive','Saved','The Show']);
    await page.locator('.bottom-nav [data-view="the-show"]').click();
    await visible('#theShowView');
    assert.equal(await page.locator('#theShowView [data-show-view]').count(),4,'The Show must retain access to Bible, reading stats, books and Explore Bible');
    await page.locator('#theShowView [data-show-view="bible"]').click();
    await visible('#bibleView');
    assert.equal(await page.locator('.bottom-nav [data-view="the-show"]').evaluate(el=>el.classList.contains('selected')),true,'The Show tab remains selected for linked resources');
    await page.locator('.bottom-nav [data-view="home"]').click();
    await visible('#homeView');
    await page.locator('#appSettingsButton').click();
    await page.evaluate(()=>history.back());
    await hidden('#appSettingsModal');

    // System mode follows live OS changes; manual modes persist across reloads.
    await setTheme('system');
    await page.emulateMedia({colorScheme:'light'});
    await page.waitForFunction(()=>document.body.classList.contains('app-light'),null,{timeout:2000});
    await page.emulateMedia({colorScheme:'dark'});
    await page.waitForFunction(()=>document.body.classList.contains('app-dark'),null,{timeout:2000});
    const nightAsset=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--gift-of-hope-image'));
    assert.match(nightAsset,/gift-of-hope-sky\.svg/);
    await page.locator('button[data-app-theme="light"]').click();
    await bodyHas('app-light');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.PEDShowcase&&!!window.PEDDevotional,null,{timeout:15000});
    await bodyHas('app-light');
    await page.locator('#appSettingsButton').click();
    await page.locator('button[data-app-theme="dark"]').click();
    await bodyHas('app-dark');
    const darkSettingsPanel=await page.locator('.app-settings-panel').evaluate(el=>getComputedStyle(el).backgroundImage);
    assert.match(darkSettingsPanel,/radial-gradient/,'Settings panel must use the layered broadcast-studio dark background');
    const darkSettingsSection=await page.locator('.settings-section').evaluate(el=>({background:getComputedStyle(el).backgroundImage,border:getComputedStyle(el).borderTopColor}));
    assert.match(darkSettingsSection.background,/linear-gradient/,'Settings sections must have distinct elevated surfaces');
    assert.notEqual(darkSettingsSection.border,'rgba(0, 0, 0, 0)','Settings sections must retain a visible border');
    const darkSettingsOption=await page.locator('.theme-options button[data-app-theme="dark"]').evaluate(el=>({background:getComputedStyle(el).backgroundImage,color:getComputedStyle(el).color}));
    assert.match(darkSettingsOption.background,/linear-gradient/,'Theme options must use layered dark surfaces');
    assert.equal(await page.locator('.theme-options button[data-app-theme="dark"]').getAttribute('aria-pressed'),'true','selected dark theme must expose its state accessibly');
    assert.notEqual(darkSettingsOption.color,'rgba(0, 0, 0, 0)','selected dark theme option must retain a visible text color');
    const darkHopeScripture=await page.locator('.hope-scripture').evaluate(el=>({background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopWidth,shadow:getComputedStyle(el).boxShadow}));
    assert.equal(darkHopeScripture.background,'rgba(0, 0, 0, 0)','Gift of Hope scripture must not have a separate card background');
    assert.equal(darkHopeScripture.border,'0px','Gift of Hope scripture must not have a separate card border');
    assert.equal(darkHopeScripture.shadow,'none','Gift of Hope scripture must not have a separate card shadow');
    const darkEpisodeSurface=await page.locator('.episode').first().evaluate(el=>getComputedStyle(el).backgroundImage);
    assert.match(darkEpisodeSurface,/linear-gradient/,'episode tiles must use the layered dark card system');
    await page.locator('button[data-app-theme="system"]').click();
    await page.emulateMedia({colorScheme:'light'});
    await page.waitForFunction(()=>document.body.classList.contains('app-light'),null,{timeout:2000});
    const dayAsset=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--gift-of-hope-image'));
    assert.match(dayAsset,/gift-of-hope-day\.svg/);
    const assetResponse=await page.request.get('http://127.0.0.1:4173/assets/gift-of-hope-day.svg');
    assert.equal(assetResponse.status(),200,'daytime Gift of Hope asset should load');
    const daySvg=fs.readFileSync(path.join(root,'assets/gift-of-hope-day.svg'),'utf8');
    assert.match(daySvg,/#4d9fe0/,'daytime sky must use a clear blue upper-sky tone');
    assert.match(daySvg,/#78bce9/,'daytime sky must retain a bright blue mid-sky tone');
    assert.match(daySvg,/cloudFace/,'daytime sky must contain layered white cloud artwork');
    assert.doesNotMatch(daySvg,/#f5dfbd|linearGradient id="hills"/,'daytime artwork must not fall back to the old beige/hill palette');
    const dayCardImage=await page.locator('.hope-card').evaluate(el=>getComputedStyle(el).backgroundImage);
    assert.match(dayCardImage,/gift-of-hope-day\.svg/,'home Gift of Hope card must use the daytime asset');
    const dayModalImage=await page.locator('#hopeModal').evaluate(el=>getComputedStyle(el).backgroundImage);
    assert.match(dayModalImage,/gift-of-hope-day\.svg/,'expanded Gift of Hope must use the daytime asset');
    assert.equal(await page.locator('#settingsClose').count(),0,'Settings must not render a Close control');
    await page.locator('#settingsHome').click();
    await hidden('#appSettingsModal');

    // Compact Home card cycles content but has a fixed geometry and glass scripture treatment.
    assert.equal(await page.locator('.hope-card').getAttribute('data-presentation'),'compact');
    assert.equal(await page.locator('#hopeModal').getAttribute('data-presentation'),'expanded');
    await page.waitForTimeout(500);
    const compactBoxBefore=await page.locator('.hope-card').evaluate(el=>({height:el.offsetHeight,top:el.offsetTop}));
    const scriptureSurface=await page.locator('.hope-scripture').evaluate(el=>({background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopWidth,shadow:getComputedStyle(el).boxShadow}));
    assert.equal(scriptureSurface.background,'rgba(0, 0, 0, 0)','scripture must sit directly on the unified Gift of Hope card');
    assert.equal(scriptureSurface.border,'0px','scripture must not render as a separate template card');
    assert.ok(compactBoxBefore.height>=280&&compactBoxBefore.height<=290,'compact Home card should have a fixed mobile height');
    await page.waitForFunction(()=>document.querySelector('#giftVerseLabel')?.textContent==='AMAZING GRACE',null,{timeout:12000});
    assert.equal(await page.locator('#giftDevotional').evaluate(el=>el.classList.contains('is-entering')||getComputedStyle(el).opacity==='1'),true,'Home scripture must return visibly after its fade');
    assert.match(await page.locator('#giftVerse').textContent(),/Amazing grace! how sweet the sound/);
    const compactBoxAfter=await page.locator('.hope-card').evaluate(el=>({height:el.offsetHeight,top:el.offsetTop}));
    assert.equal(compactBoxAfter.height,compactBoxBefore.height,'compact card height must not change as devotional text changes');
    assert.equal(compactBoxAfter.top,compactBoxBefore.top,'compact card position must remain stable');
    assert.equal(await page.locator('#giftVerse').evaluate(el=>getComputedStyle(el).webkitLineClamp),'2','compact verse text must clamp to two lines');
    // Tapping opens a separate expanded presentation, with its own glass card.
    await page.locator('.hope-card').click({position:{x:28,y:30}});
    await visible('#hopeModal');
    const lightGlassSurface=await page.locator('.hope-modal-panel').evaluate(el=>getComputedStyle(el).backgroundColor);
    assert.equal(lightGlassSurface,'rgba(239, 248, 255, 0.66)','Light Mode expanded card must remain translucent sky glass, not an opaque slab');
    assert.equal(await page.locator('#modalGiftVerseLabel').textContent(),'AMAZING GRACE','expanded card opens at the current devotional stage');
    assert.match(await page.locator('#modalGiftVerse').textContent(),/Amazing grace! how sweet the sound/);
    await page.waitForFunction(()=>document.querySelector('#modalGiftVerseLabel')?.textContent==='A PROMISE OF VICTORY',null,{timeout:10000});
    assert.match(await page.locator('#modalGiftVerse').textContent(),/He who overcomes/);
    await page.locator('#hopeCommentToggle').click();
    await page.locator('#hopeCommentInput').fill('Regression test comment');
    await page.locator('#hopeCommentForm button[type="submit"]').click();
    assert.match(await page.locator('#hopeCommentList').textContent(),/Regression test comment/);
    const commentColor=await page.locator('#hopeComments textarea').evaluate(el=>getComputedStyle(el).color);
    assert.notEqual(commentColor,'rgba(0, 0, 0, 0)','comment input text must be visible');
    assert.equal(commentColor,'rgb(36, 56, 43)','light-theme comment input must use readable dark text');
    const commentSurface=await page.locator('#hopeComments').evaluate(el=>getComputedStyle(el).backgroundColor);
    assert.notEqual(commentSurface,'rgba(0, 0, 0, 0)','comment panel must have a defined light surface');
    await page.evaluate(()=>history.back());
    await hidden('#hopeModal');
    await page.locator('.hope-card').click({position:{x:28,y:30}});
    await visible('#hopeModal');
    assert.equal(await page.locator('.hope-modal-panel').evaluate(el=>el.scrollTop),0,'Gift of Hope should reopen at the top so swipe-to-dismiss remains available');
    await page.locator('#hopeModal').click({position:{x:2,y:2}});
    await hidden('#hopeModal');
    await page.locator('.hope-card').click({position:{x:28,y:30}});
    await visible('#hopeModal');
    await page.evaluate(()=>{
      const el=document.querySelector('.hope-modal-panel');
      el.scrollTop=0;
      const a=new Touch({identifier:21,target:el,clientX:120,clientY:100});
      const b=new Touch({identifier:21,target:el,clientX:122,clientY:205});
      el.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[a],changedTouches:[a]}));
      el.dispatchEvent(new TouchEvent('touchend',{bubbles:true,touches:[],changedTouches:[b]}));
    });
    await page.waitForFunction(()=>document.querySelector('#hopeModal')?.hidden===true,null,{timeout:2000});

    // Gift of Hope must reopen in Dark Mode with its night artwork and no runtime error.
    await page.locator('#appSettingsButton').click();
    await page.locator('button[data-app-theme="dark"]').click();
    await page.locator('#settingsHome').click();
    await hidden('#appSettingsModal');
    const darkCardImage=await page.locator('.hope-card').evaluate(el=>getComputedStyle(el).backgroundImage);
    assert.match(darkCardImage,/gift-of-hope-sky\.svg/,'home Gift of Hope card must use the night asset');
    await page.locator('.hope-card').click({position:{x:28,y:30}});
    await visible('#hopeModal');
    const darkModalImage=await page.locator('#hopeModal').evaluate(el=>getComputedStyle(el).backgroundImage);
    assert.match(darkModalImage,/gift-of-hope-sky\.svg/,'expanded Gift of Hope must use the night asset');
    await page.evaluate(()=>history.back());
    await hidden('#hopeModal');
    await page.locator('#appSettingsButton').click();
    await page.locator('button[data-app-theme="light"]').click();
    await page.locator('#settingsHome').click();
    await hidden('#appSettingsModal');

    // Upcoming carousel must adopt both app themes rather than retaining a dark-only surface.
    await page.locator('#appSettingsButton').click();
    await page.locator('button[data-app-theme="dark"]').click();
    await page.locator('#settingsHome').click();
    const darkUpcoming=await page.locator('.app-showcase-upcoming .upcoming-card').evaluate(el=>getComputedStyle(el).backgroundImage);
    assert.match(darkUpcoming,/linear-gradient/,'dark Upcoming card must have a theme-specific surface');
    const darkUpcomingTitle=await page.locator('.app-showcase-upcoming .upcoming-card-head h2').evaluate(el=>getComputedStyle(el).color);
    assert.equal(darkUpcomingTitle,'rgb(245, 255, 248)','dark Upcoming title must use the primary high-contrast text token');
    await page.locator('#appSettingsButton').click();
    await page.locator('button[data-app-theme="light"]').click();
    await page.locator('#settingsHome').click();
    const lightUpcomingTitle=await page.locator('.app-showcase-upcoming .upcoming-card-head h2').evaluate(el=>getComputedStyle(el).color);
    assert.equal(lightUpcomingTitle,'rgb(38, 60, 48)','light Upcoming title must be dark and readable');

    // Automatic carousel without manual controls, retained index after theme changes, no unintended Episodes navigation.
    assert.equal(await page.locator('.showcase-controls,.showcase-arrow,.showcase-dots,[data-showcase-slide],[data-showcase-prev],[data-showcase-next]').count(),0,'manual carousel controls must not exist');
    assert.equal(await page.locator('.showcase-controls').count(),0,'no carousel control layout space');
    await page.evaluate(()=>window.PEDShowcase.goTo(1));
    assert.equal(await page.evaluate(()=>window.PEDShowcase.activeIndex),1);
    await page.evaluate(()=>{
      const el=document.getElementById('appShowcase');
      el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:77,pointerType:'touch',clientX:300,clientY:120}));
      el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:77,pointerType:'touch',clientX:180,clientY:122}));
    });
    await page.waitForFunction(()=>window.PEDShowcase?.activeIndex===2,null,{timeout:2000});
    await page.evaluate(()=>window.PEDShowcase.goTo(1));
    await page.locator('#appSettingsButton').click();
    await page.locator('button[data-app-theme="light"]').click();
    await page.locator('#settingsHome').click();
    await hidden('#appSettingsModal');
    assert.equal(await page.evaluate(()=>window.PEDShowcase.activeIndex),1);
    await page.evaluate(()=>window.PEDShowcase.goTo(2));
    const voiceFilter=await page.locator('.app-showcase-voice>img').evaluate(el=>getComputedStyle(el).filter);
    assert.match(voiceFilter,/brightness\(1\.2/);
    await page.locator('.app-showcase-slide[aria-hidden="false"]').click();
    await visible('#dwoopOverlay');
    assert.equal(await page.evaluate(()=>history.state?.view),'home','opening a feature must not navigate to Episodes');
    await hidden('#episodesView');
    await page.evaluate(()=>history.back());
    await hidden('#dwoopOverlay');
    await page.locator('.app-showcase-slide[aria-hidden="false"]').click();
    await visible('#dwoopOverlay');
    await page.locator('#dwoopClose').click();
    await page.waitForFunction(()=>document.querySelector('#dwoopOverlay')?.hidden===true,null,{timeout:2000});
    await page.locator('.app-showcase-slide[aria-hidden="false"]').click();
    await visible('#dwoopOverlay');
    await page.locator('#dwoopOverlay').click({position:{x:2,y:2}});
    await hidden('#dwoopOverlay');
    await page.locator('.app-showcase-slide[aria-hidden="false"]').click();
    await visible('#dwoopOverlay');
    await page.evaluate(()=>{
      const el=document.querySelector('.dwoop-card-expanded');
      const a=new Touch({identifier:22,target:el,clientX:120,clientY:100});
      const b=new Touch({identifier:22,target:el,clientX:122,clientY:205});
      el.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[a],changedTouches:[a]}));
      el.dispatchEvent(new TouchEvent('touchend',{bubbles:true,touches:[],changedTouches:[b]}));
    });
    await page.waitForFunction(()=>document.querySelector('#dwoopOverlay')?.hidden===true,null,{timeout:2000});

    // Bottom tabs and Settings Home from a non-Home screen.
    await page.locator('.bottom-nav [data-view="episodes"]').click();
    await visible('#episodesView');
    await page.locator('#appSettingsButton').click();
    await page.locator('#settingsHome').click();
    await visible('#homeView');
    await hidden('#appSettingsModal');
    await page.waitForFunction(()=>document.querySelector('.bottom-nav [data-view="home"]')?.classList.contains('selected'));

    // Episode cards must open a centered modal window, not expand into a full-screen tab.
    await page.locator('#appSettingsButton').click();
    await page.locator('button[data-app-theme="dark"]').click();
    await page.locator('#settingsHome').click();
    await hidden('#appSettingsModal');
    await page.waitForSelector('.episode-open-card',{timeout:10000});
    await visible('#giftDevotional');
    assert.equal(await page.locator('#latestEpisodeHero').count(),0,'Gift of Hope must remain the first Home feature; no latest-episode hero may displace it');
    assert.ok(await page.locator('#homeView > .hope-card').count()===1,'Gift of Hope must lead the Home page');
    assert.equal(await page.locator('.episode-open-card .episode-open-mark').count(),0,'small episode rows must use the row tap target, not a nested play button');
    assert.equal(await page.locator('.episode-card-prompt').count(),0,'episode rows must not contain descriptive prompt copy');
    await page.locator('.episode-open-card').first().click();
    await visible('#dwoopOverlay');
    const episodeWindow=await page.locator('.dwoop-card-expanded').evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,viewportWidth:innerWidth,viewportHeight:innerHeight,classes:el.className,overlayClasses:el.parentElement.className}));
    assert.ok(episodeWindow.width<=episodeWindow.viewportWidth,'episode window must fit the viewport');
    assert.ok(episodeWindow.height<=episodeWindow.viewportHeight,'episode window must fit the viewport');
    assert.match(episodeWindow.overlayClasses,/dwoop-episode-mode/,'episode must open in its own dedicated window/page');
    const episodeHeader=await page.evaluate(()=>{
      const card=document.querySelector('.dwoop-card-expanded'),eyebrow=document.querySelector('#dwoopEyebrow'),title=document.querySelector('#dwoopTitle'),intro=document.querySelector('#dwoopIntro'),close=document.querySelector('#dwoopClose');
      const rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
      return{eyebrow:rect(eyebrow),title:rect(title),intro:rect(intro),close:rect(close),closePosition:getComputedStyle(close).position,closeFloat:getComputedStyle(close).float,card:rect(card)};
    });
    assert.equal(episodeHeader.closePosition,'absolute','episode close control must be anchored and removed from text flow');
    assert.equal(episodeHeader.closeFloat,'none','episode close control must not float beside text');
    assert.ok(Math.abs(episodeHeader.eyebrow.x-episodeHeader.title.x)<=1,'episode eyebrow and title must share the same left alignment');
    assert.ok(Math.abs(episodeHeader.title.x-episodeHeader.intro.x)<=1,'episode title and intro must share the same left alignment');
    assert.ok(episodeHeader.title.y>=episodeHeader.close.bottom,'episode title must not collide with the close control');
    assert.ok(episodeHeader.title.right<=episodeHeader.card.right,'episode title must remain inside the window');

    const expandedPlay=await page.locator('[data-play-main]').evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,radius:getComputedStyle(el).borderRadius}));
    assert.notEqual(await page.locator('[data-play-main]').evaluate(el=>getComputedStyle(el,'::before').animationName),'none','expanded play button must have a subtle radar glow');
    assert.ok(expandedPlay.width>=68&&expandedPlay.width<=76&&expandedPlay.height>=68&&expandedPlay.height<=76,'expanded player must use the 68–76px primary play control from the brief');
    assert.equal(expandedPlay.radius,'50%','expanded player primary play control must be circular');
    assert.equal(await page.locator('[data-player-seek]').count(),1,'episode player must include a seek control');
    assert.equal(await page.locator('[data-skip-back]').count(),1,'expanded player must include 15-second skip back');
    assert.equal(await page.locator('[data-skip-forward]').count(),1,'expanded player must include 30-second skip forward');
    assert.equal(await page.locator('[data-playback-speed]').count(),1,'expanded player must include playback speed');
    assert.equal(await page.locator('[data-episode-favorite]').count(),1,'expanded player must include save/favorite');
    assert.equal(await page.locator('[data-episode-share]').count(),1,'expanded player must include share');
    assert.equal(await page.locator('#miniPlayer').evaluate(el=>!el.hidden),true,'persistent mini-player must appear when an episode is selected');
    assert.equal(await page.locator('[data-episode-swipe-area]').count(),1,'episode audio surface must support swipe navigation');
    const playerLayout=await page.evaluate(()=>{
      const rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
      const windowEl=document.querySelector('.episode-player-window'),times=document.querySelector('.episode-player-times'),current=document.querySelector('[data-player-current]'),duration=document.querySelector('[data-player-duration]'),hint=document.querySelector('.episode-player-hint');
      return{viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,window:rect(windowEl),times:rect(times),current:rect(current),duration:rect(duration),hint:rect(hint),timesDisplay:getComputedStyle(times).display};
    });
    assert.ok(playerLayout.documentWidth<=playerLayout.viewport+1,'app must not create horizontal page overflow');
    assert.equal(playerLayout.timesDisplay,'flex','player timestamps must remain in a horizontal flex row');
    assert.ok(Math.abs(playerLayout.current.y-playerLayout.duration.y)<=2,'current and total time must share one line');
    assert.ok(playerLayout.hint.y>=playerLayout.times.bottom-1,'swipe hint must sit below timestamps, not overlap them');
    assert.ok(playerLayout.hint.right<=playerLayout.window.right+1,'swipe hint must remain inside the player surface');
    await page.locator('[data-episode-favorite]').click();
    assert.equal(await page.locator('[data-episode-favorite]').getAttribute('aria-pressed'),'true','Save control must mark the episode as saved');
    await page.locator('#dwoopClose').click();
    await hidden('#dwoopOverlay');
    assert.equal(await page.locator('#miniPlayer').evaluate(el=>!el.hidden),true,'mini-player must remain available after closing the expanded player');
    assert.ok(await page.locator('#pedtalkAudioEngine').evaluate(el=>!!el.src),'audio source must persist after closing the expanded player');
    await page.locator('.bottom-nav [data-view="saved"]').click();
    await visible('#savedEpisodesView');
    await page.waitForSelector('#savedEpisodeGroups .episode-open-card',{timeout:5000});
    assert.equal(await page.locator('#savedEpisodeGroups .episode-open-card').count(),1,'saved episode must appear in the Saved tab');
    await page.locator('.bottom-nav [data-view="home"]').click();
    await visible('#homeView');

    // One autoplay timeout advances exactly one slide.
    await page.evaluate(()=>window.PEDShowcase.goTo(0));
    await page.waitForTimeout(8300);
    assert.equal(await page.evaluate(()=>window.PEDShowcase.activeIndex),1,'autoplay should advance one slide');

    // Validate the second target phone viewport from the implementation brief.
    const widePage=await context.newPage();
    await widePage.setViewportSize({width:430,height:932});
    widePage.on('pageerror',error=>errors.push('430px viewport: '+error.message));
    await widePage.goto('http://127.0.0.1:4173/app/',{waitUntil:'domcontentloaded'});
    await widePage.waitForFunction(()=>!!window.PEDShowcase&&!!document.querySelector('.hope-card'),null,{timeout:15000});
    const wideLayout=await widePage.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,hero:document.querySelector('.hope-card')?.getBoundingClientRect().width,navCount:document.querySelectorAll('.bottom-nav [data-view]').length}));
    assert.equal(wideLayout.width,430,'second target viewport must be 430px wide');
    assert.ok(wideLayout.documentWidth<=430,'430px layout must not overflow horizontally');
    assert.ok(wideLayout.hero<=430,'Gift of Hope must fit the 430px viewport');
    assert.equal(wideLayout.navCount,4,'four-tab navigation must remain intact at 430px');
    await widePage.locator('.episode-open-card').first().click();
    await visibleOnWide(widePage,'#dwoopOverlay');
    const widePlayer=await widePage.locator('.dwoop-card-expanded').evaluate(el=>({width:el.getBoundingClientRect().width,viewport:innerWidth,play:document.querySelector('[data-play-main]').getBoundingClientRect().width}));
    assert.ok(widePlayer.width<=widePlayer.viewport,'expanded player must fit the 430px viewport');
    assert.ok(widePlayer.play>=68&&widePlayer.play<=76,'expanded player control must retain the specified size at 430px');
    await widePage.locator('#dwoopClose').click();
    await widePage.close();

    const invalidImageState=await page.evaluate(()=>({images:[...document.images].map(img=>({id:img.id,src:img.getAttribute('src'),resolved:img.src})).filter(img=>/undefined|null/.test((img.src||'')+' '+img.resolved)),backgrounds:[...document.querySelectorAll('body *')].map(el=>({tag:el.tagName,id:el.id,className:typeof el.className==='string'?el.className:'',background:getComputedStyle(el).backgroundImage})).filter(item=>/undefined|null/.test(item.background))}));
    if(invalidImageState.images.length||invalidImageState.backgrounds.length)errors.push('INVALID_IMAGE_DOM '+JSON.stringify(invalidImageState));
    assert.deepEqual(errors,[],'browser JavaScript errors');
    process.stdout.write('PASS: Settings Home, Settings Back, system/manual theme persistence, Gift of Hope day asset, devotional cycle, WEB Revelation 3:21, comments, modal outside/Back/swipe dismissal, carousel controls/theme retention, Voice of Healing light treatment, Episodes navigation and single-step autoplay, dedicated episode window, refined circular glass play control, seek bar and swipe navigation.\n');
    await context.close();
  }catch(error){
    process.stderr.write((error&&error.stack)||String(error));
    process.exitCode=1;
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})();

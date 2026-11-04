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
    const page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')errors.push('console: '+message.text());});
    await page.goto('http://127.0.0.1:4173/app/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.PEDShowcase&&!!window.PEDDevotional,null,{timeout:15000});
    const hidden=async selector=>{await page.waitForFunction(sel=>document.querySelector(sel)?.hidden===true,selector,{timeout:5000});assert.equal(await page.locator(selector).evaluate(el=>el.hidden),true,selector+' should be hidden');}
    const visible=async selector=>assert.equal(await page.locator(selector).evaluate(el=>!el.hidden),true,selector+' should be visible');
    const setTheme=async theme=>{await page.locator('#appSettingsButton').click();await page.locator('button[data-app-theme="'+theme+'"]').click();};
    const bodyHas=async cls=>assert.equal(await page.locator('body').evaluate((el,name)=>el.classList.contains(name),cls),true,'body should have '+cls);

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
    assert.equal(await page.locator('.episode-open-card .episode-open-mark').count(),0,'small episode cards must not show a play button; the whole card is the tap target');
    await page.locator('.episode-open-card').first().click();
    await visible('#dwoopOverlay');
    const episodeWindow=await page.locator('.dwoop-card-expanded').evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,viewportWidth:innerWidth,viewportHeight:innerHeight,classes:el.className,overlayClasses:el.parentElement.className}));
    assert.ok(episodeWindow.width<=episodeWindow.viewportWidth,'episode window must fit the viewport');
    assert.ok(episodeWindow.height<=episodeWindow.viewportHeight,'episode window must fit the viewport');
    assert.match(episodeWindow.overlayClasses,/dwoop-episode-mode/,'episode must open in its own dedicated window/page');
    const compactPlay=await page.locator('[data-episode-play]').evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,radius:getComputedStyle(el).borderRadius,label:getComputedStyle(el.querySelector('.episode-play-label')).display}));
    assert.ok(compactPlay.width>=48&&compactPlay.width<=58&&compactPlay.height>=48&&compactPlay.height<=58,'player play control must be a refined circular button');
    assert.equal(compactPlay.radius,'50%','player play control must be circular');
    assert.equal(await page.locator('[data-player-seek]').count(),1,'episode player must include a seek control');
    assert.equal(await page.locator('[data-episode-swipe-area]').count(),1,'episode audio surface must support swipe navigation');
    await page.locator('#dwoopClose').click();
    await hidden('#dwoopOverlay');

    // One autoplay timeout advances exactly one slide.
    await page.evaluate(()=>window.PEDShowcase.goTo(0));
    await page.waitForTimeout(8300);
    assert.equal(await page.evaluate(()=>window.PEDShowcase.activeIndex),1,'autoplay should advance one slide');

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

const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.ZURI_BROWSER_PATH ? {executablePath:process.env.ZURI_BROWSER_PATH} : {})});
  const context = await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
  const page = await context.newPage();
  const errors=[],passed=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.setDefaultTimeout(10000);
  const base=process.env.ZURI_PREVIEW_URL || 'http://zuri.test/';
  if(!process.env.ZURI_PREVIEW_URL){
    await context.route('http://zuri.test/**',async route=>{
      const pathname=decodeURIComponent(new URL(route.request().url()).pathname);
      const file=path.resolve('dist',pathname==='/'?'index.html':'.'+pathname);
      if(!file.startsWith(path.resolve('dist')+path.sep))return route.abort();
      const contentType={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'}[path.extname(file)]||'application/octet-stream';
      try{await route.fulfill({body:fs.readFileSync(file),contentType});}catch{await route.fulfill({status:404,body:'Not found'});}
    });
    await context.route(/^https:\/\//,route=>route.abort());
  }

  // Optional Playwright harness; the current milestone was also verified through the in-app browser.
  const click=name=>page.getByRole('button',{name,exact:true}).click();
  const launch=async name=>{await click('Go to lounge');await click(name)};
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('.zuri-exp').waitFor();
  assert.match(await page.title(),/ZURI/);assert.equal(await page.locator('.zx-mobile-nav button').count(),4);
  await page.getByRole('textbox',{name:'New focus task',exact:true}).fill('QA focus');await click('Add');
  for(const [name,tabs]of Object.entries({'◎ Aura':['Feed','Spaces','Societies','Find'],'↗ Motion':['Planner','Events','Pings'],'◈ Rizz':['Feed','Create','Channels','Chats'],'◒ Lore':['Moments','Discover','Chapters','Profile']})){
    await launch(name);assert.equal(await page.locator('.zx-mobile-nav').count(),0);
    for(const tab of tabs){await click(tab);assert.equal(await page.getByRole('heading',{level:1,name:tab,exact:true}).count(),1);}
  }
  passed.push('fifteen sections; dock only on Lounge');
  await launch('◎ Aura');await click('Spaces');await page.getByRole('textbox',{name:'Search Spaces',exact:true}).fill('Nile');
  const focusId=await page.locator('.zm-space-tile').first().getAttribute('data-focus');await page.locator('.zm-space-tile').first().click();
  assert.equal(await page.locator('.zx-tabs').count(),0);await click('Back within experience');
  assert.equal(await page.getByRole('textbox',{name:'Search Spaces',exact:true}).inputValue(),'Nile');assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-focus')),focusId);
  passed.push('context collapse and search/focus restoration');
  await launch('↗ Motion');await click('Pings');await page.locator('.xf-ping-card').first().click();await click('Join Ping ↗');assert.equal(await page.getByRole('button',{name:'Joined locally ✓',exact:true}).count(),1);
  await page.getByRole('button',{name:/The Ping conversation/}).click();assert.match(page.url(),/kind=ping-chat/);assert.equal(await page.locator('.zx-tabs').count(),0);
  await page.getByRole('textbox',{name:'Context conversation message',exact:true}).fill('QA local conversation');await click('Save conversation message');assert.equal(await page.getByText('QA local conversation',{exact:true}).count(),1);
  passed.push('Ping joining and contextual conversation');
  await launch('↗ Motion');await click('Events');await page.locator('.zm-event-tile').first().click();await click('Attend ↗');await page.getByRole('slider',{name:'Swipe attendance confirmation',exact:true}).press('End');await click('Confirm preview attendance ✓');await page.getByText('✓ You’re attending in this preview.',{exact:true}).waitFor();
  passed.push('explicit local demo attendance');
  await launch('◈ Rizz');await click('Create');assert.equal(await page.locator('.xf-context-results').count(),0);await page.getByRole('textbox',{name:'Search space context',exact:true}).fill('Nile');assert.ok(await page.locator('.xf-context-results button').count());
  await click('Channels');await click('Add channel');await page.getByRole('textbox',{name:'Channel name',exact:true}).fill('QA channel');await click('Save channel ↗');await page.getByRole('textbox',{name:'Channel post',exact:true}).fill('QA broadcast');await click('Publish local channel post');await page.getByText('QA broadcast',{exact:true}).waitFor();await click('Manage ⚙');await click('Archive channel');
  passed.push('searchable context and owned channels');
  await launch('◒ Lore');await click('Chapters');await page.getByRole('textbox',{name:'Chapter title',exact:true}).fill('QA Chapter');await click('Create chapter');await page.getByRole('textbox',{name:'Chapter note',exact:true}).fill('QA journal');await click('Add note ＋');await click('✓ Task');await page.getByRole('textbox',{name:'Chapter task',exact:true}).fill('QA shared task');await click('Add task ＋');
  await click('Go to lounge');assert.equal(await page.getByRole('checkbox',{name:/QA shared task/}).count(),1);await page.reload();await page.locator('.zuri-exp').waitFor();assert.equal(await page.getByRole('checkbox',{name:/QA shared task/}).count(),1);
  passed.push('chapter journal and persistent shared Planner tasks');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.setViewportSize({width:1440,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  fs.mkdirSync('verification',{recursive:true});fs.writeFileSync('verification/context-browser-results.json',JSON.stringify({passed,errors},null,2));await browser.close();console.log(JSON.stringify({passed,errors},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});

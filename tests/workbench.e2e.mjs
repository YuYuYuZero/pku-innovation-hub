// 本地静态站点 + 独立 Chrome 会话，演示操作不会连接 app 或云端服务。
import puppeteer from 'puppeteer-core'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve, extname } from 'node:path'
import assert from 'node:assert/strict'

const chrome = process.env.CHROME_PATH ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync)
if (!chrome) { console.log('没找到 Chrome，跳过 DEMO 页面测试'); process.exit(0) }
const root = resolve(import.meta.dirname,'..')
const server = createServer((req,res) => {
  const file = resolve(root,'.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname))
  if (!file.startsWith(root + '/')) { res.writeHead(403).end(); return }
  try { res.setHeader('Content-Type', {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml'}[extname(file)] || 'application/octet-stream'); res.end(readFileSync(file)) }
  catch { res.writeHead(404).end() }
})
await new Promise(r => server.listen(0,'127.0.0.1',r))
const base = `http://127.0.0.1:${server.address().port}`
const browser = await puppeteer.launch({executablePath:chrome,headless:true,defaultViewport:{width:1440,height:960}})
const p = await browser.newPage(), errors = []
p.on('pageerror',e=>errors.push(e.message))
mkdirSync(resolve(root,'data/screens'),{recursive:true})
const go = async (role, extra = '') => p.goto(`${base}/workbench.html?role=${role}${extra}`,{waitUntil:'networkidle0'})
const fill = async (label, value) => { const s = `[aria-label="${label}"]`; await p.$eval(s,e=>e.select()); await p.type(s,value) }
try {
  await go('backbone','&new=task')
  assert.equal(await p.$('[aria-label="任务难度系数"]'),null)
  await fill('任务名称','浏览器演示任务'); await fill('任务内容','准备资料并支持现场执行')
  await p.click('dialog [data-action=create]')
  const id = new URL(p.url()).searchParams.get('task'); assert.ok(id)
  await fill('进展与成果','线上准备 2 小时，线下支持 3 小时，资料已归档')
  await fill('线上工时','2'); await fill('线下工时','3')
  await p.click('dialog [data-action=submitted]')
  assert.equal(await p.$('dialog[open]'),null)
  await go('minister',`&task=${id}`)
  assert.equal(await p.$('[aria-label="进展与成果"]'),null)
  await p.select('[aria-label="任务难度系数"]','1.2')
  await p.click('dialog [data-action=approve]')
  await go('minister',`&task=${id}`)
  assert.match(await p.$eval('.task-score',e=>e.innerText), /9\.60/)
  await fill('最终积分','24'); await p.click('dialog [data-action=calibrate]')
  assert.match(await p.$eval('[role=alert]',e=>e.innerText),/必须填写原因/)
  await fill('处理说明','核实额外组织投入，完整校准')
  await p.click('dialog [data-action=calibrate]')
  await go('minister',`&task=${id}`)
  assert.match(await p.$eval('.task-history',e=>e.innerText), /9\.60 → 24\.00/)
  await go('backbone','&tab=points')
  assert.match(await p.$eval('.task-total',e=>e.innerText),/24\.00/)
  assert.match(await p.$eval('.task-benefits',e=>e.innerText),/实习内推/)
  await p.screenshot({path:resolve(root,'data/screens/骨干-贡献与权益.png'),fullPage:true})
  await p.click('[data-reuse]'); await p.click('dialog [data-action=create]')
  assert.notEqual(new URL(p.url()).searchParams.get('task'),id)
  assert.equal(await p.$eval('[aria-label="线上工时"]',e=>e.value),'0')
  assert.match(await p.$eval('.task-score',e=>e.innerText),/待分配/)
  await go('maintainer',`&task=${id}`)
  assert.match(await p.$eval('#task-app',e=>e.innerText),/无权查看/)
  assert.doesNotMatch(await p.$eval('#task-app',e=>e.innerText),/浏览器演示任务/)
  for (const role of ['member','outsider']) {
    await go(role)
    assert.equal(await p.$('#task-app'),null)
    assert.equal(await p.$('.asset-lock, .nav-i.off'),null)
    assert.doesNotMatch(await p.$eval('#sb',e=>e.innerText),/工作台/)
  }
  await go('president'); await p.click('#task-app [data-action=create]')
  assert.equal(await p.$$eval('select[name=owner] option',es=>es.length),3)
  await go('minister'); await p.click('#task-app [data-action=create]')
  assert.equal(await p.$$eval('select[name=owner] option',es=>es.length),2)
  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true})
  await go('backbone','&tab=points')
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true)
  await p.screenshot({path:resolve(root,'data/screens/手机骨干-贡献与权益.png'),fullPage:true})
  assert.deepEqual(errors,[])
  console.log('✓ DEMO 浏览器通过：上报、确认、完整校准、权益、复用、角色范围与手机布局')
} finally { await browser.close(); await new Promise(r=>server.close(r)) }

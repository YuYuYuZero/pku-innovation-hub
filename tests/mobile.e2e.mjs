// 手机与小程序：同一套页面在手机浏览器、小程序（演示参数 / 真实 UA）下的外观与行为。
import puppeteer from 'puppeteer-core'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve, extname } from 'node:path'
import assert from 'node:assert/strict'

const chrome = process.env.CHROME_PATH ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync)
if (!chrome) { console.log('没找到 Chrome，跳过手机与小程序页面测试'); process.exit(0) }
const root = resolve(import.meta.dirname,'..')
const server = createServer((req,res) => {
  const file = resolve(root,'.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname))
  if (!file.startsWith(root + '/')) { res.writeHead(403).end(); return }
  try { res.setHeader('Content-Type', {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'}[extname(file)] || 'application/octet-stream'); res.end(readFileSync(file)) }
  catch { res.writeHead(404).end() }
})
await new Promise(r => server.listen(0,'127.0.0.1',r))
const base = `http://127.0.0.1:${server.address().port}`
const browser = await puppeteer.launch({executablePath:chrome,headless:true})
const p = await browser.newPage(), errors = []
p.on('pageerror',e=>errors.push(e.message))
mkdirSync(resolve(root,'data/screens'),{recursive:true})
const phone = {width:375,height:760,isMobile:true,hasTouch:true}
const open = (path) => p.goto(`${base}/${path}`,{waitUntil:'networkidle0'})
const shown = (sel) => p.$eval(sel, e => getComputedStyle(e).display !== 'none' && !e.closest('[hidden]')).catch(() => false)
const PAGES = ['index','resources','resource_detail','resource_new','kb','kb_doc','resource_review','workbench','assistant','event_new','events','admin','me','login']
try {
  await p.setViewport(phone)
  // 手机浏览器：所有开放页面不横向溢出；侧边栏换成顶栏 + 底部标签栏
  for (const page of PAGES) for (const env of ['', '&env=mp']) {
    await open(`${page}.html?role=president${env}`)
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${page}${env} 横向溢出`)
  }
  await open('index.html?role=minister')
  assert.equal(await shown('.sb'), false); assert.ok(await shown('.m-top')); assert.ok(await shown('.m-tabbar'))
  assert.deepEqual(await p.$$eval('.m-tab', es => es.map(e => e.textContent.trim())), ['首页','活动','','AI','我的'])
  // 资源库：手机上点条目进入详情页
  await open('resources.html?role=president')
  assert.equal(await shown('.det'), false)
  await Promise.all([p.waitForNavigation(), p.click('.res .help')])
  assert.match(p.url(), /resource_detail\.html\?.*role=president/)

  // 小程序（演示参数）：微信标题栏 + 胶囊，没有网页顶栏；通知移到「我的」；切页保留参数
  await open('kb_doc.html?role=minister&env=mp')
  assert.ok(await shown('.mp-bar')); assert.ok(await shown('.mp-capsule')); assert.ok(await shown('.mp-back'))
  assert.equal(await shown('.m-top'), false)
  assert.equal(await p.title(), '知识库')
  assert.deepEqual(await p.$$eval('.m-tab', es => es.map(e => e.textContent.trim())), ['首页','活动','','知识库','我的'])   // 未开通 AI 类目：AI 换成知识库
  assert.ok(await p.$eval('[data-m-plus]', e => Math.abs(e.getBoundingClientRect().left + e.offsetWidth / 2 - innerWidth / 2) < 2), '「+」不在正中')
  // 下载：不走网页下载，弹出「在微信中打开 / 复制下载链接」
  await p.click('[data-mp-file]'); await p.waitForSelector('.m-sheet')
  assert.match(await p.$eval('.m-sheet', e => e.textContent), /在微信中打开.*复制下载链接/s)
  assert.equal(await p.$('.toast'), null)
  await p.click('[data-sheet-close]')
  // 上传：只能从微信聊天选择文件
  await p.click('[data-dlg="version"]'); await p.click('[data-mp-upload]'); await p.waitForSelector('.m-sheet')
  assert.match(await p.$eval('.m-sheet', e => e.textContent), /从微信聊天选择文件/)
  await p.screenshot({path:resolve(root,'data/screens/小程序-上传.png')})
  await open('me.html?role=minister&env=mp')
  assert.match(await p.$eval('.me-list', e => e.firstElementChild.textContent), /通知/)
  assert.equal(await shown('.me-list [href^="assistant.html"]'), false)
  await Promise.all([p.waitForNavigation(), p.click('.me-list a[href^="kb.html"]')])
  assert.match(p.url(), /env=mp/)
  // 外部链接：改为复制
  await open('event_new.html?role=president&env=mp')
  assert.equal(await shown('#openai'), false)
  await p.click('[data-mp-link]'); await p.waitForSelector('.m-sheet')
  assert.match(await p.$eval('.m-sheet', e => e.textContent), /复制链接/)
  // AI 工具箱：未开通类目显示说明；开通后（?mpai=1）恢复，并在切页时保留
  await open('assistant.html?role=minister&env=mp')
  assert.match(p.url(), /index\.html\?.*env=mp/)   // 不展示 AI，也不引导去网页版
  await open('kb.html?role=minister&env=mp')
  assert.equal(await shown('.mp-back'), false); assert.ok(await shown('.m-tab.on[href^="kb.html"]'))
  await open('index.html?role=member&env=mp')   // 普通会员也是五格
  assert.deepEqual(await p.$$eval('.m-tab', es => es.map(e => e.textContent.trim())), ['首页','活动','','知识库','我的'])
  await open('index.html?role=minister&env=mp&mpai=1')
  assert.deepEqual(await p.$$eval('.m-tab', es => es.map(e => e.textContent.trim())), ['首页','活动','','AI','我的'])
  await Promise.all([p.waitForNavigation(), p.click('.m-tab[href^="assistant.html"]')])
  assert.match(p.url(), /mpai=1/); assert.ok(await shown('.fr'))
  await p.screenshot({path:resolve(root,'data/screens/小程序-AI开通.png')})

  // 真实小程序：靠微信 UA 识别，没有参数；不画模拟标题栏（由微信绘制），其余与演示一致
  await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0.50 NetType/WIFI Language/zh_CN miniProgram/wx0000000000000000')
  await open('kb_doc.html?role=minister')
  assert.ok(await p.evaluate(() => document.documentElement.classList.contains('mp')))
  assert.equal(await shown('.mp-bar'), false); assert.equal(await shown('.m-top'), false)
  await p.click('[data-mp-file]'); await p.waitForSelector('.m-sheet')
  await p.setUserAgent(await browser.userAgent())

  // 电脑上打开 ?env=mp：回到预览页；预览页的两台手机加载同一页面
  await p.setViewport({width:1440,height:960})
  await open('events.html?role=member&env=mp')
  assert.match(p.url(), /mobile\.html\?page=events\.html/)
  const frames = await p.$$eval('.dev iframe', es => es.map(e => e.getAttribute('src')))
  assert.equal(frames.length, 2)
  assert.ok(frames.every(s => s.startsWith('events.html?') && s.includes('role=member')))
  assert.ok(!frames[0].includes('env=mp') && frames[1].includes('env=mp'))
  await new Promise(r => setTimeout(r, 400))
  await p.screenshot({path:resolve(root,'data/screens/手机与小程序预览.png')})
  assert.deepEqual(errors, [])
  console.log('✓ 手机与小程序：14 个页面无横向溢出，标题栏、下载、上传、外链、AI 开关、真实 UA 识别、预览页')
} finally { await browser.close(); server.close() }

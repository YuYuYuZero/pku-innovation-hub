import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
import { runInNewContext } from 'node:vm'

const root = fileURLToPath(new URL('../', import.meta.url))
const source = readFileSync(join(root, 'assets/app.js'), 'utf8')
const nav = runInNewContext(source + '\nNAV', { document: { addEventListener() {} } })

test('学社资产在分组统一标记内部权限，资源和知识入口不重复加锁，资源审核计数归到资源库', () => {
  const assets = nav.find(g => g.g === '学社资产')
  assert.equal(assets.internal, true)
  assert.deepEqual(Array.from(assets.items, i => i[0]), ['resources', 'workbench', 'kb'])
  assert.ok(assets.items.every(i => !i[4]))
  assert.equal(assets.items.find(i => i[0] === 'resources')[5], 3)
})

test('所有导航入口与 HTML 本地资源链接可解析', () => {
  for (const group of nav) for (const item of group.items) assert.ok(existsSync(join(root, item[2])), item[2])
  for (const file of readdirSync(root).filter(f => f.endsWith('.html'))) {
    const html = readFileSync(join(root, file), 'utf8')
    for (const [, target] of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
      if (/^(?:[a-z]+:|\/\/|#)/i.test(target)) continue
      const path = target.split(/[?#]/)[0]
      if (path) assert.ok(existsSync(resolve(root, path)), `${file} → ${target}`)
    }
  }
})

test('存储不可用场景显示提示、禁用上传；默认场景恢复可用', () => {
  const warning = { hidden: true }
  const upload = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v } }
  const sandbox = {
    URLSearchParams, location: { search: '?storage=unavailable' },
    document: { addEventListener() {}, querySelectorAll(selector) { return selector === '[data-storage-warning]' ? [warning] : [upload] } },
  }
  runInNewContext(source + '\nrenderStorageState()', sandbox)
  assert.equal(warning.hidden, false)
  assert.equal(upload.attrs['aria-disabled'], 'true')
  sandbox.location.search = ''
  runInNewContext('renderStorageState()', sandbox)
  assert.equal(warning.hidden, true)
  assert.equal(upload.attrs['aria-disabled'], 'false')
})

test('会员与未入名单隐藏无权限入口，骨干保留锁定管理入口', () => {
  const roles = runInNewContext(source + '\nDEMO_ROLES', { document: { addEventListener() {} } })
  const check = (expression) => runInNewContext(source + '\n' + expression, { document: { addEventListener() {} } })
  assert.equal(roles.member.name, '同学 E')
  for (const page of ['resources', 'workbench', 'admin']) assert.equal(check(`demoVisible('${page}', DEMO_ROLES.member)`), false)
  assert.equal(check("demoAllowed('kb', DEMO_ROLES.member)"), true)
  assert.equal(check("demoAllowed('kb', DEMO_ROLES.outsider)"), false)
  assert.equal(check("demoVisible('admin', DEMO_ROLES.backbone)"), true)
  assert.equal(check("demoAllowed('admin', DEMO_ROLES.backbone)"), false)
})

test('登录页使用 A–F 演示身份，邮箱入口保持隐藏', () => {
  const html = readFileSync(join(root, 'login.html'), 'utf8')
  for (const letter of 'ABCDEF') assert.ok(html.includes(`同学 ${letter}`))
  assert.match(html, /data-feature="email-login" hidden/)
  assert.doesNotMatch(html, /张同学|同学 M/)
})


test('任务与权益开放，活动申报仍暂停，资源审核独立', () => {
  const [pages, notes] = runInNewContext(source + '\n[PAGES, NOTES]', { document: { addEventListener() {} } })
  assert.ok(pages.some(([, file]) => file === 'resource_review.html'))
  assert.ok(pages.some(([, file]) => file === 'workbench.html'))
  assert.ok(!pages.some(([, file]) => file === 'activity_review.html'))
  assert.ok(notes.some(([, , href]) => href === 'workbench.html'))
  assert.ok(!notes.some(([title]) => /审批|终审/.test(title)))
  assert.match(readFileSync(join(root,'workbench.html'),'utf8'), /assets\/workbench.js/)
  assert.match(readFileSync(join(root,'activity_review.html'),'utf8'), /活动申报暂不开放/)
})

test('活动录入独立于申报，资源审核只保留资源', () => {
  const event = readFileSync(join(root, 'event_new.html'), 'utf8')
  assert.match(event, /活动来源/)
  assert.match(event, /href="events.html">活动/)
  assert.doesNotMatch(event, /终审通过后会自动出现/)
  const review = readFileSync(join(root, 'resource_review.html'), 'utf8')
  assert.match(review, /资源审核/)
  assert.match(review, /data-need="maintainer"/)
  assert.doesNotMatch(review, /活动申报|积分|终审|督办/)
  const check = expression => runInNewContext(source + '\n' + expression, { document: { addEventListener() {} } })
  assert.equal(check("demoAllowed(pageId('event_new.html'), DEMO_ROLES.member)"), false)
  assert.equal(check("demoAllowed(pageId('event_new.html'), DEMO_ROLES.backbone)"), true)
})

test('任务贡献只向本人和对应管理者可见，资源维护权限不等于积分管理权限', () => {
  const rules = runInNewContext(readFileSync(join(root,'assets/workbench.js'),'utf8') + '\nTASK_RULES', { document: { addEventListener() {} } })
  const roles = runInNewContext(source + '\nDEMO_ROLES', { document: { addEventListener() {} } })
  const task = {owner:3,dept:1}
  assert.equal(rules.visible(roles.backbone,task), true)
  assert.equal(rules.visible(roles.minister,task), true)
  assert.equal(rules.visible(roles.president,task), true)
  for (const key of ['maintainer','member','outsider']) assert.equal(rules.visible(roles[key],task), false)
  for (const key of ['backbone','maintainer','member']) assert.equal(rules.manager(roles[key],task), false)
  assert.equal(rules.manager(roles.minister,{owner:4,dept:2}), false)
  assert.equal(rules.reporter(roles.minister), false)
  assert.equal(rules.points(120,180,1.2),9.6)
  assert.equal(rules.points(15,0,1.1),0.28)
  assert.equal(rules.period('term','2026-01-20'),'2025-08-01')
})

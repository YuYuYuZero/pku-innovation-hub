import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
import { runInNewContext } from 'node:vm'

const root = fileURLToPath(new URL('../', import.meta.url))
const source = readFileSync(join(root, 'assets/app.js'), 'utf8')
const nav = runInNewContext(source + '\nNAV', { document: { addEventListener() {} } })

test('学社资产在分组统一标记内部权限，三个入口不重复加锁且保留工作台计数', () => {
  const assets = nav.find(g => g.g === '学社资产')
  assert.equal(assets.internal, true)
  assert.deepEqual(Array.from(assets.items, i => i[0]), ['resources', 'kb', 'workbench'])
  assert.ok(assets.items.every(i => !i[4]))
  assert.equal(assets.items.find(i => i[0] === 'workbench')[5], 5)
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

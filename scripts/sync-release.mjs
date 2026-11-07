// 统一页面依赖与站内链接的版本，避免切页时命中旧 HTML / 脚本组合。
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
const root = resolve(import.meta.dirname, '..')
const release = readFileSync(resolve(root,'assets/app.js'),'utf8').match(/const DEMO_RELEASE = '([^']+)'/)[1]
for (const file of readdirSync(root).filter(f => f.endsWith('.html'))) {
  const path = resolve(root,file)
  const html = readFileSync(path,'utf8').replace(/(src|href)="([^"#]+)"/g,(match,attr,href) => {
    if (!/^(?:assets\/[\w.-]+\.(?:js|css)|[\w-]+\.html)(?:[?#]|$)/.test(href)) return match
    const url = new URL(href,'https://demo.local/')
    url.searchParams.set('v',release)
    return `${attr}="${url.pathname.slice(1)}${url.search}${url.hash}"`
  })
  writeFileSync(path,html)
}
console.log(`同步页面版本：${release}`)

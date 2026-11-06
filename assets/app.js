// 原型公共框架：侧边栏、顶栏、图标、标注开关
const LOGO = `<img class="mark" src="assets/pku-logo.svg?v=20261031c" alt="北京大学校徽">`;

const NAV = [
  { g: "", items: [
    ["home", "首页", "index.html", "LuHouse"],
  ] },
  { g: "学社资产", internal: true, items: [
    ["resources", "资源库", "resources.html", "LuDatabase", 0, 3],
    ["kb", "知识库", "kb.html", "LuLibrary"],
  ] },
  { g: "工具 · AI", items: [
    ["assistant", "AI 工具箱", "assistant.html", "LuWandSparkles"],
  ] },
  { g: "社区 · 活动广场", items: [
    ["events", "活动", "events.html", "LuCalendarDays"],
  ] },
  { g: "管理 · 平台管理", items: [
    ["admin", "审核与管理", "admin.html", "LuShieldCheck"],
  ] },
];

// 演示身份仅用于展示；真实授权由 app 的后端负责。
const DEMO_ROLES = {
  president: { name: "同学 A", title: "会长团", backbone: true, admin: true },
  minister: { name: "同学 B", title: "AI俱乐部 · 部长", backbone: true, admin: true },
  backbone: { name: "同学 C", title: "AI俱乐部 · 骨干", backbone: true },
  maintainer: { name: "同学 D", title: "外联部 · 维护人", backbone: true, maintainer: true },
  member: { name: "同学 E", title: "会员" },
  outsider: { name: "同学 F", title: "未入名单" },
};
const PAGE_NEEDS = { resources: "backbone", kb: "member", workbench: "backbone", event_new: "backbone", assistant: "member", events: "member", admin: "admin" };
function demoRole() { return DEMO_ROLES[new URLSearchParams(location.search).get("role")] || DEMO_ROLES.minister; }
function demoAllowed(id, role = demoRole()) {
  const need = PAGE_NEEDS[id];
  return !need || (need === "member" ? role !== DEMO_ROLES.outsider : !!role[need]);
}
function demoVisible(id, role = demoRole()) { return demoAllowed(id, role) || !!role.backbone; }
function pageId(file) {
  if (/^(resource|upload)/.test(file)) return 'resources';
  if (/^kb/.test(file)) return 'kb';
  if (/^event_new/.test(file)) return 'event_new';
  if (/^needs/.test(file)) return 'resources';
  if (/^(workbench|activity_review)/.test(file)) return 'workbench';
  return file.replace(/\.html$/, '');
}

function ic(n) { return `<i class="ic" data-i="${n}"></i>`; }

// 通知：只推和自己有关、需要处理或需要知道结果的事
const NOTES = [
  ["3 条资源待审核", "外联部提交 · 含 1 条疑似重复", "resource_review.html", "LuInbox", "maintainer"],
  ["你录入的资源已通过审核", "示例机构 F · 2 天前", "resource_detail.html", "LuCircleCheck"],
  ["你的想法「表格批量处理」：已排期", "想法共建 · 3 天前", "index.html#my-ideas", "LuLightbulb"],
  ["新想法：报名表自动分组", "想法共建 · 同学 E 提出", "admin.html#ideas", "LuLightbulb"],
  ["同学 D 把文档「AI 产品分享会 · 活动纪要」共享给你", "知识库 · 1 小时前", "kb_doc.html", "LuLibrary"],
];

function renderShell() {
  const page = document.body.dataset.page === "event_new" ? "events" : document.body.dataset.page;
  const sb = document.getElementById("sb");
  if (sb) {
    sb.className = "sb";
    sb.innerHTML = `<a class="brand" href="index.html">${LOGO}<div class="wm"><b>北大创新学社</b><span>资源 · 工具 · 社区</span></div></a>` +
      NAV.filter(g => g.items.some(([id]) => demoVisible(id))).map(g => `<div class="nav-g">${g.g ? `<div class="gt">${g.g}${g.internal && demoRole().backbone ? `<span class="asset-lock" title="学社内部：资源库限骨干；知识库按文档范围开放" aria-label="学社内部资产">${ic("LuLock")}</span>` : ""}</div>` : ""}` + g.items.filter(([id]) => demoVisible(id)).map(([id, t, href, icon, lock, cnt]) =>
        demoAllowed(id) ? `<a class="nav-i ${id === page ? "on" : ""}" href="${href}">${ic(icon)}<span>${t}</span>${cnt && demoRole().maintainer ? `<span class="cnt">${cnt}</span>` : ""}</a>` : `<span class="nav-i off" aria-disabled="true" title="当前身份没有权限">${ic(icon)}<span>${t}</span>${!g.internal ? `<span class="lk">${ic("LuLock")}</span>` : ""}</span>`).join("") + `</div>`).join("") +
      `<a class="me" href="login.html"><span class="av av-sm a1">${demoRole().name.slice(-1)}</span><div class="who"><b>${demoRole().name}</b><span>${demoRole().title}</span></div>${ic("LuChevronDown")}</a>`;
  }
  // 不再用顶栏：搜索放在首页和各板块内部，通知铃铛放在侧边栏 Logo 旁边
  const tb = document.getElementById("tb");
  if (tb) tb.remove();
  if (sb && demoRole() !== DEMO_ROLES.outsider) {
    const bell = document.createElement("div");
    bell.className = "dd-wrap sb-bell";
    bell.innerHTML = `<button class="icon-btn">${ic("LuBell")}<span class="dot"></span></button>
      <div class="dd dd-note" hidden><div class="dd-h">通知<span>全部已读</span></div>${NOTES.filter(([, , href, , need]) => (!need || demoRole()[need]) && demoAllowed(pageId(href.split('#')[0]))).map(([t, d, href, icon]) =>
        `<a href="${href}">${ic(icon)}<div><b>${t}</b><span>${d}</span></div></a>`).join("")}</div>`;
    sb.querySelector(".brand").after(bell);
    const box = bell.querySelector(".dd");
    bell.querySelector("button").onclick = (e) => { e.stopPropagation(); box.hidden = !box.hidden; };
    document.addEventListener("click", () => { box.hidden = true; });
  }

}

// 想法共建：每个页面右上角的入口，点开是右侧抽屉（不放在导航里）。想法只有提出人和处理人（会长团、AI俱乐部部长）能看
const IDEA_ROW = (t, st, tone, n, open) => `<div class="idea"><div class="grow"><div class="row"><span class="b grow">${t}</span>${n ? `<span class="xs muted">${n} 条回复</span>` : ""}<span class="tag ${tone}">${st}</span></div>${open || ""}</div></div>`;
const IDEAS = `<div class="drawer"><div class="dr-h"><b>想法共建</b><span class="grow"></span><span class="icon-btn x" data-close>×</span></div>
  <div class="dr-b"><div class="row" style="margin-bottom:12px"><p class="small muted grow">有什么重复、费时的事想交给 AI，或者对平台有什么想法？写清谁、在什么场景、给它什么、想要什么。想法只有你和处理人（会长团、AI俱乐部部长）能看到，回复和进展会通过通知告诉你。</p><span class="btn btn-p btn-sm" data-done="已提交，处理后会通知你">提一个想法</span></div>
  <div class="h-sec" style="margin-bottom:4px">我提的想法</div>
  ${IDEA_ROW("办活动助手", "评估中", "t-amber", 2, `<div class="small" style="margin-top:8px">骨干准备办一场活动时，先看往届怎么办的</div><div class="xs muted" style="margin-top:2px">给它：一句话描述活动想法 → 得到：往届复盘、可请嘉宾和对接人、模板、活动策划草稿</div>
    <div class="thread"><div class="reply"><span class="av av-sm a2">A</span><div class="grow"><div class="xs muted">同学 A（处理人）· 昨天</div><div class="small">方向很好。想先确认：往届复盘现在都在飞书里，你希望它直接读飞书文档，还是先由各部门整理一份复盘清单？</div></div></div>
    <div class="reply"><span class="av av-sm a1">B</span><div class="grow"><div class="xs muted">同学 B（提出人）· 3 小时前</div><div class="small">先用清单就行，读飞书的以后再说。</div></div></div>
    <div class="row" style="margin-top:4px"><div class="input ph grow">补充说明或回复处理人</div><span class="btn btn-p btn-sm" data-done="已回复">回复</span></div></div>`)}
  ${IDEA_ROW("部门周报", "待处理", "", 0)}
  ${IDEA_ROW("表格批量处理", "已排期", "t-blue", 1)}
</div></div>`;
function renderIdeas() {
  const main = document.querySelector(".main");
  if (!main || !document.getElementById("sb") || demoRole() === DEMO_ROLES.outsider) return;
  const btn = document.createElement("span");
  btn.className = "btn btn-sm ideas-btn"; btn.innerHTML = `${ic("LuLightbulb")}想法共建`;
  main.appendChild(btn);
  const tpl = document.createElement("template"); tpl.id = "dlg-ideas"; tpl.innerHTML = IDEAS; document.body.appendChild(tpl);
  btn.onclick = () => openDlg("ideas");
  if (location.hash === "#my-ideas") openDlg("ideas");   // 通知跳转过来时直接打开
}

function renderIcons() {
  document.querySelectorAll("i.ic[data-i]").forEach(el => {
    const svg = (window.ICONS || {})[el.dataset.i];
    if (svg) el.innerHTML = svg;
  });
}


// 原型目录：所有页面与对应文件，便于在 GitHub Pages 上预览
const PAGES = [
  ["首页", "index.html"], ["资源库", "resources.html"], ["资源详情", "resource_detail.html"], ["录入资源", "resource_new.html"],
  ["批量导入", "upload.html"], ["知识库", "kb.html"], ["文档详情与版本", "kb_doc.html"], ["资源审核", "resource_review.html"],
  ["AI 工具箱", "assistant.html"], ["录入活动", "event_new.html"],
  ["活动", "events.html"], ["审核与管理", "admin.html"], ["登录", "login.html"], ["手机与飞书", "mobile.html"],
  ["—— 暂不开放 ——"], ["AI 能力说明", "skills.html"], ["讨论", "community.html"], ["精选", "featured.html"], ["创业 · 项目", "projects.html"], ["创业 · 项目详情", "project_detail.html"], ["创业 · 投资人与机构", "investors.html"],
];
function renderProtoNav() {
  if (new URLSearchParams(location.search).has("shot")) return;
  const cur = location.pathname.split("/").pop() || "index.html";
  const box = document.createElement("div");
  box.className = "proto-nav";
  box.innerHTML = `<div class="pn-panel"><div class="pn-h">原型页面</div>` +
    PAGES.filter(([, f]) => !f || demoAllowed(pageId(f))).map(([t, f]) => !f ? `<div class="pn-h">${t}</div>` : `<a class="${f === cur ? "on" : ""}" href="${f}${document.body.classList.contains("anno") ? "#anno" : ""}"><span>${t}</span><code>${f}</code></a>`).join("") +
    `<label class="pn-anno"><input type="checkbox" ${document.body.classList.contains("anno") ? "checked" : ""}> 显示编号标注</label></div><button class="pn-btn">原型目录</button>`;
  document.body.appendChild(box);
  box.querySelector(".pn-btn").onclick = () => box.classList.toggle("open");
  box.querySelector(".pn-anno input").onchange = (e) => {
    document.body.classList.toggle("anno", e.target.checked);
    location.hash = e.target.checked ? "anno" : "";
    box.querySelectorAll(".pn-panel a").forEach(a => { a.href = a.getAttribute("href").replace("#anno", "") + (e.target.checked ? "#anno" : ""); });
  };
}

// 知识库原型可用 ?storage=unavailable 演示文件后端不可用，文件夹仍能创建。
function renderStorageState() {
  const unavailable = new URLSearchParams(location.search).get("storage") === "unavailable";
  document.querySelectorAll("[data-storage-warning]").forEach(el => { el.hidden = !unavailable; });
  document.querySelectorAll("[data-storage-upload]").forEach(el => {
    el.setAttribute("aria-disabled", String(unavailable));
    if (unavailable) el.title = "文件存储暂不可用";
  });
}

function renderRoleState() {
  const role = demoRole();
  const roleKey = Object.keys(DEMO_ROLES).find(key => DEMO_ROLES[key] === role);
  document.querySelectorAll("[data-demo-name]").forEach(el => { el.textContent = role.name; });
  document.querySelectorAll("[data-need]").forEach(el => {
    const need = el.dataset.need;
    el.hidden = need === "member" ? role === DEMO_ROLES.outsider : !role[need];
  });
  document.querySelectorAll("[data-review-empty]").forEach(el => { el.hidden = !!role.maintainer; });
  const page = document.body.dataset.page;
  if (page && !demoAllowed(page, role)) {
    const main = document.querySelector(".main");
    if (main) main.innerHTML = `<div class="card pad"><h2>当前身份没有权限</h2><p>请联系所在部门部长确认身份。</p><a href="index.html">返回首页</a></div>`;
  }
  // 原型目录允许查看不同页面，普通页面链接保留正在演示的身份。
  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!/^[\w-]+\.html(?:[?#]|$)/.test(href)) return;
    const url = new URL(href, location.href);
    if (!url.searchParams.has('role')) url.searchParams.set('role', roleKey);
    a.setAttribute('href', url.pathname.split('/').pop() + url.search + url.hash);
  });
}

// 通用弹窗：点击 [data-dlg="x"] 打开 <template id="dlg-x">；[data-close] 关闭；[data-done="提示"] 关闭并提示
function openDlg(id) {
  const tpl = document.getElementById("dlg-" + id);
  if (!tpl) return;
  let mask = document.getElementById("gmask");
  if (!mask) {
    mask = document.createElement("div");
    mask.className = "mask"; mask.id = "gmask";
    mask.addEventListener("click", (e) => { if (e.target === mask) closeDlg(); });
    document.body.appendChild(mask);
  }
  mask.innerHTML = "";
  mask.appendChild(tpl.content.cloneNode(true));
  mask.hidden = false;
  renderStorageState();
  mask.classList.toggle("right", id === "ideas");   // 想法共建从右侧滑出
  renderIcons();
}
function closeDlg() { const m = document.getElementById("gmask"); if (m) { m.hidden = true; m.classList.remove("right"); } }
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.innerHTML = `<i class="ic" data-i="LuCircleCheck"></i><span>${msg}</span>`;
  document.body.appendChild(t); renderIcons();
  setTimeout(() => t.remove(), 2600);
}
document.addEventListener("click", (e) => {
  if (e.target.closest('[aria-disabled="true"]')) { e.preventDefault(); return; }
  const open = e.target.closest("[data-dlg]");
  if (open) { e.preventDefault(); openDlg(open.dataset.dlg); return; }
  const done = e.target.closest("[data-done]");
  if (done) { closeDlg(); toast(done.dataset.done); return; }
  if (e.target.closest("#gmask [data-close]")) closeDlg();
  // 弹窗里的分段选择、单选卡片可以点
  const seg = e.target.closest("#gmask .seg a, .seg.pick a");
  if (seg) seg.parentElement.querySelectorAll("a").forEach(a => a.classList.toggle("on", a === seg));
  const opt = e.target.closest(".opts > div");
  if (opt) opt.parentElement.querySelectorAll(":scope > div").forEach(o => o.classList.toggle("on", o === opt));
});

document.addEventListener("DOMContentLoaded", () => {
  if (location.pathname.endsWith('/workbench.html') && (location.hash === '#review' || new URLSearchParams(location.search).get('tab') === 'review')) {
    location.replace('resource_review.html' + location.search); return;
  }
  renderShell();
  renderStorageState();
  renderIdeas();
  renderIcons();
  if (location.hash.includes("anno")) document.body.classList.add("anno");
  renderProtoNav();
  renderRoleState();
  // 地址后加 #dlg-xxx 直接打开对应弹窗，便于截图和文档引用
  const m = location.hash.match(/dlg-([\w-]+)/);
  if (m) openDlg(m[1]);
});

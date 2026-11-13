// 原型公共框架：侧边栏、顶栏、图标、标注开关
const DEMO_RELEASE = '20261114-mp2';
const LOGO = `<img class="mark" src="assets/pku-logo.svg?v=20261031c" alt="北京大学校徽">`;

// ---------- 运行环境：同一套页面，三种外观（与 app 的判断一致） ----------
// desktop：电脑浏览器，侧边栏；mobile：手机浏览器（< 768px），顶栏 + 底部标签栏；
// mp：微信小程序。小程序只是一个 <web-view> 壳，加载的就是这些页面，标题栏和右上角胶囊由微信绘制。
// 真实小程序靠 UA 里的 miniProgram 识别；演示时加 ?env=mp，由页面自己画出微信标题栏和胶囊。
function mpReal() { return typeof navigator !== 'undefined' && /miniProgram/i.test(navigator.userAgent || ''); }
function mpSim() { return typeof location !== 'undefined' && new URLSearchParams(location.search).get('env') === 'mp' && !mpReal(); }
function demoEnv() {
  if (mpReal() || mpSim()) return 'mp';
  return typeof matchMedia !== 'undefined' && matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
}
// 小程序里的 AI 功能：微信要求先取得「深度合成」类目（算法备案，或模型方的算法备案 + 合作协议）。
// 开通前在小程序里隐藏 AI 入口，网页版不受影响；演示时加 ?mpai=1 查看开通后的样子。
const MP_AI_APPROVED = false;
function mpAi() { return MP_AI_APPROVED || (typeof location !== 'undefined' && new URLSearchParams(location.search).get('mpai') === '1'); }
// 切页时保留演示参数（真实小程序靠 UA 识别，不需要参数）
function carryEnv(url) {
  if (!mpSim()) return;
  url.searchParams.set('env', 'mp');
  if (mpAi()) url.searchParams.set('mpai', '1');
}
// 小程序里和网页不同的地方（预览页的说明与下面的处理一一对应）
const MP_DIFFS = [
  ["标题栏", "用微信的标题栏，文字取页面标题，不能隐藏；网页不再画自己的顶栏，通知移到「我的」"],
  ["下载与导出", "网页里不能下载文件。PDF、Word、Excel、PPT 跳到小程序原生页用微信打开，可转发；其他格式复制链接到浏览器下载；CSV、JSON 改为复制内容"],
  ["上传", "文件只能从微信聊天记录选择（手机里的文件先发到文件传输助手）；图片可从相册、拍照或聊天记录选择"],
  ["外部链接", "只能打开平台自己的域名和关联公众号的文章；问卷、飞书表单等链接改为复制"],
  ["AI 功能", "调用大模型就要「深度合成-AI问答」类目（信息抽取、OCR 也算）。开通前小程序里对所有人都不出现 AI 入口，也不引导去网页版；网页版照常"],
  ["登录与分享", "沿用手机号验证码登录；转发卡片带上当前页面，好友点开回到同一页"],
];
// 标签栏一级页面：小程序里不显示返回箭头
const mpTabPages = () => ['index.html', 'events.html', mpAi() ? 'assistant.html' : 'resources.html', 'me.html'];
(function markEnv() {
  if (typeof document === 'undefined' || !document.documentElement || typeof location === 'undefined') return;
  const html = document.documentElement, file = location.pathname.split('/').pop() || 'index.html';
  const framed = window.top !== window;
  // 电脑上直接打开 ?env=mp：放进手机外框预览，避免把手机界面拉宽
  if (mpSim() && !framed && !matchMedia('(max-width: 767px)').matches && file !== 'mobile.html') {
    const u = new URL(location.href); u.searchParams.delete('env');
    location.replace(`mobile.html?page=${encodeURIComponent(file + u.search + u.hash)}`); return;
  }
  if (framed) html.classList.add('in-frame');
  if (demoEnv() === 'mp') html.classList.add('mp');
  if (mpSim()) html.classList.add('mp-sim');
  if (demoEnv() === 'mp' && mpAi()) html.classList.add('mp-ai');
})();

const NAV = [
  { g: "", items: [
    ["home", "首页", "index.html", "LuHouse"],
  ] },
  { g: "学社资产", internal: true, items: [
    ["resources", "资源库", "resources.html", "LuDatabase", 0, 3],
    ["workbench", "工作台", "workbench.html", "LuClipboardList"],
    ["kb", "知识库", "kb.html", "LuLibrary"],
  ] },
  { g: "工具 · AI", items: [
    ["assistant", "AI 工具箱", "assistant.html", "LuWandSparkles"],
  ] },
  { g: "社区 · 活动广场", items: [
    ["events", "活动", "events.html", "LuCalendarDays"],
  ] },
  { g: "个人", items: [
    ["me", "个人中心", "me.html", "LuUser"],
  ] },
  { g: "管理 · 平台管理", items: [
    ["admin", "审核与管理", "admin.html", "LuShieldCheck"],
  ] },
];

// 演示身份仅用于展示；真实授权由 app 的后端负责。
const DEMO_ROLES = {
  president: { id: 1, dept: 3, president: true, leader: true, content: true, ideas: true, people: true, name: "同学 A", title: "会长团", backbone: true, admin: true },
  minister: { id: 2, dept: 1, depts: [1, 3], leader: true, ideas: true, people: true, name: "同学 B", title: "AI俱乐部、综合管理部 · 部长", backbone: true, admin: true },
  backbone: { id: 3, dept: 1, name: "同学 C", title: "AI俱乐部 · 骨干（内容管理）", backbone: true, content: true, admin: true },
  maintainer: { id: 4, dept: 2, name: "同学 D", title: "外联部 · 维护人", backbone: true, maintainer: true },
  member: { id: 5, name: "同学 E", title: "会员" },
  outsider: { id: 6, name: "同学 F", title: "未入名单" },
};
const PAGE_NEEDS = { resources: "backbone", kb: "member", workbench: "backbone", event_new: "backbone", assistant: "member", events: "member", admin: "admin" };
function demoRole() { return DEMO_ROLES[new URLSearchParams(location.search).get("role")] || DEMO_ROLES.minister; }
function demoAllowed(id, role = demoRole()) {
  const need = PAGE_NEEDS[id];
  return !need || (need === "member" ? role !== DEMO_ROLES.outsider : !!role[need]);
}
function demoVisible(id, role = demoRole()) { return demoAllowed(id, role) || !!role.backbone; }
// 与 app 一致：工作台计数 = 本人未完成工作 + 待我确认的工作；演示数据来自工作台页保存的浏览器记录。
const DEMO_TASK_SEED = [{ owner: 3, dept: 1, status: "doing", score: "unsubmitted" }, { owner: 3, dept: 1, status: "done", score: "pending" }, { owner: 4, dept: 2, status: "done", score: "approved" }];
function demoTaskTodo(role = demoRole()) {
  if (!role.backbone) return { open: 0, pending: 0, total: 0 };
  let tasks = DEMO_TASK_SEED;
  try { const stored = JSON.parse(localStorage.getItem("inno-task-demo-v1")); if (Array.isArray(stored)) tasks = stored; } catch { /* 使用示例数据 */ }
  const manages = t => !!role.leader && t.owner !== role.id && !!(role.president || t.dept === role.dept);
  const open = tasks.filter(t => t.owner === role.id && t.status !== "done").length, pending = tasks.filter(t => t.score === "pending" && manages(t)).length;
  return { open, pending, total: open + pending };
}
function demoNavCount(id, role = demoRole()) { return id === "workbench" ? demoTaskTodo(role).total : id === "resources" && role.maintainer ? 3 : 0; }
// 首页右栏：骨干及以上看“待我处理”计数，会员和未入名单看欢迎说明（与 app 首页一致）。
function renderHomeTodo() {
  const card = document.querySelector("[data-home-todo]"); if (!card) return;
  const role = demoRole(), welcome = document.querySelector("[data-home-welcome]");
  card.hidden = !role.backbone; welcome.hidden = !!role.backbone;
  welcome.querySelector("p").textContent = role === DEMO_ROLES.outsider ? "你尚未在学社成员名单中，请联系所在部门部长确认身份。" : "你现在是学社会员，可以看活动、使用 AI 工具箱和知识库（按文档范围开放）。资源库和任务工作台对骨干开放。";
  const todo = demoTaskTodo(role), task = card.querySelector("[data-home-task]");
  task.hidden = !todo.total;
  if (todo.pending) task.setAttribute("href", `workbench.html?tab=manage&v=${DEMO_RELEASE}`);
  task.querySelector(".b").textContent = `${todo.open} 项个人工作未完成 · ${todo.pending} 项工作待确认`;
  card.querySelector("[data-home-empty]").hidden = !!(todo.total || role.maintainer);
}
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
  ["任务与贡献待处理", "查看 TODO 和待确认贡献", "workbench.html", "LuClipboardList", "backbone"],
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
      NAV.filter(g => g.items.some(([id]) => demoVisible(id))).map(g => `<div class="nav-g">${g.g ? `<div class="gt">${g.g}${g.internal && demoRole().backbone ? `<span class="asset-lock" title="学社内部：资源库与工作台限骨干；知识库按文档范围开放" aria-label="学社内部资产">${ic("LuLock")}</span>` : ""}</div>` : ""}` + g.items.filter(([id]) => demoVisible(id)).map(([id, t, href, icon, lock, cnt]) =>
        demoAllowed(id) ? `<a class="nav-i ${id === page ? "on" : ""}" href="${href}">${ic(icon)}<span>${t}</span>${demoNavCount(id) ? `<span class="cnt">${demoNavCount(id)}</span>` : ""}</a>` : `<span class="nav-i off" aria-disabled="true" title="当前身份没有权限">${ic(icon)}<span>${t}</span>${!g.internal ? `<span class="lk">${ic("LuLock")}</span>` : ""}</span>`).join("") + `</div>`).join("") +
      `<a class="me" href="login.html"><span class="av av-sm a1">${demoRole().name.slice(-1)}</span><div class="who"><b>${demoRole().name}</b><span>${demoRole().title}</span></div>${ic("LuChevronDown")}</a>`;
  }
  // 不再用顶栏：搜索放在首页和各板块内部，通知铃铛放在侧边栏 Logo 旁边
  const tb = document.getElementById("tb");
  if (tb) tb.remove();
  if (sb && demoRole() !== DEMO_ROLES.outsider) sb.querySelector(".brand").after(makeBell("sb-bell"));
  if (sb) renderMobileShell(page);
  renderMpBar();
}

const myNotes = (role = demoRole()) => NOTES.filter(([, , href, , need]) => (!need || role[need]) && demoAllowed(pageId(href.split('#')[0]), role));
const notesHtml = () => myNotes().map(([t, d, href, icon]) => `<a href="${href}">${ic(icon)}<div><b>${t}</b><span>${d}</span></div></a>`).join("");
function makeBell(cls) {
  const bell = document.createElement("div");
  bell.className = "dd-wrap " + cls;
  bell.innerHTML = `<button class="icon-btn" aria-label="通知">${ic("LuBell")}<span class="dot"></span></button><div class="dd dd-note" hidden><div class="dd-h">通知<span>全部已读</span></div>${notesHtml()}</div>`;
  const box = bell.querySelector(".dd");
  bell.querySelector("button").onclick = (e) => { e.stopPropagation(); box.hidden = !box.hidden; };
  document.addEventListener("click", () => { box.hidden = true; });
  return bell;
}

// ---------- 手机外壳（< 768px 与小程序共用）：与 app 的 MobileShell 一致 ----------
// 顶栏：校徽 + 名称 + 通知；小程序里由微信标题栏代替，通知移到「我的」。
// 底部标签栏：首页 / 活动 / + / AI / 我的；小程序未开通 AI 类目时第四格换成资源库，保持五格、「+」居中。
const M_TABS = [["home", "首页", "index.html", "LuHouse"], ["events", "活动", "events.html", "LuCalendarDays", "member"], ["+", "", "", "LuPlus", "member"], ["assistant", "AI", "assistant.html", "LuSparkles", "member", "ai"], ["resources", "资源库", "resources.html", "LuDatabase", "member", "noai"], ["me", "我的", "me.html", "LuUser"]];
const M_ACTIONS = [["上报工作", "workbench.html?new=report", "backbone"], ["录入资源", "resource_new.html", "backbone"], ["上传文件", "kb.html#dlg-upload", "member"], ["录入活动", "event_new.html", "backbone"], ["想法共建", "#ideas", "member"]];
function demoHas(need, role = demoRole()) { return !need || (need === "member" ? role !== DEMO_ROLES.outsider : !!role[need]); }
function renderMobileShell(page) {
  const app = document.querySelector(".app"); if (!app) return;
  const top = document.createElement("header");
  top.className = "m-top";
  top.innerHTML = `<a class="m-brand" href="index.html">${LOGO}<b>北大创新学社</b></a><span class="grow"></span>`;
  if (demoRole() !== DEMO_ROLES.outsider) top.appendChild(makeBell("m-bell"));
  app.prepend(top);
  const cur = M_TABS.some(([id]) => id === page) ? page : "me";
  const bar = document.createElement("nav");
  bar.className = "m-tabbar"; bar.setAttribute("aria-label", "底部导航");
  const noAi = demoEnv() === "mp" && !mpAi();
  bar.innerHTML = M_TABS.filter(t => demoHas(t[4]) && t[5] !== (noAi ? "ai" : "noai")).map(([id, t, href, icon]) => id === "+"
    ? `<button class="m-tab" type="button" data-m-plus aria-label="新建">${`<span class="m-fab">${ic(icon)}</span>`}</button>`
    : `<a class="m-tab ${id === cur ? "on" : ""}" href="${href}">${ic(icon)}<span>${t}</span>${id === "me" && demoEnv() === "mp" && myNotes().length ? '<i class="m-dot"></i>' : ""}</a>`).join("");
  document.body.appendChild(bar);
  const plus = bar.querySelector("[data-m-plus]");
  if (plus) plus.onclick = () => mSheet("", M_ACTIONS.filter(([, , need]) => demoHas(need)).map(([t, href]) => href === "#ideas" ? `<button type="button" data-sheet-ideas>${t}</button>` : `<a href="${href}">${t}</a>`).join(""));
}
// 底部动作面板（对应 app 的 antd-mobile ActionSheet）
function mSheet(title, body) {
  closeSheet();
  const m = document.createElement("div");
  m.className = "m-sheet-mask"; m.id = "msheet";
  m.innerHTML = `<div class="m-sheet" role="dialog" aria-modal="true" aria-label="${title || "操作"}">${title ? `<div class="m-sheet-h">${title}</div>` : ""}<div class="m-sheet-b">${body}</div><button type="button" class="m-sheet-x" data-sheet-close>取消</button></div>`;
  m.addEventListener("click", (e) => {
    if (e.target === m || e.target.closest("[data-sheet-close]")) closeSheet();
    else if (e.target.closest("[data-sheet-ideas]")) { closeSheet(); openDlg("ideas"); }
    else if (e.target.closest("[data-sheet-done]")) { closeSheet(); toast(e.target.closest("[data-sheet-done]").dataset.sheetDone); }
  });
  document.body.appendChild(m); renderIcons();
}
function closeSheet() { document.getElementById("msheet")?.remove(); }

// ---------- 小程序：微信标题栏（演示时模拟；真实小程序由微信绘制） ----------
function mpTitle() { const t = document.title.split(" · ")[0]; return t === "首页" ? "北大创新学社" : t; }
function renderMpBar() {
  if (demoEnv() !== "mp") return;
  document.title = mpTitle();   // web-view 的标题栏文字取网页标题，去掉站名后缀
  if (!mpSim()) return;
  const file = location.pathname.split("/").pop() || "index.html";
  const bar = document.createElement("div");
  bar.className = "mp-bar";
  bar.innerHTML = `${mpTabPages().includes(file) ? "" : `<button class="mp-back" type="button" aria-label="返回">${ic("LuChevronRight")}</button>`}<div class="mp-title">${document.title}</div>` +
    `<div class="mp-capsule" title="微信右上角胶囊：由微信绘制，网页不能修改或遮挡"><span class="mp-more">•••</span><i></i><span class="mp-ring"></span></div>`;
  const back = bar.querySelector(".mp-back");
  if (back) back.onclick = () => { if (history.length > 1 && document.referrer) history.back(); else location.href = "index.html" + location.search; };
  document.body.prepend(bar);
}
// 小程序里通知没有顶栏可放，放在「我的」第一项
function renderMpNotes() {
  const list = document.querySelector(".me-list");
  if (!list || demoEnv() !== "mp" || demoRole() === DEMO_ROLES.outsider) return;
  const a = document.createElement("a");
  a.href = "#"; a.innerHTML = `${ic("LuBell")}<span class="grow">通知</span>${myNotes().length ? `<span class="tag t-red">${myNotes().length}</span>` : ""}`;
  a.onclick = (e) => { e.preventDefault(); mSheet("通知", `<div class="m-notes">${notesHtml()}</div>`); };
  list.prepend(a);
}

// 想法共建：每个页面右上角的入口，点开是右侧抽屉（不放在导航里）。想法只有提出人和处理人（会长团、AI俱乐部部长）能看
const ideaDrafts = new Map();
const demoEscape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
function readDemoData(key, fallback) { try { return JSON.parse(localStorage.getItem(`hub-${key}-${demoRole().id}`)) ?? fallback; } catch { return fallback; } }
function saveDemoData(key, value) { try { localStorage.setItem(`hub-${key}-${demoRole().id}`, JSON.stringify(value)); return true; } catch { toast('保存失败，请检查浏览器存储设置后重试'); return false; } }
// 想法在提出人和处理人之间共用一份演示数据（与 app 一致：处理人回复、改状态，提出人在抽屉里看到）
const IDEA_SEED = [
  { id: 'i1', title: '办活动助手', by: 2, name: '同学 B', status: '评估中', at: '3 天前', upd: '今天 09:12', scene: '骨干准备办一场活动时，先看往届怎么办的', input: '一句话描述活动想法', output: '往届复盘、可请嘉宾和对接人、模板、活动策划草稿',
    replies: [{ by: 1, name: '同学 A', body: '方向很好。想先确认：往届复盘现在都在飞书里，你希望它直接读飞书文档，还是先由各部门整理一份复盘清单？' }, { by: 2, name: '同学 B', body: '先用清单就行，读飞书的以后再说。' }] },
  { id: 'i2', title: '报名表自动分组', by: 5, name: '同学 E', status: '待处理', at: '今天', upd: '今天 08:40', scene: '活动报名后，希望按年级和兴趣自动分组。', input: '问卷导出的 Excel', output: '按年级分组的名单，每组 5 人', replies: [] },
  { id: 'i3', title: '会议纪要整理', by: 3, name: '同学 C', status: '待处理', at: '昨天', upd: '昨天', scene: '部门例会后，希望把录音整理成纪要和待办。', replies: [] },
  { id: 'i4', title: '表格批量处理', by: 2, name: '同学 B', status: '已排期', at: '上周', upd: '3 天前', scene: '招新报名表需要批量清洗、去重。', replies: [{ by: 1, name: '同学 A', body: '已排进 12 月，先做去重和格式统一。' }] },
  { id: 'i5', title: '换届交接包', by: 1, name: '同学 A', status: '已排期', at: '上周', upd: '上周', scene: '换届时，把本部门的资料、对接人和待办打包交给下一任。', replies: [] },
];
const IDEA_STATUS = ['待处理', '评估中', '已排期', '开发中', '已上线', '暂不做'];
function demoAllIdeas() { try { return JSON.parse(localStorage.getItem('hub-ideas-shared')) ?? IDEA_SEED; } catch { return IDEA_SEED; } }
function saveAllIdeas(value) { try { localStorage.setItem('hub-ideas-shared', JSON.stringify(value)); return true; } catch { toast('保存失败，请检查浏览器存储设置后重试'); return false; } }
function demoIdeas() { return demoAllIdeas().filter(i => i.by === demoRole().id); }
const ideaWho = (i, r) => `${r.name}${r.by === i.by ? '（提出人）' : '（处理人）'}`;
const IDEAS = `<div class="drawer" role="dialog" aria-modal="true" aria-label="想法共建"><div class="dr-h"><b>想法共建</b><span class="grow"></span><button class="icon-btn x" data-close aria-label="关闭想法共建">×</button></div>
  <div class="dr-b"><p class="small muted">功能建议、使用问题，或想交给 AI 的事，都可以写在这里。只有你和处理人（会长团、AI俱乐部部长）可见。</p>
  <form id="idea-form" class="idea-form"><h3>提一个想法</h3>
    <label>想法标题 <span class="muted">必填</span><input class="input" name="title" aria-label="想法标题" required placeholder="一句话概括，如：活动收藏更好找"></label>
    <label>想法内容 <span class="muted">必填</span><textarea class="input" name="scene" aria-label="想法内容" rows="5" required placeholder="在这里写具体想法：遇到了什么问题？希望怎么改？也可以举个例子。"></textarea></label>
    <details><summary>补充 AI 使用场景（选填）</summary><label>可提供的材料<input class="input" name="input" placeholder="如：问卷导出的 Excel"></label><label>期望的结果<input class="input" name="output" placeholder="如：每组 5 人的名单"></label></details>
    <button class="btn btn-p" type="submit" disabled>提交想法</button><p class="xs muted">关闭面板后草稿仍保留，刷新页面会清空。演示数据保存在当前浏览器，切换到处理人身份（同学 A、同学 B）可在「审核与管理 · 想法共建」处理。</p>
  </form><h3>我提的想法</h3><div id="idea-list"></div></div></div>`;
function renderIdeaList(openId) {
  const list = document.getElementById('idea-list'); if (!list) return;
  list.innerHTML = demoIdeas().map(i => `<details class="idea-record" ${i.id === openId ? 'open' : ''}><summary><b>${demoEscape(i.title)}</b><span class="tag">${demoEscape(i.status)}</span><span class="xs muted">${i.replies.length} 条回复 · 展开</span></summary>
    <p class="idea-body">${demoEscape(i.scene)}</p>${i.input || i.output ? `<p class="xs muted">材料：${demoEscape(i.input || '—')} · 期望：${demoEscape(i.output || '—')}</p>` : ''}
    <div class="thread">${i.replies.map(r => `<div><span class="xs muted">${demoEscape(ideaWho(i, r))}</span><p class="idea-body">${demoEscape(r.body)}</p></div>`).join('') || '<p class="xs muted">还没有回复，可继续补充说明</p>'}
    <form data-idea-reply="${demoEscape(i.id)}"><textarea class="input" aria-label="补充说明或回复处理人" name="body" rows="2" required placeholder="补充说明或回复处理人"></textarea><button type="submit" class="btn btn-p btn-sm">回复</button></form></div></details>`).join('');
  list.querySelectorAll('[data-idea-reply]').forEach(form => form.onsubmit = e => {
    e.preventDefault(); const body = form.elements.body.value.trim(); if (!body) return;
    const ideas = demoAllIdeas(), idea = ideas.find(i => i.id === form.dataset.ideaReply); if (!idea) return;
    idea.replies.push({ by: demoRole().id, name: demoRole().name, body }); idea.upd = '刚刚';
    if (saveAllIdeas(ideas)) { renderIdeaList(idea.id); toast('已回复，处理人会收到通知'); }
  });
}
function bindIdeaForm() {
  const form = document.getElementById('idea-form'); if (!form) return;
  const draft = ideaDrafts.get(demoRole().id) || {};
  for (const key of ['title', 'scene', 'input', 'output']) form.elements[key].value = draft[key] || '';
  const update = () => {
    ideaDrafts.set(demoRole().id, Object.fromEntries(new FormData(form)));
    form.querySelector('[type=submit]').disabled = !form.elements.title.value.trim() || !form.elements.scene.value.trim();
  };
  form.oninput = update; update();
  form.onsubmit = e => {
    e.preventDefault(); const fields = Object.fromEntries([...new FormData(form)].map(([k,v]) => [k,v.trim()]));
    if (!fields.title || !fields.scene) return;
    const idea = { ...fields, id: crypto.randomUUID(), by: demoRole().id, name: demoRole().name, status: '待处理', at: '刚刚', upd: '刚刚', replies: [] };
    if (!saveAllIdeas([idea, ...demoAllIdeas()])) return;
    form.reset(); update(); renderIdeaList(idea.id); renderHomeIdeas();
    document.getElementById('idea-list').scrollIntoView({block:'nearest',behavior:'smooth'}); toast('已提交，可在下方查看进展并补充说明');
  };
  renderIdeaList(); form.elements.title.focus();
}
function renderHomeIdeas() {
  const list = document.querySelector('[data-home-ideas]'); if (!list) return;
  list.innerHTML = demoIdeas().slice(0,3).map(i => `<button class="home-idea" data-dlg="ideas"><span class="grow"><b>${demoEscape(i.title)}</b><span class="xs muted">${i.replies.length} 条回复</span></span><span class="tag">${demoEscape(i.status)}</span></button>`).join('');
}
function renderIdeas() {
  const main = document.querySelector(".main");
  if (!main || !document.getElementById("sb") || demoRole() === DEMO_ROLES.outsider) return;
  const btn = document.createElement("button");
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
  ["知识库", "kb.html"], ["文档详情与版本", "kb_doc.html"], ["资源审核", "resource_review.html"],
  ["工作台 · 任务与积分", "workbench.html"], ["AI 工具箱", "assistant.html"], ["录入活动", "event_new.html"],
  ["活动", "events.html"], ["审核与管理", "admin.html"], ["个人中心", "me.html"], ["登录", "login.html"], ["手机与小程序预览", "mobile.html"],
  ["—— 暂不开放 ——"], ["批量导入", "upload.html"], ["资源对接", "needs.html"], ["AI 能力说明", "skills.html"], ["讨论", "community.html"], ["精选", "featured.html"], ["创业 · 项目", "projects.html"], ["创业 · 项目详情", "project_detail.html"], ["创业 · 投资人与机构", "investors.html"],
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
  // 与 app 一致的“有该身份时隐藏”，例如手机首页骨干用工作台替换活动入口。
  document.querySelectorAll("[data-hide-need]").forEach(el => { el.hidden = !!role[el.dataset.hideNeed]; });
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
    carryEnv(url);
    url.searchParams.set('v', DEMO_RELEASE);
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
  if (id === 'ideas') bindIdeaForm();
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
  if (mpIntercept(e.target)) { e.preventDefault(); return; }
  // 手机上整行可点（如资源库条目进入详情页）；电脑上仍在右侧显示详情
  const row = e.target.closest("[data-m-href]");
  if (row && demoEnv() !== "desktop" && !e.target.closest("a, button")) { const a = document.createElement("a"); a.href = row.dataset.mHref; document.body.appendChild(a); a.click(); return; }
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
  renderMpNotes();
  renderMpAiOff();
  renderStorageState();
  renderIdeas();
  renderHomeFeed();
  renderHomeTodo();
  renderDemoEvents();
  renderHomeIdeas();
  renderIcons();
  if (location.hash.includes("anno")) document.body.classList.add("anno");
  renderProtoNav();
  renderRoleState();
  // 地址后加 #dlg-xxx 直接打开对应弹窗，便于截图和文档引用
  const m = location.hash.match(/dlg-([\w-]+)/);
  if (m) openDlg(m[1]);
});

// 首页只保留一个内容区，活动和资料更新按标签切换。
function renderHomeFeed() {
  const tabs = document.querySelector('[data-home-tabs]'); if (!tabs) return;
  tabs.querySelectorAll('button').forEach(button => button.onclick = () => {
    const kind = button.dataset.feed;
    tabs.querySelectorAll('button').forEach(b => { b.classList.toggle('on', b === button); b.setAttribute('aria-pressed', String(b === button)); });
    document.querySelectorAll('[data-feed-panel]').forEach(panel => { panel.hidden = panel.dataset.feedPanel !== kind; });
    document.querySelector('[data-feed-all]').href = `${{event:'events',res:'resources',doc:'kb'}[kind]}.html?role=${new URLSearchParams(location.search).get('role') || 'minister'}`;
  });
}
function renderDemoEvents() {
  if (document.body.dataset.page !== 'events' || demoRole() === DEMO_ROLES.outsider) return;
  const cards = [...document.querySelectorAll('.card.feat, .card.ev')];
  const tabs = document.querySelector('[data-event-tabs]');
  let when = new URLSearchParams(location.search).get('when') || 'upcoming';
  const favorites = new Set(readDemoData('favorites', []));
  cards.forEach((card, index) => {
    card.dataset.eventId = String(index + 1); card.id = `event-${index + 1}`;
    const button = document.createElement('button'); button.className = 'btn btn-sm event-fav'; button.dataset.favorite = card.dataset.eventId;
    const original = card.querySelector('.btn-ghost'); if (original) original.replaceWith(button); else card.querySelector('.tx').appendChild(button);
    button.onclick = () => {
      const id = card.dataset.eventId, next = new Set(favorites); next.has(id) ? next.delete(id) : next.add(id);
      if (!saveDemoData('favorites', [...next])) return;
      favorites.clear(); next.forEach(id => favorites.add(id)); update(); toast(favorites.has(id) ? '已收藏，可在「我的收藏」查看' : '已取消收藏');
    };
  });
  function update() {
    cards.forEach((card,index) => {
      const on = favorites.has(card.dataset.eventId), button = card.querySelector('[data-favorite]');
      button.innerHTML = `${ic(on ? 'LuBookmarkCheck' : 'LuBookmark')}${on ? '已收藏' : '收藏'}`; button.setAttribute('aria-pressed', String(on)); button.setAttribute('aria-label', on ? '取消收藏' : '收藏');
      const past = index === cards.length - 1;
      card.hidden = when === 'fav' ? !on : when === 'past' ? !past : when === 'open' ? past || !card.textContent.includes('报名中') : past;
    });
    tabs.querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.when === when); b.setAttribute('aria-pressed', String(b.dataset.when === when)); if (b.dataset.when === 'fav') b.textContent = `我的收藏${favorites.size ? ' ' + favorites.size : ''}`; });
    const empty = document.querySelector('[data-event-empty]'); empty.hidden = cards.some(c => !c.hidden); empty.textContent = when === 'fav' ? '还没有收藏的活动，点活动卡片上的书签就能收藏' : '暂无符合条件的活动';
    document.querySelector('[data-favorite-hint]').hidden = when !== 'fav'; renderIcons();
  }
  tabs.querySelectorAll('button').forEach(b => b.onclick = () => { when = b.dataset.when; const url = new URL(location); url.searchParams.set('when', when); history.pushState(null, '', url); update(); });
  window.addEventListener('popstate', () => { when = new URLSearchParams(location.search).get('when') || 'upcoming'; update(); });
  update();
}
document.addEventListener('keydown', e => {
  const mask = document.getElementById('gmask'); if (!mask || mask.hidden) return;
  if (e.key === 'Escape') { closeDlg(); document.querySelector('.ideas-btn')?.focus(); }
  if (e.key === 'Tab') {
    const items = [...mask.querySelectorAll('button, input, textarea, summary, a[href]')].filter(el => !el.disabled && el.getClientRects().length);
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  }
});

document.addEventListener('click', e => {
  const link = e.target.closest('a[href]'); if (!link) return;
  const href = link.getAttribute('href'); if (!/^[\w-]+\.html(?:[?#]|$)/.test(href)) return;
  const url = new URL(href, location.href);
  if (!url.searchParams.has('role')) url.searchParams.set('role', new URLSearchParams(location.search).get('role') || 'minister');
  carryEnv(url);
  url.searchParams.set('v', DEMO_RELEASE);
  link.setAttribute('href', url.pathname.split('/').pop() + url.search + url.hash);
}, true);

// ---------- 小程序里网页做不到的操作：交给小程序原生页面，或改为复制 ----------
// 对应 app 里的处理：下载走 wx.downloadFile + wx.openDocument；上传走 wx.chooseMessageFile + 预签名地址 PUT。
function mpIntercept(t) {
  if (demoEnv() !== "mp") return false;
  const file = t.closest("[data-mp-file]");
  if (file) {
    const name = file.dataset.mpFile, office = /\.(docx?|xlsx?|pptx?|pdf)$/i.test(name);
    mSheet(name, (office
      ? `<button type="button" data-sheet-done="（演示）跳到小程序原生页下载并用微信打开，右上角可转发或用其他应用打开">在微信中打开<span class="sub">PDF、Word、Excel、PPT，可转发到聊天</span></button>`
      : `<div class="tip">这种格式微信不能直接打开</div>`) +
      `<button type="button" data-sheet-done="已复制下载链接（10 分钟内有效），可粘贴到浏览器下载">复制下载链接</button>`);
    return true;
  }
  const copy = t.closest("[data-mp-copy]");
  if (copy) { toast(`已复制 ${copy.dataset.mpCopy} 内容，可粘贴到聊天或表格`); return true; }
  if (t.closest("[data-mp-upload]")) {
    mSheet("上传文件", `<button type="button" data-sheet-done="（演示）已从聊天记录选择「交流纪要.docx」并上传">从微信聊天选择文件<span class="sub">小程序只能从聊天记录选文件</span></button><div class="tip">手机里的文件，先发到「文件传输助手」再选择</div>`);
    return true;
  }
  if (t.closest("[data-mp-image]")) {
    mSheet("添加图片", ["从相册选择", "拍照", "从聊天记录选择"].map(x => `<button type="button" data-sheet-done="已添加图片（自动压缩）">${x}</button>`).join(""));
    return true;
  }
  if (t.closest("[data-mp-img]")) {
    mSheet("报名二维码", `<button type="button" data-sheet-done="（演示）小程序原生页显示大图，长按可保存到相册或识别二维码">查看大图<span class="sub">长按保存或识别</span></button>`);
    return true;
  }
  const link = t.closest("[data-mp-link]");
  if (link) {
    mSheet("", `<div class="tip">小程序只能打开学社平台和关联公众号的文章，其他网址请复制到浏览器打开</div><button type="button" data-sheet-done="已复制链接">复制链接<span class="sub">${demoEscape(link.dataset.mpLink)}</span></button>`);
    return true;
  }
  return false;
}
// 小程序未开通「深度合成」类目：小程序里对所有人都不提供 AI，也不引导去网页版（运营规范 2.5.19、2.8）。
// 直接打开 AI 工具箱的链接（如转发卡片）回到首页。
function renderMpAiOff() {
  if (demoEnv() !== "mp" || mpAi() || document.body.dataset.page !== "assistant") return;
  location.replace("index.html" + location.search);
}

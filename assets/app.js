// 原型公共框架：侧边栏、顶栏、图标、标注开关
const LOGO = `<img class="mark" src="assets/pku-logo.svg?v=20261031b" alt="北京大学校徽">`;

const NAV = [
  { g: "", items: [
    ["home", "首页", "index.html", "LuHouse"],
  ] },
  { g: "学社资产 · 成员可见", items: [
    ["resources", "资源库", "resources.html", "LuDatabase", 1],
    ["kb", "知识库", "kb.html", "LuLibrary", 1],
    ["workbench", "工作台", "workbench.html", "LuTarget", 1, 5],
  ] },
  { g: "工具 · AI", items: [
    ["assistant", "AI 工具箱", "assistant.html", "LuWandSparkles"],
  ] },
  { g: "社区 · 内测版", items: [
    ["events", "活动", "events.html", "LuCalendarDays"],
  ] },
  { g: "管理 · 会长团权限", items: [
    ["admin", "平台管理", "admin.html", "LuShieldCheck", 1],
  ] },
];

function ic(n) { return `<i class="ic" data-i="${n}"></i>`; }

// 通知：只推和自己有关、需要处理或需要知道结果的事
const NOTES = [
  ["待你审批：读书会第 4 期活动申报", "同学 C 申报 · 今天", "activity_review.html", "LuCalendarCheck"],
  ["2 条资源待审核", "外联部提交 · 含 1 条疑似重复", "workbench.html#review", "LuInbox"],
  ["同学 C 有 1 项工作已逾期", "可以督办 · 昨天", "workbench.html", "LuClock"],
  ["你录入的资源已通过审核", "示例机构 F · 2 天前", "resource_detail.html", "LuCircleCheck"],
];

function renderShell() {
  const page = document.body.dataset.page;
  const sb = document.getElementById("sb");
  if (sb) {
    sb.className = "sb";
    sb.innerHTML = `<a class="brand" href="index.html">${LOGO}<div class="wm"><b>北大创新学社</b><span>资源 · 工具 · 社区</span></div></a>` +
      NAV.map(g => `<div class="nav-g">${g.g ? `<div class="gt">${g.g}</div>` : ""}` + g.items.map(([id, t, href, icon, lock, cnt]) =>
        `<a class="nav-i ${id === page ? "on" : ""}" href="${href}">${ic(icon)}<span>${t}</span>${cnt ? `<span class="cnt">${cnt}</span>` : lock ? `<span class="lk">${ic("LuLock")}</span>` : ""}</a>`).join("") + `</div>`).join("") +
      `<a class="me" href="#"><span class="av av-sm a1">张</span><div class="who"><b>张同学</b><span>AI俱乐部 · 部长</span></div>${ic("LuSettings")}</a>`;
  }
  // 不再用顶栏：搜索放在首页和各板块内部，通知铃铛放在侧边栏 Logo 旁边
  const tb = document.getElementById("tb");
  if (tb) tb.remove();
  if (sb) {
    const bell = document.createElement("div");
    bell.className = "dd-wrap sb-bell";
    bell.innerHTML = `<button class="icon-btn">${ic("LuBell")}<span class="dot"></span></button>
      <div class="dd dd-note" hidden><div class="dd-h">通知<span>全部已读</span></div>${NOTES.map(([t, d, href, icon]) =>
        `<a href="${href}">${ic(icon)}<div><b>${t}</b><span>${d}</span></div></a>`).join("")}</div>`;
    sb.querySelector(".brand").after(bell);
    const box = bell.querySelector(".dd");
    bell.querySelector("button").onclick = (e) => { e.stopPropagation(); box.hidden = !box.hidden; };
    document.addEventListener("click", () => { box.hidden = true; });
  }

}

// 想法共建：每个页面右上角的入口，点开是右侧抽屉（不放在导航里）
const IDEAS = `<div class="drawer"><div class="dr-h"><b>想法共建</b><span class="grow"></span><span class="icon-btn x" data-close>×</span></div>
  <div class="dr-b"><div class="row" style="margin-bottom:12px"><p class="small muted grow">有什么重复、费时的事想交给 AI，或者对平台有什么想法？写清谁、在什么场景、给它什么、想要什么。大家投票，票多的优先做</p><span class="btn btn-p btn-sm" data-done="已提交，大家可以投票了">提一个想法</span></div>
  <div class="seg pick" style="margin-bottom:10px"><a class="on">全部</a><a>想法</a><a>评审中</a><a>已排期</a><a>已上线</a></div>
  ${`<div>
  <div class="idea"><div class="vote on"><b style="font-size:11px">▲</b>3</div><div class="grow"><div class="row"><span class="b">办活动助手</span><span class="tag t-amber">评审中</span></div><div class="small" style="margin-top:4px">骨干准备办一场活动时，先看往届怎么办的</div><div class="xs muted" style="margin-top:2px">给它：一句话描述活动想法 → 得到：往届复盘、可请嘉宾和对接人、模板、申报表草稿</div><div class="xs muted" style="margin-top:4px">张同学 · 来自 技术文档 · AI 二期</div></div></div>
  <div class="idea"><div class="vote"><b style="font-size:11px">▲</b>2</div><div class="grow"><div class="row"><span class="b">会议纪要整理</span><span class="tag">想法</span></div><div class="small" style="margin-top:4px">部门例会、对接会结束后整理纪要和待办</div><div class="xs muted" style="margin-top:2px">给它：会议文字记录 → 得到：纪要、决议、待办；待办可一键建成工作台任务</div><div class="xs muted" style="margin-top:4px">同学 C · 来自 研讨会（元宝纪要）</div></div></div>
  <div class="idea"><div class="vote"><b style="font-size:11px">▲</b>1</div><div class="grow"><div class="row"><span class="b">表格批量处理</span><span class="tag">想法</span></div><div class="small" style="margin-top:4px">报名表、问卷导出后要逐行分类、打标签、写摘要</div><div class="xs muted" style="margin-top:2px">给它：一张 Excel + 一句处理要求 → 得到：多出一列 AI 结果，可导出</div></div></div>
  <div class="idea"><div class="vote"><b style="font-size:11px">▲</b>1</div><div class="grow"><div class="row"><span class="b">换届交接包</span><span class="tag t-blue">已排期</span></div><div class="small" style="margin-top:4px">换届时离任和接任同学交接</div><div class="xs muted" style="margin-top:2px">给它：离任同学名下的资源、资料、进行中工作 → 得到：交接清单和摘要</div></div></div>
  <div class="idea"><div class="vote"><b style="font-size:11px">▲</b>0</div><div class="grow"><div class="row"><span class="b">推文与通知生成</span><span class="tag">想法</span></div><div class="small" style="margin-top:4px">宣传和活动负责人写推文、群通知</div><div class="xs muted" style="margin-top:2px">给它：活动信息或申报表 → 得到：推文初稿、群通知、海报文案</div></div></div>
</div>`}</div></div>`;
function renderIdeas() {
  const main = document.querySelector(".main");
  if (!main || !document.getElementById("sb")) return;
  const btn = document.createElement("span");
  btn.className = "btn btn-sm ideas-btn"; btn.innerHTML = `${ic("LuLightbulb")}想法共建`;
  main.appendChild(btn);
  const tpl = document.createElement("template"); tpl.id = "dlg-ideas"; tpl.innerHTML = IDEAS; document.body.appendChild(tpl);
  btn.onclick = () => openDlg("ideas");
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
  ["批量导入", "upload.html"], ["知识库", "kb.html"], ["文档阅读", "kb_doc.html"], ["工作台", "workbench.html"],
  ["AI 工具箱", "assistant.html"], ["录入活动", "event_new.html"], ["活动申报审批", "activity_review.html"],
  ["活动", "events.html"], ["平台管理", "admin.html"], ["登录", "login.html"], ["手机与飞书", "mobile.html"],
  ["—— 暂不开放 ——"], ["AI 能力说明", "skills.html"], ["讨论", "community.html"], ["精选", "featured.html"], ["创业 · 项目", "projects.html"], ["创业 · 项目详情", "project_detail.html"], ["创业 · 投资人与机构", "investors.html"],
];
function renderProtoNav() {
  if (new URLSearchParams(location.search).has("shot")) return;
  const cur = location.pathname.split("/").pop() || "index.html";
  const box = document.createElement("div");
  box.className = "proto-nav";
  box.innerHTML = `<div class="pn-panel"><div class="pn-h">原型页面</div>` +
    PAGES.map(([t, f]) => !f ? `<div class="pn-h">${t}</div>` : `<a class="${f === cur ? "on" : ""}" href="${f}${document.body.classList.contains("anno") ? "#anno" : ""}"><span>${t}</span><code>${f}</code></a>`).join("") +
    `<label class="pn-anno"><input type="checkbox" ${document.body.classList.contains("anno") ? "checked" : ""}> 显示编号标注</label></div><button class="pn-btn">原型目录</button>`;
  document.body.appendChild(box);
  box.querySelector(".pn-btn").onclick = () => box.classList.toggle("open");
  box.querySelector(".pn-anno input").onchange = (e) => {
    document.body.classList.toggle("anno", e.target.checked);
    location.hash = e.target.checked ? "anno" : "";
    box.querySelectorAll(".pn-panel a").forEach(a => { a.href = a.getAttribute("href").replace("#anno", "") + (e.target.checked ? "#anno" : ""); });
  };
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
  renderShell();
  renderIdeas();
  renderIcons();
  if (location.hash.includes("anno")) document.body.classList.add("anno");
  renderProtoNav();
  // 地址后加 #dlg-xxx 直接打开对应弹窗，便于截图和文档引用
  const m = location.hash.match(/dlg-([\w-]+)/);
  if (m) openDlg(m[1]);
});

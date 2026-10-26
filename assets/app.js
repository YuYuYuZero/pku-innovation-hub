// 原型公共框架：侧边栏、顶栏、图标、标注开关
const LOGO = `<img class="mark" src="assets/pku-logo.svg?v=20261026c" alt="北京大学校徽">`;

const NAV = [
  { g: "", items: [
    ["home", "首页", "index.html", "LuHouse"],
  ] },
  { g: "学社资产 · 成员可见", items: [
    ["resources", "资源库", "resources.html", "LuDatabase", 1],
    ["kb", "知识库", "kb.html", "LuLibrary", 1],
    ["needs", "资源对接", "needs.html", "LuHandshake", 1],
  ] },
  { g: "工具 · AI", items: [
    ["assistant", "AI 助手", "assistant.html", "LuSparkles"],
    ["skills", "助手技能", "skills.html", "LuWandSparkles"],
  ] },
  { g: "社区 · 北大同学", items: [
    ["community", "讨论", "community.html", "LuMessagesSquare"],
    ["events", "活动", "events.html", "LuCalendarDays"],
    ["featured", "精选", "featured.html", "LuBookOpen"],
  ] },
  { g: "管理 · 维护人", items: [
    ["admin", "审核与管理", "admin.html", "LuShieldCheck", 1, 5],
  ] },
];

function ic(n) { return `<i class="ic" data-i="${n}"></i>`; }

function renderShell() {
  const page = document.body.dataset.page;
  const sb = document.getElementById("sb");
  if (sb) {
    sb.className = "sb";
    sb.innerHTML = `<a class="brand" href="index.html">${LOGO}<div class="wm"><b>北大创新学社</b><span>资源 · 工具 · 社区</span></div></a>` +
      NAV.map(g => `<div class="nav-g">${g.g ? `<div class="gt">${g.g}</div>` : ""}` + g.items.map(([id, t, href, icon, lock, cnt]) =>
        `<a class="nav-i ${id === page ? "on" : ""}" href="${href}">${ic(icon)}<span>${t}</span>${cnt ? `<span class="cnt">${cnt}</span>` : lock ? `<span class="lk">${ic("LuLock")}</span>` : ""}</a>`).join("") + `</div>`).join("") +
      `<a class="me" href="#"><span class="av av-sm a1">张</span><div class="who"><b>张同学</b><span>AI俱乐部 · 学社成员</span></div>${ic("LuSettings")}</a>`;
  }
  const tb = document.getElementById("tb");
  if (tb) {
    tb.className = "tb";
    const ph = document.body.dataset.search || "搜索资源、资料、活动、帖子，或直接问 AI";
    tb.innerHTML = `<div class="gsearch rel">${ic("LuSearch")}<span class="ph">${ph}</span><span class="kbd">⌘ K</span><a class="ask" href="assistant.html">${ic("LuSparkles")}问 AI</a></div>
      <div class="sp"></div>
      <a class="btn btn-p" href="#">${ic("LuPlus")}新建</a>
      <a class="icon-btn" href="#">${ic("LuBell")}<span class="dot"></span></a>`;
  }
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
  ["批量导入", "upload.html"], ["知识库", "kb.html"], ["文档阅读", "kb_doc.html"], ["资源对接", "needs.html"],
  ["AI 助手", "assistant.html"], ["助手技能", "skills.html"], ["技能：会议纪要", "tool_minutes.html"], ["讨论", "community.html"],
  ["活动", "events.html"], ["精选", "featured.html"], ["审核与管理", "admin.html"], ["登录", "login.html"], ["手机与飞书", "mobile.html"],
];
function renderProtoNav() {
  if (new URLSearchParams(location.search).has("shot")) return;
  const cur = location.pathname.split("/").pop() || "index.html";
  const box = document.createElement("div");
  box.className = "proto-nav";
  box.innerHTML = `<div class="pn-panel"><div class="pn-h">原型页面</div>` +
    PAGES.map(([t, f]) => `<a class="${f === cur ? "on" : ""}" href="${f}${document.body.classList.contains("anno") ? "#anno" : ""}"><span>${t}</span><code>${f}</code></a>`).join("") +
    `<label class="pn-anno"><input type="checkbox" ${document.body.classList.contains("anno") ? "checked" : ""}> 显示编号标注</label></div><button class="pn-btn">原型目录</button>`;
  document.body.appendChild(box);
  box.querySelector(".pn-btn").onclick = () => box.classList.toggle("open");
  box.querySelector(".pn-anno input").onchange = (e) => {
    document.body.classList.toggle("anno", e.target.checked);
    location.hash = e.target.checked ? "anno" : "";
    box.querySelectorAll(".pn-panel a").forEach(a => { a.href = a.getAttribute("href").replace("#anno", "") + (e.target.checked ? "#anno" : ""); });
  };
}

document.addEventListener("DOMContentLoaded", () => {
  renderShell();
  renderIcons();
  if (location.hash.includes("anno")) document.body.classList.add("anno");
  renderProtoNav();
});

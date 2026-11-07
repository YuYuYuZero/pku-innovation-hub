// 静态演示数据只保存在当前浏览器；正式权限、审计和积分计算由 app 的数据库负责。
const TASK_RULES = {
  visible: (r, t) => !!r.backbone && !!(t.owner === r.id || r.president || (r.leader && t.dept === r.dept)),
  manager: (r, t) => !!r.leader && t.owner !== r.id && !!(r.president || t.dept === r.dept),
  reporter: r => !!r.backbone && !r.leader,
  points: (online, offline, k) => Math.round((online + 2 * offline) * Math.round(k * 10) / 6) / 100,
  period: (p, today) => {
    const [y, m] = today.split('-').map(Number);
    if (p === 'all') return '';
    if (p === 'month') return today.slice(0, 7) + '-01';
    if (p === 'year') return `${m >= 9 ? y : y - 1}-09-01`;
    return m >= 8 ? `${y}-08-01` : m >= 2 ? `${y}-02-01` : `${y - 1}-08-01`;
  },
};

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('task-app');
  if (!root || !demoAllowed('workbench')) return;
  const role = demoRole(), leader = !!role.leader;
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone:'Asia/Shanghai' }).format(new Date());
  const storageKey = 'inno-task-demo-v1';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = v => v == null ? '—' : Number(v).toFixed(2);
  const person = id => Object.values(DEMO_ROLES).find(r => r.id === id)?.name || '同学';
  const dept = id => id === 1 ? 'AI俱乐部' : '外联部';
  const scoreLabel = {unsubmitted:'未提交贡献',pending:'待确认贡献',returned:'退回补充',approved:'积分已确认',rejected:'贡献未通过'};
  const statusLabel = {todo:'待办',doing:'进行中',done:'已完成'};
  const actionLabel = {created:'建立任务',progress:'更新进展',submitted:'提交完成',withdrawn:'撤回修改',followup:'跟进提醒',rate:'分配系数',approve:'确认贡献',calibrate:'校准积分',return:'退回补充',reject:'驳回贡献'};
  const ks = [[1,'基础事务'],[1.1,'常规执行'],[1.2,'复杂工作'],[1.3,'组织统筹'],[1.4,'重大专项']];
  const newTask = (id, title, owner, d) => ({id,title,owner,dept:d,note:'',due:'',date:'',online:0,offline:0,k:null,final:null,base:null,evidence:'',status:'todo',score:'unsubmitted',reason:'',history:[]});
  let tasks = [
    {...newTask(1,'整理本周会员资料',3,1),note:'核对资料，整理本周更新',status:'doing'},
    {...newTask(2,'会员交流活动支持',3,1),note:'线上筹备 2 小时，线下执行 3 小时，成果已归档',date:today,online:120,offline:180,k:1.2,status:'done',score:'pending'},
    {...newTask(3,'企业交流资料整理',4,2),note:'归档交流资料并完成对接说明',date:today,online:120,offline:180,k:1,base:8,final:8,status:'done',score:'approved'},
  ];
  try { const stored = JSON.parse(localStorage.getItem(storageKey)); if (Array.isArray(stored) && stored.every(t => t.id && Array.isArray(t.history))) tasks = stored; } catch { /* 新会话使用示例数据 */ }
  const save = () => localStorage.setItem(storageKey, JSON.stringify(tasks));
  let tab = new URLSearchParams(location.search).get('tab') === 'points' ? 'points' : 'tasks', filter = 'open', period = 'term', keyword = '', historyKeyword = '';
  const dialog = document.createElement('dialog'); dialog.className = 'task-dialog'; dialog.setAttribute('aria-label','任务详情'); document.body.appendChild(dialog);
  const taskUrl = id => { const u = new URL(location.href); id ? u.searchParams.set('task',id) : u.searchParams.delete('task'); u.searchParams.delete('new'); history.replaceState({},'',u); };
  const close = () => { dialog.close(); taskUrl(null); };
  dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
  const button = (a, text, primary = false) => `<button type="button" class="btn${primary ? ' btn-p' : ''}" data-action="${a}">${text}</button>`;
  const field = (label, html) => `<div class="field"><label class="label">${label}</label>${html}</div>`;
  const input = (name, label, value = '', type = 'text', extra = '') => `<input name="${name}" aria-label="${label}" type="${type}" value="${esc(value)}" ${extra}>`;
  const kSelect = k => `<select name="k" aria-label="任务难度系数"><option value="">由部长 / 会长团分配</option>${ks.map(([n,l]) => `<option value="${n}" ${Number(k) === n ? 'selected' : ''}>${n.toFixed(1)} · ${l}</option>`).join('')}</select>`;
  const record = (t, action, reason = '', before = null) => {
    t.history.unshift({action,reason,actor:role.name,at:new Date().toISOString(),before,after:{k:t.k,final:t.final,note:t.note,online:t.online,offline:t.offline}});
    save(); close(); render(); toast('演示操作已保存');
  };
  function modal(title, html, act) {
    dialog.innerHTML = `<header><h3>${title}</h3>${button('close','关闭')}</header><form>${html}<p class="task-error" role="alert"></p></form>`;
    dialog.onclick = e => { const a = e.target.closest('[data-action]')?.dataset.action; if (!a) return; if (a === 'close') return close(); const f = dialog.querySelector('form'); try { act(a, f); } catch (error) { dialog.querySelector('.task-error').textContent = error.message; } };
    dialog.querySelector('form').onsubmit = e => e.preventDefault();
    if (!dialog.open) dialog.showModal();
  }
  function createTask(source = null) {
    const people = Object.values(DEMO_ROLES).filter(r => TASK_RULES.reporter(r) && (role.president || r.dept === role.dept));
    modal(source ? '从历史工作复用' : leader ? '分配任务' : '上报任务', `${source ? '<p class="notice">本次工时、日期、凭证、系数和积分重新填写与确认。</p>' : ''}
      ${leader ? field('负责人',`<select name="owner" aria-label="任务负责人" required><option value="">选择管理范围内的骨干</option>${people.map(p => `<option value="${p.id}">${p.name} · ${dept(p.dept)}</option>`).join('')}</select>`) : ''}
      ${field('任务名称',input('title','任务名称',source?.title || '', 'text','required maxlength="200"'))}
      ${field('任务内容',`<textarea name="note" aria-label="任务内容" rows="3">${esc(source?.note || '')}</textarea>`)}
      ${field('截止日期（可选）',input('due','任务截止日期','','date'))}
      ${leader ? field('难度系数（可稍后分配）',kSelect(null)) : '<p class="notice">姓名、部门按登录身份记录。系数由部长 / 会长团分配；你只需填写任务与实际进展。</p>'}
      <div class="task-actions">${button('create','建立任务',true)}</div>`, (a,f) => {
      if (a !== 'create' || !f.reportValidity()) return;
      const owner = leader ? Number(f.elements.owner.value) : role.id;
      const r = Object.values(DEMO_ROLES).find(r => r.id === owner);
      if (!r || !TASK_RULES.reporter(r) || (leader && !role.president && r.dept !== role.dept)) throw new Error('请选择管理范围内的普通骨干');
      const t = newTask(Math.max(...tasks.map(t => t.id),0) + 1,f.elements.title.value.trim(),owner,r.dept);
      if (!t.title) throw new Error('请填写任务名称');
      Object.assign(t,{note:f.elements.note.value,due:f.elements.due.value,k:leader && f.elements.k.value ? Number(f.elements.k.value) : null,source:source?.id || null});
      tasks.unshift(t); record(t,'created'); detail(t);
    });
  }
  function detail(t) {
    if (!TASK_RULES.visible(role,t)) return;
    taskUrl(t.id);
    const own = t.owner === role.id && TASK_RULES.reporter(role), manager = TASK_RULES.manager(role,t), editable = own && ['unsubmitted','returned'].includes(t.score);
    modal('任务详情', `<p style="margin-bottom:16px">${person(t.owner)} · ${dept(t.dept)} <span class="tag">${statusLabel[t.status]}</span> <span class="tag">${scoreLabel[t.score]}</span></p>
      ${t.reason ? `<p class="notice">确认 / 校准说明：${esc(t.reason)}</p>` : ''}
      ${field('任务名称',editable ? input('title','任务名称',t.title,'text','required maxlength="200"') : `<b>${esc(t.title)}</b>`)}
      ${field('进展与成果',editable ? `<textarea name="note" aria-label="进展与成果" rows="3">${esc(t.note)}</textarea>` : `<p style="white-space:pre-wrap">${esc(t.note || '尚未填写')}</p>`)}
      ${editable ? field('任务状态',`<select name="status" aria-label="任务状态"><option value="todo" ${t.status === 'todo' ? 'selected' : ''}>待办</option><option value="doing" ${t.status === 'doing' ? 'selected' : ''}>进行中</option></select>`) : ''}
      <div class="task-two">${field('截止日期',editable || (manager && t.status !== 'done') ? input('due','任务截止日期',t.due,'date') : esc(t.due || '—'))}${field('实际工作日期',editable ? input('date','实际工作日期',t.date || today,'date',`max="${today}"`) : esc(t.date || '—'))}</div>
      <div class="task-two">${field('线上工时（小时）',editable ? input('online','线上工时',t.online / 60,'number','min="0" step="0.25"') : `${t.online / 60} 小时 × 1`)}${field('线下工时（小时）',editable ? input('offline','线下工时',t.offline / 60,'number','min="0" step="0.25"') : `${t.offline / 60} 小时 × 2`)}</div>
      ${editable ? '<p class="small muted">每次 0.25 小时；线上与线下分开，不重复计算。超过 12 小时请在成果中说明。</p>' : ''}
      ${field('成果 / 凭证链接（可选）',editable ? input('evidence','成果凭证链接',t.evidence,'url') : t.evidence ? `<a class="lnk" href="${esc(t.evidence)}" target="_blank" rel="noreferrer">查看凭证</a>` : '—')}
      <div class="task-score card pad"><h3>贡献积分</h3><p class="small muted">基础积分 =（线上小时 + 2 × 线下小时）× 难度系数；确认后才计入权益参考。</p><p>难度 ${t.k || '待分配'} · 基础 ${t.k ? money(TASK_RULES.points(t.online,t.offline,t.k)) : '—'} 分 · <b>确认积分 ${t.score === 'approved' ? money(t.final) : '待确认'}</b></p>${t.score === 'approved' ? `<p class="small muted">校准差额 ${money(t.final - t.base)} 分</p>` : ''}</div>
      ${editable ? `<div class="task-actions">${button('progress','保存进展')}${button('submitted','提交完成，等待确认',true)}</div>` : ''}
      ${own && t.score === 'pending' ? button('withdrawn','撤回修改') : ''}
      ${manager && t.score !== 'rejected' ? `<div class="task-manage card pad"><h3>部长 / 会长团处理</h3>${field('任务难度系数',kSelect(t.k))}
        ${['pending','approved'].includes(t.score) ? field('最终积分（留空按基础积分）',input('final','最终积分',t.final ?? '','number','min="0" max="999999999.99" step="0.01"')) : ''}
        ${field('处理说明 / 校准原因','<textarea name="reason" aria-label="处理说明" rows="2" placeholder="退回、驳回和积分校准必填；原始上报内容会保留"></textarea>')}
        <div class="task-actions">${t.status !== 'done' ? button('followup','保存截止日并提醒') : ''}${t.score !== 'approved' ? button('rate','分配系数') : ''}${t.score === 'pending' ? button('return','退回补充') + button('reject','驳回贡献') + button('approve','确认贡献',true) : ''}${t.score === 'approved' ? button('calibrate','保存积分校准',true) : ''}</div></div>` : ''}
      <h3 style="margin-top:20px">操作记录</h3>${t.history.map(h => `<div class="task-history"><b>${actionLabel[h.action]}</b><span class="small muted">${esc(h.actor)} · ${new Date(h.at).toLocaleString('zh-CN')}</span><p>${esc(h.reason)}</p>${['approve','calibrate','rate'].includes(h.action) ? `<p>系数 ${h.before?.k || '未分配'} → ${h.after.k} · 积分 ${money(h.before?.final)} → ${money(h.after.final)}</p>` : `<p class="small muted">${esc(h.after.note)} · 线上 ${h.after.online / 60} 小时 / 线下 ${h.after.offline / 60} 小时</p>`}</div>`).join('') || '<p class="small muted">示例记录；新操作会在此保留。</p>'}`, (action,f) => {
      const value = n => f.elements[n]?.value || '', before = {k:t.k,final:t.final};
      if (['progress','submitted','withdrawn'].includes(action)) {
        if (!own) throw new Error('只能更新本人任务');
        if (action === 'withdrawn') { if (t.score !== 'pending') throw new Error('只有待确认记录可撤回'); Object.assign(t,{score:'unsubmitted',status:'doing'}); return record(t,action); }
        if (!editable || !f.reportValidity()) return;
        const online = Number(value('online')) * 60, offline = Number(value('offline')) * 60;
        if (![online,offline].every(v => Number.isFinite(v) && v >= 0 && v % 15 === 0)) throw new Error('工时须为 0.25 小时的整数倍');
        if (!value('title').trim()) throw new Error('请填写任务名称');
        if (value('evidence') && !/^https?:\/\//.test(value('evidence'))) throw new Error('凭证链接应以 http:// 或 https:// 开头');
        if (action === 'submitted' && (!value('note').trim() || !value('date') || value('date') > today || online + offline <= 0)) throw new Error('请填写成果、实际工作日期和有效工时');
        Object.assign(t,{title:value('title').trim(),note:value('note'),due:value('due'),date:value('date'),online,offline,evidence:value('evidence'),status:action === 'submitted' ? 'done' : value('status'),score:action === 'submitted' ? 'pending' : 'unsubmitted'});
        return record(t,action);
      }
      if (!manager) throw new Error('仅部长 / 会长团可以处理');
      const reason = value('reason').trim(), k = Number(value('k'));
      if (action === 'followup') { t.due = value('due'); return record(t,action,reason); }
      if (['return','reject'].includes(action)) {
        if (t.score !== 'pending' || !reason) throw new Error('仅待确认记录可退回或驳回，请填写原因');
        Object.assign(t,{score:action === 'return' ? 'returned' : 'rejected',status:action === 'return' ? 'doing' : 'done',reason}); return record(t,action,reason);
      }
      if (!ks.some(([n]) => n === k)) throw new Error('请选择 1.0 至 1.4 的五档难度系数');
      if (action === 'rate' && !['approved','rejected'].includes(t.score)) { t.k = k; return record(t,action,reason,before); }
      if (!((action === 'approve' && t.score === 'pending') || (action === 'calibrate' && t.score === 'approved'))) throw new Error('当前状态不能进行此操作');
      const base = TASK_RULES.points(t.online,t.offline,k), final = value('final') === '' ? base : Number(value('final'));
      if (!Number.isFinite(final) || final < 0 || final >= 1e9 || Math.abs(Math.round(final*100) - final*100) > 1e-7) throw new Error('积分须为非负数，最多两位小数');
      if ((action === 'calibrate' || final !== base) && !reason) throw new Error('积分校准必须填写原因');
      Object.assign(t,{k,base,final,score:'approved',reason}); record(t,action,reason,before);
    });
  }
  function render() {
    const visible = tasks.filter(t => TASK_RULES.visible(role,t)), from = TASK_RULES.period(period,today);
    const approved = visible.filter(t => t.score === 'approved' && t.date >= from && t.date <= today);
    const total = approved.reduce((c,t) => c + Math.round(t.final * 100),0) / 100;
    const shown = visible.filter(t => `${t.title} ${t.note} ${person(t.owner)}`.includes(keyword) && (filter === 'all' || (filter === 'open' ? t.status !== 'done' : t.score === filter)));
    root.innerHTML = `<div class="task-head"><div><div class="row"><h1 class="h-page">工作台</h1><span class="tag t-line">${leader ? role.president ? '全社任务与贡献' : '本部门任务与贡献' : '我的任务与贡献'}</span></div><p class="muted">记录任务、跟进 TODO、提交成果；部长 / 会长团分配系数并确认贡献，积分作为骨干权益的参考。</p></div>${button('create',leader ? '分配任务' : '上报任务',true)}</div>
      <p class="small muted" style="margin-bottom:14px">演示数据 · 操作保存在当前浏览器，可从登录页切换身份继续演示。<a class="lnk" href="login.html">切换身份</a></p>
      <div class="tabs"><a href="#" data-tab="tasks" class="${tab === 'tasks' ? 'on' : ''}">任务跟进</a><a href="#" data-tab="points" class="${tab === 'points' ? 'on' : ''}">贡献与权益</a></div>
      ${tab === 'tasks' ? `<div class="task-toolbar"><div class="seg">${[['open',`TODO ${visible.filter(t => t.status !== 'done').length}`],['pending',`待确认 ${visible.filter(t => t.score === 'pending').length}`],['returned','退回补充'],['approved','已确认'],['all','全部']].map(([k,l]) => `<a href="#" data-filter="${k}" class="${k === filter ? 'on' : ''}">${l}</a>`).join('')}</div>${input('keyword','搜索任务',keyword,'search','placeholder="搜索任务、内容或负责人"')}</div>
      <div class="card">${shown.map(t => `<button class="task-row" data-task="${t.id}"><span>${ic('LuClipboardList')}</span><span class="grow"><b>${esc(t.title)}</b><span class="row small muted"><span class="tag">${statusLabel[t.status]}</span><span class="tag">${scoreLabel[t.score]}</span>${leader ? `<span>${person(t.owner)} · ${dept(t.dept)}</span>` : ''}<span>${t.k ? `系数 ${t.k.toFixed(1)}` : '系数待分配'}</span>${t.score === 'approved' ? `<b>${money(t.final)} 分</b>` : ''}</span><p>${esc(t.note)}</p></span><small class="muted">${t.due ? `${t.status !== 'done' && t.due < today ? '已逾期 · ' : ''}${t.due}` : '未设截止日'}</small></button>`).join('') || '<p class="task-empty">当前筛选下没有任务</p>'}</div><p class="notice" style="margin-top:14px">上报任务后可持续更新；完成时填写实际工时与成果，确认后计入贡献。活动申报审批继续沿用现有方式。</p>` : `
      <div class="task-toolbar"><div class="seg">${[['month','本月'],['term','本学期'],['year','本学年'],['all','历史累计']].map(([k,l]) => `<a href="#" data-period="${k}" class="${k === period ? 'on' : ''}">${l}</a>`).join('')}</div><span class="small muted">按实际工作日期统计 · ${from ? from + ' 至今' : '全部历史'}</span></div>
      <div class="card pad"><h3>${leader ? '管理范围内已确认贡献' : '我的贡献'}</h3><b class="task-total">${money(total)} <small>分</small></b><p class="small muted">${approved.length} 项已确认工作；待确认、退回和驳回不计分。个人积分仅本人及授权部长 / 会长团可见。</p></div>
      ${leader && approved.length ? `<div class="card pad task-card"><h3>成员贡献明细</h3><p class="small muted">按成员顺序展示，供职责范围内核对。</p>${Object.values(DEMO_ROLES).filter(r => approved.some(t => t.owner === r.id)).map(r => `<div class="task-earned"><span class="grow">${r.name} · ${dept(r.dept)}</span><b>${money(approved.filter(t => t.owner === r.id).reduce((s,t) => s + t.final,0))} 分</b></div>`).join('')}</div>` : ''}
      <div class="card pad task-card"><div class="task-toolbar"><h3>已确认工作</h3>${input('historyKeyword','搜索历史工作',historyKeyword,'search','placeholder="搜索已确认的历史工作"')}</div>${approved.filter(t => `${t.title} ${person(t.owner)}`.includes(historyKeyword)).map(t => `<div class="task-earned"><div class="grow"><button class="lnk b" data-task="${t.id}">${esc(t.title)}</button><p class="small muted">${t.date} · ${leader ? person(t.owner) + ' · ' : ''}${money(t.final)} 分</p></div>${TASK_RULES.reporter(role) && t.owner === role.id ? `<button class="btn btn-sm" data-reuse="${t.id}">复用任务</button>` : ''}</div>`).join('') || '<p class="task-empty">还没有符合条件的已确认工作</p>'}</div>
      <div class="card pad task-card"><h3>骨干权益</h3><p style="margin-top:8px">已确认贡献可作为以下机会的参考；具体名额、条件和安排以学社通知为准。</p><div class="task-benefits">${[['优秀骨干评选','结合实际贡献、履职情况与组织评价。'],['地方实践','公费地方实践等限额机会的贡献参考。'],['企业参访','限额参访机会结合活动要求安排。'],['实习内推','结合岗位匹配与具体推荐要求。']].map(([h,p]) => `<div><b>${h}</b><p class="small muted">${p}</p></div>`).join('')}</div><p class="notice">积分不自动兑换权益，也不直接决定资格。部长选拔以答辩和组织考核为主；部长 / 会长团不进行个人工时计分。</p></div>`}`;
    renderIcons();
  }
  root.addEventListener('click', e => {
    const a = e.target.closest('[data-tab],[data-filter],[data-period],[data-task],[data-reuse],[data-action]'); if (!a) return; e.preventDefault();
    if (a.dataset.tab) { tab = a.dataset.tab; const u = new URL(location.href); u.searchParams.set('tab',tab); u.searchParams.delete('task'); history.replaceState({},'',u); }
    if (a.dataset.filter) filter = a.dataset.filter;
    if (a.dataset.period) period = a.dataset.period;
    if (a.dataset.task) return detail(tasks.find(t => t.id === Number(a.dataset.task)));
    if (a.dataset.reuse) return createTask(tasks.find(t => t.id === Number(a.dataset.reuse)));
    if (a.dataset.action === 'create') return createTask();
    render();
  });
  root.addEventListener('input', e => { const name = e.target.name; if (!['keyword','historyKeyword'].includes(name)) return; if (name === 'keyword') keyword = e.target.value; else historyKeyword = e.target.value; const pos = e.target.selectionStart; render(); const input = root.querySelector(`[name=${name}]`); input.focus(); input.setSelectionRange(pos,pos); });
  render();
  const id = Number(new URLSearchParams(location.search).get('task'));
  if (id) { const t = tasks.find(t => t.id === id && TASK_RULES.visible(role,t)); t ? detail(t) : root.insertAdjacentHTML('beforeend','<p class="notice">这条任务不存在，或当前身份无权查看。</p>'); }
  if (new URLSearchParams(location.search).get('new') === 'task' && TASK_RULES.reporter(role)) createTask();
});

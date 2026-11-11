// 静态演示数据只保存在当前浏览器；正式权限、审计和积分计算由 app 的数据库负责。
const TASK_RULES = {
  visible: (r, t) => !!r.backbone && !!(t.owner === r.id || r.president || (r.leader && t.dept === r.dept)),
  manager: (r, t) => !!r.leader && t.owner !== r.id && !!(r.president || t.dept === r.dept),
  reporter: r => !!r.backbone,
  points: (online, offline, k) => Math.round((online + 2 * offline) * Math.round(k * 10) / 6) / 100,
  term: { label: '26–27 秋冬学期', start: '2026-08-01', end: '2027-01-31' },
  inTerm: (date, today) => !!date && date >= '2026-08-01' && date <= '2027-01-31' && date <= today,
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
  const dept = id => id === 1 ? 'AI俱乐部' : id === 2 ? '外联部' : id === 3 ? '综合管理部' : '未分部门';
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
  let adjustments = [];
  try { const stored = JSON.parse(localStorage.getItem('inno-term-adjustments-v1')); if (Array.isArray(stored)) adjustments = stored; } catch {}
  const save = () => localStorage.setItem(storageKey, JSON.stringify(tasks));
  const termWork = id => tasks.filter(t => t.owner === id && t.score === 'approved' && TASK_RULES.inTerm(t.date,today)).reduce((n,t) => n + Math.round(t.final * 100),0) / 100;
  const termDelta = id => adjustments.filter(a => a.owner === id).reduce((n,a) => n + Math.round(a.delta * 100),0) / 100;
  const termTotal = id => Math.round((termWork(id) + termDelta(id)) * 100) / 100;
  const signed = n => `${n > 0 ? '+' : ''}${money(n)}`;
  const params = new URLSearchParams(location.search), selected = tasks.find(t => t.id === Number(params.get('task')));
  let tab = params.get('tab') === 'points' ? 'points' : leader && (params.get('tab') === 'manage' || params.get('new') === 'assign' || !params.get('tab') && selected && TASK_RULES.manager(role,selected)) ? 'manage' : 'mine';
  let mineFilter = 'open', manageFilter = 'pending', keyword = '', historyKeyword = '';
  const dialog = document.createElement('dialog'); dialog.className = 'task-dialog'; dialog.setAttribute('aria-label','任务详情'); document.body.appendChild(dialog);
  const taskUrl = id => { const u = new URL(location.href); id ? u.searchParams.set('task',id) : u.searchParams.delete('task'); u.searchParams.delete('new'); u.searchParams.set('tab',tab); history.replaceState({},'',u); };
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
    dialog.setAttribute('aria-label',title);
    dialog.innerHTML = `<header><h3>${title}</h3>${button('close','关闭')}</header><form>${html}<p class="task-error" role="alert"></p></form>`;
    dialog.onclick = e => { const a = e.target.closest('[data-action]')?.dataset.action; if (!a) return; if (a === 'close') return close(); const f = dialog.querySelector('form'); try { act(a, f); } catch (error) { dialog.querySelector('.task-error').textContent = error.message; } };
    dialog.querySelector('form').onsubmit = e => e.preventDefault();
    if (!dialog.open) dialog.showModal();
  }
  function createTask(source = null, mode = 'task') {
    const assign = mode === 'assign'; let completed = mode === 'report';
    if (assign && !leader) return;
    const people = Object.values(DEMO_ROLES).filter(r => TASK_RULES.reporter(r) && r.id !== role.id && (role.president || r.dept === role.dept));
    modal(source ? '复用工作' : assign ? '分配工作' : '上报工作', `${source ? '<p class="notice">本次工时、日期、凭证、系数和积分重新填写与确认。</p>' : ''}
      ${!assign ? field('工作进度',`<div class="work-progress task-actions">${button('work-open','未完成',!completed)}${button('work-done','已完成',completed)}</div>`) : ''}
      ${assign ? field('负责人',`<select name="owner" aria-label="任务负责人" required><option value="">选择管理范围内的其他成员</option>${people.map(p => `<option value="${p.id}">${p.name} · ${dept(p.dept)}</option>`).join('')}</select>`) : ''}
      ${!assign && (role.depts || []).length > 1 ? field('归属部门',`<select name="dept" aria-label="归属部门">${role.depts.map(d => `<option value="${d}" ${d === role.dept ? 'selected' : ''}>${dept(d)}</option>`).join('')}</select>`) : ''}
      ${field('工作名称',input('title','工作名称',source?.title || '', 'text','required maxlength="200"'))}
      ${field('工作内容与成果',`<textarea name="note" aria-label="工作内容与成果" rows="3">${esc(source?.note || '')}</textarea>`)}
      <div data-incomplete-fields>${field('截止日期（可选）',input('due','任务截止日期','','date'))}</div>
      ${!assign ? `<div data-complete-fields>${field(`实际工作日期 · ${TASK_RULES.term.label}`,input('date','实际工作日期',today,'date',`required min="${TASK_RULES.term.start}" max="${today < TASK_RULES.term.end ? today : TASK_RULES.term.end}"`))}<div class="task-two">${field('线上工时（小时）',input('online','线上工时',0,'number','min="0" step="0.25" required'))}${field('线下工时（小时）',input('offline','线下工时',0,'number','min="0" step="0.25" required'))}</div>${field('成果 / 凭证链接（可选）',input('evidence','成果凭证链接','','url'))}<p class="notice">工时按 0.25 小时填写，线上与线下不重复计算；难度系数和积分由有权限的其他管理者确认。</p></div>` : field('难度系数（可稍后分配）',kSelect(null))}
      <div class="task-actions">${button('create','保存工作',true)}</div>`, (a,f) => {
      if (a === 'work-open' || a === 'work-done') { completed = a === 'work-done'; syncProgress(); return; }
      if (a !== 'create' || !f.reportValidity()) return;
      const owner = assign ? Number(f.elements.owner.value) : role.id;
      const r = Object.values(DEMO_ROLES).find(r => r.id === owner);
      if (!r || !TASK_RULES.reporter(r) || (assign && !TASK_RULES.manager(role,{owner,dept:r.dept}))) throw new Error('请选择管理范围内的其他成员');
      // 与 app 一致：属于多个部门时，本人的工作选择归属部门，由该部门的管理者确认
      const t = newTask(Math.max(...tasks.map(t => t.id),0) + 1,f.elements.title.value.trim(),owner,(!assign && f.elements.dept ? Number(f.elements.dept.value) : r.dept) || null);
      if (!t.title) throw new Error('请填写工作名称');
      Object.assign(t,{note:f.elements.note.value,due:completed ? '' : f.elements.due.value,k:assign && f.elements.k.value ? Number(f.elements.k.value) : null,source:source?.id || null,createdBy:role.id});
      if (completed) {
        const online = Number(f.elements.online.value) * 60, offline = Number(f.elements.offline.value) * 60, date = f.elements.date.value;
        if (!t.note.trim() || !TASK_RULES.inTerm(date,today) || online + offline <= 0 || ![online,offline].every(v => Number.isFinite(v) && v >= 0 && v % 15 === 0)) throw new Error('请填写成果、本学期工作日期和有效工时');
        if (f.elements.evidence.value && !/^https?:\/\//.test(f.elements.evidence.value)) throw new Error('凭证链接应以 http:// 或 https:// 开头');
        Object.assign(t,{date,online,offline,evidence:f.elements.evidence.value,status:'done',score:'pending'});
      }
      tab = owner === role.id ? 'mine' : 'manage'; mineFilter = completed ? 'done' : 'open'; manageFilter = 'open';
      tasks.unshift(t); record(t,completed ? 'submitted' : 'created'); detail(t);
    });
    function syncProgress() {
      const f = dialog.querySelector('form');
      for (const [selector,hidden] of [['[data-complete-fields]',!completed],['[data-incomplete-fields]',completed]]) {
        const el = f.querySelector(selector); if (el) { el.hidden = hidden; el.querySelectorAll('input').forEach(e => e.disabled = hidden); }
      }
      f.elements.note.required = completed;
      // 与 app 一致：已完成写“工作内容与成果”，未完成或分配写“工作内容 / 进展”。
      f.elements.note.closest('.field').querySelector('.label').textContent = completed ? '工作内容与成果' : '工作内容 / 进展';
      f.elements.note.placeholder = completed ? '说明完成了什么、交付了什么' : '简要说明要完成什么';
      f.querySelectorAll('.work-progress button').forEach(b => { const on = (b.dataset.action === 'work-done') === completed; b.classList.toggle('btn-p',on); b.setAttribute('aria-pressed',on); });
      f.querySelector('[data-action=create]').textContent = completed ? '提交完成，等待确认' : assign ? '分配工作' : '保存工作';
    }
    syncProgress();
  }
  function calibrateTerm(id) {
    const r = Object.values(DEMO_ROLES).find(r => r.id === id);
    if (!r || !TASK_RULES.manager(role,{owner:id,dept:r.dept})) return;
    const expected = termTotal(id);
    modal('校准学期积分', `<p>${r.name} · ${TASK_RULES.term.label} · 当前 ${money(expected)} 分</p>${field('校准后总积分',input('total','校准后总积分',expected,'number','required min="0" max="999999999.99" step="0.01"'))}${field('校准原因','<textarea name="reason" aria-label="学期校准原因" required maxlength="2000" rows="3"></textarea>')}<p class="notice" data-term-delta>本次调整 ${signed(0)} 分，单项工作的工时、系数和积分保持可追溯。</p><div class="task-actions">${button('save-term','保存学期校准',true)}</div>`,(a,f) => {
      if (a !== 'save-term' || !f.reportValidity()) return;
      const total = Number(f.elements.total.value), reason = f.elements.reason.value.trim();
      if (!reason || !Number.isFinite(total) || total < 0 || total >= 1e9 || Math.abs(Math.round(total*100)-total*100) > 1e-7) throw new Error('请填写有效积分与校准原因');
      if (termTotal(id) !== expected) throw new Error('积分已变化，请刷新后重试');
      if (total === expected) throw new Error('校准后的积分没有变化');
      adjustments.unshift({owner:id,dept:r.dept,delta:Math.round((total-expected)*100)/100,before:expected,after:total,reason,actor:role.name,at:new Date().toISOString()});
      localStorage.setItem('inno-term-adjustments-v1',JSON.stringify(adjustments)); close(); render(); toast('学期积分已校准，明细已保留');
    });
    // 与 app 一致：实时显示本次调整差额，方便管理者核对。
    const termForm = dialog.querySelector('form');
    termForm.oninput = () => { const v = Number(termForm.elements.total.value); termForm.querySelector('[data-term-delta]').textContent = `本次调整 ${signed(Number.isFinite(v) ? Math.round((v - expected) * 100) / 100 : 0)} 分，单项工作的工时、系数和积分保持可追溯。`; };
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
      <div class="task-two">${field('截止日期',editable || (manager && t.status !== 'done') ? input('due','任务截止日期',t.due,'date') : esc(t.due || '—'))}${field('实际工作日期',editable ? input('date','实际工作日期',t.date || today,'date',`min="${TASK_RULES.term.start}" max="${today < TASK_RULES.term.end ? today : TASK_RULES.term.end}"`) : esc(t.date || '—'))}</div>
      <div class="task-two">${field('线上工时（小时）',editable ? input('online','线上工时',t.online / 60,'number','min="0" step="0.25"') : `${t.online / 60} 小时 × 1`)}${field('线下工时（小时）',editable ? input('offline','线下工时',t.offline / 60,'number','min="0" step="0.25"') : `${t.offline / 60} 小时 × 2`)}</div>
      ${editable ? '<p class="small muted">每次 0.25 小时；线上与线下分开，不重复计算。超过 12 小时请在成果中说明。</p>' : ''}
      ${field('成果 / 凭证链接（可选）',editable ? input('evidence','成果凭证链接',t.evidence,'url') : t.evidence ? `<a class="lnk" href="${esc(t.evidence)}" target="_blank" rel="noreferrer">查看凭证</a>` : '—')}
      <div class="task-score card pad"><h3>贡献积分</h3><p class="small muted">基础积分 =（线上小时 + 2 × 线下小时）× 难度系数；确认后计入学期积分。</p><p>难度 ${t.k || '待分配'} · 基础 ${t.k ? money(TASK_RULES.points(t.online,t.offline,t.k)) : '—'} 分 · <b>确认积分 ${t.score === 'approved' ? money(t.final) : '待确认'}</b></p>${t.score === 'approved' ? `<p class="small muted">校准差额 ${money(t.final - t.base)} 分</p>` : ''}</div>
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
        if (action === 'submitted' && (!value('note').trim() || !TASK_RULES.inTerm(value('date'),today) || online + offline <= 0)) throw new Error('请填写成果、本学期工作日期和有效工时');
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
      if (TASK_RULES.inTerm(t.date,today) && Math.round((termTotal(t.owner) + final - (t.score === 'approved' ? t.final : 0))*100) < 0) throw new Error('该操作会使学期总分为负，请先调整学期校准分值');
      Object.assign(t,{k,base,final,score:'approved',reason}); record(t,action,reason,before);
    });
  }
  function benefitsView() {
    const mine = tasks.filter(t => t.owner === role.id && t.score === 'approved' && TASK_RULES.inTerm(t.date,today) && t.title.includes(historyKeyword));
    const people = Object.values(DEMO_ROLES).filter(r => r.backbone && TASK_RULES.manager(role,{owner:r.id,dept:r.dept}));
    const records = adjustments.filter(a => TASK_RULES.visible(role,a));
    return `<div class="term-tabs" role="tablist" aria-label="权益学期"><button role="tab" aria-selected="true" class="on">${TASK_RULES.term.label}</button><button role="tab" aria-selected="false" disabled>26–27 春夏学期 <span>暂未开放</span></button></div><p class="small muted">按实际工作日期统计 · ${TASK_RULES.term.start} 至 ${TASK_RULES.term.end}</p>
      <div class="card pad task-card"><h3>我的学期积分</h3><b class="task-total">${money(termTotal(role.id))} <small>分</small></b><p class="small muted">已确认工作 ${money(termWork(role.id))} 分 + 学期校准 ${signed(termDelta(role.id))} 分</p><p class="small muted">待确认、退回补充和未通过的工作不计分。</p></div>
      <section class="card pad task-card"><h3>本学期骨干权益</h3><p class="small muted" style="margin-top:8px">已确认贡献可作为以下机会的参考；具体名额、条件和安排以学社通知为准。</p><div class="task-benefits">${[['优秀骨干评选','结合实际贡献、履职情况与组织评价。'],['地方实践','公费地方实践等限额机会的贡献参考。'],['企业参访','限额参访机会结合活动要求安排。'],['实习内推','结合岗位匹配与具体推荐要求。']].map(([h,p]) => `<div><b>${h}</b><p class="small muted">${p}</p></div>`).join('')}</div></section>
      ${leader ? `<section class="card pad task-card"><h3>成员学期积分</h3><p class="small muted" style="margin:8px 0">管理范围内的其他成员。逐项工作在「工作管理」确认；学期整体更正在这里校准。</p><div class="tbl-wrap"><table class="tbl term-members"><thead><tr><th>成员</th><th>工作积分</th><th>学期校准</th><th>总积分</th><th>操作</th></tr></thead><tbody>${people.map(r => `<tr data-member="${r.id}"><td>${r.name}<p class="small muted">${dept(r.dept)}</p></td><td>${money(termWork(r.id))}</td><td>${signed(termDelta(r.id))}</td><td><b>${money(termTotal(r.id))}</b></td><td><button class="btn btn-sm" data-calibrate="${r.id}">校准学期积分</button></td></tr>`).join('')}</tbody></table></div></section>` : ''}
      <section class="card pad task-card"><div class="task-toolbar"><h3>我的已确认工作</h3>${input('historyKeyword','搜索历史工作',historyKeyword,'search','placeholder="搜索本学期已确认工作"')}</div>${mine.map(t => `<div class="task-earned"><div class="grow"><button class="lnk b" data-task="${t.id}">${esc(t.title)}</button><p class="small muted">${t.date} · ${money(t.final)} 分</p></div><button class="btn btn-sm" data-reuse="${t.id}">复用工作</button></div>`).join('') || '<p class="task-empty">还没有符合条件的已确认工作</p>'}</section>
      <section class="card pad task-card"><h3>学期校准记录</h3><p class="small muted" style="margin-top:8px">工作积分与学期校准分别保留，后续确认的新工作会继续累加。</p>${records.map(a => `<div class="task-history term-history"><b>${person(a.owner)} · ${money(a.before)} → ${money(a.after)} 分（${signed(a.delta)}）</b><p>${esc(a.reason)}</p><span class="small muted">${esc(a.actor)} · ${new Date(a.at).toLocaleString('zh-CN')}</span></div>`).join('') || '<p class="task-empty">本学期暂无校准记录</p>'}</section>`;
  }
  function render() {
    const visible = tasks.filter(t => TASK_RULES.visible(role,t)), mine = visible.filter(t => t.owner === role.id), managed = visible.filter(t => TASK_RULES.manager(role,t));
    const filter = tab === 'manage' ? manageFilter : mineFilter, pending = managed.filter(t => t.score === 'pending').length;
    const scoped = tab === 'manage' ? managed : mine;
    const shown = scoped.filter(t => `${t.title} ${t.note} ${person(t.owner)}`.includes(keyword) && (filter === 'all' || (filter === 'open' ? t.status !== 'done' : filter === 'done' ? t.status === 'done' : t.score === filter)));
    const filters = tab === 'manage' ? [['pending',`待确认 ${pending}`],['open','未完成'],['approved','已确认'],['all','全部']] : [['open',`未完成 ${mine.filter(t => t.status !== 'done').length}`],['done',`已完成 ${mine.filter(t => t.status === 'done').length}`]];
    root.innerHTML = `<div class="task-head"><div><div class="row"><h1 class="h-page">工作台</h1><span class="tag t-line">骨干工作与权益</span></div><p class="muted">统一上报工作与进展；完成后确认积分，按学期查看贡献与权益。</p></div>${button('report','上报工作',true)}</div>
      <p class="small muted" style="margin-bottom:14px">演示数据 · 操作保存在当前浏览器，可从登录页切换身份继续演示。<a class="lnk" href="login.html">切换身份</a></p>
      <div class="tabs workbench-tabs" role="tablist" aria-label="工作台栏目">${[['mine','我的工作'],...(leader ? [['manage','工作管理']] : []),['points','骨干权益']].map(([k,l]) => `<button role="tab" aria-selected="${tab === k}" data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}${k === 'manage' && pending ? ` <span class="cnt">${pending}</span>` : ''}</button>`).join('')}</div>
      ${tab === 'points' ? benefitsView() : `<div class="task-toolbar"><div class="seg">${filters.map(([k,l]) => `<a href="#" data-filter="${k}" class="${k === filter ? 'on' : ''}">${l}</a>`).join('')}</div><div class="task-actions">${input('keyword','搜索任务',keyword,'search',`placeholder="${tab === 'manage' ? '搜索工作或负责人' : '搜索我的工作'}"`)}${tab === 'manage' ? button('assign','分配工作') : ''}</div></div>
      <p class="small muted" style="margin-bottom:16px">${tab === 'manage' ? '处理管理范围内其他成员的工作：分配、跟进、设置系数、确认与校准。本人工作由其他有权限的管理者处理。' : '自主上报和分配给你的工作都在这里。完成状态与积分确认分别显示，退回补充的工作回到未完成。'}</p>
      <div class="card">${shown.map(t => `<button class="task-row" data-task="${t.id}"><span>${ic('LuClipboardList')}</span><span class="grow"><b>${esc(t.title)}</b><span class="row small muted"><span class="tag">${t.status === 'done' ? '已完成' : '未完成'}</span><span class="tag">${scoreLabel[t.score]}</span>${tab === 'manage' ? `<span>${person(t.owner)} · ${dept(t.dept)}</span>` : ''}${t.createdBy && t.createdBy !== t.owner ? `<span>${person(t.createdBy)} 分配</span>` : ''}<span>${t.k ? `系数 ${t.k.toFixed(1)}` : '系数待分配'}</span>${t.score === 'approved' ? `<b>${money(t.final)} 分</b>` : ''}</span><p>${esc(t.note)}</p></span><small class="muted">${t.due ? `${t.status !== 'done' && t.due < today ? '已逾期 · ' : ''}${t.due}` : '未设截止日'}</small></button>`).join('') || '<p class="task-empty">当前筛选下没有工作</p>'}</div>`}`;
    renderIcons();
  }
  root.addEventListener('click', e => {
    const a = e.target.closest('[data-tab],[data-filter],[data-task],[data-reuse],[data-action],[data-calibrate]'); if (!a) return; e.preventDefault();
    if (a.dataset.tab) { tab = a.dataset.tab; keyword = ''; taskUrl(null); }
    if (a.dataset.filter) { if (tab === 'manage') manageFilter = a.dataset.filter; else mineFilter = a.dataset.filter; }
    if (a.dataset.task) return detail(tasks.find(t => t.id === Number(a.dataset.task)));
    if (a.dataset.reuse) return createTask(tasks.find(t => t.id === Number(a.dataset.reuse)));
    if (a.dataset.calibrate) return calibrateTerm(Number(a.dataset.calibrate));
    if (a.dataset.action === 'report') return createTask(null,'report');
    if (a.dataset.action === 'assign') return createTask(null,'assign');
    render();
  });
  root.addEventListener('input', e => { const name = e.target.name; if (!['keyword','historyKeyword'].includes(name)) return; if (name === 'keyword') keyword = e.target.value; else historyKeyword = e.target.value; const pos = e.target.selectionStart; render(); const input = root.querySelector(`[name=${name}]`); input.focus(); input.setSelectionRange(pos,pos); });
  render();
  const id = Number(new URLSearchParams(location.search).get('task'));
  if (id) { const t = tasks.find(t => t.id === id && TASK_RULES.visible(role,t)); t ? detail(t) : root.insertAdjacentHTML('beforeend',`<p class="notice">这条工作不存在，或当前身份无权查看。<a class="lnk" href="workbench.html?role=${new URLSearchParams(location.search).get('role') || 'minister'}&v=${DEMO_RELEASE}">返回列表</a></p>`); }
  const mode = new URLSearchParams(location.search).get('new');
  if (['task','report','assign'].includes(mode) && TASK_RULES.reporter(role)) createTask(null,mode);
});

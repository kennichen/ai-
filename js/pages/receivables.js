/**
 * 应收应付管理 — 台账 / 核销 / 账龄分析 / 到期提醒
 */
const Receivables = {
  tab: 'receivable', // receivable | payable

  render(container) {
    container.innerHTML = '';
    this._container = container;

    const receivables = DB.getReceivables();
    const payables = DB.getPayables();

    // ===== 汇总 =====
    const recTotal = receivables.filter(r => r.status !== '已收').reduce((s, r) => s + (parseFloat(r.amount) - parseFloat(r.paid || 0)), 0);
    const payTotal = payables.filter(p => p.status !== '已付').reduce((s, p) => s + (parseFloat(p.amount) - parseFloat(p.paid || 0)), 0);
    const recAging = DB.aging(receivables);
    const payAging = DB.aging(payables);
    const recOverdue = [...recAging.d30, ...recAging.d60, ...recAging.d90].reduce((s, r) => s + (parseFloat(r.amount) - parseFloat(r.paid || 0)), 0);
    const payOverdue = [...payAging.d30, ...payAging.d60, ...payAging.d90].reduce((s, p) => s + (parseFloat(p.amount) - parseFloat(p.paid || 0)), 0);

    let html = `
      <!-- 汇总卡片 -->
      <div class="kpi-row">
        <div class="stat-card kpi-item">
          <div class="kpi-value" style="color:var(--success)">${App.fmtMoneyShort(recTotal)}</div>
          <div class="kpi-label">应收未收</div>
          <div style="font-size:11px;color:${recOverdue > 0 ? 'var(--danger)' : 'var(--text-tertiary)'}">逾期 ${App.fmtMoneyShort(recOverdue)}</div>
        </div>
        <div class="stat-card kpi-item">
          <div class="kpi-value" style="color:var(--danger)">${App.fmtMoneyShort(payTotal)}</div>
          <div class="kpi-label">应付未付</div>
          <div style="font-size:11px;color:${payOverdue > 0 ? 'var(--warning)' : 'var(--text-tertiary)'}">逾期 ${App.fmtMoneyShort(payOverdue)}</div>
        </div>
        <div class="stat-card kpi-item">
          <div class="kpi-value">${App.fmtMoneyShort(recTotal - payTotal)}</div>
          <div class="kpi-label">净应收</div>
          <div style="font-size:11px;color:var(--text-tertiary)">应收 - 应付</div>
        </div>
        <div class="stat-card kpi-item">
          <div class="kpi-value" style="color:${recOverdue > 0 || payOverdue > 0 ? 'var(--warning)' : 'var(--success)'}">${recOverdue > 0 || payOverdue > 0 ? '⚠ 有逾期' : '✓ 无逾期'}</div>
          <div class="kpi-label">到期提醒</div>
        </div>
      </div>

      <!-- Tab 切换 -->
      <div class="report-tabs" style="margin-bottom:10px">
        <button class="report-tab ${this.tab === 'receivable' ? 'active' : ''}" onclick="Receivables.switchTab('receivable')">应收账款 (${receivables.length})</button>
        <button class="report-tab ${this.tab === 'payable' ? 'active' : ''}" onclick="Receivables.switchTab('payable')">应付账款 (${payables.length})</button>
      </div>
      ${App.isReadOnly ? '' : `
      <div style="display:flex;justify-content:flex-end;gap:6px;margin-bottom:10px">
        <button class="btn btn-sm btn-outline" onclick="Receivables.exportCSV()">导出${this.tab === 'receivable' ? '应收' : '应付'}</button>
        <button class="btn btn-sm btn-outline" onclick="Receivables.importCSV()">导入${this.tab === 'receivable' ? '应收' : '应付'}</button>
      </div>`}

      <!-- 应收列表 -->
      <div id="recList" class="glass-card" style="padding:0;overflow:hidden">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:var(--glass-divider)">
          <span style="font-size:13px;font-weight:500">${this.tab === 'receivable' ? '应收台账' : '应付台账'}</span>
          ${App.isReadOnly ? '' : `
          <button class="btn btn-sm btn-primary" onclick="Receivables.showAddModal()">+ 新增${this.tab === 'receivable' ? '应收' : '应付'}</button>
          `}
        </div>
        <!-- 筛选栏 -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;padding:10px 16px;border-bottom:var(--glass-divider);align-items:center">
          <input type="text" class="form-control" id="recFilterKw" placeholder="搜索对方/备注..." style="width:140px;padding:5px 10px;font-size:12px" oninput="Receivables.renderTable()">
          <select class="form-control" id="recFilterType" style="width:110px;padding:5px;font-size:12px" onchange="Receivables.renderTable()">
            <option value="">全部类型</option>
            ${this.tab === 'receivable'
              ? '<option value="外卖">外卖</option><option value="团购">团购</option><option value="储值">储值</option><option value="赊账">赊账</option>'
              : '<option value="货款">货款</option><option value="佣金">佣金</option><option value="房租">房租</option><option value="其他">其他</option>'}
          </select>
          <select class="form-control" id="recFilterStatus" style="width:100px;padding:5px;font-size:12px" onchange="Receivables.renderTable()">
            <option value="">全部状态</option>
            ${this.tab === 'receivable'
              ? '<option value="未收">未收</option><option value="部分">部分</option><option value="已收">已收</option>'
              : '<option value="未付">未付</option><option value="部分">部分</option><option value="已付">已付</option>'}
          </select>
          <input type="date" class="form-control" id="recFilterStart" style="width:135px;padding:5px;font-size:12px" onchange="Receivables.renderTable()">
          <span style="font-size:11px;color:var(--text-tertiary)">至</span>
          <input type="date" class="form-control" id="recFilterEnd" style="width:135px;padding:5px;font-size:12px" onchange="Receivables.renderTable()">
          <button class="btn btn-sm btn-outline" style="padding:3px 10px;font-size:11px" onclick="Receivables.clearFilter()">清除筛选</button>
          <span id="recFilterCount" style="font-size:11px;color:var(--text-tertiary);margin-left:auto"></span>
        </div>
        <div id="recTableBody" style="padding:4px 16px"></div>
      </div>

      <!-- 账龄分析 -->
      <div class="glass-card">
        <div class="glass-card-header">
          <div class="glass-card-title">账龄分析（${this.tab === 'receivable' ? '应收' : '应付'}）</div>
        </div>
        <div id="agingBody"></div>
      </div>
    `;

    container.innerHTML = html;
    this.renderTable();
    this.renderAging();
  },

  switchTab(tab) {
    this.tab = tab;
    this.render(this._container || document.getElementById('pageContent'));
  },

  clearFilter() {
    ['recFilterKw', 'recFilterType', 'recFilterStatus', 'recFilterStart', 'recFilterEnd'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    this.renderTable();
  },

  renderTable() {
    const body = document.getElementById('recTableBody');
    if (!body) return;
    const isRec = this.tab === 'receivable';
    let list = isRec ? DB.getReceivables() : DB.getPayables();
    const fundAccounts = DB.getFundAccounts();

    // ===== 应用筛选 =====
    const kw = (document.getElementById('recFilterKw')?.value || '').trim();
    const fType = document.getElementById('recFilterType')?.value || '';
    const fStatus = document.getElementById('recFilterStatus')?.value || '';
    const fStart = document.getElementById('recFilterStart')?.value || '';
    const fEnd = document.getElementById('recFilterEnd')?.value || '';
    if (kw) list = list.filter(x => (x.party || '').includes(kw) || (x.note || '').includes(kw));
    if (fType) list = list.filter(x => x.type === fType);
    if (fStatus) list = list.filter(x => x.status === fStatus);
    if (fStart) list = list.filter(x => (x.date || '') >= fStart);
    if (fEnd) list = list.filter(x => (x.date || '') <= fEnd);
    const countEl = document.getElementById('recFilterCount');
    if (countEl) countEl.textContent = `共 ${list.length} 条`;

    if (list.length === 0) {
      body.innerHTML = `<div class="empty-state"><div class="icon">${isRec ? '&#x1F4B0;' : '&#x1F4E5;'}</div><p>暂无${isRec ? '应收' : '应付'}记录</p></div>`;
      return;
    }

    const typeBadge = { '外卖': 'badge-primary', '团购': 'badge-accent', '储值': 'badge-success', '货款': 'badge-danger', '佣金': 'badge-warning', '房租': 'badge-gold', '赊账': 'badge-warm' };
    const statusBadge = { '已收': 'badge-success', '已付': 'badge-success', '部分': 'badge-warning', '未收': 'badge-danger', '未付': 'badge-danger' };

    let html = `<table class="data-table">
      <thead><tr><th>日期</th><th>对方</th><th>类型</th><th style="text-align:right">金额</th><th style="text-align:right">已${isRec ? '收' : '付'}</th><th style="text-align:right">余额</th><th>到期日</th><th>状态</th><th style="text-align:right">操作</th></tr></thead><tbody>`;

    list.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).forEach((it, idx) => {
      const balance = parseFloat(it.amount) - parseFloat(it.paid || 0);
      const today = new Date();
      const due = new Date(it.due_date || it.date);
      const overdue = balance > 0 && due < today ? `color:var(--danger)` : '';
      const fundOpts = `<option value="">不关联</option>${fundAccounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}`;
      html += `
        <tr>
          <td style="white-space:nowrap">${App.fmtDate(it.date)}</td>
          <td>${it.party || it.supplier_name || '-'}</td>
          <td><span class="badge ${typeBadge[it.type] || 'badge-accent'}">${it.type || '-'}</span></td>
          <td class="amount">${App.fmtMoney(it.amount)}</td>
          <td class="amount" style="color:var(--text-secondary)">${App.fmtMoney(it.paid || 0)}</td>
          <td class="amount" style="font-weight:500;${overdue}">${App.fmtMoney(balance)}</td>
          <td style="white-space:nowrap;${overdue}">${App.fmtDate(it.due_date)}${balance > 0 && due < today ? ' <span class="badge badge-danger">逾期</span>' : ''}</td>
          <td><span class="badge ${statusBadge[it.status] || 'badge-accent'}">${it.status}</span></td>
          <td style="text-align:right;white-space:nowrap">
            ${App.isReadOnly ? '' : (balance > 0.001 ? `
            <button class="btn btn-sm btn-outline" onclick="Receivables.showPayModal('${it.id}')">${isRec ? '收款' : '付款'}</button>
            ` : '')}
            ${App.isReadOnly ? '' : `<button class="btn btn-sm btn-outline" onclick="Receivables.showEditModal('${it.id}')">编辑</button>
            <button class="btn btn-sm btn-danger" onclick="Receivables.deleteItem('${it.id}')">删除</button>`}
          </td>
        </tr>`;
    });

    html += '</tbody></table>';
    body.innerHTML = html;
  },

  renderAging() {
    const el = document.getElementById('agingBody');
    if (!el) return;
    const isRec = this.tab === 'receivable';
    const list = isRec ? DB.getReceivables() : DB.getPayables();
    const aging = DB.aging(list);
    const groups = [
      { key: 'current', label: '未到期', color: 'var(--success)' },
      { key: 'd30', label: '逾期 1-30 天', color: 'var(--warning)' },
      { key: 'd60', label: '逾期 31-60 天', color: 'var(--warning)' },
      { key: 'd90', label: '逾期 60 天以上', color: 'var(--danger)' }
    ];
    let html = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">`;
    groups.forEach(g => {
      const items = aging[g.key] || [];
      const total = items.reduce((s, i) => s + (parseFloat(i.amount) - parseFloat(i.paid || 0)), 0);
      html += `
        <div style="background:var(--glass-thin);border-radius:10px;padding:12px;border:0.5px solid rgba(0,0,0,0.05)">
          <div style="font-size:11px;color:var(--text-secondary)">${g.label}</div>
          <div style="font-size:18px;font-weight:500;color:${g.color}">${App.fmtMoneyShort(total)}</div>
          <div style="font-size:10px;color:var(--text-tertiary)">${items.length} 笔</div>
        </div>`;
    });
    html += `</div>`;
    el.innerHTML = html;
  },

  // ========== 新增 ==========
  showAddModal() {
    const isRec = this.tab === 'receivable';
    const suppliers = DB.getSuppliers();
    const typeOpts = isRec
      ? `<option value="外卖">外卖平台结算</option><option value="团购">团购核销款</option><option value="储值">会员储值</option><option value="赊账">客户赊账</option>`
      : `<option value="货款">供应商货款</option><option value="佣金">平台佣金</option><option value="房租">房租</option><option value="其他">其他</option>`;
    const partyOpts = suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    App.showModal(`新增${isRec ? '应收' : '应付'}`, `
      <div class="form-row">
        <div class="form-group">
          <label>日期</label>
          <input type="date" class="form-control" id="arDate" value="${App.today()}">
        </div>
        <div class="form-group">
          <label>类型</label>
          <select class="form-control" id="arType">${typeOpts}</select>
        </div>
      </div>
      <div class="form-group">
        <label>对方单位/个人</label>
        <input type="text" class="form-control" id="arParty" list="supplierList" placeholder="${isRec ? '如：美团、某企业客户' : '选择供应商'}">
        <datalist id="supplierList">${partyOpts}</datalist>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>金额 (¥)</label>
          <input type="number" class="form-control" id="arAmount" step="0.01" min="0">
        </div>
        <div class="form-group">
          <label>到期日</label>
          <input type="date" class="form-control" id="arDue">
        </div>
      </div>
      <div class="form-group">
        <label>备注</label>
        <input type="text" class="form-control" id="arNote" placeholder="选填">
      </div>
    `, `
      <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Receivables.saveItem()">保存</button>
    `);
  },

  saveItem() {
    const isRec = this.tab === 'receivable';
    const amount = parseFloat(document.getElementById('arAmount')?.value);
    if (!amount || amount <= 0) { alert('请输入有效金额'); return; }
    const data = {
      party: document.getElementById('arParty')?.value || '未知',
      type: document.getElementById('arType')?.value || '其他',
      amount, paid: 0,
      date: document.getElementById('arDate')?.value || App.today(),
      due_date: document.getElementById('arDue')?.value || App.today(),
      note: document.getElementById('arNote')?.value || '',
      status: isRec ? '未收' : '未付'
    };
    if (isRec) DB.addReceivable(data); else DB.addPayable(data);
    App.closeModal();
    this.render(this._container || document.getElementById('pageContent'));
  },

  showEditModal(id) {
    const isRec = this.tab === 'receivable';
    const it = isRec ? DB.getReceivables().find(i => i.id === id) : DB.getPayables().find(i => i.id === id);
    if (!it) return;
    App.showModal(`编辑${isRec ? '应收' : '应付'}`, `
      <div class="form-row">
        <div class="form-group"><label>日期</label><input type="date" class="form-control" id="arDate" value="${it.date}"></div>
        <div class="form-group"><label>到期日</label><input type="date" class="form-control" id="arDue" value="${it.due_date || ''}"></div>
      </div>
      <div class="form-group"><label>对方</label><input type="text" class="form-control" id="arParty" value="${it.party || ''}"></div>
      <div class="form-row">
        <div class="form-group"><label>金额 (¥)</label><input type="number" class="form-control" id="arAmount" value="${it.amount}" step="0.01" min="0"></div>
        <div class="form-group"><label>已${isRec ? '收' : '付'} (¥)</label><input type="number" class="form-control" id="arPaid" value="${it.paid || 0}" step="0.01" min="0"></div>
      </div>
      <div class="form-group"><label>备注</label><input type="text" class="form-control" id="arNote" value="${it.note || ''}"></div>
    `, `
      <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Receivables.saveEdit('${id}')">保存</button>
    `);
  },

  saveEdit(id) {
    const isRec = this.tab === 'receivable';
    const amount = parseFloat(document.getElementById('arAmount')?.value) || 0;
    const paid = parseFloat(document.getElementById('arPaid')?.value) || 0;
    const status = paid >= amount - 0.001 ? (isRec ? '已收' : '已付') : (paid > 0 ? '部分' : (isRec ? '未收' : '未付'));
    const data = {
      party: document.getElementById('arParty')?.value || '',
      amount, paid, status,
      date: document.getElementById('arDate')?.value || App.today(),
      due_date: document.getElementById('arDue')?.value || App.today(),
      note: document.getElementById('arNote')?.value || ''
    };
    if (isRec) DB.updateReceivable(id, data); else DB.updatePayable(id, data);
    App.closeModal();
    this.render(this._container || document.getElementById('pageContent'));
  },

  showPayModal(id) {
    const isRec = this.tab === 'receivable';
    const it = isRec ? DB.getReceivables().find(i => i.id === id) : DB.getPayables().find(i => i.id === id);
    if (!it) return;
    const balance = parseFloat(it.amount) - parseFloat(it.paid || 0);
    const fundOpts = DB.getFundAccounts().map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    App.showModal(`${isRec ? '收款' : '付款'}核销`, `
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px">
        ${isRec ? '应收' : '应付'}：<b>${it.party}</b> · 余额 <b style="color:var(--primary)">${App.fmtMoney(balance)}</b>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>${isRec ? '本次收款' : '本次付款'} (¥)</label>
          <input type="number" class="form-control" id="payAmount" value="${balance.toFixed(2)}" step="0.01" min="0" max="${balance}">
        </div>
        <div class="form-group">
          <label>资金账户</label>
          <select class="form-control" id="payFund">${fundOpts}</select>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text-tertiary)">确认后将自动生成记账分录</div>
    `, `
      <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Receivables.confirmPay('${id}')">确认核销</button>
    `);
  },

  confirmPay(id) {
    const isRec = this.tab === 'receivable';
    const amount = parseFloat(document.getElementById('payAmount')?.value) || 0;
    if (amount <= 0) { alert('请输入有效金额'); return; }
    const fundId = document.getElementById('payFund')?.value || '';
    const res = isRec ? DB.collectReceivable(id, amount, fundId) : DB.payPayable(id, amount, fundId);
    if (res.ok) {
      alert(`核销成功（${res.status}）\n已自动生成记账分录`);
    } else {
      alert(res.msg || '核销失败');
    }
    App.closeModal();
    this.render(this._container || document.getElementById('pageContent'));
  },

  deleteItem(id) {
    const isRec = this.tab === 'receivable';
    if (!confirm(`确定删除这条${isRec ? '应收' : '应付'}记录？`)) return;
    if (isRec) DB.deleteReceivable(id); else DB.deletePayable(id);
    this.render(this._container || document.getElementById('pageContent'));
  },

  // ========== 导入导出 ==========
  exportCSV() {
    const isRec = this.tab === 'receivable';
    const list = isRec ? DB.getReceivables() : DB.getPayables();
    const headers = ['日期', '对方', '类型', '金额', '已收付', '到期日', '状态', '备注'];
    const rows = list.map(x => [x.date, x.party, x.type, x.amount, x.paid || 0, x.due_date || '', x.status, x.note || '']);
    App.downloadCSV((isRec ? '应收账款' : '应付账款') + '_' + App.today() + '.csv', headers, rows);
  },

  importCSV() {
    const isRec = this.tab === 'receivable';
    App.pickCSVFile('.csv,.txt', ({ rows }) => {
      const keyMap = { '日期': 'date', '对方': 'party', '类型': 'type', '金额': 'amount', '已收付': 'paid', '到期日': 'due_date', '状态': 'status', '备注': 'note' };
      let ok = 0, err = 0; const errors = [];
      rows.forEach((r, i) => {
        try {
          const data = {};
          Object.entries(keyMap).forEach(([k, v]) => { data[v] = r[k] !== undefined ? r[k] : (r[v] || ''); });
          const amount = parseFloat(data.amount);
          if (!amount || amount <= 0) throw new Error('金额无效');
          const record = {
            date: data.date || App.today(),
            party: data.party || '未知',
            type: data.type || '其他',
            amount,
            paid: parseFloat(data.paid) || 0,
            due_date: data.due_date || data.date || App.today(),
            status: data.status || (isRec ? '未收' : '未付'),
            note: data.note || '批量导入'
          };
          if (parseFloat(record.paid) > 0) record.status = parseFloat(record.paid) >= amount - 0.001 ? (isRec ? '已收' : '已付') : '部分';
          const paid = parseFloat(record.paid) || 0;
          if (isRec) {
            const rec = DB.addReceivable({ ...record, paid: 0, status: record.status === '已收' || record.status === '部分' ? '未收' : record.status });
            // 已收部分同步核销（生成负向记账，保证报表=台账）
            if (paid > 0) DB.collectReceivable(rec.id, Math.min(paid, amount), '', record.date);
          } else {
            const pay = DB.addPayable({ ...record, paid: 0, status: record.status === '已付' || record.status === '部分' ? '未付' : record.status });
            if (paid > 0) DB.payPayable(pay.id, Math.min(paid, amount), '', record.date);
          }
          ok++;
        } catch (e) { err++; errors.push(`第${i + 2}行: ${e.message}`); }
      });
      alert(`导入完成：成功 ${ok} 条${err > 0 ? `，失败 ${err} 条\n${errors.slice(0, 5).join('\n')}` : ''}`);
      this.render(this._container || document.getElementById('pageContent'));
    });
  }
};

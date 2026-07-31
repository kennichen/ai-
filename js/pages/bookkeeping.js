/**
 * 记账页面 - 极简模式 + 专业模式（借贷记账法）
 */
const Bookkeeping = {
  mode: 'simple', // simple | professional

  // 渠道选项：收入按销售渠道，支出按成本类目（动态联动）
  CHANNEL_SETS: {
    income: [
      { value: 'dine-in', label: '堂食' },
      { value: 'delivery', label: '外卖' },
      { value: 'takeout', label: '自提' }
    ],
    expense: [
      { value: '食材成本', label: '食材成本' },
      { value: '平台佣金', label: '平台佣金' },
      { value: '包装成本', label: '包装成本' },
      { value: '人工成本', label: '人工成本' }
    ]
  },

  channelOptionsHtml(type, selected) {
    let list;
    if (type === 'income') list = this.CHANNEL_SETS.income;
    else if (type === 'expense') list = this.CHANNEL_SETS.expense;
    else list = [...this.CHANNEL_SETS.income, ...this.CHANNEL_SETS.expense];
    const opts = list.map(o => `<option value="${o.value}" ${o.value === selected ? 'selected' : ''}>${o.label}</option>`).join('');
    return `<option value="">全部渠道</option>${opts}<option value="other" ${'other' === selected ? 'selected' : ''}>其他</option>`;
  },

  render(container) {
    this._container = container;

    // 一次性构建所有HTML，避免多次 innerHTML += 导致事件丢失
    const modeHtml = this._buildModeTabs();
    const filterHtml = this._buildFilterBar();
    const statsHtml = this._buildStats();
    const tablePlaceholder = '<div id="txnTableContainer"></div>';

    container.innerHTML = modeHtml + filterHtml + statsHtml + tablePlaceholder;

    // 统一绑定事件（一次完成）
    this._bindEvents();
    this.renderTable();

    // 回车搜索
    document.getElementById('txnFilterKeyword')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.renderTable();
    });
  },

  // ========== 模式切换 ==========
  _buildModeTabs() {
    return `
      <div style="display:flex;gap:0;margin-bottom:16px;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);width:fit-content">
        <button class="btn mode-btn" data-mode="simple"
          style="border-radius:0;cursor:pointer;${this.mode === 'simple' ? 'background:var(--primary);color:#fff' : 'background:transparent;color:var(--gray-400)'}">
          极简模式
        </button>
        <button class="btn mode-btn" data-mode="professional"
          style="border-radius:0;cursor:pointer;${this.mode === 'professional' ? 'background:var(--primary);color:#fff' : 'background:transparent;color:var(--gray-400)'}">
          专业模式
        </button>
      </div>
    `;
  },

  _buildFilterBar() {
    return `
      <div class="filter-bar">
        <input type="date" class="form-control" id="txnFilterStart" value="${App.monthStart()}" style="min-width:130px">
        <span style="color:var(--gray-400)">至</span>
        <input type="date" class="form-control" id="txnFilterEnd" value="${App.today()}" style="min-width:130px">
        <select class="form-control" id="txnFilterType" style="width:120px">
          <option value="">全部类型</option>
          <option value="income">收入</option>
          <option value="expense">支出</option>
        </select>
        <select class="form-control" id="txnFilterChannel" style="width:140px">
          ${this.channelOptionsHtml('', '')}
        </select>
        <input type="text" class="form-control" id="txnFilterKeyword" placeholder="搜索说明..." style="width:160px">
        <button class="btn btn-primary btn-sm" id="txnFilterBtn">查询</button>
        ${App.isReadOnly ? '' : (this.mode === 'professional'
          ? '<button class="btn btn-accent btn-sm" id="txnAddBtn">+ 新增凭证</button>'
          : '<button class="btn btn-accent btn-sm" id="txnAddBtn">+ 新增流水</button>'
        )}
        ${App.isReadOnly ? '' : `
        <button class="btn btn-sm btn-outline" onclick="Bookkeeping.exportTemplate()" title="导出批量导入模板">导出模板</button>
        <button class="btn btn-sm btn-outline" onclick="Bookkeeping.exportData()" title="导出当前所有流水数据">导出数据</button>
        <button class="btn btn-sm btn-outline" onclick="Bookkeeping.batchImport()" title="批量导入记账">批量导入</button>
        <input type="file" id="txnBatchFile" accept=".csv,.xlsx" style="display:none" onchange="Bookkeeping.handleBatchImport(this)">
        `}
      </div>
    `;
  },

  _buildStats() {
    const storeId = App.currentStore;
    const startDate = App.monthStart();
    const endDate = App.today();
    const allTxns = DB.getTransactions({ store_id: storeId, start_date: startDate, end_date: endDate });
    const totalIncome = allTxns.filter(t => { const a = DB.getAccount(t.account_id); return a && a.type === 'revenue'; }).reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const totalExpense = allTxns.filter(t => { const a = DB.getAccount(t.account_id); return a && (a.type === 'cost' || a.type === 'expense'); }).reduce((s, t) => s + parseFloat(t.amount || 0), 0);

    return `
      <div class="stat-grid" style="margin-bottom:12px">
        <div class="stat-card">
          <div class="label">本月收入</div>
          <div class="value" style="color:var(--primary)">${App.fmtMoney(totalIncome)}</div>
        </div>
        <div class="stat-card">
          <div class="label">本月支出</div>
          <div class="value" style="color:var(--danger)">${App.fmtMoney(totalExpense)}</div>
        </div>
        <div class="stat-card">
          <div class="label">本月结余</div>
          <div class="value" style="color:${totalIncome - totalExpense >= 0 ? 'var(--primary-dark)' : 'var(--danger)'}">${App.fmtMoney(totalIncome - totalExpense)}</div>
        </div>
        <div class="stat-card">
          <div class="label">流水笔数</div>
          <div class="value">${allTxns.length}</div>
        </div>
      </div>
    `;
  },

  _bindEvents() {
    // 模式切换
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.mode = btn.dataset.mode;
        this.render(this._container || document.getElementById('pageContent'));
      });
    });

    // 查询按钮
    document.getElementById('txnFilterBtn')?.addEventListener('click', () => this.renderTable());
    // 新增按钮
    document.getElementById('txnAddBtn')?.addEventListener('click', () => this.showAddModal());
    // 类型切换时联动渠道下拉（收入→销售渠道，支出→成本类目）
    document.getElementById('txnFilterType')?.addEventListener('change', () => {
      const t = document.getElementById('txnFilterType').value;
      const ch = document.getElementById('txnFilterChannel');
      if (ch) ch.innerHTML = this.channelOptionsHtml(t === 'income' ? 'income' : (t === 'expense' ? 'expense' : ''), '');
    });
  },

  getFilters() {
    const storeId = App.currentStore;
    const startDate = document.getElementById('txnFilterStart')?.value || App.monthStart();
    const endDate = document.getElementById('txnFilterEnd')?.value || App.today();
    const rawType = document.getElementById('txnFilterType')?.value || '';
    const channel = document.getElementById('txnFilterChannel')?.value || '';
    const keyword = document.getElementById('txnFilterKeyword')?.value || '';
    // 修复：用科目类型过滤（account_type），而非业务类型（type）
    const accountType = rawType === 'income' ? 'revenue' : (rawType === 'expense' ? 'expense' : '');
    return { store_id: storeId, start_date: startDate, end_date: endDate, account_type: accountType, channel, keyword };
  },

  // ========== 表格渲染 ==========
  renderTable() {
    const filters = this.getFilters();
    const txns = DB.getTransactions(filters);
    const accounts = DB.getAccounts();
    const container = document.getElementById('txnTableContainer');
    if (!container) return;

    if (txns.length === 0) {
      container.innerHTML = '<div class="card"><div class="empty-state"><div class="icon">&#x1F4CB;</div><p>暂无数据，点击右上角"新增"开始</p></div></div>';
      return;
    }

    if (this.mode === 'professional') {
      container.innerHTML = this._renderProfessionalTable(txns, accounts);
    } else {
      container.innerHTML = this._renderSimpleTable(txns, accounts);
    }

    // 绑定编辑/删除事件
    container.querySelectorAll('.txn-edit').forEach(btn => {
      btn.addEventListener('click', () => this.showEditModal(btn.dataset.id));
    });
    container.querySelectorAll('.txn-delete').forEach(btn => {
      btn.addEventListener('click', () => this.deleteTxn(btn.dataset.id));
    });
  },

  _renderSimpleTable(txns, accounts) {
    const channelLabels = { 'dine-in': '堂食', 'delivery': '外卖', 'takeout': '自提', '食材成本': '食材成本', '平台佣金': '平台佣金', '包装成本': '包装成本', '人工成本': '人工成本', 'other': '其他' };
    let html = `
      <div class="card" style="padding:0;overflow:hidden">
        <table class="data-table">
          <thead>
            <tr><th>日期</th><th>类型</th><th>科目</th><th>说明</th><th>渠道</th><th style="text-align:right">收入</th><th style="text-align:right">支出</th><th style="text-align:right">操作</th></tr>
          </thead>
          <tbody>
    `;

    txns.forEach(t => {
      const acc = accounts.find(a => a.id === t.account_id);
      const accName = acc ? acc.name : '未知科目';
      const isRevenue = acc && acc.type === 'revenue';
      const isExpense = acc && (acc.type === 'cost' || acc.type === 'expense');

      html += `
        <tr class="txn-row ${isRevenue ? 'txn-type-income' : 'txn-type-expense'}">
          <td style="white-space:nowrap">${App.fmtDate(t.date)}</td>
          <td><span class="badge ${isRevenue ? 'badge-primary' : 'badge-danger'}">${isRevenue ? '收入' : '支出'}</span></td>
          <td>${accName}</td>
          <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.description || '-'}
            ${t.fund_account_id ? `<span style="font-size:9px;color:var(--text-tertiary);display:block">${(()=>{const fa=DB.getFundAccounts().find(a=>a.id===t.fund_account_id);return fa?fa.name:'';})()}</span>` : ''}</td>
          <td>${channelLabels[t.channel] || t.channel || '-'}</td>
          <td class="amount ${isRevenue ? 'positive' : ''}">${isRevenue ? App.fmtMoney(t.amount) : '-'}</td>
          <td class="amount ${isExpense ? 'negative' : ''}">${isExpense ? App.fmtMoney(t.amount) : '-'}</td>
          <td style="text-align:right">
            ${App.isReadOnly ? '<span style="font-size:10px;color:var(--text-tertiary)">只读</span>' : `
            <button class="btn btn-sm btn-outline txn-edit" data-id="${t.id}">编辑</button>
            <button class="btn btn-sm btn-danger txn-delete" data-id="${t.id}">删除</button>
            `}
          </td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    return html;
  },

  _renderProfessionalTable(txns, accounts) {
    // 专业模式：展示会计分录格式（借/贷）
    let html = `
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:8px 16px;background:var(--info-light);font-size:12px;color:#185FA5">
          <span>&#x2139; 专业借贷记账法 — 每笔记账包含借方和贷方分录</span>
        </div>
        <table class="data-table">
          <thead>
            <tr><th>日期</th><th>凭证号</th><th>摘要</th><th>借方科目</th><th style="text-align:right">借方金额</th><th>贷方科目</th><th style="text-align:right">贷方金额</th><th style="text-align:right">操作</th></tr>
          </thead>
          <tbody>
    `;

    txns.forEach((t, idx) => {
      const acc = accounts.find(a => a.id === t.account_id);
      if (!acc) return;

      const isRevenue = acc.type === 'revenue';
      const isExpenseOrCost = acc.type === 'cost' || acc.type === 'expense';
      const voucherNo = `记-${String(txns.length - idx).padStart(4, '0')}`;
      const channelLabels = { 'dine-in': '堂食', 'delivery': '外卖', 'takeout': '自提', '食材成本': '食材成本', '平台佣金': '平台佣金', '包装成本': '包装成本', '人工成本': '人工成本', 'other': '其他' };
      const ch = channelLabels[t.channel] || '';

      if (isRevenue) {
        // 收入分录：借:银行存款 贷:收入科目
        html += `
          <tr style="background:#FAFAF8">
            <td rowspan="2" style="white-space:nowrap;vertical-align:middle">${App.fmtDate(t.date)}</td>
            <td rowspan="2" style="vertical-align:middle;font-family:monospace;font-size:12px">${voucherNo}</td>
            <td rowspan="2" style="vertical-align:middle">${t.description || acc.name} ${ch}</td>
            <td style="padding-left:32px;color:var(--primary-dark)">银行存款</td>
            <td class="amount positive">${App.fmtMoney(t.amount)}</td>
            <td></td>
            <td></td>
            <td rowspan="2" style="vertical-align:middle;text-align:right">
              ${App.isReadOnly ? '<span style="font-size:10px;color:var(--text-tertiary)">只读</span>' : `
              <button class="btn btn-sm btn-outline txn-edit" data-id="${t.id}">编辑</button>
              <button class="btn btn-sm btn-danger txn-delete" data-id="${t.id}">删除</button>
              `}
            </td>
          </tr>
          <tr>
            <td style="padding-left:32px;color:var(--gray-600)">${acc.name}</td>
            <td></td>
            <td class="amount positive">${App.fmtMoney(t.amount)}</td>
          </tr>
        `;
      } else {
        // 支出分录：借:成本/费用科目 贷:银行存款
        html += `
          <tr style="background:#FAFAF8">
            <td rowspan="2" style="white-space:nowrap;vertical-align:middle">${App.fmtDate(t.date)}</td>
            <td rowspan="2" style="vertical-align:middle;font-family:monospace;font-size:12px">${voucherNo}</td>
            <td rowspan="2" style="vertical-align:middle">${t.description || acc.name} ${ch}</td>
            <td style="padding-left:32px;color:var(--warm)">${acc.name}</td>
            <td class="amount negative">${App.fmtMoney(t.amount)}</td>
            <td></td>
            <td></td>
            <td rowspan="2" style="vertical-align:middle;text-align:right">
              ${App.isReadOnly ? '<span style="font-size:10px;color:var(--text-tertiary)">只读</span>' : `
              <button class="btn btn-sm btn-outline txn-edit" data-id="${t.id}">编辑</button>
              <button class="btn btn-sm btn-danger txn-delete" data-id="${t.id}">删除</button>
              `}
            </td>
          </tr>
          <tr>
            <td style="padding-left:32px;color:var(--gray-600)">银行存款</td>
            <td></td>
            <td class="amount negative">${App.fmtMoney(t.amount)}</td>
          </tr>
        `;
      }
    });

    html += '</tbody></table></div>';
    return html;
  },

  // ========== 新增/编辑 ==========
  showAddModal() {
    const accounts = DB.getAccounts();
    const isPro = this.mode === 'professional';

    let bodyHtml;
    if (isPro) {
      // 专业模式 - 借贷记账表单
      bodyHtml = `
        <div class="form-row">
          <div class="form-group">
            <label>凭证日期</label>
            <input type="date" class="form-control" id="txnFormDate" value="${App.today()}">
          </div>
          <div class="form-group">
            <label>凭证摘要</label>
            <input type="text" class="form-control" id="txnFormDesc" placeholder="如：采购食材一批">
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label>借方科目</label>
            <select class="form-control" id="txnFormDebitAccount">
              ${accounts.filter(a => a.type === 'cost' || a.type === 'expense' || a.type === 'asset').map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>借方金额 (¥)</label>
            <input type="number" class="form-control" id="txnFormDebitAmount" placeholder="0.00" step="0.01" min="0">
          </div>
          <div class="form-group">
            <label>渠道</label>
            <select class="form-control" id="txnFormChannel">
              ${this.channelOptionsHtml('', '')}
            </select>
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group">
            <label>贷方科目</label>
            <select class="form-control" id="txnFormCreditAccount">
              ${accounts.filter(a => a.type === 'revenue' || a.type === 'liability' || a.type === 'equity').map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>贷方金额 (¥)</label>
            <input type="number" class="form-control" id="txnFormCreditAmount" placeholder="0.00" step="0.01" min="0">
          </div>
          <div class="form-group">
            <label>门店</label>
            <select class="form-control" id="txnFormStore">
              ${DB.getStores().map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="padding:8px 12px;background:var(--info-light);border-radius:6px;font-size:12px;color:#185FA5">
          提示：借方金额应与贷方金额相等（借贷平衡）
        </div>
      `;
    } else {
      // 极简模式 - 收入/支出表单
      bodyHtml = `
        <div class="form-group">
          <label>记账类型</label>
          <select class="form-control" id="txnFormType" onchange="Bookkeeping.toggleTxnType()">
            <option value="income">收入</option>
            <option value="expense">支出</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>日期</label>
            <input type="date" class="form-control" id="txnFormDate" value="${App.today()}">
          </div>
          <div class="form-group">
            <label>金额 (¥)</label>
            <input type="number" class="form-control" id="txnFormAmount" placeholder="0.00" step="0.01" min="0">
          </div>
        </div>
        <div class="form-group">
          <label>科目</label>
          <select class="form-control" id="txnFormAccount">
            <option value="">请先选择类型</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>渠道</label>
            <select class="form-control" id="txnFormChannel">
              ${this.channelOptionsHtml('', '')}
            </select>
          </div>
          <div class="form-group">
            <label>门店</label>
            <select class="form-control" id="txnFormStore">
              ${DB.getStores().map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>资金账户</label>
          <select class="form-control" id="txnFormFundAccount">
            <option value="">不关联账户</option>
            ${DB.getFundAccounts().map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
          </select>
        </div>
        <div class="invoice-box" id="invoiceUploadBox" style="display:none;margin:4px 0 12px;padding:12px;border:1px dashed var(--gray-300);border-radius:8px;background:var(--bg)">">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <strong style="font-size:13px">发票智能识别（支出）</strong>
            <button type="button" class="btn btn-sm btn-outline" onclick="Bookkeeping.openInvoiceFile()">上传发票</button>
            <span style="font-size:10px;color:var(--text-tertiary)">支持 JPG / PNG / PDF</span>
          </div>
          <input type="file" id="txnInvoiceFile" accept="image/*,.pdf" style="display:none" onchange="Bookkeeping.handleInvoiceFile(this)">
          <div id="invoicePreview" style="margin-bottom:8px"></div>
          <details style="font-size:12px;color:var(--gray-500)">
            <summary style="cursor:pointer">或用文字识别（粘贴发票文字）</summary>
            <textarea id="txnInvoiceText" rows="3" class="form-control" style="margin-top:6px" placeholder="将发票拍照后用微信/扫描工具提取文字，粘贴到这里，点“用文字识别”自动填单"></textarea>
            <button type="button" class="btn btn-sm btn-outline" style="margin-top:6px" onclick="Bookkeeping.parseInvoiceText()">用文字识别</button>
          </details>
          <div id="invoiceStatus" style="font-size:12px;color:var(--gray-500);margin-top:8px;min-height:16px"></div>
          <details open style="font-size:12px;color:var(--gray-500);margin-top:8px">
            <summary style="cursor:pointer">识别原文（识别不准时可据此手动修正，或改用文字识别）</summary>
            <pre id="invoiceRaw" style="white-space:pre-wrap;word-break:break-all;max-height:200px;overflow:auto;background:#fff;border:1px solid var(--gray-200);border-radius:6px;padding:8px;margin-top:6px;font-size:11px;line-height:1.5"></pre>
          </details>
          <div id="invoiceVerify"></div>
        </div>
        <div class="form-group">
          <label>说明</label>
          <input type="text" class="form-control" id="txnFormDesc" placeholder="如：午餐堂食收入">
        </div>
      `;
    }

    App.showModal(
      this.mode === 'professional' ? '新增会计凭证' : '新增流水记账',
      bodyHtml,
      `<button class="btn btn-outline" onclick="App.closeModal()">取消</button>
       <button class="btn btn-primary" onclick="Bookkeeping.saveTxn()">保存</button>`
    );

    if (!isPro) this.toggleTxnType();
  },

  showEditModal(id) {
    const txn = DB.getTransactions().find(t => t.id === id);
    if (!txn) return;

    const accounts = DB.getAccounts();
    const isRevenue = accounts.find(a => a.id === txn.account_id)?.type === 'revenue';
    const type = isRevenue ? 'income' : 'expense';
    const filteredAccounts = accounts.filter(a => isRevenue ? a.type === 'revenue' : (a.type === 'cost' || a.type === 'expense'));
    const accountOpts = filteredAccounts.map(a => `<option value="${a.id}" ${a.id === txn.account_id ? 'selected' : ''}>${a.name}</option>`).join('');

    const bodyHtml = `
      <div class="form-group">
        <label>记账类型</label>
        <select class="form-control" id="txnFormType" onchange="Bookkeeping.toggleTxnType()">
          <option value="income" ${type === 'income' ? 'selected' : ''}>收入</option>
          <option value="expense" ${type === 'expense' ? 'selected' : ''}>支出</option>
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>日期</label>
          <input type="date" class="form-control" id="txnFormDate" value="${txn.date}">
        </div>
        <div class="form-group">
          <label>金额 (¥)</label>
          <input type="number" class="form-control" id="txnFormAmount" value="${txn.amount}" step="0.01" min="0">
        </div>
      </div>
      <div class="form-group">
        <label>科目</label>
        <select class="form-control" id="txnFormAccount">${accountOpts}</select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>渠道</label>
          <select class="form-control" id="txnFormChannel">
            ${this.channelOptionsHtml(type, txn.channel)}
          </select>
        </div>
        <div class="form-group">
          <label>门店</label>
          <select class="form-control" id="txnFormStore">
            ${DB.getStores().map(s => `<option value="${s.id}" ${s.id === txn.store_id ? 'selected' : ''}>${s.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>资金账户</label>
        <select class="form-control" id="txnFormFundAccount">
          <option value="">不关联账户</option>
          ${DB.getFundAccounts().map(a => `<option value="${a.id}" ${a.id === txn.fund_account_id ? 'selected' : ''}>${a.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>说明</label>
        <input type="text" class="form-control" id="txnFormDesc" value="${txn.description || ''}">
      </div>
      <input type="hidden" id="txnEditId" value="${id}">
    `;

    App.showModal('编辑记账', bodyHtml, `
      <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Bookkeeping.saveTxn()">保存</button>
    `);
  },

  toggleTxnType() {
    const type = document.getElementById('txnFormType')?.value;
    const sel = document.getElementById('txnFormAccount');
    if (!sel) return;
    const accounts = DB.getAccounts();
    const filtered = accounts.filter(a => type === 'income' ? a.type === 'revenue' : (a.type === 'cost' || a.type === 'expense'));
    sel.innerHTML = filtered.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    // 渠道随记账类型联动（收入→销售渠道，支出→成本类目）
    const chSel = document.getElementById('txnFormChannel');
    if (chSel) chSel.innerHTML = this.channelOptionsHtml(type === 'income' ? 'income' : 'expense', '');
    // 发票识别仅在支出时显示
    const box = document.getElementById('invoiceUploadBox');
    if (box) box.style.display = (type === 'expense') ? '' : 'none';
  },

  saveTxn() {
    if (this.mode === 'professional') {
      this._saveProfessional();
    } else {
      this._saveSimple();
    }
  },

  _saveSimple() {
    const editId = document.getElementById('txnEditId')?.value;
    const type = document.getElementById('txnFormType').value;
    const data = {
      date: document.getElementById('txnFormDate').value,
      amount: parseFloat(document.getElementById('txnFormAmount').value) || 0,
      account_id: document.getElementById('txnFormAccount').value,
      channel: document.getElementById('txnFormChannel').value,
      fund_account_id: document.getElementById('txnFormFundAccount')?.value || '',
      store_id: document.getElementById('txnFormStore').value || App.currentStore,
      description: document.getElementById('txnFormDesc').value,
      type: type
    };

    if (!data.amount || data.amount <= 0) { alert('请输入有效金额'); return; }
    if (!data.account_id) { alert('请选择科目'); return; }
    if (!data.date) { alert('请选择日期'); return; }

    if (editId) {
      DB.updateTransaction(editId, data);
    } else {
      DB.addTransaction(data);
    }

    App.closeModal();
    const container = document.getElementById('pageContent');
    if (container) this.render(container);
  },

  _saveProfessional() {
    const date = document.getElementById('txnFormDate').value;
    const desc = document.getElementById('txnFormDesc').value;
    const debitAccountId = document.getElementById('txnFormDebitAccount').value;
    const debitAmount = parseFloat(document.getElementById('txnFormDebitAmount').value) || 0;
    const creditAccountId = document.getElementById('txnFormCreditAccount').value;
    const creditAmount = parseFloat(document.getElementById('txnFormCreditAmount').value) || 0;
    const channel = document.getElementById('txnFormChannel').value;
    const store_id = document.getElementById('txnFormStore').value || App.currentStore;

    if (Math.abs(debitAmount - creditAmount) > 0.01) {
      alert(`借贷不平衡！借方：${App.fmtMoney(debitAmount)}，贷方：${App.fmtMoney(creditAmount)}`);
      return;
    }
    if (debitAmount <= 0) { alert('请输入借方金额'); return; }
    if (!date) { alert('请选择日期'); return; }

    // 保存借方分录（费用/成本/资产增加）
    DB.addTransaction({
      date, amount: debitAmount,
      account_id: debitAccountId,
      channel, store_id,
      description: `[借]${desc || ''}`,
      type: 'expense'
    });

    // 保存贷方分录（收入/负债/权益增加）
    DB.addTransaction({
      date, amount: creditAmount,
      account_id: creditAccountId,
      channel, store_id,
      description: `[贷]${desc || ''}`,
      type: 'income'
    });

    App.closeModal();
    const container = document.getElementById('pageContent');
    if (container) this.render(container);
  },

  // ========== 发票识别（支出上传图片/文字，自动填单）==========
  ensureTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (this._tesseractReady) return this._tesseractReady;
    this._tesseractReady = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js';
      s.onload = () => resolve(window.Tesseract);
      s.onerror = () => reject(new Error('OCR 引擎加载失败（请检查网络）'));
      document.head.appendChild(s);
    });
    return this._tesseractReady;
  },

  openInvoiceFile() {
    const f = document.getElementById('txnInvoiceFile');
    if (f) f.click();
  },

  setInvoiceStatus(msg, isErr) {
    const el = document.getElementById('invoiceStatus');
    if (el) { el.textContent = msg; el.style.color = isErr ? 'var(--danger)' : 'var(--gray-500)'; }
  },

  async handleInvoiceFile(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const preview = document.getElementById('invoicePreview');
    if (preview) {
      try { preview.innerHTML = '<img src="' + URL.createObjectURL(file) + '" style="max-width:100%;max-height:180px;border-radius:6px;border:1px solid var(--gray-200)">'; } catch (e) {}
    }
    this.setInvoiceStatus('正在加载识别引擎…');
    let Tesseract;
    try {
      Tesseract = await this.ensureTesseract();
    } catch (e) {
      this.setInvoiceStatus(e.message + '，可改用下方「文字识别」粘贴发票文字', true);
      return;
    }

    // 等待 pdf.js 库加载完成（如果在 index.html 已声明则立即可用）
    await this._ensurePdfJs();
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    // 策略 1：PDF 必须先通过 pdf.js 渲染再识别（因为 Tesseract 不支持 PDF 直接读取）
    if (isPdf) {
      this.setInvoiceStatus('PDF 渲染中（首次需联网下载 pdf.js，约 5-10 秒）…');
      try {
        const imageBlob = await this._renderPDF(file, 2.0);
        if (imageBlob) {
          this.setInvoiceStatus('正在识别发票（首次需下载中文语言包，请稍候）…');
          const r = await Tesseract.recognize(imageBlob, 'chi_sim', {
            logger: m => { if (m.status === 'recognizing text') this.setInvoiceStatus('识别中 ' + Math.round(m.progress * 100) + '%'); }
          });
          console.log('[OCR PDF] 识别原文长度:', r.data.text.length, '预览:', r.data.text.slice(0, 120));
          this.fillInvoiceResult(this.parseInvoice(r.data.text), '图片');
          return;
        }
      } catch (e) {
        console.warn('PDF 渲染识别失败:', e);
      }
    }

    // 策略 2：图片 直接识别
    this.setInvoiceStatus('正在识别发票（首次需下载中文语言包，请稍候）…');
    try {
      const r = await Tesseract.recognize(file, 'chi_sim', {
        logger: m => { if (m.status === 'recognizing text') this.setInvoiceStatus('识别中 ' + Math.round(m.progress * 100) + '%'); }
      });
      this.fillInvoiceResult(this.parseInvoice(r.data.text), '图片');
      return;
    } catch (e) {
      console.warn('OCR 直接识别失败:', e);
    }

    // 策略 3：图片 canvas 上采样后识别（兜底）
    this.setInvoiceStatus('图片预处理中…');
    try {
      const imageBlob = await this._upscaleImage(file, 2.0);
      if (imageBlob) {
        const r = await Tesseract.recognize(imageBlob, 'chi_sim', {
          logger: m => { if (m.status === 'recognizing text') this.setInvoiceStatus('识别中 ' + Math.round(m.progress * 100) + '%'); }
        });
        this.fillInvoiceResult(this.parseInvoice(r.data.text), '图片');
        return;
      }
    } catch (e) {
      console.warn('图片上采样识别失败:', e);
    }

    // 全部失败
    this.setInvoiceStatus('图片/PDF 识别失败，请手动填写或粘贴发票文字。', true);
  },

  // 确保 pdf.js 已加载（pdfjs-dist@3.x 暴露全局 pdfjsLib）
  async _ensurePdfJs() {
    if (window.pdfjsLib && window.pdfjsLib.getDocument) return;
    // 如果用户未在 index.html 中引用 pdf.js，则动态加载
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('pdf.js 加载失败'));
      document.head.appendChild(s);
    });
    // 等一帧让 UMD 完成赋值
    await new Promise(r => setTimeout(r, 50));
  },

  // 用 pdf.js 渲染 PDF 第一页到高分辨率 canvas，返回 blob
  async _renderPDF(file, scale) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = window.pdfjsLib;
      if (!pdfjsLib || !pdfjsLib.getDocument) {
        console.warn('pdf.js 未加载');
        return null;
      }
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      // 关键：告诉 pdf.js 使用字符映射表（cmap），否则中文/日文等字符会渲染失败
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/'
      }).promise;
      const page = await pdf.getPage(1);
      const vp = page.getViewport({ scale: scale || 3.0 });  // 提升至 3x DPI 提升 OCR 精度
      const canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext('2d');
      // 白底（防透明导致 OCR 误识别）
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      await pdf.destroy();
      return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'));
    } catch (e) {
      console.warn('PDF 渲染失败:', e.message);
      return null;
    }
  },

  // 用 canvas 上采样图片
  async _upscaleImage(file, scale) {
    try {
      const url = URL.createObjectURL(file);
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片加载失败')); };
        i.src = url;
      });
      // 先转成 blob 再释放 URL
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * (scale || 2.0));
      canvas.height = Math.round(img.height * (scale || 2.0));
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'));
    } catch (e) {
      console.warn('图片上采样失败:', e.message);
      return null;
    }
  },

  parseInvoiceText() {
    const ta = document.getElementById('txnInvoiceText');
    const text = ta ? ta.value : '';
    if (!text || !text.trim()) { this.setInvoiceStatus('请先在上方粘贴发票文字', true); return; }
    this.fillInvoiceResult(this.parseInvoice(text), '文字');
  },

  parseInvoice(text) {
    const res = { date: '', amount: 0, invoiceNo: '', invoiceCode: '', sellerTaxId: '', items: [], raw: text || '' };
    if (!text) return res;
    // 清理不可见字符（BOM、零宽空格等）和多余空白
    text = text.replace(/[\uFEFF\u200B\u200C\u200D\u2028\u2029]/g, '').trim();
    const lines = text.split(/[\n\r]+/);

    // 从片段中提取一个合法日期（支持 年月日 / 分隔符 / 点号 / 紧凑8位 / OCR 拆字 + 错字）
    const extractDateFrom = (seg) => {
      const tryMatch = (s, reduced) => {
        const pats = reduced ? [
          // 去空格版：OCR 可能把"日"认成其他字（如"晶"），不要求末尾有"日"
          /(\d{4})年(\d{1,2})月(\d{1,2})[^0-9]?/,
        ] : [
          /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*\S?/,  // 允许"日"被OCR认成别的字
          /(\d{4})[-/.]\s*(\d{1,2})[-/.]\s*(\d{1,2})/,
          /(\d{4})\s*\.\s*(\d{1,2})\s*\.\s*(\d{1,2})/,
          /(\d{4})\s+(\d{1,2})\s+(\d{1,2})/,
          /(\d{4})(\d{2})(\d{2})/,
        ];
        for (const p of pats) {
          const m = s.match(p);
          if (m) {
            const y = parseInt(m[1], 10), mo = parseInt(m[2], 10), da = parseInt(m[3], 10);
            if (y >= 2000 && y <= 2099 && mo >= 1 && mo <= 12 && da >= 1 && da <= 31)
              return y + '-' + String(mo).padStart(2, '0') + '-' + String(da).padStart(2, '0');
          }
        }
        return '';
      };
      // OCR 可能把数字也拆开（如 "2 0 2 6 年 0 6 月 0 4 日" 或 "04晶"），先原样试，再去空格试
      return tryMatch(seg, false) || tryMatch(seg.replace(/\s+/g, ''), true);
    };

    // ====== 1. 日期：取右上角“开票日期”后的年月日 ======
    // OCR 可能把“开票日期”拆成“开 票 日 期”或错字“开 时 日 期”，日期也可能跨行
    const dateLabels = [
      /开\s*票\s*日\s*期/, /开\s*具\s*日\s*期/, /发\s*票\s*日\s*期/,
      /开\s*\S\s*日\s*期/  // 宽容版：开啥日期（OCR 错别字，如“开时日期”）
    ];
    for (const lr of dateLabels) {
      const idx = text.search(lr);
      if (idx >= 0) {
        const seg = text.slice(idx, idx + 60);
        const d = extractDateFrom(seg);
        if (d) { res.date = d; break; }
          // 如果年份缺失但月日存在（如"月 04 日"），从全文找年份补上
          if (!res.date) {
            // 先尝试完整 月+日（如"07月04日"）
            let mo = 0, da = 0;
            const fullMd = seg.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
            if (fullMd) { mo = parseInt(fullMd[1], 10); da = parseInt(fullMd[2], 10); }
            else {
              // 月也可能丢失（如"月04日"），从全文搜月份
              const weakMd = seg.match(/月\s*(\d{1,2})\s*日/);
              if (weakMd) {
                da = parseInt(weakMd[1], 10);
                // 从全文搜"X月"获取月份
                const moM = text.match(/(\d{1,2})\s*月/);
                if (moM) mo = parseInt(moM[1], 10);
              }
            }
            if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
              // 补年份
              let yrStr = '';
              const yrM = text.match(/(20[2-9]\d)/);
              if (yrM) yrStr = yrM[1];
              else {
                const invYr = text.match(/发票号码[：:\s]*(\d{2})(\d{2})/);
                if (invYr) { const c = parseInt(invYr[1], 10); if (c >= 20 && c <= 29) yrStr = '20' + invYr[1]; }
              }
              if (!yrStr) yrStr = new Date().getFullYear().toString();
              res.date = yrStr + '-' + String(mo).padStart(2, '0') + '-' + String(da).padStart(2, '0');
              break;
            }
          }
      }
    }
    // 兜底：全文中第一个合法 20xx 日期（排除发票号/年份等干扰由 extractDateFrom 把关）
    if (!res.date) res.date = extractDateFrom(text);

    // ====== 2. 发票号码（允许 OCR 拆字，如 "发 票 号 码"） ======
    const noIdx = text.search(/发\s*票\s*号\s*码[：:\s]/);
    if (noIdx >= 0) {
      const noSeg = text.slice(noIdx, noIdx + 40).replace(/\s+/g, '');
      const noM = noSeg.match(/发票号码[：:\s]*([0-9]{8,20})/);
      if (noM) res.invoiceNo = noM[1];
    }

    // ====== 2.5 发票代码 & 开票方识别号（用于发票校验）=====
    // 发票代码通常在发票号前，或另一行标明
    const codeIdx = text.search(/发票代码[：:\s]/);
    if (codeIdx >= 0) {
      const codeSeg = text.slice(codeIdx, codeIdx + 40).replace(/\s+/g, '');
      const codeM = codeSeg.match(/发票代码[：:\s]*([0-9]{12,20})/);
      if (codeM) res.invoiceCode = codeM[1];
    }
    // 销方纳税人识别号（社会信用代码）
    const taxIdx = text.search(/售[：:\s]*.*社会信用代码|销售方[：:\s]*.*识别|纳税人识别号[：:\s]/);
    if (taxIdx >= 0) {
      const taxSeg = text.slice(taxIdx, taxIdx + 80).replace(/\s+/g, '');
      const taxM = taxSeg.match(/[0-9]{2}[0-9A-Z]{2,16}[0-9A-Z]{2}/);
      if (taxM && taxM[0].length >= 15) res.sellerTaxId = taxM[0];
    }
    // 兜底：全文找 18 位统一社会信用代码
    if (!res.sellerTaxId) {
      const fallback = text.replace(/\s+/g, '').match(/[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}/);
      if (fallback) res.sellerTaxId = fallback[0];
    }

    // ====== 3. 金额：优先“价税合计（小写）” ======
    // 真实发票底部：价税合计（大写）…（小写）￥109.84
    // OCR 常把“（小写）”与金额拆到两行，故用“标签位置 + 跨行窗口”提取，避开上面的“合计 ¥106.60”
    let found = false;
    const jsshIdx = text.search(/价\s*税\s*合\s*计|价\s*税\s*总\s*额/);
    if (jsshIdx >= 0) {
      const win = text.slice(jsshIdx, jsshIdx + 80).replace(/\s+/g, '');
      const sm = win.match(/[（(]小写[）)][¥￥]?(\d{1,3}(?:,\d{3})*\.\d{2})/);
      if (sm) { res.amount = parseFloat(sm[1].replace(/,/g, '')); found = true; }
      else {
        const amts = this._extractAmounts(text.slice(jsshIdx, jsshIdx + 80));
        if (amts.length) { res.amount = Math.max.apply(null, amts); found = true; }
      }
    }

    // 策略B：含税金额/金额合计/总金额 等汇总关键词行
    if (!found) {
      const sumKeys = ['含税金额', '金额合计', '合计金额', '总金额', '价税总额'];
      for (const line of lines) {
        const nl = line.replace(/\s+/g, '');
        if (sumKeys.some(k => nl.indexOf(k) >= 0)) {
          const amts = this._extractAmounts(line);
          if (amts.length) { res.amount = Math.max.apply(null, amts); found = true; break; }
        }
      }
    }

    // 策略C：排除货物明细的"合计/总计"行（不能含数量/单价列标题）
    //   - 如果有两个金额（金额+税额），求和得到含税总金额（价税合计线被OCR吞掉时）
    //   - 如果只有一个金额，直接取
    //   - OCR 常把小数点认错（如 L→., 或点号丢失），故额外做 OCR 修正匹配
    if (!found) {
      for (const line of lines) {
        const nl = line.replace(/\s+/g, '');
        if ((nl.indexOf('合计') >= 0 || nl.indexOf('总计') >= 0)
            && nl.indexOf('数量') < 0 && nl.indexOf('单价') < 0
            && nl.indexOf('规格') < 0) {
          // 策略C：排除货物明细的"合计/总计"行（不能含数量/单价列标题）
          // 尝试提取金额(含税)：
          //   ① 标准格式 X.XX + X.XX → 直接求和（最准）
          //   ② OCR小数点变字母 (10L67) → 转为 10.67
          //   ③ OCR丢失小数点 → digit-run 拆分推测
          let totalFromLine = 0;
          // ① 标准提取
          const standard = (line.match(/\d+\.\d{2}/g) || []).map(v => parseFloat(v));
          const stdFiltered = standard.filter(v => {
            const s = v.toFixed(2);
            const parts = s.split('.');
            const yr = parseInt(parts[0], 10), mo = parseInt(parts[1], 10);
            return !(yr >= 2000 && yr <= 2099 && mo >= 1 && mo <= 12 && parts[0].length === 4);
          });
          if (stdFiltered.length >= 2) {
            // 标准格式有两个数字（金额+税额），直接求和
            totalFromLine = stdFiltered.reduce((s, v) => s + v, 0);
          } else if (stdFiltered.length === 1) {
            totalFromLine = stdFiltered[0];
          } else {
            // ② OCR 小数点错字（L/l/i/o/O 代替 .）
            const corrupt = (line.match(/\d+[LlioO]\d{2}/g) || []).map(v => parseFloat(v.replace(/[LlioO]/, '.')));
            if (corrupt.length >= 1) {
              // 可能只找到金额（税额的小数点也丢了），digit-run 配合找
              const digitRun = line.replace(/[^0-9]/g, '');
              const splitCandidates = [];
              if (digitRun.length >= 5 && digitRun.length <= 10) {
                for (let i = 2; i < digitRun.length - 1; i++) {
                  const first = parseInt(digitRun.slice(0, i), 10) / 100;
                  const second = parseInt(digitRun.slice(i), 10) / 100;
                  if (first <= 0 || second <= 0 || first > 100000 || second > 100000) continue;
                  if (first > second) {
                    splitCandidates.push({ sum: first + second, ratio: second / first });
                  }
                }
              }
              if (splitCandidates.length) {
                // 取最合理拆分（税率在 3%-45% 之间的优先→接近 9%）
                splitCandidates.sort((a, b) => {
                  const ra = a.ratio >= 0.03 && a.ratio <= 0.45 ? Math.abs(a.ratio - 0.09) : 999;
                  const rb = b.ratio >= 0.03 && b.ratio <= 0.45 ? Math.abs(b.ratio - 0.09) : 999;
                  return ra - rb;
                });
                totalFromLine = splitCandidates[0].sum;
              } else {
                totalFromLine = corrupt[0]; // 仅有一个修正金额时保底
              }
            }
          }
          if (totalFromLine > 0) {
            res.amount = totalFromLine;
            found = true; break;
          }
        }
      }
    }

    // 策略E：全文兜底（取最大合理金额）
    if (!found) {
      const allAmts = this._extractAmounts(text);
      if (allAmts.length) res.amount = Math.max.apply(null, allAmts);
    }

    // ====== 4. 明细物品 ======
    lines.forEach(line => {
      const lm = line.match(/(.{2,20})[×x*]\s*([\d.]+)\s*(?:件|个|只|份|kg|斤|g|升|l|L|ml|ML)?\s*[¥￥Yy]?\s*([\d,]+\.\d{2})?/i);
      if (lm) { res.items.push(lm[1].trim() + (lm[3] ? ' ¥' + lm[3] : '')); return; }
      const nm = line.match(/^\*([^\*]{2,20})(?:\s+\d)/);
      if (nm && line.indexOf('￥') >= 0) res.items.push(nm[1].trim());
    });
    return res;
  },

  // 从文本片段中提取所有合理金额（过滤年份、发票号等非金额数字）
  _extractAmounts(seg) {
    const results = [];
    // 千分位格式：¥1,234.56 或 1,234.56
    const re1 = /[¥￥]?\s*((?:\d{1,3}(?:,\d{3})+)\.\d{1,2})/g;
    let m;
    while ((m = re1.exec(seg)) !== null) {
      const v = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(v) && v > 0 && v < 1e12) results.push(v);
    }
    // 裸数字格式：123.45（排除纯4位年份）
    const re2 = /(?<![¥￥\d,.])(\d+\.\d{1,2})(?![\d,])/g;
    while ((m = re2.exec(seg)) !== null) {
      const v = parseFloat(m[1]);
      if (!isNaN(v) && v > 0 && v < 1e12 && !/^\d{4}$/.test(m[1])) results.push(v);
    }
    return results;
  },

  fillInvoiceResult(res, source) {
    const d = document.getElementById('txnFormDate');
    if (res.date && d) d.value = res.date;
    const a = document.getElementById('txnFormAmount');
    if (res.amount > 0 && a) a.value = res.amount.toFixed(2);
    const descText = (res.invoiceNo ? '发票' + res.invoiceNo + ' ' : '发票 ') + res.items.join('；');
    const desc = document.getElementById('txnFormDesc');
    if (desc) desc.value = descText.trim();
    this.recommendAccount(descText);
    this.setInvoiceStatus(
      '已通过' + (source === '文字' ? '文字' : '图片') + '识别：日期 ' + (res.date || '—') +
      '，金额 ' + (res.amount ? App.fmtMoney(res.amount) : '—') +
      (res.invoiceNo ? '，发票号 ' + res.invoiceNo : '') + '（请核对后保存）',
      false
    );
    const rawEl = document.getElementById('invoiceRaw');
    if (rawEl && res.raw) rawEl.textContent = res.raw;

    // 发票校验信息
    const verifyEl = document.getElementById('invoiceVerify');
    if (verifyEl) {
      if (res.invoiceNo || res.sellerTaxId) {
        const code = res.invoiceCode || res.invoiceNo?.slice(0, 12) || '';
        verifyEl.innerHTML = `
          <div style="margin-top:8px;padding:8px 10px;background:rgba(99,102,241,0.06);border-radius:8px;font-size:11px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <span style="font-weight:500;color:var(--text-primary)">发票校验信息</span>
              <button class="btn btn-sm btn-outline" style="font-size:10px;padding:2px 8px"
                onclick="window.open('https://etax.shenzhen.chinatax.gov.cn/BsfwtWeb/apps/views/fp/fpcy/fp_fpcy.html','_blank')">
                去验证
              </button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;color:var(--text-secondary)">
              <span>发票代码: <b style="color:var(--text-primary)">${code || '—'}</b></span>
              <span>发票号码: <b style="color:var(--text-primary)">${res.invoiceNo || '—'}</b></span>
              <span style="grid-column:1/-1">开票方识别号: <b style="color:var(--text-primary);font-size:10px">${res.sellerTaxId || '—'}</b></span>
            </div>
            <div style="margin-top:4px;font-size:10px;color:var(--text-tertiary)">&#x1f517; 打开国家税局平台，填入以上信息+验证码校验真伪</div>
          </div>
        `;
      } else {
        verifyEl.innerHTML = '';
      }
    }
  },

  recommendAccount(text) {
    const accounts = DB.getAccounts();
    const costAccounts = accounts.filter(a => a.type === 'cost' || a.type === 'expense');
    const rules = [
      { kw: ['食材', '米', '面', '油', '菜', '肉', '海鲜', '调料', '生鲜', '果蔬', '干货', '冻品', '餐料', '农副'], code: '6001' },
      { kw: ['酒', '饮料', '饮品', '奶茶', '啤酒', '白酒', '红酒', '水'], code: '6002' },
      { kw: ['工资', '薪资', '薪酬', '社保', '公积金', '五险', '人事'], code: '6606' },
      { kw: ['佣金', '平台', '美团', '饿了么', '抽成', '服务费'], code: '6601' },
      { kw: ['包装', '打包', '餐盒', '塑料袋', '纸箱', '封口'], code: '6004' }
    ];
    let targetCode = '6001';
    for (const r of rules) {
      if (r.kw.some(k => text.indexOf(k) >= 0)) { targetCode = r.code; break; }
    }
    const acc = costAccounts.find(a => a.code === targetCode) || costAccounts[0];
    const sel = document.getElementById('txnFormAccount');
    if (sel && acc) sel.value = acc.id;
    const chMap = { '6001': '食材成本', '6002': '食材成本', '6004': '包装成本', '6606': '人工成本', '6601': '平台佣金' };
    const ch = document.getElementById('txnFormChannel');
    if (ch && chMap[targetCode]) ch.value = chMap[targetCode];
  },

  deleteTxn(id) {
    if (!confirm('确定删除这条记账记录吗？')) return;
    DB.deleteTransaction(id);
    this.renderTable();
  },

  // ========== 批量导入/导出 ==========
  // 导出 CSV 模板（可用 Excel/WPS 打开编辑）
  exportTemplate() {
    const accounts = DB.getAccounts();
    const stores = DB.getStores();
    const fundAccounts = DB.getFundAccounts();

    // 构建科目和账户参考表（放在模板顶部作为注释行）
    const accRef = accounts.filter(a => a.type !== 'equity').map(a => `${a.code}=${a.name}`).join(';');
    const fundRef = fundAccounts.map(a => `${a.id}=${a.name}`).join(';');
    const storeRef = stores.map(s => `${s.id}=${s.name}`).join(';');

    const headers = ['日期', '类型', '金额', '科目编码', '渠道', '说明', '门店ID', '资金账户ID'];
    const hints = [
      '2026-07-01', '收入', '1280.50', '5001', '堂食', '堂食收入-7月1日', 'store_1', 'fund_default_main'
    ];

    // 类型说明行
    const typeHint = '# 类型说明: 收入 或 支出';

    // CSV 前两行是说明行（以 # 开头，Excel 会忽略）
    const rows = [
      '# 餐饮财务工作台 · 批量导入模板',
      `# 科目参考: ${accRef}`,
      `# 资金账户参考: ${fundRef}`,
      `# 门店参考: ${storeRef}`,
      typeHint,
      '# 渠道说明: 堂食 / 外卖 / 自提 / 其他',
      '# 使用说明: 删除示例行，填入实际数据后保存为 CSV（UTF-8 编码），再上传导入',
      '',
      headers.join(','),
      hints.join(',')
    ];

    const csv = '\uFEFF' + rows.join('\n'); // UTF-8 BOM for Excel
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '记账导入模板_' + App.today() + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  },

  // 导出当前所有流水数据
  exportData() {
    const txns = DB.getTransactions();
    const accounts = DB.getAccounts();
    const accMap = {};
    accounts.forEach(a => accMap[a.id] = a.name);
    const headers = ['日期', '类型', '金额', '科目', '科目编码', '渠道', '说明', '门店ID', '资金账户ID'];
    const rows = txns.map(t => [t.date, t.type === 'income' ? '收入' : '支出', t.amount, accMap[t.account_id] || '', '', t.channel || '', t.description || '', t.store_id || '', t.fund_account_id || '']);
    App.downloadCSV('记账流水_' + App.today() + '.csv', headers, rows);
  },

  // 选择导入文件
  batchImport() {
    document.getElementById('txnBatchFile')?.click();
  },

  // 处理导入文件
  handleBatchImport(input) {
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const result = this._parseBatchCSV(text);
        if (result.errors.length > 0) {
          this._showBatchResult(`导入完成，成功 ${result.success} 条，失败 ${result.errors.length} 条。<br>错误：<br>${result.errors.join('<br>')}`, result.errors.length > 0);
        } else {
          this._showBatchResult(`成功导入 ${result.success} 条记账记录！`, false);
        }
        this.renderTable();
      } catch (err) {
        this._showBatchResult('导入失败：' + err.message, true);
      }
    };
    reader.readAsText(file);
    input.value = '';
  },

  // 解析批量导入 CSV
  _parseBatchCSV(csvText) {
    // 按行分割，过滤注释行（#开头）和空行
    const lines = csvText.split(/[\n\r]+/)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));

    const accounts = DB.getAccounts();
    const result = { success: 0, errors: [] };

    if (lines.length < 1) {
      result.errors.push('文件为空或格式不正确');
      return result;
    }

    // 解析表头（中文兼容，也允许英文）
    const headerLine = lines[0];
    const delim = headerLine.includes('\t') ? '\t' : ',';
    // 支持中英文表头
    const headerMap = {
      '日期': 'date', '类型': 'type', '金额': 'amount',
      '科目编码': 'accountCode', '科目名称': 'accountName', '科目': 'accountCode',
      '渠道': 'channel', '说明': 'description', '描述': 'description',
      '门店': 'store_id', '门店ID': 'store_id', '资金账户': 'fund_account_id',
      '资金账户ID': 'fund_account_id'
    };
    // 支持中英文类型值
    const typeMap = { '收入': 'income', '支出': 'expense', 'income': 'income', 'expense': 'expense' };
    const channelMap = { '堂食': 'dine-in', '外卖': 'delivery', '自提': 'takeout', '其他': 'other', 'dine-in': 'dine-in', 'delivery': 'delivery', 'takeout': 'takeout' };
    const headers = headerLine.split(delim).map(h => {
      const clean = h.trim().replace(/^"|"$/g, '');
      return headerMap[clean] || clean;
    });

    const requiredFields = ['date', 'type', 'amount', 'accountCode'];
    const missing = requiredFields.filter(f => !headers.includes(f));
    if (missing.length > 0) {
      result.errors.push(`缺少必要列: ${missing.join(', ')}。请使用导出的模板。`);
      return result;
    }

    // 逐行解析
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delim).map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 3) continue;

      const row = {};
      headers.forEach((h, idx) => { row[h] = cols[idx] || ''; });

      try {
        if (!row.date || !row.amount || !row.accountCode) {
          result.errors.push(`第 ${i+1} 行: 缺少必填字段`);
          continue;
        }

        const amount = parseFloat(row.amount);
        if (isNaN(amount) || amount <= 0) {
          result.errors.push(`第 ${i+1} 行: 金额无效 (${row.amount})`);
          continue;
        }

        const acc = accounts.find(a => a.code === row.accountCode || a.name === row.accountCode);
        if (!acc) {
          result.errors.push(`第 ${i+1} 行: 未找到科目 "${row.accountCode}"`);
          continue;
        }

        const data = {
          date: row.date,
          amount: amount,
          account_id: acc.id,
          type: typeMap[(row.type || '').trim()] || 'expense',
          channel: channelMap[(row.channel || '').trim()] || 'other',
          description: row.description || `批量导入-${acc.name}`,
          store_id: row.store_id || App.currentStore,
          fund_account_id: row.fund_account_id || ''
        };

        DB.addTransaction(data);
        result.success++;
      } catch (e) {
        result.errors.push(`第 ${i+1} 行: ${e.message}`);
      }
    }

    return result;
  },

  // 显示导入结果
  _showBatchResult(msg, isErr) {
    const preview = document.getElementById('invoicePreview');
    // 在发票区域显示，如果没有就在页面上方显示提示
    const existing = document.getElementById('batchResult');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.id = 'batchResult';
    div.style.cssText = `margin:8px 0;padding:10px 14px;border-radius:8px;font-size:12px;background:${isErr ? 'var(--danger-light)' : 'var(--success-light)'};color:${isErr ? '#991b1b' : '#065f46'};border:0.5px solid ${isErr ? 'rgba(220,38,38,0.2)' : 'rgba(5,150,105,0.2)'}`;
    div.innerHTML = msg;
    const filterBar = document.querySelector('.filter-bar');
    if (filterBar) filterBar.after(div);
    setTimeout(() => div.remove(), 10000);
  }
};

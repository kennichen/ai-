/**
 * 设置页面
 */
const Settings = {
  render(container) {
    this._container = container;
    container.innerHTML = '';

    // 门店管理
    const stores = DB.getStores();
    let storeRows = stores.map(s => `
      <tr>
        <td>${s.name}</td>
        <td>${s.address || '-'}</td>
        <td>${s.is_headquarters ? '<span class="badge badge-primary">总店</span>' : '<span class="badge badge-accent">分店</span>'}</td>
        <td>${App.fmtDate(s.created_at?.split('T')[0])}</td>
      </tr>
    `).join('');

    // 资金账户
    const fundAccounts = DB.getFundAccounts();
    const typeLabels2 = { bank: '银行账户', cash: '库存现金', wechat: '微信', alipay: '支付宝', other: '其他' };
    const typeColors2 = { bank: 'badge-primary', cash: 'badge-success', wechat: 'badge-accent', alipay: 'badge-accent', other: 'badge-gold' };
    let fundRows = fundAccounts.map(a => {
      const balance = DB.getFundAccountBalance(a.id);
      return `<tr>
        <td>${a.name} ${a.isDefault ? '<span style="font-size:10px;color:var(--text-tertiary)">默认</span>' : ''}</td>
        <td><span class="badge ${typeColors2[a.type] || 'badge-accent'}">${typeLabels2[a.type] || a.type}</span></td>
        <td style="font-size:11px;color:var(--text-secondary)">${a.accountNo || '-'}</td>
        <td class="amount">${App.fmtMoney(a.openingBalance || 0)}</td>
        <td class="amount" style="font-weight:500">${App.fmtMoney(balance)}</td>
        <td style="text-align:right">
          <button class="btn btn-sm btn-outline" onclick="Settings.showEditFundModal('${a.id}')">编辑</button>
          ${a.isDefault ? '' : `<button class="btn btn-sm btn-danger" onclick="Settings.deleteFundAccount('${a.id}')">删除</button>`}
        </td>
      </tr>`;
    }).join('');
    const accounts = DB.getAccounts();
    const typeLabels = { asset: '资产', liability: '负债', equity: '权益', revenue: '收入', cost: '成本', expense: '费用' };
    const typeColors = { asset: 'badge-primary', liability: 'badge-gold', equity: 'badge-accent', revenue: 'badge-primary', cost: 'badge-danger', expense: 'badge-warm' };

    let accRows = accounts.map(a => `
      <tr>
        <td style="font-family:monospace;font-size:12px">${a.code}</td>
        <td>${a.name}</td>
        <td><span class="badge ${typeColors[a.type]}">${typeLabels[a.type]}</span></td>
        <td>${a.category || '-'}</td>
        <td>${a.is_restaurant ? '<span class="badge badge-accent">餐饮</span>' : '-'}</td>
        <td>${a.is_default ? '<span style="color:var(--gray-400)">预设</span>' : '自定义'}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn btn-sm btn-outline" onclick="Settings.showEditAccountModal('${a.id}')">编辑</button>
          <button class="btn btn-sm btn-danger" onclick="Settings.deleteAccount('${a.id}')">删除</button>
        </td>
      </tr>
    `).join('');

    const html = `
      <div class="card">
        <div class="card-header"><div class="card-title">门店管理</div></div>
        <table class="data-table">
          <thead><tr><th>门店名称</th><th>地址</th><th>类型</th><th>创建时间</th></tr></thead>
          <tbody>${storeRows}</tbody>
        </table>
        <div style="margin-top:12px">
          <button class="btn btn-sm btn-outline" onclick="Settings.showAddStoreModal()">+ 新增门店</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">会计科目表</div>
          <span class="card-subtitle">${accounts.length} 个科目 · 餐饮行业预设</span>
        </div>
        <div style="display:flex;justify-content:flex-end;padding:0 0 10px">
          <button class="btn btn-sm btn-primary" onclick="Settings.showAddAccountModal()">+ 新增科目</button>
        </div>
        <div style="max-height:400px;overflow-y:auto">
          <table class="data-table">
            <thead>
              <tr><th>编码</th><th>科目名称</th><th>类型</th><th>分类</th><th>餐饮专用</th><th>来源</th><th style="text-align:right">操作</th></tr>
            </thead>
            <tbody>${accRows}</tbody>
          </table>
        </div>
      </div>

      <!-- 资金账户管理 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">资金账户</div>
          <span class="card-subtitle">管理银行账户、现金、微信/支付宝等</span>
        </div>
        <div style="display:flex;justify-content:flex-end;padding:0 0 10px">
          <button class="btn btn-sm btn-primary" onclick="Settings.showAddFundModal()">+ 新增账户</button>
        </div>
        <table class="data-table">
          <thead><tr><th>账户名称</th><th>类型</th><th>账号</th><th>期初余额</th><th>当前余额</th><th style="text-align:right">操作</th></tr></thead>
          <tbody>${fundRows}</tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">数据管理</div></div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn-outline" onclick="Settings.exportData()">导出所有数据</button>
          <button class="btn btn-danger" onclick="Settings.clearData()">清除所有数据</button>
          <button class="btn btn-accent" onclick="Settings.importData()">导入数据</button>
        </div>
        <div style="margin-top:12px;padding:12px;background:var(--warning-light);border-radius:8px;font-size:12px;color:#633806">
          数据存储在浏览器本地 (localStorage)，清除浏览器缓存会丢失数据。建议定期导出备份。
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">关于</div></div>
        <div style="font-size:13px;color:var(--gray-600);line-height:2">
          <div>餐厨财务工作台 v1.0</div>
          <div>面向中小餐饮门店的财务管理系统</div>
          <div>数据存储：浏览器本地 localStorage</div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // 导入 - 隐藏的 file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          Object.entries(data).forEach(([key, val]) => {
            localStorage.setItem(key, JSON.stringify(val));
          });
          alert('数据导入成功！页面将刷新。');
          location.reload();
        } catch (err) {
          alert('导入失败：文件格式不正确');
        }
      };
      reader.readAsText(file);
    });
    document.body.appendChild(fileInput);
    this._fileInput = fileInput;
  },

  showAddStoreModal() {
    const bodyHtml = `
      <div class="form-group">
        <label>门店名称</label>
        <input type="text" class="form-control" id="storeFormName" placeholder="如：朝阳店">
      </div>
      <div class="form-group">
        <label>地址</label>
        <input type="text" class="form-control" id="storeFormAddress" placeholder="门店地址（选填）">
      </div>
    `;

    App.showModal('新增门店', bodyHtml, `
      <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Settings.saveStore()">保存</button>
    `);
  },

  saveStore() {
    const name = document.getElementById('storeFormName').value.trim();
    const address = document.getElementById('storeFormAddress').value.trim();
    if (!name) { alert('请输入门店名称'); return; }
    DB.addStore({ name, address });
    App.closeModal();
    App.loadStoreSelector();
  },

  exportData() {
    const keys = ['wb_accounts', 'wb_transactions', 'wb_journal_entries', 'wb_stores', 'wb_menu_items', 'wb_suppliers'];
    const data = {};
    keys.forEach(k => {
      const val = localStorage.getItem(k);
      if (val) data[k] = JSON.parse(val);
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `restaurant_finance_backup_${App.today()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  importData() {
    this._fileInput?.click();
  },

  clearData() {
    if (!confirm('确定清除所有数据？此操作不可恢复！')) return;
    if (!confirm('再次确认：所有记账数据将被永久删除！')) return;
    const keys = ['wb_accounts', 'wb_transactions', 'wb_journal_entries', 'wb_stores', 'wb_menu_items', 'wb_suppliers'];
    keys.forEach(k => localStorage.removeItem(k));
    DB.init();
    alert('数据已清除');
    location.reload();
  },

  // ========== 会计科目 增 / 改 / 删 ==========
  _accountTypeOptions(selected) {
    const map = { asset: '资产', liability: '负债', equity: '权益', revenue: '收入', cost: '成本', expense: '费用' };
    return Object.entries(map).map(([v, l]) => `<option value="${v}" ${v === selected ? 'selected' : ''}>${l}</option>`).join('');
  },

  _accountFormHtml(acc) {
    const isEdit = !!acc;
    const code = acc?.code || '';
    const name = acc?.name || '';
    const type = acc?.type || 'expense';
    const category = acc?.category || '';
    const isRestaurant = acc?.is_restaurant ? 'checked' : '';
    return `
      <div class="form-row">
        <div class="form-group">
          <label>科目编码</label>
          <input type="text" class="form-control" id="accFormCode" value="${code}" placeholder="如：1002（数字）" ${isEdit ? 'readonly' : ''}>
          <small style="color:var(--gray-400)">${isEdit ? '编码为科目唯一标识，不可修改' : '建议按会计准则编号，如资产1xxx/负债2xxx/权益4xxx/收入5xxx/成本6xxx'}</small>
        </div>
        <div class="form-group">
          <label>科目名称</label>
          <input type="text" class="form-control" id="accFormName" value="${name}" placeholder="如：办公费">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>科目类型</label>
          <select class="form-control" id="accFormType">
            ${this._accountTypeOptions(type)}
          </select>
        </div>
        <div class="form-group">
          <label>分类</label>
          <input type="text" class="form-control" id="accFormCategory" value="${category}" placeholder="如：管理费用">
        </div>
      </div>
      <div class="form-group" style="display:flex;align-items:center;gap:8px">
        <input type="checkbox" id="accFormRestaurant" ${isRestaurant}>
        <label for="accFormRestaurant" style="margin:0">餐饮行业专用科目</label>
      </div>
      ${isEdit ? `<input type="hidden" id="accFormId" value="${acc.id}">` : ''}
    `;
  },

  showAddAccountModal() {
    App.showModal('新增会计科目', this._accountFormHtml(null), `
      <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Settings.saveAccount()">保存</button>
    `);
  },

  showEditAccountModal(id) {
    const acc = DB.getAccount(id);
    if (!acc) { alert('科目不存在'); return; }
    App.showModal('编辑会计科目', this._accountFormHtml(acc), `
      <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Settings.saveAccount()">保存</button>
    `);
  },

  saveAccount() {
    const code = (document.getElementById('accFormCode').value || '').trim();
    const name = (document.getElementById('accFormName').value || '').trim();
    const type = document.getElementById('accFormType').value;
    const category = (document.getElementById('accFormCategory').value || '').trim();
    const isRestaurant = document.getElementById('accFormRestaurant').checked;
    const editId = document.getElementById('accFormId')?.value;

    // 校验
    if (!code) { alert('请输入科目编码'); return; }
    if (!/^\d{2,10}$/.test(code)) { alert('科目编码须为 2-10 位数字'); return; }
    if (!name) { alert('请输入科目名称'); return; }

    const accounts = DB.getAccounts();
    const dup = accounts.find(a => a.code === code && a.id !== editId);
    if (dup) { alert(`编码 ${code} 已存在（${dup.name}），请换一个`); return; }

    if (editId) {
      DB.updateAccount(editId, { code, name, type, category, is_restaurant: isRestaurant });
    } else {
      DB.addAccount({ code, name, type, category, is_restaurant: isRestaurant, is_default: false });
    }

    App.closeModal();
    this.render(this._container || document.getElementById('pageContent'));
  },

  deleteAccount(id) {
    const acc = DB.getAccount(id);
    if (!acc) return;
    if (!confirm(`确定删除科目「${acc.name}」吗？`)) return;
    const res = DB.deleteAccount(id);
    if (res && res.ok === false) {
      alert(`该科目已有 ${res.count} 笔记账记录，无法删除。\n请先删除相关记账（或将记录改到其他科目）后再试。`);
      return;
    }
    alert('科目已删除');
    this.render(this._container || document.getElementById('pageContent'));
  },

  // ========== 资金账户 增 / 改 / 删 ==========
  showAddFundModal() {
    App.showModal('新增资金账户', `
      <div class="form-group">
        <label>账户名称</label>
        <input type="text" class="form-control" id="fundFormName" placeholder="如：工行主卡、备用金">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>账户类型</label>
          <select class="form-control" id="fundFormType">
            <option value="bank">银行账户</option>
            <option value="cash">库存现金</option>
            <option value="wechat">微信</option>
            <option value="alipay">支付宝</option>
            <option value="other">其他</option>
          </select>
        </div>
        <div class="form-group">
          <label>账号</label>
          <input type="text" class="form-control" id="fundFormNo" placeholder="银行卡号后4位">
        </div>
      </div>
      <div class="form-group">
        <label>期初余额 (¥)</label>
        <input type="number" class="form-control" id="fundFormBalance" value="0" step="0.01">
      </div>
    `, `
      <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Settings.saveFundAccount()">保存</button>
    `);
  },

  showEditFundModal(id) {
    const acc = DB.getFundAccounts().find(a => a.id === id);
    if (!acc) return;
    App.showModal('编辑资金账户', `
      <div class="form-group">
        <label>账户名称</label>
        <input type="text" class="form-control" id="fundFormName" value="${acc.name}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>账户类型</label>
          <select class="form-control" id="fundFormType">
            <option value="bank" ${acc.type === 'bank' ? 'selected' : ''}>银行账户</option>
            <option value="cash" ${acc.type === 'cash' ? 'selected' : ''}>库存现金</option>
            <option value="wechat" ${acc.type === 'wechat' ? 'selected' : ''}>微信</option>
            <option value="alipay" ${acc.type === 'alipay' ? 'selected' : ''}>支付宝</option>
            <option value="other" ${acc.type === 'other' ? 'selected' : ''}>其他</option>
          </select>
        </div>
        <div class="form-group">
          <label>账号</label>
          <input type="text" class="form-control" id="fundFormNo" value="${acc.accountNo || ''}">
        </div>
      </div>
      <div class="form-group">
        <label>期初余额 (¥)</label>
        <input type="number" class="form-control" id="fundFormBalance" value="${acc.openingBalance || 0}" step="0.01">
      </div>
    `, `
      <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Settings.saveFundAccount('${id}')">保存</button>
    `);
  },

  saveFundAccount(id) {
    const name = document.getElementById('fundFormName')?.value;
    if (!name) { alert('请输入账户名称'); return; }
    const data = {
      id: id || 'fund_' + Date.now(),
      name,
      type: document.getElementById('fundFormType')?.value || 'bank',
      accountNo: document.getElementById('fundFormNo')?.value || '',
      openingBalance: parseFloat(document.getElementById('fundFormBalance')?.value) || 0,
      isDefault: false
    };
    DB.saveFundAccount(data);
    App.closeModal();
    this.render(this._container || document.getElementById('pageContent'));
  },

  deleteFundAccount(id) {
    if (!confirm('确定删除此资金账户？与该账户关联的记账记录不会删除。')) return;
    DB.deleteFundAccount(id);
    this.render(this._container || document.getElementById('pageContent'));
  }
};

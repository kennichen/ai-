/**
 * 供应链采购管理 — 采购订单 / 到货入库 / 付款 / 供应商比价
 */
const Purchasing = {
  tab: 'orders', // orders | suppliers

  render(container) {
    container.innerHTML = '';
    this._container = container;

    const orders = DB.getPurchaseOrders();
    const suppliers = DB.getSuppliers();
    const pending = orders.filter(o => o.status === '待收货').length;
    const monthOrders = orders.filter(o => (o.order_date || '').startsWith((App.today() || '').slice(0, 7)));
    const monthTotal = monthOrders.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);
    const unpaid = DB.getPayables().filter(p => p.status !== '已付').reduce((s, p) => s + (parseFloat(p.amount) - parseFloat(p.paid || 0)), 0);

    let html = `
      <!-- KPI -->
      <div class="kpi-row">
        <div class="stat-card kpi-item">
          <div class="kpi-value" style="color:var(--primary)">${orders.length}</div>
          <div class="kpi-label">采购订单</div>
          <div style="font-size:11px;color:${pending > 0 ? 'var(--warning)' : 'var(--text-tertiary)'}">待收货 ${pending} 单</div>
        </div>
        <div class="stat-card kpi-item">
          <div class="kpi-value" style="color:var(--success)">${App.fmtMoneyShort(monthTotal)}</div>
          <div class="kpi-label">本月采购额</div>
        </div>
        <div class="stat-card kpi-item">
          <div class="kpi-value" style="color:var(--danger)">${App.fmtMoneyShort(unpaid)}</div>
          <div class="kpi-label">应付未付</div>
        </div>
        <div class="stat-card kpi-item">
          <div class="kpi-value">${suppliers.length}</div>
          <div class="kpi-label">供应商</div>
        </div>
      </div>

      <!-- Tab -->
      <div class="report-tabs">
        <button class="report-tab ${this.tab === 'orders' ? 'active' : ''}" onclick="Purchasing.switchTab('orders')">采购订单 (${orders.length})</button>
        <button class="report-tab ${this.tab === 'suppliers' ? 'active' : ''}" onclick="Purchasing.switchTab('suppliers')">供应商管理 (${suppliers.length})</button>
      </div>

      <div id="purBody"></div>
    `;

    container.innerHTML = html;
    this.tab === 'orders' ? this.renderOrders() : this.renderSuppliers();
  },

  switchTab(tab) {
    this.tab = tab;
    this.render(this._container || document.getElementById('pageContent'));
  },

  // ========== 采购订单列表 ==========
  clearOrderFilter() {
    ['poFilterKw', 'poFilterStatus', 'poFilterSupplier', 'poFilterStart', 'poFilterEnd'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    this.renderOrders();
  },

  renderOrders() {
    const body = document.getElementById('purBody');
    if (!body) return;
    const orders = DB.getPurchaseOrders().slice().sort((a, b) => (b.order_date || '').localeCompare(a.order_date || ''));
    const suppliers = {};
    DB.getSuppliers().forEach(s => suppliers[s.id] = s.name);

    const statusBadge = { '待收货': 'badge-warning', '已入库': 'badge-primary', '已付款': 'badge-success', '已取消': 'badge-gold' };

    let html = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:10px;gap:6px">
        ${App.isReadOnly ? '' : `
        <button class="btn btn-sm btn-outline" onclick="Purchasing.exportCSV()">导出采购单</button>
        <button class="btn btn-sm btn-outline" onclick="Purchasing.importCSV()">导入采购单</button>
        <button class="btn btn-sm btn-primary" onclick="Purchasing.showOrderModal()">+ 新建采购订单</button>`}
      </div>
      <!-- 筛选栏 -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
        <input type="text" class="form-control" id="poFilterKw" placeholder="搜索供应商..." style="width:140px;padding:5px 10px;font-size:12px" oninput="Purchasing.renderOrders()">
        <select class="form-control" id="poFilterStatus" style="width:110px;padding:5px;font-size:12px" onchange="Purchasing.renderOrders()">
          <option value="">全部状态</option>
          <option value="待收货">待收货</option>
          <option value="已入库">已入库</option>
          <option value="已付款">已付款</option>
        </select>
        <select class="form-control" id="poFilterSupplier" style="width:150px;padding:5px;font-size:12px" onchange="Purchasing.renderOrders()">
          <option value="">全部供应商</option>
          ${DB.getSuppliers().map(s => `<option value="${s.name}">${s.name}</option>`).join('')}
        </select>
        <input type="date" class="form-control" id="poFilterStart" style="width:135px;padding:5px;font-size:12px" onchange="Purchasing.renderOrders()">
        <span style="font-size:11px;color:var(--text-tertiary)">至</span>
        <input type="date" class="form-control" id="poFilterEnd" style="width:135px;padding:5px;font-size:12px" onchange="Purchasing.renderOrders()">
        <button class="btn btn-sm btn-outline" style="padding:3px 10px;font-size:11px" onclick="Purchasing.clearOrderFilter()">清除筛选</button>
        <span id="poFilterCount" style="font-size:11px;color:var(--text-tertiary);margin-left:auto"></span>
      </div>
      <div class="glass-card" style="padding:0;overflow:hidden">
        <div style="padding:4px 16px">
    `;

    // ===== 应用筛选 =====
    const kw = (document.getElementById('poFilterKw')?.value || '').trim();
    const fStatus = document.getElementById('poFilterStatus')?.value || '';
    const fSup = document.getElementById('poFilterSupplier')?.value || '';
    const fStart = document.getElementById('poFilterStart')?.value || '';
    const fEnd = document.getElementById('poFilterEnd')?.value || '';
    let filtered = orders;
    if (kw) filtered = filtered.filter(o => (o.supplier_name || '').includes(kw));
    if (fStatus) filtered = filtered.filter(o => o.status === fStatus);
    if (fSup) filtered = filtered.filter(o => o.supplier_name === fSup);
    if (fStart) filtered = filtered.filter(o => (o.order_date || '') >= fStart);
    if (fEnd) filtered = filtered.filter(o => (o.order_date || '') <= fEnd);
    const countEl = document.getElementById('poFilterCount');
    if (countEl) countEl.textContent = `共 ${filtered.length} 单`;

    if (filtered.length === 0) {
      html += `<div class="empty-state"><div class="icon">&#x1F4E6;</div><p>暂无符合条件的采购订单</p></div>`;
    } else {
      html += `<table class="data-table">
        <thead><tr><th>订单日期</th><th>供应商</th><th style="text-align:right">金额</th><th>状态</th><th>应付</th><th style="text-align:right">操作</th></tr></thead><tbody>`;
      filtered.forEach(o => {
        const payable = DB.getPayables().find(p => p.ref_order_id === o.id);
        html += `
          <tr>
            <td style="white-space:nowrap">${App.fmtDate(o.order_date)}</td>
            <td>${o.supplier_name || suppliers[o.supplier_id] || '-'}</td>
            <td class="amount" style="font-weight:500">${App.fmtMoney(o.total_amount)}</td>
            <td><span class="badge ${statusBadge[o.status] || 'badge-accent'}">${o.status}</span></td>
            <td style="font-size:11px">${payable ? (payable.status === '已付' ? '<span style="color:var(--success)">已付</span>' : '<span style="color:var(--danger)">未付 ' + App.fmtMoney(parseFloat(payable.amount) - parseFloat(payable.paid || 0)) + '</span>') : '-'}</td>
            <td style="text-align:right;white-space:nowrap">
              <button class="btn btn-sm btn-outline" onclick="Purchasing.viewOrder('${o.id}')">明细</button>
              ${App.isReadOnly ? '' : (o.status === '待收货' ? `
              <button class="btn btn-sm btn-primary" onclick="Purchasing.receiveOrder('${o.id}')">确认入库</button>
              ` : '')}
              ${App.isReadOnly ? '' : (o.status === '已入库' && payable && payable.status !== '已付' ? `
              <button class="btn btn-sm btn-outline" onclick="Purchasing.payOrder('${payable.id}')">付款</button>
              ` : '')}
              ${App.isReadOnly ? '' : (o.status === '待收货' ? `<button class="btn btn-sm btn-danger" onclick="Purchasing.deleteOrder('${o.id}')">删除</button>` : '')}
            </td>
          </tr>`;
      });
      html += '</tbody></table>';
    }
    html += '</div></div>';
    body.innerHTML = html;
  },

  // ========== 新建订单 ==========
  showOrderModal() {
    const suppliers = DB.getSuppliers();
    const inventory = DB.getInventory();
    const supOpts = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    const invOpts = inventory.map(i => `<option value="${i.id}" data-name="${i.name}" data-unit="${i.unit}">${i.name}（${i.category || '食材'} · ${i.unit}）</option>`).join('');
    App.showModal('新建采购订单', `
      <div class="form-row">
        <div class="form-group">
          <label>供应商</label>
          <select class="form-control" id="poSupplier">${supOpts || '<option value="">请先添加供应商</option>'}</select>
        </div>
        <div class="form-group">
          <label>订单日期</label>
          <input type="date" class="form-control" id="poDate" value="${App.today()}">
        </div>
      </div>
      <div class="form-group">
        <label>付款到期日（默认收货时挂应付）</label>
        <input type="date" class="form-control" id="poDue">
      </div>
      <div style="font-size:12px;font-weight:500;margin:10px 0 6px">采购明细</div>
      <div id="poItems">
        <div class="po-item" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:6px;margin-bottom:6px;align-items:center">
          <select class="form-control" style="padding:5px" onchange="Purchasing.syncItemMeta(this)">${invOpts || '<option value="">暂无食材，请先在进销存添加</option>'}</select>
          <input type="number" class="form-control" style="padding:5px" placeholder="数量" min="0.01" step="0.01" oninput="Purchasing.recalcOrder()">
          <input type="number" class="form-control" style="padding:5px" placeholder="单价" min="0" step="0.01" oninput="Purchasing.recalcOrder()">
          <input type="text" class="form-control" style="padding:5px" placeholder="单位" readonly>
          <button class="btn btn-sm btn-danger" onclick="Purchasing.removeItemRow(this)" style="padding:3px 8px">删</button>
        </div>
      </div>
      <button class="btn btn-sm btn-outline" onclick="Purchasing.addItemRow()" style="margin:4px 0">+ 添加一行</button>
      <div style="display:flex;justify-content:flex-end;margin-top:10px;font-size:14px">
        合计：<b id="poTotal" style="margin-left:6px">¥0.00</b>
      </div>
    `, `
      <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Purchasing.saveOrder()">保存订单</button>
    `, );
    // 重新绑定第一行的食材下拉数据
  },

  addItemRow() {
    const inventory = DB.getInventory();
    const invOpts = inventory.map(i => `<option value="${i.id}" data-name="${i.name}" data-unit="${i.unit}">${i.name}（${i.category || '食材'} · ${i.unit}）</option>`).join('');
    const row = document.createElement('div');
    row.className = 'po-item';
    row.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:6px;margin-bottom:6px;align-items:center';
    row.innerHTML = `
      <select class="form-control" style="padding:5px" onchange="Purchasing.syncItemMeta(this)">${invOpts || '<option value="">暂无食材</option>'}</select>
      <input type="number" class="form-control" style="padding:5px" placeholder="数量" min="0.01" step="0.01" oninput="Purchasing.recalcOrder()">
      <input type="number" class="form-control" style="padding:5px" placeholder="单价" min="0" step="0.01" oninput="Purchasing.recalcOrder()">
      <input type="text" class="form-control" style="padding:5px" placeholder="单位" readonly>
      <button class="btn btn-sm btn-danger" onclick="Purchasing.removeItemRow(this)" style="padding:3px 8px">删</button>
    `;
    document.getElementById('poItems').appendChild(row);
  },

  removeItemRow(btn) {
    const rows = document.querySelectorAll('.po-item');
    if (rows.length <= 1) return;
    btn.closest('.po-item').remove();
    this.recalcOrder();
  },

  syncItemMeta(sel) {
    const opt = sel.options[sel.selectedIndex];
    if (!opt) return;
    const unitInput = sel.closest('.po-item').querySelector('input[placeholder="单位"]');
    if (unitInput) unitInput.value = opt.dataset.unit || '';
  },

  recalcOrder() {
    const rows = document.querySelectorAll('.po-item');
    let total = 0;
    rows.forEach(r => {
      const qty = parseFloat(r.querySelector('input[placeholder="数量"]')?.value) || 0;
      const price = parseFloat(r.querySelector('input[placeholder="单价"]')?.value) || 0;
      total += qty * price;
    });
    const el = document.getElementById('poTotal');
    if (el) el.textContent = App.fmtMoney(total);
  },

  saveOrder() {
    const supplierId = document.getElementById('poSupplier')?.value;
    if (!supplierId) { alert('请选择供应商'); return; }
    const rows = document.querySelectorAll('.po-item');
    const items = [];
    let total = 0;
    rows.forEach(r => {
      const invId = r.querySelector('select')?.value;
      const qty = parseFloat(r.querySelector('input[placeholder="数量"]')?.value) || 0;
      const price = parseFloat(r.querySelector('input[placeholder="单价"]')?.value) || 0;
      if (!invId || qty <= 0) return;
      const opt = r.querySelector('select').selectedOptions[0];
      items.push({
        inventory_id: invId,
        material_name: opt?.dataset?.name || '未知',
        unit: opt?.dataset?.unit || r.querySelector('input[placeholder="单位"]')?.value || '份',
        qty, unit_price: price, amount: Math.round(qty * price * 100) / 100
      });
      total += qty * price;
    });
    if (items.length === 0) { alert('请至少填写一项有效的采购明细'); return; }

    const supplier = DB.getSuppliers().find(s => s.id === supplierId);
    const order = DB.addPurchaseOrder({
      supplier_id: supplierId,
      supplier_name: supplier ? supplier.name : '未知供应商',
      order_date: document.getElementById('poDate')?.value || App.today(),
      pay_due_date: document.getElementById('poDue')?.value || '',
      total_amount: Math.round(total * 100) / 100,
      status: '待收货'
    });
    items.forEach(it => DB.addPurchaseItem({ ...it, order_id: order.id }));
    App.closeModal();
    this.render(this._container || document.getElementById('pageContent'));
  },

  viewOrder(id) {
    const order = DB.getPurchaseOrders().find(o => o.id === id);
    const items = DB.getPurchaseItems().filter(i => i.order_id === id);
    if (!order) return;
    const suppliers = {};
    DB.getSuppliers().forEach(s => suppliers[s.id] = s.name);
    App.showModal('采购订单明细', `
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px">
        供应商：<b style="color:var(--text-primary)">${order.supplier_name}</b> ·
        日期：${App.fmtDate(order.order_date)} · 状态：<span class="badge badge-primary">${order.status}</span>
      </div>
      <table class="data-table">
        <thead><tr><th>食材</th><th style="text-align:right">数量</th><th style="text-align:right">单价</th><th style="text-align:right">金额</th></tr></thead>
        <tbody>${items.map(i => `<tr><td>${i.material_name}</td><td class="amount">${i.qty} ${i.unit}</td><td class="amount">¥${Number(i.unit_price).toFixed(2)}</td><td class="amount">${App.fmtMoney(i.amount)}</td></tr>`).join('')}</tbody>
      </table>
      <div style="text-align:right;margin-top:8px;font-weight:500">合计：${App.fmtMoney(order.total_amount)}</div>
    `, `<button class="btn btn-outline" onclick="App.closeModal()">关闭</button>`);
  },

  receiveOrder(id) {
    if (!confirm('确认入库？将自动增加库存并挂应付账款。')) return;
    const res = DB.receivePurchaseOrder(id);
    if (res.ok) {
      alert(`入库成功！\n增加 ${res.items} 项食材库存\n自动挂应付 ${App.fmtMoney(res.total)}`);
    } else {
      alert(res.msg || '入库失败');
    }
    this.render(this._container || document.getElementById('pageContent'));
  },

  payOrder(payableId) {
    const payable = DB.getPayables().find(p => p.id === payableId);
    if (!payable) return;
    const balance = parseFloat(payable.amount) - parseFloat(payable.paid || 0);
    const fundOpts = DB.getFundAccounts().map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    App.showModal('供应商付款', `
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px">
        应付：<b>${payable.party}</b> · 余额 <b style="color:var(--danger)">${App.fmtMoney(balance)}</b>
      </div>
      <div class="form-row">
        <div class="form-group"><label>付款金额 (¥)</label><input type="number" class="form-control" id="payAmt" value="${balance.toFixed(2)}" step="0.01" min="0.01"></div>
        <div class="form-group"><label>资金账户</label><select class="form-control" id="payFund">${fundOpts}</select></div>
      </div>
      <div style="font-size:11px;color:var(--text-tertiary)">确认后将自动核销应付并生成记账分录</div>
    `, `
      <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Purchasing.confirmPay('${payableId}')">确认付款</button>
    `);
  },

  confirmPay(payableId) {
    const amount = parseFloat(document.getElementById('payAmt')?.value) || 0;
    if (amount <= 0) { alert('请输入有效金额'); return; }
    const fundId = document.getElementById('payFund')?.value || '';
    const res = DB.payPayable(payableId, amount, fundId);
    if (res.ok) {
      alert(`付款成功（${res.status}）\n已自动生成记账分录`);
    } else {
      alert(res.msg || '付款失败');
    }
    App.closeModal();
    this.render(this._container || document.getElementById('pageContent'));
  },

  deleteOrder(id) {
    if (!confirm('确定删除该采购订单？')) return;
    DB.deletePurchaseItemsByOrder(id);
    DB.deletePurchaseOrder(id);
    this.render(this._container || document.getElementById('pageContent'));
  },

  // ========== 供应商管理 ==========
  renderSuppliers() {
    const body = document.getElementById('purBody');
    if (!body) return;
    const suppliers = DB.getSuppliers();
    const orders = DB.getPurchaseOrders();

    let html = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
        ${App.isReadOnly ? '' : '<button class="btn btn-sm btn-primary" onclick="Purchasing.showSupplierModal()">+ 新增供应商</button>'}
      </div>
      <!-- 供应商搜索 -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
        <input type="text" class="form-control" id="supFilterKw" placeholder="搜索供应商名称/联系人..." style="width:200px;padding:5px 10px;font-size:12px" oninput="Purchasing.renderSuppliers()">
        <span id="supFilterCount" style="font-size:11px;color:var(--text-tertiary);margin-left:auto"></span>
      </div>
      <div class="glass-card" style="padding:0;overflow:hidden">
        <div style="padding:4px 16px">
    `;

    const kw = (document.getElementById('supFilterKw')?.value || '').trim();
    let filtered = suppliers;
    if (kw) filtered = filtered.filter(s => (s.name || '').includes(kw) || (s.contact || '').includes(kw) || (s.phone || '').includes(kw));
    const supCountEl = document.getElementById('supFilterCount');
    if (supCountEl) supCountEl.textContent = `共 ${filtered.length} 家`;

    if (filtered.length === 0) {
      html += `<div class="empty-state"><div class="icon">&#x1F4E6;</div><p>暂无供应商</p></div>`;
    } else {
      html += `<table class="data-table">
        <thead><tr><th>供应商名称</th><th>联系人</th><th>电话</th><th>地址</th><th>采购单数</th><th style="text-align:right">累计采购额</th><th style="text-align:right">操作</th></tr></thead><tbody>`;
      filtered.forEach(s => {
        const sOrders = orders.filter(o => o.supplier_id === s.id);
        const sTotal = sOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
        html += `<tr>
          <td style="font-weight:500">${s.name}</td>
          <td>${s.contact || '-'}</td>
          <td>${s.phone || '-'}</td>
          <td style="font-size:11px;color:var(--text-secondary);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.address || '-'}</td>
          <td>${sOrders.length}</td>
          <td class="amount">${App.fmtMoney(sTotal)}</td>
          <td style="text-align:right">
            <button class="btn btn-sm btn-outline" onclick="Purchasing.showSupplierModal('${s.id}')">编辑</button>
            ${App.isReadOnly ? '' : `<button class="btn btn-sm btn-danger" onclick="Purchasing.deleteSupplier('${s.id}')">删除</button>`}
          </td>
        </tr>`;
      });
      html += '</tbody></table>';
    }
    html += '</div></div>';
    body.innerHTML = html;
  },

  showSupplierModal(id) {
    const s = id ? DB.getSuppliers().find(x => x.id === id) : null;
    App.showModal(id ? '编辑供应商' : '新增供应商', `
      <div class="form-group"><label>供应商名称</label><input type="text" class="form-control" id="supName" value="${s?.name || ''}" placeholder="如：某某食材批发"></div>
      <div class="form-row">
        <div class="form-group"><label>联系人</label><input type="text" class="form-control" id="supContact" value="${s?.contact || ''}"></div>
        <div class="form-group"><label>电话</label><input type="text" class="form-control" id="supPhone" value="${s?.phone || ''}"></div>
      </div>
      <div class="form-group"><label>地址</label><input type="text" class="form-control" id="supAddress" value="${s?.address || ''}"></div>
      <div class="form-group"><label>结算方式</label>
        <select class="form-control" id="supPayType">
          <option value="现结" ${s?.pay_type === '现结' ? 'selected' : ''}>现结（货到付款）</option>
          <option value="月结" ${s?.pay_type === '月结' ? 'selected' : ''}>月结</option>
          <option value="账期" ${s?.pay_type === '账期' ? 'selected' : ''}>账期（按到期日）</option>
        </select>
      </div>
    `, `
      <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Purchasing.saveSupplier('${id || ''}')">保存</button>
    `);
  },

  saveSupplier(id) {
    const name = document.getElementById('supName')?.value;
    if (!name) { alert('请输入供应商名称'); return; }
    const data = {
      name,
      contact: document.getElementById('supContact')?.value || '',
      phone: document.getElementById('supPhone')?.value || '',
      address: document.getElementById('supAddress')?.value || '',
      pay_type: document.getElementById('supPayType')?.value || '现结'
    };
    if (id) {
      const list = DB.getSuppliers();
      const idx = list.findIndex(x => x.id === id);
      if (idx >= 0) { list[idx] = { ...list[idx], ...data }; DB._set('wb_suppliers', list); }
    } else {
      DB.addSupplier(data);
    }
    App.closeModal();
    this.render(this._container || document.getElementById('pageContent'));
  },

  deleteSupplier(id) {
    if (!confirm('确定删除该供应商？相关采购记录保留。')) return;
    const list = DB.getSuppliers().filter(s => s.id !== id);
    DB._set('wb_suppliers', list);
    this.render(this._container || document.getElementById('pageContent'));
  },

  // ========== 导入导出 ==========
  exportCSV() {
    const orders = DB.getPurchaseOrders();
    const items = DB.getPurchaseItems();
    const headers = ['订单日期', '供应商', '食材', '数量', '单位', '单价', '金额', '状态'];
    const rows = [];
    orders.forEach(o => {
      const oItems = items.filter(i => i.order_id === o.id);
      if (oItems.length === 0) rows.push([o.order_date, o.supplier_name, '', '', '', '', o.total_amount, o.status]);
      else oItems.forEach(it => rows.push([o.order_date, o.supplier_name, it.material_name, it.qty, it.unit, it.unit_price, it.amount, o.status]));
    });
    App.downloadCSV('采购订单_' + App.today() + '.csv', headers, rows);
  },

  importCSV() {
    App.pickCSVFile('.csv,.txt', ({ rows }) => {
      const keyMap = { '订单日期': 'date', '供应商': 'supplier', '食材': 'material', '数量': 'qty', '单位': 'unit', '单价': 'price', '金额': 'amount', '状态': 'status' };
      let ok = 0, err = 0; const errors = [];
      // 按供应商+日期分组生成订单
      const groups = {};
      rows.forEach((r, i) => {
        try {
          const data = {};
          Object.entries(keyMap).forEach(([k, v]) => { data[v] = r[k] !== undefined ? r[k] : (r[v] || ''); });
          if (!data.supplier) throw new Error('缺少供应商');
          if (!data.material || !data.qty) throw new Error('缺少食材或数量');
          const key = data.supplier + '|' + data.date;
          if (!groups[key]) groups[key] = { supplier: data.supplier, date: data.date, rows: [] };
          groups[key].rows.push(data);
        } catch (e) { err++; errors.push(`第${i + 2}行: ${e.message}`); }
      });

      Object.values(groups).forEach(g => {
        // 找或建供应商
        let sup = DB.getSuppliers().find(s => s.name === g.supplier);
        if (!sup) { sup = DB.addSupplier({ name: g.supplier, contact: '', phone: '', address: '', pay_type: '现结' }); }
        // 找或建食材
        let total = 0;
        const items = g.rows.map(r => {
          let inv = DB.getInventory().find(x => x.name === r.material);
          if (!inv) { inv = DB.addInventory({ name: r.material, category: '食材', unit: r.unit || '份', qty: 0, avg_cost: parseFloat(r.price) || 0, safe_qty: 0 }); }
          const qty = parseFloat(r.qty) || 0;
          const price = parseFloat(r.price) || 0;
          const amt = +(qty * price).toFixed(2);
          total += amt;
          return { inv, qty, price, amt };
        });
        const order = DB.addPurchaseOrder({
          supplier_id: sup.id, supplier_name: sup.name,
          order_date: g.date || App.today(), pay_due_date: '',
          total_amount: +total.toFixed(2), status: '待收货'
        });
        items.forEach(it => {
          DB.addPurchaseItem({ order_id: order.id, inventory_id: it.inv.id, material_name: it.inv.name, unit: it.inv.unit, qty: it.qty, unit_price: it.price, amount: it.amt });
        });
        ok += items.length;
      });

      alert(`导入完成：成功 ${ok} 项采购明细${err > 0 ? `，失败 ${err} 条\n${errors.slice(0, 5).join('\n')}` : ''}（订单状态为待收货，可在列表确认入库）`);
      this.render(this._container || document.getElementById('pageContent'));
    });
  }
};

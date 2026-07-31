/**
 * 食材进销存管理 — 库存台账 / 出入库 / 预警 / 加权平均成本
 */
const Inventory = {
  render(container) {
    container.innerHTML = '';
    this._container = container;

    const items = DB.getInventory();
    const lowStock = items.filter(i => i.safe_qty > 0 && parseFloat(i.qty) <= i.safe_qty);
    const totalValue = items.reduce((s, i) => s + parseFloat(i.qty) * parseFloat(i.avg_cost || 0), 0);

    let html = `
      <!-- KPI -->
      <div class="kpi-row">
        <div class="stat-card kpi-item">
          <div class="kpi-value" style="color:var(--primary)">${items.length}</div>
          <div class="kpi-label">食材品类</div>
        </div>
        <div class="stat-card kpi-item">
          <div class="kpi-value" style="color:var(--success)">${App.fmtMoneyShort(totalValue)}</div>
          <div class="kpi-label">库存总值</div>
        </div>
        <div class="stat-card kpi-item">
          <div class="kpi-value" style="color:${lowStock.length > 0 ? 'var(--danger)' : 'var(--success)'}">${lowStock.length}</div>
          <div class="kpi-label">低库存预警</div>
        </div>
        <div class="stat-card kpi-item">
          <div class="kpi-value" style="color:var(--warning)">${items.filter(i => i.expiry_date && new Date(i.expiry_date) - new Date() < 3 * 86400000).length}</div>
          <div class="kpi-label">临期食材</div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm ${this._filter === 'all' ? 'btn-primary' : 'btn-outline'}" onclick="Inventory.setFilter('all')">全部</button>
          <button class="btn btn-sm ${this._filter === 'low' ? 'btn-primary' : 'btn-outline'}" onclick="Inventory.setFilter('low')">低库存</button>
          <button class="btn btn-sm ${this._filter === 'expiring' ? 'btn-primary' : 'btn-outline'}" onclick="Inventory.setFilter('expiring')">临期</button>
        </div>
        ${App.isReadOnly ? '' : `
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-outline" onclick="Inventory.exportCSV()">导出库存</button>
          <button class="btn btn-sm btn-outline" onclick="Inventory.importCSV()">导入库存</button>
          <button class="btn btn-sm btn-outline" onclick="Inventory.showStockModal()">出入库</button>
          <button class="btn btn-sm btn-primary" onclick="Inventory.showAddModal()">+ 新增食材</button>
        </div>`}
      </div>

      <!-- 筛选栏 -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
        <input type="text" class="form-control" id="invFilterKw" placeholder="搜索食材名称..." style="width:150px;padding:5px 10px;font-size:12px" oninput="Inventory.renderTable()">
        <select class="form-control" id="invFilterCat" style="width:110px;padding:5px;font-size:12px" onchange="Inventory.renderTable()">
          <option value="">全部分类</option>
          <option value="食材">食材</option>
          <option value="酒水">酒水</option>
          <option value="调料">调料</option>
          <option value="包装">包装</option>
          <option value="其他">其他</option>
        </select>
        <button class="btn btn-sm btn-outline" style="padding:3px 10px;font-size:11px" onclick="Inventory.clearFilter()">清除筛选</button>
        <span id="invFilterCount" style="font-size:11px;color:var(--text-tertiary);margin-left:auto"></span>
      </div>

      <div class="glass-card" style="padding:0;overflow:hidden">
        <div id="invTableBody" style="padding:4px 16px"></div>
      </div>

      <div class="glass-card">
        <div class="glass-card-header">
          <div class="glass-card-title">库存变动流水</div>
        </div>
        <div id="movBody" style="font-size:12px"></div>
      </div>
    `;

    container.innerHTML = html;
    this.renderTable();
    this.renderMovements();
  },

  setFilter(f) {
    this._filter = f;
    this.render(this._container || document.getElementById('pageContent'));
  },

  clearFilter() {
    const kw = document.getElementById('invFilterKw');
    const cat = document.getElementById('invFilterCat');
    if (kw) kw.value = '';
    if (cat) cat.value = '';
    this._filter = 'all';
    this.render(this._container || document.getElementById('pageContent'));
  },

  renderTable() {
    const body = document.getElementById('invTableBody');
    if (!body) return;
    let items = DB.getInventory();
    const today = new Date();

    // 状态筛选（低库存/临期）
    if (this._filter === 'low') items = items.filter(i => i.safe_qty > 0 && parseFloat(i.qty) <= i.safe_qty);
    if (this._filter === 'expiring') items = items.filter(i => i.expiry_date && new Date(i.expiry_date) - today < 3 * 86400000);

    // 关键词 + 分类筛选
    const kw = (document.getElementById('invFilterKw')?.value || '').trim();
    const cat = document.getElementById('invFilterCat')?.value || '';
    if (kw) items = items.filter(i => (i.name || '').includes(kw));
    if (cat) items = items.filter(i => (i.category || '') === cat);
    const countEl = document.getElementById('invFilterCount');
    if (countEl) countEl.textContent = `共 ${items.length} 种`;

    if (items.length === 0) {
      body.innerHTML = `<div class="empty-state"><div class="icon">&#x1F6D2;</div><p>暂无食材库存数据</p></div>`;
      return;
    }

    let html = `<table class="data-table">
      <thead><tr><th>食材名称</th><th>分类</th><th style="text-align:right">库存</th><th style="text-align:right">安全库存</th><th>单位</th><th style="text-align:right">平均成本</th><th style="text-align:right">库存金额</th><th>保质期</th><th>状态</th></tr></thead><tbody>`;

    items.forEach(i => {
      const qty = parseFloat(i.qty) || 0;
      const low = i.safe_qty > 0 && qty <= i.safe_qty;
      const expiring = i.expiry_date && new Date(i.expiry_date) - today < 3 * 86400000 && qty > 0;
      const expired = i.expiry_date && new Date(i.expiry_date) < today && qty > 0;
      const value = qty * parseFloat(i.avg_cost || 0);
      html += `
        <tr>
          <td style="font-weight:500">${i.name}</td>
          <td>${i.category || '-'}</td>
          <td class="amount" style="font-weight:500;color:${qty <= 0 ? 'var(--danger)' : 'var(--text-primary)'}">${qty}</td>
          <td class="amount" style="color:var(--text-secondary)">${i.safe_qty || 0}</td>
          <td>${i.unit || '份'}</td>
          <td class="amount" style="color:var(--text-secondary)">${i.avg_cost ? '¥' + Number(i.avg_cost).toFixed(2) : '-'}</td>
          <td class="amount">${App.fmtMoney(value)}</td>
          <td style="white-space:nowrap;${expired || expiring ? 'color:var(--danger)' : ''}">${i.expiry_date ? App.fmtDate(i.expiry_date) : '-'}</td>
          <td>
            ${qty <= 0 ? '<span class="badge badge-danger">缺货</span>' : ''}
            ${low ? '<span class="badge badge-warning">低库存</span>' : ''}
            ${expired ? '<span class="badge badge-danger">已过期</span>' : ''}
            ${expiring && !expired ? '<span class="badge badge-warning">临期</span>' : ''}
            ${!low && !expiring && qty > 0 ? '<span class="badge badge-success">正常</span>' : ''}
          </td>
        </tr>`;
    });

    html += '</tbody></table>';
    body.innerHTML = html;
  },

  renderMovements() {
    const el = document.getElementById('movBody');
    if (!el) return;
    const movs = DB.getStockMovements().slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 20);
    if (movs.length === 0) {
      el.innerHTML = `<div style="color:var(--text-tertiary);padding:8px;font-size:12px">暂无出入库记录</div>`;
      return;
    }
    const invMap = {};
    DB.getInventory().forEach(i => invMap[i.id] = i.name);
    const typeColors = { '入库': 'var(--success)', '出库': 'var(--danger)', '领用': 'var(--warning)', '盘点': 'var(--primary)' };
    let html = `<table class="data-table">
      <thead><tr><th>日期</th><th>食材</th><th>类型</th><th style="text-align:right">数量</th><th>备注</th></tr></thead><tbody>`;
    movs.forEach(m => {
      html += `<tr>
        <td style="white-space:nowrap">${App.fmtDate(m.date)}</td>
        <td>${invMap[m.inventory_id] || '-'}</td>
        <td><span style="color:${typeColors[m.type] || 'var(--text-secondary)'};font-weight:500">${m.type}</span></td>
        <td class="amount">${m.type === '入库' ? '+' : '-'}${m.qty} ${m.unit || ''}</td>
        <td style="font-size:11px;color:var(--text-tertiary)">${m.note || ''}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  },

  // ========== 新增食材 ==========
  showAddModal() {
    App.showModal('新增食材', `
      <div class="form-row">
        <div class="form-group">
          <label>食材名称</label>
          <input type="text" class="form-control" id="invName" placeholder="如：五花肉">
        </div>
        <div class="form-group">
          <label>分类</label>
          <select class="form-control" id="invCategory">
            <option value="食材">食材</option><option value="酒水">酒水</option><option value="调料">调料</option><option value="包装">包装耗材</option><option value="其他">其他</option>
          </select>
        </div>
      </div>
      <div class="form-row-3">
        <div class="form-group"><label>期初数量</label><input type="number" class="form-control" id="invQty" value="0" step="0.01" min="0"></div>
        <div class="form-group"><label>单位</label><input type="text" class="form-control" id="invUnit" placeholder="kg/份/瓶"></div>
        <div class="form-group"><label>期初单价 (¥)</label><input type="number" class="form-control" id="invCost" value="0" step="0.01" min="0"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>安全库存</label><input type="number" class="form-control" id="invSafe" value="0" step="0.01" min="0"></div>
        <div class="form-group"><label>保质期至</label><input type="date" class="form-control" id="invExpiry"></div>
      </div>
    `, `
      <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Inventory.saveAdd()">保存</button>
    `);
  },

  saveAdd() {
    const name = document.getElementById('invName')?.value;
    if (!name) { alert('请输入食材名称'); return; }
    const data = {
      name,
      category: document.getElementById('invCategory')?.value || '食材',
      qty: parseFloat(document.getElementById('invQty')?.value) || 0,
      unit: document.getElementById('invUnit')?.value || '份',
      avg_cost: parseFloat(document.getElementById('invCost')?.value) || 0,
      safe_qty: parseFloat(document.getElementById('invSafe')?.value) || 0,
      expiry_date: document.getElementById('invExpiry')?.value || ''
    };
    DB.addInventory(data);
    App.closeModal();
    this.render(this._container || document.getElementById('pageContent'));
  },

  // ========== 出入库 ==========
  showStockModal() {
    const items = DB.getInventory();
    const opts = items.map(i => `<option value="${i.id}">${i.name}（当前 ${i.qty} ${i.unit}）</option>`).join('');
    App.showModal('出入库登记', `
      <div class="form-group">
        <label>食材</label>
        <select class="form-control" id="stockItem">${opts || '<option value="">请先新增食材</option>'}</select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>类型</label>
          <select class="form-control" id="stockType" onchange="document.getElementById('stockCostRow').style.display=this.value==='入库'?'':'none'">
            <option value="入库">入库（采购/退货）</option>
            <option value="出库">出库（领用/损耗）</option>
            <option value="盘点">盘点调整</option>
          </select>
        </div>
        <div class="form-group">
          <label>数量</label>
          <input type="number" class="form-control" id="stockQty" step="0.01" min="0.01">
        </div>
      </div>
      <div class="form-group" id="stockCostRow">
        <label>入库单价 (¥)（用于更新平均成本）</label>
        <input type="number" class="form-control" id="stockCost" step="0.01" min="0">
      </div>
      <div class="form-group">
        <label>备注</label>
        <input type="text" class="form-control" id="stockNote" placeholder="如：后厨领用">
      </div>
    `, `
      <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Inventory.saveStock()">确认</button>
    `);
  },

  saveStock() {
    const invId = document.getElementById('stockItem')?.value;
    const type = document.getElementById('stockType')?.value;
    const qty = parseFloat(document.getElementById('stockQty')?.value);
    if (!invId) { alert('请选择食材'); return; }
    if (!qty || qty <= 0) { alert('请输入有效数量'); return; }
    const inv = DB.getInventory().find(i => i.id === invId);
    if (!inv) return;
    // 出库/盘点减量时校验库存足够
    if (type !== '入库' && qty > parseFloat(inv.qty)) {
      if (!confirm(`当前库存仅 ${inv.qty} ${inv.unit}，仍要继续吗？`)) return;
    }
    const unitCost = type === '入库' ? (parseFloat(document.getElementById('stockCost')?.value) || inv.avg_cost || 0) : undefined;
    DB.addStockMovement({
      inventory_id: invId, type, qty,
      unit_cost: unitCost, unit: inv.unit,
      date: App.today(),
      note: document.getElementById('stockNote')?.value || ''
    });
    App.closeModal();
    this.render(this._container || document.getElementById('pageContent'));
  },

  // ========== 导入导出 ==========
  exportCSV() {
    const items = DB.getInventory();
    const headers = ['食材名称', '分类', '当前库存', '单位', '平均成本', '安全库存', '保质期至'];
    const rows = items.map(i => [i.name, i.category || '食材', i.qty, i.unit || '份', i.avg_cost || 0, i.safe_qty || 0, i.expiry_date || '']);
    App.downloadCSV('库存数据_' + App.today() + '.csv', headers, rows);
  },

  importCSV() {
    App.pickCSVFile('.csv,.txt', ({ rows }) => {
      const keyMap = { '食材名称': 'name', '分类': 'category', '当前库存': 'qty', '单位': 'unit', '平均成本': 'avg_cost', '安全库存': 'safe_qty', '保质期至': 'expiry_date' };
      let ok = 0, err = 0; const errors = [];
      rows.forEach((r, i) => {
        try {
          const data = {};
          Object.entries(keyMap).forEach(([k, v]) => { data[v] = r[k] !== undefined ? r[k] : (r[v] || ''); });
          if (!data.name) throw new Error('缺少食材名称');
          const newQty = parseFloat(data.qty) || 0;
          // 已存在则更新数量，不存在则新增
          const exist = DB.getInventory().find(x => x.name === data.name);
          if (exist) {
            const diff = newQty - (parseFloat(exist.qty) || 0);
            DB.updateInventory(exist.id, {
              category: data.category || exist.category,
              qty: newQty,
              unit: data.unit || exist.unit,
              avg_cost: parseFloat(data.avg_cost) || exist.avg_cost,
              safe_qty: parseFloat(data.safe_qty) || exist.safe_qty,
              expiry_date: data.expiry_date || exist.expiry_date
            });
            // 数量变化生成盘点流水（保证 台账=流水轧差 一致；增加用入库、减少用盘点）
            if (Math.abs(diff) > 0.001) {
              DB.addStockMovement({ inventory_id: exist.id, type: diff > 0 ? '入库' : '盘点', qty: Math.abs(diff), unit_cost: parseFloat(data.avg_cost) || exist.avg_cost, date: App.today(), note: '批量导入调整' });
            }
          } else {
            DB.addInventory({
              name: data.name, category: data.category || '食材',
              qty: newQty, unit: data.unit || '份',
              avg_cost: parseFloat(data.avg_cost) || 0,
              safe_qty: parseFloat(data.safe_qty) || 0,
              expiry_date: data.expiry_date || ''
            });
          }
          ok++;
        } catch (e) { err++; errors.push(`第${i + 2}行: ${e.message}`); }
      });
      alert(`导入完成：成功 ${ok} 条${err > 0 ? `，失败 ${err} 条\n${errors.slice(0, 5).join('\n')}` : ''}`);
      this.render(this._container || document.getElementById('pageContent'));
    });
  }
};

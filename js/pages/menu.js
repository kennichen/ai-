/**
 * 菜品库页面
 */
const Menu = {
  render(container) {
    container.innerHTML = '';

    container.innerHTML += `
      <div class="filter-bar">
        <span style="font-size:13px;color:var(--gray-600)">管理菜品配方、成本和售价</span>
        <div style="flex:1"></div>
        ${App.isReadOnly ? '' : `
        <button class="btn btn-outline btn-sm" onclick="Menu.exportCSV()">导出菜品</button>
        <button class="btn btn-outline btn-sm" onclick="Menu.importCSV()">导入菜品</button>
        <button class="btn btn-primary btn-sm" id="menuAddBtn">+ 新增菜品</button>`}
      </div>
    `;

    container.innerHTML += '<div id="menuList"></div>';

    document.getElementById('menuAddBtn')?.addEventListener('click', () => this.showAddModal());

    this.renderList();
  },

  renderList() {
    const items = DB.getMenuItems();
    const container = document.getElementById('menuList');
    if (!container) return;

    // 按品类分组
    const cats = {};
    items.forEach(i => {
      if (!cats[i.category]) cats[i.category] = [];
      cats[i.category].push(i);
    });

    if (items.length === 0) {
      container.innerHTML = '<div class="card"><div class="empty-state"><div class="icon">&#x1F372;</div><p>暂无菜品数据，点击"新增菜品"开始</p></div></div>';
      return;
    }

    let html = '';
    Object.entries(cats).forEach(([cat, catItems]) => {
      html += `
        <div class="card">
          <div class="card-header"><div class="card-title">${cat}</div><span class="badge badge-accent">${catItems.length} 项</span></div>
          <table class="data-table">
            <thead><tr><th>菜品名称</th><th style="text-align:right">BOM成本 (¥)</th><th style="text-align:right">售价 (¥)</th><th style="text-align:right">毛利 (¥)</th><th style="text-align:right">毛利率</th><th style="text-align:right">操作</th></tr></thead>
            <tbody>
      `;
      catItems.forEach(item => {
        const profit = item.price - item.cost;
        const margin = item.price > 0 ? (profit / item.price * 100) : 0;
        html += `<tr>
          <td>${item.name}</td>
          <td class="amount negative">${App.fmtMoney(item.cost)}</td>
          <td class="amount positive">${App.fmtMoney(item.price)}</td>
          <td class="amount" style="color:${profit >= 0 ? 'var(--success)' : 'var(--danger)'}">${App.fmtMoney(profit)}</td>
          <td class="amount"><span class="badge ${margin >= 60 ? 'badge-primary' : margin >= 40 ? 'badge-accent' : margin >= 20 ? 'badge-gold' : 'badge-danger'}">${margin.toFixed(1)}%</span></td>
          <td style="text-align:right">
            <button class="btn btn-sm btn-danger menu-del" data-id="${item.id}">删除</button>
          </td>
        </tr>`;
      });
      html += '</tbody></table></div>';
    });

    container.innerHTML = html;

    container.querySelectorAll('.menu-del').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('确定删除该菜品？')) {
          DB.deleteMenuItem(btn.dataset.id);
          this.renderList();
        }
      });
    });
  },

  showAddModal() {
    const bodyHtml = `
      <div class="form-group">
        <label>菜品名称</label>
        <input type="text" class="form-control" id="menuFormName" placeholder="如：招牌红烧肉">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>菜品分类</label>
          <select class="form-control" id="menuFormCategory">
            <option value="热菜">热菜</option>
            <option value="凉菜">凉菜</option>
            <option value="素菜">素菜</option>
            <option value="主食">主食</option>
            <option value="饮品">饮品</option>
            <option value="甜品">甜品</option>
            <option value="小吃">小吃</option>
            <option value="其他">其他</option>
          </select>
        </div>
        <div class="form-group">
          <label>门店</label>
          <select class="form-control" id="menuFormStore">
            ${DB.getStores().map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>BOM 成本 (食材成本)</label>
          <input type="number" class="form-control" id="menuFormCost" placeholder="原料成本" step="0.01" min="0">
        </div>
        <div class="form-group">
          <label>售价</label>
          <input type="number" class="form-control" id="menuFormPrice" placeholder="菜品售价" step="0.01" min="0">
        </div>
      </div>
    `;

    App.showModal('新增菜品', bodyHtml, `
      <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Menu.saveItem()">保存</button>
    `);
  },

  saveItem() {
    const name = document.getElementById('menuFormName').value.trim();
    const category = document.getElementById('menuFormCategory').value;
    const store_id = document.getElementById('menuFormStore').value;
    const cost = parseFloat(document.getElementById('menuFormCost').value) || 0;
    const price = parseFloat(document.getElementById('menuFormPrice').value) || 0;

    if (!name) { alert('请输入菜品名称'); return; }
    if (cost <= 0) { alert('请输入正确的成本'); return; }
    if (price <= 0) { alert('请输入正确的售价'); return; }

    DB.addMenuItem({ name, category, cost, price, store_id });
    App.closeModal();
    this.renderList();
  },

  // ========== 导入导出 ==========
  exportCSV() {
    const items = DB.getMenuItems();
    const headers = ['菜品名称', '分类', '成本', '售价', '是否上架'];
    const rows = items.map(i => [i.name, i.category || '', i.cost, i.price, i.is_available === false ? '否' : '是']);
    App.downloadCSV('菜品库_' + App.today() + '.csv', headers, rows);
  },

  importCSV() {
    App.pickCSVFile('.csv,.txt', ({ rows }) => {
      const keyMap = { '菜品名称': 'name', '分类': 'category', '成本': 'cost', '售价': 'price', '是否上架': 'available' };
      let ok = 0, err = 0; const errors = [];
      rows.forEach((r, i) => {
        try {
          const data = {};
          Object.entries(keyMap).forEach(([k, v]) => { data[v] = r[k] !== undefined ? r[k] : (r[v] || ''); });
          if (!data.name) throw new Error('缺少菜品名称');
          const cost = parseFloat(data.cost);
          const price = parseFloat(data.price);
          if (!cost || cost <= 0) throw new Error('成本无效');
          if (!price || price <= 0) throw new Error('售价无效');
          const exist = DB.getMenuItems().find(x => x.name === data.name);
          const payload = { category: data.category || '热菜', cost, price, is_available: data.available === '否' ? false : true, store_id: App.currentStore };
          if (exist) {
            DB.updateMenuItem(exist.id, payload);
          } else {
            DB.addMenuItem({ name: data.name, ...payload });
          }
          ok++;
        } catch (e) { err++; errors.push(`第${i + 2}行: ${e.message}`); }
      });
      alert(`导入完成：成功 ${ok} 条${err > 0 ? `，失败 ${err} 条\n${errors.slice(0, 5).join('\n')}` : ''}`);
      this.renderList();
    });
  }
};

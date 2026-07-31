/**
 * 餐饮财务工作台 - 主应用 / 路由 / 通用工具
 */
const App = {
  currentPage: 'dashboard',
  currentStore: 'store_1',
  charts: {},
  isReadOnly: false, // 合伙人分享模式

  init() {
    // 检测是否只读分享模式
    const params = new URLSearchParams(window.location.search);
    if (params.get('share') === '1') {
      this.isReadOnly = true;
      document.body.classList.add('readonly-mode');
      this._allowedPages = ['dashboard', 'reports', 'analysis'];
      // 显示只读提示
      const banner = document.getElementById('readonlyBanner');
      if (banner) banner.style.display = 'block';
      // 隐藏"分享"和"加载演示数据"按钮
      const shareBtn = document.getElementById('shareBtn');
      if (shareBtn) shareBtn.style.display = 'none';
      const demoBtn = document.querySelector('.topbar-actions .btn-outline:last-child');
      if (demoBtn) demoBtn.style.display = 'none';
    }
    // 首次打开自动初始化演示数据（无任何记账数据且未手动跳过时）
    this._autoSeed();
    this.bindNavigation();
    this.bindStoreSelector();
    this.loadStoreSelector();
    this.navigate('dashboard');

    // 桌面/移动端切换时自动收起抽屉
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) this.closeMobileMenu();
    });
  },

  // 首次访问自动加载联动演示数据（避免空工作台）；旧版单科目数据自动升级为复式
  _autoSeed() {
    try {
      if (this.isReadOnly) return;
      const txns = DB.getTransactions();
      const jes = DB.getJournalEntries();
      // 旧版数据（有流水但无复式凭证）→ 自动升级
      const isLegacy = txns.length > 0 && jes.length === 0;
      // 全新空工作台 → 自动生成
      const isFresh = txns.length === 0 && localStorage.getItem('wb_demo_loaded') !== 'true' && localStorage.getItem('wb_skipped_demo') !== 'true';
      if (!isLegacy && !isFresh) return;

      const r = DB.mockBusinessData();
      localStorage.setItem('wb_demo_loaded', 'true');
      // 显示提示条
      const banner = document.createElement('div');
      banner.id = 'autoSeedBanner';
      banner.style.cssText = 'padding:8px 24px;background:rgba(5,150,105,0.1);border-bottom:0.5px solid rgba(5,150,105,0.2);font-size:12px;color:#065f46;display:flex;justify-content:space-between;align-items:center';
      banner.innerHTML = `${isLegacy ? '已升级为复式记账数据（三张报表已重算，勾稽一致）' : '已自动加载联动演示数据'}（收支流水 ${r.transactions} 条 · 采购 ${r.purchaseOrders} 单 · 应收 ${r.receivables} 条 · 库存 ${r.inventory} 种）
        <span style="display:flex;gap:6px">
          <button class="btn btn-sm btn-outline" style="padding:2px 10px;font-size:11px" onclick="document.getElementById('autoSeedBanner').remove();localStorage.setItem('wb_skipped_demo','true')">不再提示</button>
        </span>`;
      const main = document.querySelector('.main-content');
      if (main) main.insertBefore(banner, main.firstChild);
    } catch (e) {
      console.warn('自动初始化演示数据失败:', e);
    }
  },

  // ========== 导航 ==========
  bindNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
      el.addEventListener('click', () => {
        this.navigate(el.dataset.page);
        // 移动端：切换页面后自动收起抽屉
        this.closeMobileMenu();
      });
    });
  },

  // ========== 移动端抽屉菜单 ==========
  toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;
    const open = sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show', open);
    // 关闭页面滚动穿透
    document.body.style.overflow = open ? 'hidden' : '';
  },

  closeMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
    document.body.style.overflow = '';
  },

  navigate(page) {
    // 只读模式限制页面
    if (this.isReadOnly && this._allowedPages && !this._allowedPages.includes(page)) {
      page = 'dashboard';
    }
    this.currentPage = page;

    // 更新导航高亮
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    // 更新标题
    const titles = {
      dashboard: '经营驾驶舱',
      bookkeeping: '记账',
      reports: '财务报表',
      analysis: '收入成本分析',
      taxplanning: '税筹中心',
      settlement: '外卖对账',
      receivables: '应收应付',
      inventory: '进销存',
      purchasing: '采购',
      menu: '菜品库',
      settings: '设置'
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;

    // 渲染页面
    const container = document.getElementById('pageContent');
    this.destroyCharts();

    switch (page) {
      case 'dashboard': Dashboard.render(container); break;
      case 'bookkeeping': Bookkeeping.render(container); break;
      case 'reports': Reports.render(container); break;
      case 'analysis': Analysis.render(container); break;
      case 'taxplanning': TaxPlanning.render(container); break;
      case 'settlement': Settlement.render(container); break;
      case 'receivables': Receivables.render(container); break;
      case 'inventory': Inventory.render(container); break;
      case 'purchasing': Purchasing.render(container); break;
      case 'menu': Menu.render(container); break;
      case 'settings': Settings.render(container); break;
    }
  },

  // ========== 门店选择 ==========
  bindStoreSelector() {
    document.getElementById('storeSelector')?.addEventListener('change', (e) => {
      this.currentStore = e.target.value;
      this.navigate(this.currentPage);
    });
  },

  loadStoreSelector() {
    const sel = document.getElementById('storeSelector');
    if (!sel) return;
    const stores = DB.getStores();
    sel.innerHTML = stores.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  },

  // ========== 弹窗 ==========
  showModal(title, bodyHtml, footerHtml = '') {
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    let footerSection = '';
    if (footerHtml) {
      footerSection = `<div class="modal-footer">${footerHtml}</div>`;
    }
    content.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">${title}</div>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      ${footerSection}
    `;
    overlay.classList.add('show');
  },

  closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
  },

  // ========== 图表 ==========
  destroyCharts() {
    Object.values(this.charts).forEach(c => { try { c.destroy(); } catch {} });
    this.charts = {};
  },

  createChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    try {
      const chart = new Chart(canvas.getContext('2d'), config);
      this.charts[canvasId] = chart;
      return chart;
    } catch (e) { return null; }
  },

  // ========== 格式化工具 ==========
  // CSV 导出（Excel 兼容，UTF-8 BOM）
  downloadCSV(filename, headers, rows) {
    const esc = (v) => {
      const s = String(v === undefined || v === null ? '' : v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const csv = '\uFEFF' + [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  // CSV 解析（返回行数组，跳过 # 注释和空行）
  parseCSVText(text) {
    const lines = String(text || '').split(/[\n\r]+/)
      .map(l => l.replace(/^\uFEFF/, '').trim())
      .filter(l => l && !l.startsWith('#'));
    return lines.map(line => {
      const out = []; let cur = ''; let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQ) {
          if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
          else if (ch === '"') inQ = false;
          else cur += ch;
        } else if (ch === '"') inQ = true;
        else if (ch === ',') { out.push(cur); cur = ''; }
        else cur += ch;
      }
      out.push(cur);
      return out.map(c => c.trim());
    });
  },

  // 触发文件选择并解析 CSV（onData 回调收到 {headers, rows}）
  pickCSVFile(accept, onData) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept || '.csv,.txt';
    input.style.display = 'none';
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const lines = this.parseCSVText(ev.target.result);
        if (lines.length === 0) { alert('文件为空或格式不正确'); return; }
        const headers = lines[0].map(h => h.replace(/^"|"$/g, '').trim());
        const rows = lines.slice(1).map(l => {
          const row = {};
          headers.forEach((h, idx) => { row[h] = l[idx] !== undefined ? l[idx].replace(/^"|"$/g, '') : ''; });
          return row;
        });
        onData({ headers, rows, lines });
      };
      reader.readAsText(file);
    });
    document.body.appendChild(input);
    input.click();
  },

  fmtMoney(val) {
    return '¥' + Number(val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  fmtMoneyShort(val) {
    if (Math.abs(val) >= 10000) return '¥' + (val / 10000).toFixed(1) + '万';
    return '¥' + Number(val || 0).toLocaleString('zh-CN');
  },

  fmtPercent(val) {
    return (Number(val || 0) * 100).toFixed(1) + '%';
  },

  fmtDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  fmtDateCN(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  },

  today() {
    return new Date().toISOString().split('T')[0];
  },

  monthStart() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
  },

  monthEnd() {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return last.toISOString().split('T')[0];
  },

  // ========== 合伙人分享 ==========
  showShareModal() {
    const shareUrl = window.location.origin + window.location.pathname + '?share=1';
    this.showModal(
      '分享给合伙人',
      `
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:14px">
        合伙人通过此链接打开工作台，只能查看经营状况和三表，无法修改数据。
      </div>
      <div class="form-group">
        <label>分享链接</label>
        <input type="text" class="form-control" id="shareLinkInput" value="${shareUrl}" readonly
          style="font-size:11px;font-family:monospace" onclick="this.select();navigator.clipboard.writeText(this.value)">
      </div>
      <div style="text-align:center;padding:12px;background:rgba(255,255,255,0.5);border-radius:12px;border:var(--glass-border)">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareUrl)}"
          style="width:140px;height:140px;border-radius:8px" alt="QR Code">
        <div style="font-size:10px;color:var(--text-tertiary);margin-top:6px">扫码打开只读工作台</div>
      </div>
      `,
      `<button class="btn btn-primary" onclick="navigator.clipboard.writeText('${shareUrl}').then(()=>{this.innerText='已复制'});this.blur()">复制分享链接</button>
       <button class="btn btn-outline" onclick="App.closeModal()">关闭</button>`
    );
  },

  // 生成经营快照（导出老板日报）
  exportReport() {
    const storeId = this.currentStore;
    const today = this.today();
    const monthStart = this.monthStart();
    const txns = DB.getTransactions({ store_id: storeId, start_date: monthStart, end_date: today });
    const accounts = DB.getAccounts();
    const monthRev = txns.filter(t => { const a = accounts.find(ac => ac.id === t.account_id); return a && a.type === 'revenue'; })
      .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const monthCost = txns.filter(t => { const a = accounts.find(ac => ac.id === t.account_id); return a && (a.type === 'cost' || a.type === 'expense'); })
      .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const profit = monthRev - monthCost;
    const margin = monthRev > 0 ? (profit / monthRev * 100) : 0;
    const fixedCost = 77722;
    const beRate = monthRev > 0 ? Math.min(100, (monthRev / (fixedCost / (1 - 0.42))) * 100) : 0;

    const lines = [
      '=== 餐饮财务工作台 · 经营快报 ===',
      '生成时间：' + this.fmtDateCN(today),
      '',
      `本月营收：${this.fmtMoney(monthRev)}`,
      `本月成本：${this.fmtMoney(monthCost)}`,
      `本月利润：${this.fmtMoney(profit)}`,
      `毛利率：${margin.toFixed(1)}%`,
      `保本完成率：${beRate.toFixed(0)}%`,
      '',
      '--- 工作台地址 ---',
      window.location.origin + window.location.pathname
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '经营快报_' + today + '.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  },

  // ========== 演示数据 ==========
  loadDemoData() {
    if (this.isReadOnly) { alert('只读模式无法加载数据'); return; }
    if (!confirm('将覆盖所有现有数据并加载完整的业务联动演示数据（含应收应付/进销存/采购），确认？')) return;
    const r = DB.mockBusinessData();
    alert(`已加载联动演示数据\n\n• 日常收支流水 ${r.transactions} 条（90天）\n• 采购订单 ${r.purchaseOrders} 单（已入库 ${r.received} 单）\n• 应收 ${r.receivables} 条 / 应付 ${r.payables} 条\n• 食材库存 ${r.inventory} 种\n• 菜品 ${DB.getMenuItems().length} 道 · 供应商 ${DB.getSuppliers().length} 家\n\n数据已按业务闭环联动：\n采购入库→库存+应付+记账 · 付款→应付-记账\n收款→应收-记账 · 三表自动更新`);

    // 重置余额，刷新页面
    localStorage.setItem('wb_demo_loaded', 'true');
    location.reload();
  }
};

// ========== 通用渲染工具函数 ==========
function renderStatGrid(container, stats) {
  let html = '<div class="stat-grid">';
  stats.forEach(s => {
    const changeHtml = s.change !== undefined
      ? `<div class="change ${s.change >= 0 ? 'up' : 'down'}">${s.change >= 0 ? '↑' : '↓'} ${Math.abs(s.change).toFixed(1)}% 同比</div>`
      : '';
    html += `<div class="stat-card"><div class="label">${s.label}</div><div class="value">${s.value}</div>${changeHtml}</div>`;
  });
  html += '</div>';
  container.innerHTML += html;
}

function renderFilterBar(container, filters) {
  let html = '<div class="filter-bar">';
  filters.forEach(f => {
    if (f.type === 'date') {
      html += `<label style="font-size:12px;color:var(--gray-400);white-space:nowrap">${f.label}</label>
        <input type="date" class="form-control" id="${f.id}" value="${f.value || ''}" style="min-width:130px">`;
    } else if (f.type === 'select') {
      html += `<select class="form-control" id="${f.id}" style="min-width:${f.width || 120}px">
        ${f.options.map(o => `<option value="${o.value}" ${o.selected ? 'selected':''}>${o.label}</option>`).join('')}
      </select>`;
    } else if (f.type === 'button') {
      html += `<button class="btn btn-primary btn-sm" id="${f.id}">${f.label}</button>`;
    }
  });
  html += '</div>';
  container.innerHTML += html;
}

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => App.init());

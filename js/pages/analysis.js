/**
 * 收入成本分析页面
 */
const Analysis = {
  render(container) {
    container.innerHTML = '';

    const storeId = App.currentStore;
    const startDate = App.monthStart();
    const endDate = App.today();

    // 导航 tabs
    const tabsHtml = `
      <div class="report-tabs">
        <button class="report-tab active" data-atab="revenue">收入分析</button>
        <button class="report-tab" data-atab="cost">成本分析</button>
        <button class="report-tab" data-atab="menu">菜品毛利</button>
        <button class="report-tab" data-atab="detail">明细账</button>
      </div>
    `;
    container.innerHTML += tabsHtml;
    container.innerHTML += '<div id="analysisContent"></div>';

    document.querySelectorAll('.report-tab[data-atab]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.report-tab[data-atab]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderTab(tab.dataset.atab);
      });
    });

    this.renderTab('revenue');
  },

  renderTab(tab) {
    const storeId = App.currentStore;
    const startDate = App.monthStart();
    const endDate = App.today();
    const container = document.getElementById('analysisContent');
    if (!container) return;

    switch (tab) {
      case 'revenue': this.renderRevenueAnalysis(container, storeId, startDate, endDate); break;
      case 'cost': this.renderCostAnalysis(container, storeId, startDate, endDate); break;
      case 'menu': this.renderMenuAnalysis(container, storeId); break;
      case 'detail': this.renderDetailLedger(container, storeId, startDate, endDate); break;
    }
  },

  renderRevenueAnalysis(container, storeId, startDate, endDate) {
    const txns = DB.getTransactions({ store_id: storeId, start_date: startDate, end_date: endDate });
    const accounts = DB.getAccounts();

    // 按渠道统计（收入科目 + 应收账款确认收入，排除负向核销）
    const channelRevenue = { 'dine-in': 0, 'delivery': 0, 'takeout': 0, '食材成本': 0, '平台佣金': 0, '包装成本': 0, '人工成本': 0, 'other': 0 };
    const channelLabels = { 'dine-in': '堂食', 'delivery': '外卖', 'takeout': '自提', '食材成本': '食材成本', '平台佣金': '平台佣金', '包装成本': '包装成本', '人工成本': '人工成本', 'other': '其他' };
    const channelColors = { 'dine-in': '#1D9E75', 'delivery': '#378ADD', 'takeout': '#BA7517', '食材成本': '#D85A30', '平台佣金': '#378ADD', '包装成本': '#BA7517', '人工成本': '#534AB7', 'other': '#888780' };
    // 收入判定：收入科目 或 应收账款确认（1122 正向），负向核销自动排除
    const isRev = (acc) => acc && (acc.type === 'revenue' || acc.code === '1122');

    txns.forEach(t => {
      const acc = accounts.find(a => a.id === t.account_id);
      if (isRev(acc) && parseFloat(t.amount) > 0) {
        channelRevenue[t.channel] = (channelRevenue[t.channel] || 0) + parseFloat(t.amount || 0);
      }
    });

    const totalRev = Object.values(channelRevenue).reduce((s, v) => s + v, 0);

    // 每天的趋势
    const dailyRev = {};
    txns.forEach(t => {
      const acc = accounts.find(a => a.id === t.account_id);
      if (isRev(acc) && parseFloat(t.amount) > 0) {
        dailyRev[t.date] = (dailyRev[t.date] || 0) + parseFloat(t.amount || 0);
      }
    });
    const dates = Object.keys(dailyRev).sort();
    const revTrend = dates.map(d => ({ date: d, revenue: dailyRev[d] }));

    let html = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card">
          <div class="card-header"><div class="card-title">分渠道收入</div></div>
          <div class="chart-container"><canvas id="channelRevenueChart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">渠道占比</div></div>
          <div class="chart-container"><canvas id="channelPieChart"></canvas></div>
        </div>
      </div>
    `;

    // 渠道收入表格
    html += `
      <div class="card">
        <div class="card-header"><div class="card-title">渠道收入明细</div></div>
        <table class="data-table">
          <thead><tr><th>渠道</th><th style="text-align:right">收入</th><th style="text-align:right">占比</th></tr></thead>
          <tbody>
    `;
    Object.entries(channelRevenue).forEach(([ch, val]) => {
      if (val === 0) return;
      const pct = totalRev > 0 ? (val / totalRev * 100) : 0;
      html += `<tr>
        <td><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${channelColors[ch]};margin-right:8px"></span>${channelLabels[ch]}</td>
        <td class="amount positive">${App.fmtMoney(val)}</td>
        <td class="amount">${pct.toFixed(1)}%</td>
      </tr>`;
    });
    html += `<tr style="font-weight:500"><td>合计</td><td class="amount positive">${App.fmtMoney(totalRev)}</td><td class="amount">100%</td></tr>`;
    html += '</tbody></table></div>';
    container.innerHTML = html;

    // 渲染图表
    const chData = Object.entries(channelRevenue).filter(([, v]) => v > 0);
    App.createChart('channelRevenueChart', {
      type: 'bar',
      data: {
        labels: chData.map(([ch]) => channelLabels[ch]),
        datasets: [{
          label: '收入',
          data: chData.map(([, v]) => v),
          backgroundColor: chData.map(([ch]) => channelColors[ch]),
          borderRadius: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { callback: v => '¥' + (v / 1000).toFixed(0) + 'k' } }
        }
      }
    });

    App.createChart('channelPieChart', {
      type: 'doughnut',
      data: {
        labels: chData.map(([ch]) => channelLabels[ch]),
        datasets: [{ data: chData.map(([, v]) => v), backgroundColor: chData.map(([ch]) => channelColors[ch]), borderWidth: 0 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { boxWidth: 10, padding: 6, font: { size: 11 } } } },
        cutout: '60%'
      }
    });
  },

  renderCostAnalysis(container, storeId, startDate, endDate) {
    const stmt = DB.getIncomeStatement(storeId, startDate, endDate);

    let html = `
      <div class="stat-grid">
        <div class="stat-card">
          <div class="label">营业收入</div>
          <div class="value" style="color:var(--primary)">${App.fmtMoneyShort(stmt.total_revenue)}</div>
        </div>
        <div class="stat-card">
          <div class="label">食材成本</div>
          <div class="value" style="color:var(--danger)">${App.fmtMoneyShort(stmt.total_cost)}</div>
          <div class="change down">成本率 ${stmt.total_revenue > 0 ? (stmt.total_cost / stmt.total_revenue * 100).toFixed(1) : 0}%</div>
        </div>
        <div class="stat-card">
          <div class="label">期间费用</div>
          <div class="value" style="color:var(--warm)">${App.fmtMoneyShort(stmt.total_expense)}</div>
          <div class="change down">费用率 ${stmt.total_revenue > 0 ? (stmt.total_expense / stmt.total_revenue * 100).toFixed(1) : 0}%</div>
        </div>
        <div class="stat-card">
          <div class="label">净利润</div>
          <div class="value" style="color:${stmt.net_profit >= 0 ? 'var(--success)' : 'var(--danger)'}">${App.fmtMoneyShort(stmt.net_profit)}</div>
          <div class="change ${stmt.net_profit >= 0 ? 'up' : 'down'}">净利率 ${stmt.total_revenue > 0 ? (stmt.net_profit / stmt.total_revenue * 100).toFixed(1) : 0}%</div>
        </div>
      </div>
    `;

    // 成本费用结构图
    html += `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card">
          <div class="card-header"><div class="card-title">成本结构</div></div>
          <div class="chart-container"><canvas id="costStructChart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">费用结构</div></div>
          <div class="chart-container"><canvas id="expenseStructChart"></canvas></div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // 成本结构图（按明细科目 breakdown）
    const costNames = Object.keys(stmt.cost_breakdown);
    const costVals = Object.values(stmt.cost_breakdown);
    const costColors = ['#D85A30', '#BA7517', '#639922', '#534AB7', '#888780'];
    App.createChart('costStructChart', {
      type: 'bar',
      data: {
        labels: costNames.map(n => n.replace('主营业务成本-', '')),
        datasets: [{ data: costVals, backgroundColor: costColors.slice(0, costNames.length), borderRadius: 4 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { callback: v => '¥' + (v / 1000).toFixed(0) + 'k' } },
          y: { grid: { display: false } }
        }
      }
    });

    // 费用结构图（按明细科目 breakdown）
    const expNames = Object.keys(stmt.expense_breakdown);
    const expVals = Object.values(stmt.expense_breakdown);
    const expColors = ['#378ADD', '#1D9E75', '#D85A30', '#BA7517', '#639922', '#534AB7', '#888780'];
    App.createChart('expenseStructChart', {
      type: 'bar',
      data: {
        labels: expNames.map(n => n.replace(/^(销售费用|管理费用|财务费用)-?/, '')),
        datasets: [{ data: expVals, backgroundColor: expColors.slice(0, expNames.length), borderRadius: 4 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { callback: v => '¥' + (v / 1000).toFixed(0) + 'k' } },
          y: { grid: { display: false } }
        }
      }
    });
  },

  renderMenuAnalysis(container, storeId) {
    // 菜品毛利分析（基于BOM成本 vs 售价的比例）
    const items = DB.getMenuItems().filter(i => i.store_id === storeId);
    const accounts = DB.getAccounts();

    // 取本月全部营业收入（利润表凭证口径，覆盖堂食/自提/外卖应收全部渠道）
    const stmt = DB.getIncomeStatement(storeId, App.monthStart(), App.today());
    const periodRevenue = stmt.total_revenue;

    const totalMenuPrice = items.reduce((s, i) => s + i.price, 0);
    const avgPrice = totalMenuPrice > 0 ? totalMenuPrice / items.length : 0;
    // 预估总销量：总营收 ÷ 平均售价；无营收数据时给一个保守默认值，避免全 0
    const estimatedOrders = periodRevenue > 0 && avgPrice > 0
      ? Math.round(periodRevenue / avgPrice)
      : Math.round(items.length * 20);

    // 按品类排序
    const categories = {};
    items.forEach(item => {
      const estSales = totalMenuPrice > 0 ? Math.round(estimatedOrders * (item.price / totalMenuPrice)) : 0;
      const revenue = estSales * item.price;
      const cost = estSales * item.cost;
      const profit = revenue - cost;
      const marginVal = revenue > 0 ? (profit / revenue * 100) : 0;

      if (!categories[item.category]) categories[item.category] = [];
      categories[item.category].push({
        ...item,
        estimated_sales: estSales,
        revenue, cost, profit,
        margin: marginVal.toFixed(1),
        marginVal
      });
    });

    if (items.length === 0) {
      container.innerHTML = '<div class="card"><div class="empty-state"><div class="icon">&#x1F372;</div><p>菜品库为空，请在「菜品库」中添加菜品</p></div></div>';
      return;
    }

    // 汇总
    let totalRevenue = 0, totalCost = 0, totalProfit = 0;
    Object.values(categories).flat().forEach(i => {
      totalRevenue += i.revenue;
      totalCost += i.cost;
      totalProfit += i.profit;
    });

    let html = `
      <div class="stat-grid">
        <div class="stat-card">
          <div class="label">菜品总数</div>
          <div class="value">${items.length}</div>
        </div>
        <div class="stat-card">
          <div class="label">预估销量</div>
          <div class="value">${estimatedOrders}</div>
        </div>
        <div class="stat-card">
          <div class="label">综合毛利率</div>
          <div class="value" style="color:var(--primary)">${totalRevenue > 0 ? (totalProfit / totalRevenue * 100).toFixed(1) : 0}%</div>
        </div>
        <div class="stat-card">
          <div class="label">预估毛利</div>
          <div class="value" style="color:var(--success)">${App.fmtMoneyShort(totalProfit)}</div>
        </div>
      </div>
    `;

    // 按类别展示
    Object.entries(categories).forEach(([cat, catItems]) => {
      catItems.sort((a, b) => b.revenue - a.revenue);
      html += `
        <div class="card">
          <div class="card-header"><div class="card-title">${cat}</div></div>
          <table class="data-table">
            <thead><tr><th>菜品</th><th style="text-align:right">售价</th><th style="text-align:right">成本</th><th style="text-align:right">预估销量</th><th style="text-align:right">营收</th><th style="text-align:right">毛利</th><th style="text-align:right">毛利率</th></tr></thead>
            <tbody>
      `;
      catItems.forEach(item => {
        html += `<tr>
          <td>${item.name}</td>
          <td class="amount">${App.fmtMoney(item.price)}</td>
          <td class="amount negative">${App.fmtMoney(item.cost)}</td>
          <td class="amount">${item.estimated_sales}</td>
          <td class="amount positive">${App.fmtMoney(item.revenue)}</td>
          <td class="amount" style="color:${item.profit >= 0 ? 'var(--success)' : 'var(--danger)'}">${App.fmtMoney(item.profit)}</td>
          <td class="amount"><span class="badge ${item.marginVal >= 60 ? 'badge-primary' : item.marginVal >= 40 ? 'badge-accent' : item.marginVal >= 20 ? 'badge-gold' : 'badge-danger'}">${item.margin}%</span></td>
        </tr>`;
      });
      html += '</tbody></table></div>';
    });

    container.innerHTML = html;
  },

  renderDetailLedger(container, storeId, startDate, endDate) {
    const txns = DB.getTransactions({ store_id: storeId, start_date: startDate, end_date: endDate });
    const accounts = DB.getAccounts();

    // 按科目分组
    const ledger = {};
    txns.forEach(t => {
      const acc = accounts.find(a => a.id === t.account_id);
      const key = acc ? acc.name : '未知';
      if (!ledger[key]) ledger[key] = [];
      ledger[key].push(t);
    });

    let html = `
      <div class="filter-bar">
        <span style="font-size:13px;color:var(--gray-600)">${App.fmtDate(startDate)} ~ ${App.fmtDate(endDate)} · 共 ${txns.length} 笔</span>
      </div>
    `;

    if (txns.length === 0) {
      html += '<div class="card"><div class="empty-state"><div class="icon">&#x1F4CB;</div><p>暂无数据</p></div></div>';
      container.innerHTML = html;
      return;
    }

    Object.entries(ledger).forEach(([name, items]) => {
      const total = items.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
      const acc = accounts.find(a => a.name === name);
      const isRevenue = acc && acc.type === 'revenue';

      html += `
        <div class="card" style="padding:12px 16px">
          <div class="card-header" style="margin-bottom:8px;cursor:pointer" onclick="this.nextElementSibling.classList.toggle('hidden')">
            <div>
              <span class="card-title">${name}</span>
              <span class="badge ${isRevenue ? 'badge-primary' : 'badge-danger'}" style="margin-left:8px">${isRevenue ? '收入' : '支出'}</span>
            </div>
            <span style="font-size:14px;font-weight:500;color:${isRevenue ? 'var(--primary)' : 'var(--danger)'}">${App.fmtMoney(total)}</span>
          </div>
          <div>
            <table class="data-table">
              <thead><tr><th>日期</th><th>说明</th><th>渠道</th><th style="text-align:right">金额</th></tr></thead>
              <tbody>
      `;
      items.forEach(t => {
        const chLabels = { 'dine-in': '堂食', 'delivery': '外卖', 'takeout': '自提', '食材成本': '食材成本', '平台佣金': '平台佣金', '包装成本': '包装成本', '人工成本': '人工成本', 'other': '其他' };
        html += `<tr>
          <td>${App.fmtDate(t.date)}</td>
          <td>${t.description || '-'}</td>
          <td>${chLabels[t.channel] || '-'}</td>
          <td class="amount ${isRevenue ? 'positive' : 'negative'}">${App.fmtMoney(t.amount)}</td>
        </tr>`;
      });
      html += '</tbody></table></div></div>';
    });

    container.innerHTML = html;
  }
};

/**
 * 经营驾驶舱页面
 */
const Dashboard = {
  render(container) {
    container.innerHTML = '';

    const storeId = App.currentStore;
    const today = App.today();
    const monthStart = App.monthStart();
    const prevMonthStart = new Date();
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
    prevMonthStart.setDate(1);
    const prevMs = prevMonthStart.toISOString().split('T')[0];
    const prevMe = App.monthStart(); // 上月结束日

    const monthTxns = DB.getTransactions({ store_id: storeId, start_date: monthStart, end_date: today });
    const prevTxns = DB.getTransactions({ store_id: storeId, start_date: prevMs, end_date: today });

    // ===== KPI 计算 =====
    const todayTxns = DB.getTransactions({ store_id: storeId, start_date: today, end_date: today });
    const accounts = DB.getAccounts();

    function calcRevenue(txns) {
      return txns.filter(t => { const a = accounts.find(ac => ac.id === t.account_id); return a && a.type === 'revenue'; })
        .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    }
    function calcCost(txns) {
      return txns.filter(t => { const a = accounts.find(ac => ac.id === t.account_id); return a && (a.type === 'cost' || a.type === 'expense'); })
        .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    }

    const todayRev = calcRevenue(todayTxns);
    const monthRev = calcRevenue(monthTxns);
    const prevRev = calcRevenue(prevTxns);
    const monthCost = calcCost(monthTxns);
    const monthProfit = monthRev - monthCost;
    const margin = monthRev > 0 ? (monthProfit / monthRev * 100) : 0;
    const yoyChange = prevRev > 0 ? ((monthRev - prevRev) / prevRev * 100) : 0;

    // 客单价（假设今日堂食单量）
    const todayDineInTxns = todayTxns.filter(t => { const a = accounts.find(ac => ac.id === t.account_id); return a && a.type === 'revenue' && t.channel === 'dine-in'; });
    const todayDineInRev = todayDineInTxns.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const estOrders = Math.round(todayDineInRev / 42); // 假设客单价约 42 元
    const avgOrder = estOrders > 0 ? todayDineInRev / estOrders : 0;

    // ===== 最近30天趋势 =====
    const dailyData = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const last30Txns = DB.getTransactions({ store_id: storeId, start_date: thirtyDaysAgo.toISOString().split('T')[0], end_date: today });
    last30Txns.forEach(t => {
      const a = accounts.find(ac => ac.id === t.account_id);
      if (!a) return;
      if (!dailyData[t.date]) dailyData[t.date] = { revenue: 0, cost: 0, profit: 0 };
      if (a.type === 'revenue') dailyData[t.date].revenue += parseFloat(t.amount || 0);
      else if (a.type === 'cost' || a.type === 'expense') dailyData[t.date].cost += parseFloat(t.amount || 0);
    });
    Object.keys(dailyData).forEach(k => {
      dailyData[k].profit = dailyData[k].revenue - dailyData[k].cost;
    });
    const trendDates = Object.keys(dailyData).sort();

    // ===== 收入结构（本月）=====
    const monthlyRevenue = { 'dine-in': 0, 'delivery': 0, 'takeout': 0, '食材成本': 0, '平台佣金': 0, '包装成本': 0, '人工成本': 0, 'other': 0 };
    const channelLabels = { 'dine-in': '堂食', 'delivery': '外卖', 'takeout': '自提', '食材成本': '食材成本', '平台佣金': '平台佣金', '包装成本': '包装成本', '人工成本': '人工成本', 'other': '其他' };
    const channelColors = { 'dine-in': '#1D9E75', 'delivery': '#378ADD', 'takeout': '#BA7517', '食材成本': '#D85A30', '平台佣金': '#378ADD', '包装成本': '#BA7517', '人工成本': '#534AB7', 'other': '#888780' };
    monthTxns.forEach(t => {
      const a = accounts.find(ac => ac.id === t.account_id);
      if (a && a.type === 'revenue') {
        monthlyRevenue[t.channel] = (monthlyRevenue[t.channel] || 0) + parseFloat(t.amount || 0);
      }
    });

    // ===== 盈亏平衡点 =====
    // 固定成本：房租+工资+社保+折旧 ≈ 12000+35000+8500+22222 = 77722/月
    // 变动成本率：平均食材+酒水成本率 ≈ 42%
    const fixedCost = 77722;
    const variableRate = 0.42;
    const breakeven = fixedCost / (1 - variableRate);

    // ===== 库存预警 =====
    // 最近7天的食材成本
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekTxns = DB.getTransactions({ store_id: storeId, start_date: weekStart.toISOString().split('T')[0], end_date: today });
    const weekFoodCost = weekTxns
      .filter(t => { const a = accounts.find(ac => ac.id === t.account_id); return a && a.name.includes('食材'); })
      .reduce((s, t) => s + parseFloat(t.amount || 0), 0);

    // ===== 渲染 =====
    const monthName = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'][new Date().getMonth()];

    // ===== 健康评分计算 =====
    const foodCostRate = monthRev > 0 ? (monthCost / monthRev) : 1; // 实际食材成本率（含所有成本）
    const beCompletion = monthRev > 0 ? Math.min(100, (monthRev / breakeven) * 100) : 0;
    const costRatio = monthRev > 0 ? (monthCost / monthRev) : 0;

    // 分项评分
    const scoreMargin = Math.min(100, Math.round((margin / 20) * 100));          // 毛利率 20%=100分
    const scoreCost = foodCostRate <= 0.38 ? 100 : Math.max(0, Math.round(100 - (foodCostRate - 0.38) * 500)); // 成本率≤38%=100
    const scoreBe = Math.min(100, Math.round(beCompletion));                      // 保本完成率
    const scoreGrowth = yoyChange >= 0 ? Math.min(100, 50 + Math.round(yoyChange * 1.5)) : Math.max(0, 50 + Math.round(yoyChange * 1.5)); // 增长
    const scoreExpense = costRatio <= 0.65 ? 100 : Math.max(0, Math.round(100 - (costRatio - 0.65) * 300)); // 成本占比

    const healthScore = Math.round(
      scoreMargin * 0.25 + scoreCost * 0.20 + scoreBe * 0.25 + scoreGrowth * 0.20 + scoreExpense * 0.10
    );

    // 评分等级
    const healthLevel = healthScore >= 85 ? '优秀' : healthScore >= 70 ? '良好' : healthScore >= 55 ? '一般' : '待改善';
    const healthEmoji = healthScore >= 85 ? '&#x1F44D;' : healthScore >= 70 ? '&#x2705;' : healthScore >= 55 ? '&#x26A0;' : '&#x1F525;';
    const healthColor = healthScore >= 85 ? 'var(--success)' : healthScore >= 70 ? 'var(--primary)' : healthScore >= 55 ? 'var(--warning)' : 'var(--danger)';

    // 一句话摘要
    const profitTrend = monthProfit >= 0
      ? (yoyChange >= 5 ? '盈利增长' : '保持盈利')
      : '出现亏损';
    const costSummary = foodCostRate <= 0.38 ? '成本率在合理范围内' : '成本率偏高';
    const beSummary = monthRev >= breakeven ? '已过保本点' : '尚未达到保本点';
    const summaryLine = `本月${profitTrend}，${App.fmtMoney(monthProfit)}，环比${yoyChange >= 0 ? '增长' : '下降'}${Math.abs(yoyChange).toFixed(1)}%。${costSummary}（${(foodCostRate * 100).toFixed(1)}%），${beSummary}（${beCompletion.toFixed(0)}%）。`;

    // ===== 资金账户余额 =====
    const fundAccounts = DB.getFundAccounts();
    let fundBalancesHtml = '';
    if (fundAccounts.length > 0) {
      fundBalancesHtml = `
      <div class="glass-card-thin" style="display:flex;align-items:center;gap:12px;margin-bottom:14px;padding:10px 16px">
        <span style="font-size:11px;color:var(--text-secondary);flex-shrink:0">资金账户</span>
        ${fundAccounts.map(a => {
          const bal = DB.getFundAccountBalance(a.id);
          return `<div style="flex:1">
            <div style="font-size:9px;color:var(--text-tertiary)">${a.name}</div>
            <div style="font-size:14px;font-weight:500;color:${bal >= 0 ? 'var(--text-primary)' : 'var(--danger)'}">${App.fmtMoney(bal)}</div>
          </div>`;
        }).join('')}
      </div>`;
    }

    container.innerHTML = `
      <!-- 经营摘要 + 健康评分 -->
      <div class="glass-card-thin" style="display:flex;align-items:center;gap:16px;margin-bottom:14px;padding:12px 18px">
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
          <div style="width:48px;height:48px;border-radius:50%;background:${healthColor}15;display:flex;align-items:center;justify-content:center;font-size:22px">${healthEmoji}</div>
          <div>
            <div style="font-size:20px;font-weight:500;color:${healthColor}">${healthScore}</div>
            <div style="font-size:10px;color:var(--text-tertiary)">${healthLevel}</div>
          </div>
        </div>
        <div style="flex:1;font-size:12px;color:var(--text-secondary);line-height:1.7">${summaryLine}</div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <div style="width:40px;text-align:center">
            <div style="height:3px;background:var(--gray-50);border-radius:2px;overflow:hidden;margin-bottom:3px">
              <div style="height:100%;width:${scoreMargin}%;background:${healthColor};border-radius:2px"></div>
            </div>
            <div style="font-size:9px;color:var(--text-tertiary)">毛利</div>
          </div>
          <div style="width:40px;text-align:center">
            <div style="height:3px;background:var(--gray-50);border-radius:2px;overflow:hidden;margin-bottom:3px">
              <div style="height:100%;width:${scoreCost}%;background:${healthColor};border-radius:2px"></div>
            </div>
            <div style="font-size:9px;color:var(--text-tertiary)">成本</div>
          </div>
          <div style="width:40px;text-align:center">
            <div style="height:3px;background:var(--gray-50);border-radius:2px;overflow:hidden;margin-bottom:3px">
              <div style="height:100%;width:${scoreBe}%;background:${healthColor};border-radius:2px"></div>
            </div>
            <div style="font-size:9px;color:var(--text-tertiary)">保本</div>
          </div>
          <div style="width:40px;text-align:center">
            <div style="height:3px;background:var(--gray-50);border-radius:2px;overflow:hidden;margin-bottom:3px">
              <div style="height:100%;width:${scoreGrowth}%;background:${healthColor};border-radius:2px"></div>
            </div>
            <div style="font-size:9px;color:var(--text-tertiary)">增长</div>
          </div>
        </div>
      </div>

      ${fundBalancesHtml}

      <!-- KPI -->
      <div class="kpi-row">
        <div class="stat-card kpi-item">
          <div class="kpi-value" style="color:var(--primary)">${App.fmtMoneyShort(todayRev)}</div>
          <div class="kpi-label">今日营收</div>
        </div>
        <div class="stat-card kpi-item">
          <div class="kpi-value">${App.fmtMoneyShort(monthRev)}</div>
          <div class="kpi-label">${monthName}累计营收</div>
          <div style="font-size:11px;color:${yoyChange >= 0 ? 'var(--primary-dark)' : 'var(--danger)'}">${yoyChange >= 0 ? '↑' : '↓'} ${Math.abs(yoyChange).toFixed(1)}%</div>
        </div>
        <div class="stat-card kpi-item">
          <div class="kpi-value" style="color:${monthProfit >= 0 ? 'var(--success)' : 'var(--danger)'}">${App.fmtMoneyShort(monthProfit)}</div>
          <div class="kpi-label">${monthName}利润</div>
          <div style="font-size:11px;color:${margin >= 0 ? 'var(--primary-dark)' : 'var(--danger)'}">毛利率 ${margin.toFixed(1)}%</div>
        </div>
        <div class="stat-card kpi-item">
          <div class="kpi-value">${avgOrder > 0 ? '¥' + avgOrder.toFixed(0) : '-'}</div>
          <div class="kpi-label">客单价</div>
          <div style="font-size:11px;color:var(--gray-400)">今日 ${estOrders} 单</div>
        </div>
      </div>

      <!-- 图表行 -->
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:16px">
        <div class="card">
          <div class="card-header">
            <div class="card-title">近30天营收趋势</div>
            <span class="card-subtitle">¥ 元</span>
          </div>
          <div class="chart-container"><canvas id="trendChart"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">本月收入结构</div>
          </div>
          <div class="chart-container"><canvas id="revenuePieChart"></canvas></div>
        </div>
      </div>

      <!-- 盈亏分析 + 预警 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card">
          <div class="card-header">
            <div class="card-title">盈亏平衡分析</div>
            <span class="card-subtitle">固定成本 ¥${fixedCost.toLocaleString()}/月</span>
          </div>
          <div style="padding:4px 0">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px">
              <span style="color:var(--gray-400)">保本点（月营收）</span>
              <span style="font-weight:500;color:var(--warm)">${App.fmtMoney(breakeven)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px">
              <span style="color:var(--gray-400)">保本点（日营收）</span>
              <span style="font-weight:500">${App.fmtMoney(breakeven / 30)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px">
              <span style="color:var(--gray-400)">变动成本率</span>
              <span style="font-weight:500">${(variableRate * 100).toFixed(0)}%</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px">
              <span style="color:var(--gray-400)">${monthName}营收</span>
              <span style="font-weight:500;color:${monthRev >= breakeven ? 'var(--success)' : 'var(--danger)'}">
                ${App.fmtMoney(monthRev)}
                ${monthRev >= breakeven ? ' ✓ 已过保本点' : ' ⚠ 未达保本点'}
              </span>
            </div>
          </div>
          <div style="margin-top:12px;height:24px;background:var(--gray-50);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${Math.min(100, (monthRev / breakeven) * 100)}%;background:${monthRev >= breakeven ? 'var(--success)' : 'var(--warm)'};border-radius:4px;transition:width 0.5s"></div>
          </div>
          <div style="font-size:11px;color:var(--gray-400);margin-top:4px;text-align:right">保本完成率 ${Math.min(100, (monthRev / breakeven) * 100).toFixed(0)}%</div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">经营预警</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--info-light);border-radius:6px">
              <span style="font-size:12px">最近7天食材成本</span>
              <span style="font-weight:500">${App.fmtMoneyShort(weekFoodCost)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--success-light);border-radius:6px">
              <span style="font-size:12px">本月营业天数</span>
              <span style="font-weight:500">${trendDates.length} 天</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--warning-light);border-radius:6px">
              <span style="font-size:12px">月均日营收</span>
              <span style="font-weight:500">${trendDates.length > 0 ? App.fmtMoneyShort(monthRev / trendDates.length) : '-'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--danger-light);border-radius:6px">
              <span style="font-size:12px">外卖佣金占比</span>
              <span style="font-weight:500">占外卖收入 ${monthlyRevenue['delivery'] > 0 ? ((monthCost * 0.03 / monthlyRevenue['delivery']) * 100).toFixed(1) : 0}%</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // ===== 绘制图表 =====
    // 趋势图
    App.createChart('trendChart', {
      type: 'line',
      data: {
        labels: trendDates.map(d => d.slice(5)),
        datasets: [
          {
            label: '收入',
            data: trendDates.map(d => dailyData[d].revenue),
            borderColor: '#1D9E75',
            backgroundColor: 'rgba(29,158,117,0.08)',
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            borderWidth: 2
          },
          {
            label: '利润',
            data: trendDates.map(d => dailyData[d].profit),
            borderColor: '#378ADD',
            backgroundColor: 'rgba(55,138,221,0.08)',
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 10, padding: 8, font: { size: 11 } } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 10 } },
          y: { beginAtZero: true, ticks: { callback: v => '¥' + Number(v).toLocaleString() } }
        }
      }
    });

    // 收入结构饼图
    const chartData = Object.entries(monthlyRevenue).filter(([, v]) => v > 0);
    App.createChart('revenuePieChart', {
      type: 'doughnut',
      data: {
        labels: chartData.map(([k]) => channelLabels[k]),
        datasets: [{
          data: chartData.map(([, v]) => v),
          backgroundColor: chartData.map(([k]) => channelColors[k]),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, padding: 6, font: { size: 11 } } }
        },
        cutout: '55%'
      }
    });
  }
};

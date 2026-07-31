/**
 * 财务报表页面 — 企业会计准则标准格式
 * 利润表 / 资产负债表 / 现金流量表
 */
const Reports = {
  currentTab: 'income',

  render(container) {
    container.innerHTML = '';

    const html = `
      <div class="report-tabs">
        <button class="report-tab ${this.currentTab === 'income' ? 'active' : ''}" data-rtab="income">利润表</button>
        <button class="report-tab ${this.currentTab === 'balance' ? 'active' : ''}" data-rtab="balance">资产负债表</button>
        <button class="report-tab ${this.currentTab === 'cashflow' ? 'active' : ''}" data-rtab="cashflow">现金流量表</button>
      </div>
      <div class="filter-bar">
        <label style="font-size:12px;color:var(--gray-400);white-space:nowrap">期间</label>
        <input type="date" class="form-control" id="reportStart" value="${App.monthStart()}" style="min-width:130px">
        <span style="color:var(--gray-400)">至</span>
        <input type="date" class="form-control" id="reportEnd" value="${App.today()}" style="min-width:130px">
        <button class="btn btn-primary btn-sm" id="reportRefreshBtn">生成报表</button>
        <button class="btn btn-outline btn-sm" id="reportExportBtn">导出CSV</button>
        <button class="btn btn-primary btn-sm" id="reportExportExcelBtn">导出Excel</button>
      </div>
      <div id="reportContent"></div>
    `;
    container.innerHTML = html;

    document.querySelectorAll('.report-tab[data-rtab]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.report-tab[data-rtab]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTab = tab.dataset.rtab;
        this.renderReport();
      });
    });

    document.getElementById('reportRefreshBtn')?.addEventListener('click', () => this.renderReport());
    document.getElementById('reportExportBtn')?.addEventListener('click', () => this.exportCSV());
    document.getElementById('reportExportExcelBtn')?.addEventListener('click', () => this.exportExcel());

    this.renderReport();
  },

  exportCSV() {
    const tables = document.querySelectorAll('#reportContent table');
    if (tables.length === 0) { alert('请先生成报表'); return; }
    let csv = '\uFEFF'; // BOM for Excel UTF-8
    tables.forEach((table, idx) => {
      if (idx > 0) csv += '\n';
      table.querySelectorAll('tr').forEach(row => {
        const cells = [];
        row.querySelectorAll('th, td').forEach(cell => {
          let text = cell.textContent.trim().replace(/,/g, '');
          if (cell.classList.contains('amount')) text = text.replace('¥', '');
          cells.push(text);
        });
        csv += cells.join(',') + '\n';
      });
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const tabNames = { income: '利润表', balance: '资产负债表', cashflow: '现金流量表' };
    link.download = `${tabNames[this.currentTab]}_${App.today()}.csv`;
    link.click();
  },

  // 导出 .xls（HTML 表格格式，按页面排版，Excel/WPS 完美兼容）
  exportExcel() {
    const tables = document.querySelectorAll('#reportContent table');
    if (tables.length === 0) { alert('请先生成报表'); return; }
    const tabNames = { income: '利润表', balance: '资产负债表', cashflow: '现金流量表' };
    const title = tabNames[this.currentTab];
    const startDate = document.getElementById('reportStart')?.value || App.monthStart();
    const endDate = document.getElementById('reportEnd')?.value || App.today();
    const storeName = DB.getStores().find(s => s.id === App.currentStore)?.name || '';

    // 构造一个完整的 HTML（含所有报表表格），Excel/WPS 能完美解析
    let body = `<h1 style="font-family:宋体;font-size:18px;text-align:center;margin:0 0 8px">${title}</h1>`;
    body += `<div style="text-align:center;font-size:12px;color:#666;margin-bottom:12px">${storeName} · ${App.fmtDateCN(startDate)} 至 ${App.fmtDateCN(endDate)}</div>`;

    tables.forEach((table, idx) => {
      if (idx > 0) body += '<div style="page-break-before:always"></div>';
      body += table.outerHTML;
    });

    // Excel HTML 模板（XML 头 + BOM）
    const style = `
      <style>
        table { border-collapse: collapse; font-family: 宋体; font-size: 11pt; }
        th, td { border: 0.5pt solid #000; padding: 4px 8px; }
        th { background-color: #f0f0f0; font-weight: bold; }
        .amount { text-align: right; }
      </style>`;

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8">${style}</head>
      <body>${body}</body></html>`;

    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title}_${App.today()}.xls`;
    link.click();
  },

  renderReport() {
    const container = document.getElementById('reportContent');
    if (!container) return;
    const startDate = document.getElementById('reportStart')?.value || App.monthStart();
    const endDate = document.getElementById('reportEnd')?.value || App.today();
    const storeId = App.currentStore;

    if (this.currentTab === 'income') this.renderIncome(container, storeId, startDate, endDate);
    else if (this.currentTab === 'balance') this.renderBalance(container, storeId, endDate);
    else this.renderCashFlow(container, storeId, startDate, endDate);
  },

  // ========== 利润表 ==========
  renderIncome(container, storeId, startDate, endDate) {
    const s = DB.getIncomeStatement(storeId, startDate, endDate);

    function r(amt) { return App.fmtMoney(amt); }
    function indent(text, level) {
      const pad = level * 24 + 16;
      return `<td style="padding-left:${pad}px">${text}</td>`;
    }
    function row(label, amt, level, opts = {}) {
      const cls = opts.isTotal ? ' style="font-weight:500;background:var(--info-light)"' : '';
      const amtCls = amt >= 0 ? 'positive' : 'negative';
      const amtStyle = opts.bold ? ' style="font-size:14px;font-weight:500"' : '';
      return `<tr${cls}><td${indent('', 0).split('>')[0]}>${'  '.repeat(level || 0)}${label}</td>
        <td class="amount ${amtCls}"${amtStyle}>${r(amt)}</td></tr>`;
    }

    container.innerHTML = `
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:12px 16px;background:var(--info-light);font-size:12px;color:#185FA5;border-bottom:1px solid var(--accent-light)">
          利润表 （${App.fmtDate(startDate)} 至 ${App.fmtDate(endDate)}）
        </div>
        <table class="data-table">
          <thead><tr><th>项目</th><th style="text-align:right">本期金额</th></tr></thead>
          <tbody>
            <tr style="font-weight:500"><td>一、营业收入</td><td class="amount positive">${r(s.revenue.total)}</td></tr>
            <tr><td style="padding-left:40px;font-size:12px;color:var(--gray-600)">主营业务收入</td>
              <td class="amount positive" style="font-size:12px">${r(s.revenue.main_revenue)}</td></tr>
            <tr><td style="padding-left:40px;font-size:12px;color:var(--gray-600)">其他业务收入</td>
              <td class="amount positive" style="font-size:12px">${r(s.revenue.other_revenue)}</td></tr>

            <tr style="font-weight:500"><td>减：营业成本</td><td class="amount negative">${r(s.cost)}</td></tr>
            <tr style="font-weight:500"><td>减：税金及附加</td><td class="amount negative">${r(s.tax_surcharge)}</td></tr>

            <tr style="font-weight:500;background:var(--success-light)"><td>二、毛利</td>
              <td class="amount positive" style="font-size:14px;font-weight:500">${r(s.gross_profit)}</td></tr>
            <tr><td style="padding-left:40px;font-size:11px;color:var(--gray-400)">毛利率</td>
              <td class="amount" style="font-size:11px">${(s.gross_margin * 100).toFixed(1)}%</td></tr>

            <tr><td colspan="2" style="height:6px;padding:0"></td></tr>
            <tr style="font-weight:500"><td>减：销售费用</td><td class="amount negative">${r(s.selling_expense)}</td></tr>
            <tr style="font-weight:500"><td>减：管理费用</td><td class="amount negative">${r(s.admin_expense)}</td></tr>
            <tr style="font-weight:500"><td>减：财务费用</td><td class="amount negative">${r(s.finance_expense)}</td></tr>

            <tr style="font-weight:500;background:var(--info-light)"><td>三、营业利润</td>
              <td class="amount ${s.operating_profit >= 0 ? 'positive' : 'negative'}" style="font-size:14px;font-weight:500">${r(s.operating_profit)}</td></tr>

            <tr><td colspan="2" style="height:6px;padding:0"></td></tr>
            <tr><td>加：营业外收入</td><td class="amount positive">${r(s.non_operating_revenue)}</td></tr>
            <tr><td>减：营业外支出</td><td class="amount negative">${r(s.non_operating_expense)}</td></tr>

            <tr style="font-weight:500;background:var(--info-light)"><td>四、利润总额</td>
              <td class="amount ${s.total_profit >= 0 ? 'positive' : 'negative'}" style="font-size:14px;font-weight:500">${r(s.total_profit)}</td></tr>

            <tr><td>减：所得税费用</td><td class="amount negative">${r(s.income_tax)}</td></tr>

            <tr style="font-weight:bold;background:var(--success-light)"><td>五、净利润</td>
              <td class="amount ${s.net_profit >= 0 ? 'positive' : 'negative'}" style="font-size:16px;font-weight:bold">${r(s.net_profit)}</td></tr>
            <tr><td style="padding-left:40px;font-size:11px;color:var(--gray-400)">净利率</td>
              <td class="amount" style="font-size:11px">${(s.net_margin * 100).toFixed(1)}%</td></tr>
          </tbody>
        </table>
      </div>
    `;
  },

  // ========== 资产负债表 ==========
  renderBalance(container, storeId, asOfDate) {
    const bs = DB.getBalanceSheet(storeId, asOfDate);
    const r = v => App.fmtMoney(v);

    const debtRatio = bs.total_assets > 0 ? (bs.total_liabilities / bs.total_assets * 100) : 0;
    const currentRatio = bs.assets.current_total > 0 && bs.liabilities.current_total > 0
      ? (bs.assets.current_total / bs.liabilities.current_total) : 0;

    container.innerHTML = `
      <div class="stat-grid" style="margin-bottom:12px">
        <div class="stat-card">
          <div class="label">资产负债率</div>
          <div class="value" style="color:${debtRatio > 70 ? 'var(--danger)' : debtRatio > 50 ? 'var(--warm)' : 'var(--success)'}">${debtRatio.toFixed(1)}%</div>
        </div>
        <div class="stat-card">
          <div class="label">流动比率</div>
          <div class="value">${currentRatio.toFixed(2)}</div>
        </div>
        <div class="stat-card">
          <div class="label">资产总计</div>
          <div class="value" style="color:var(--primary)">${App.fmtMoneyShort(bs.total_assets)}</div>
        </div>
        <div class="stat-card">
          <div class="label">负债合计</div>
          <div class="value" style="color:var(--warm)">${App.fmtMoneyShort(bs.total_liabilities)}</div>
        </div>
      </div>

      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:12px 16px;background:var(--info-light);font-size:12px;color:#185FA5;border-bottom:1px solid var(--accent-light)">
          资产负债表 （${App.fmtDateCN(asOfDate)}）
        </div>
        <table class="data-table">
          <thead><tr><th style="width:50%">资产</th><th style="text-align:right;width:50%">期末余额</th></tr></thead>
          <tbody>
            <tr style="font-weight:500;background:var(--gray-50)"><td>流动资产：</td><td></td></tr>
            <tr><td style="padding-left:32px">货币资金</td><td class="amount positive">${r(bs.assets.current.monetary_funds)}</td></tr>
            <tr><td style="padding-left:32px">应收账款</td><td class="amount positive">${r(bs.assets.current.accounts_receivable)}</td></tr>
            <tr><td style="padding-left:32px">预付账款</td><td class="amount positive">${r(bs.assets.current.prepayments)}</td></tr>
            <tr><td style="padding-left:32px">其他应收款</td><td class="amount positive">${r(bs.assets.current.other_receivables)}</td></tr>
            <tr><td style="padding-left:32px">存货</td><td class="amount positive">${r(bs.assets.current.inventory)}</td></tr>
            <tr style="font-weight:500;background:var(--info-light)"><td style="padding-left:16px">流动资产合计</td>
              <td class="amount positive" style="font-size:14px">${r(bs.assets.current_total)}</td></tr>

            <tr style="font-weight:500;background:var(--gray-50)"><td>非流动资产：</td><td></td></tr>
            <tr><td style="padding-left:32px">固定资产净额</td><td class="amount positive">${r(bs.assets.non_current.fixed_assets_net)}</td></tr>
            <tr><td style="padding-left:32px">无形资产</td><td class="amount positive">${r(bs.assets.non_current.intangible_assets)}</td></tr>
            <tr><td style="padding-left:32px">长期待摊费用</td><td class="amount positive">${r(bs.assets.non_current.long_term_deferred)}</td></tr>
            <tr style="font-weight:500;background:var(--info-light)"><td style="padding-left:16px">非流动资产合计</td>
              <td class="amount positive" style="font-size:14px">${r(bs.assets.non_current_total)}</td></tr>

            <tr style="font-weight:bold;background:var(--success-light)"><td>资产总计</td>
              <td class="amount positive" style="font-size:16px">${r(bs.total_assets)}</td></tr>
          </tbody>
        </table>

        <div style="height:16px"></div>

        <table class="data-table">
          <thead><tr><th style="width:50%">负债和所有者权益</th><th style="text-align:right;width:50%">期末余额</th></tr></thead>
          <tbody>
            <tr style="font-weight:500;background:var(--gray-50)"><td>流动负债：</td><td></td></tr>
            <tr><td style="padding-left:32px">短期借款</td><td class="amount negative">${r(bs.liabilities.current.short_term_borrowing)}</td></tr>
            <tr><td style="padding-left:32px">应付账款</td><td class="amount negative">${r(bs.liabilities.current.accounts_payable)}</td></tr>
            <tr><td style="padding-left:32px">应付职工薪酬</td><td class="amount negative">${r(bs.liabilities.current.salary_payable)}</td></tr>
            <tr><td style="padding-left:32px">应交税费</td><td class="amount negative">${r(bs.liabilities.current.tax_payable)}</td></tr>
            <tr><td style="padding-left:32px">其他应付款</td><td class="amount negative">${r(bs.liabilities.current.other_payable)}</td></tr>
            <tr style="font-weight:500;background:var(--warm-light)"><td style="padding-left:16px">流动负债合计</td>
              <td class="amount negative" style="font-size:14px">${r(bs.liabilities.current_total)}</td></tr>

            <tr><td style="padding-left:32px">长期借款</td><td class="amount negative">${r(bs.liabilities.non_current.long_term_borrowing)}</td></tr>
            <tr style="font-weight:500;background:var(--warm-light)"><td style="padding-left:16px">非流动负债合计</td>
              <td class="amount negative" style="font-size:14px">${r(bs.liabilities.non_current_total)}</td></tr>

            <tr style="font-weight:500;background:var(--danger-light)"><td>负债合计</td>
              <td class="amount negative" style="font-size:14px">${r(bs.total_liabilities)}</td></tr>

            <tr style="font-weight:500;background:var(--gray-50)"><td>所有者权益：</td><td></td></tr>
            <tr><td style="padding-left:32px">实收资本</td><td class="amount positive">${r(bs.equity.paid_in_capital)}</td></tr>
            <tr><td style="padding-left:32px">资本公积</td><td class="amount positive">${r(bs.equity.capital_reserve)}</td></tr>
            <tr><td style="padding-left:32px">盈余公积</td><td class="amount positive">${r(bs.equity.surplus_reserve)}</td></tr>
            <tr><td style="padding-left:32px">未分配利润</td>
              <td class="amount ${bs.equity.current_year_profit + bs.equity.profit_distribution >= 0 ? 'positive' : 'negative'}">${r(bs.equity.current_year_profit + bs.equity.profit_distribution)}</td></tr>
            <tr style="font-weight:500;background:var(--success-light)"><td style="padding-left:16px">所有者权益合计</td>
              <td class="amount positive" style="font-size:14px">${r(bs.total_equity)}</td></tr>

            <tr style="font-weight:bold;background:var(--success-light);border-top:2px solid var(--success)"><td>负债和所有者权益总计</td>
              <td class="amount positive" style="font-size:16px">${r(bs.total_liabilities + bs.total_equity)}</td></tr>
          </tbody>
        </table>
      </div>
    `;
  },

  // ========== 现金流量表 ==========
  renderCashFlow(container, storeId, startDate, endDate) {
    const cf = DB.getCashFlowStatement(storeId, startDate, endDate);
    const r = v => App.fmtMoney(v);

    container.innerHTML = `
      <div class="stat-grid" style="margin-bottom:12px">
        <div class="stat-card">
          <div class="label">期初现金</div>
          <div class="value">${App.fmtMoneyShort(cf.opening_cash)}</div>
        </div>
        <div class="stat-card">
          <div class="label">本期净增加</div>
          <div class="value" style="color:${cf.net_increase >= 0 ? 'var(--success)' : 'var(--danger)'}">${App.fmtMoneyShort(cf.net_increase)}</div>
        </div>
        <div class="stat-card">
          <div class="label">期末现金</div>
          <div class="value" style="color:var(--primary)">${App.fmtMoneyShort(cf.closing_cash)}</div>
        </div>
        <div class="stat-card">
          <div class="label">经营活动净额</div>
          <div class="value" style="color:${cf.operating.net >= 0 ? 'var(--success)' : 'var(--danger)'}">${App.fmtMoneyShort(cf.operating.net)}</div>
        </div>
      </div>

      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:12px 16px;background:var(--info-light);font-size:12px;color:#185FA5;border-bottom:1px solid var(--accent-light)">
          现金流量表 （${App.fmtDate(startDate)} 至 ${App.fmtDate(endDate)}）
        </div>
        <table class="data-table">
          <thead><tr><th>项目</th><th style="text-align:right">本期金额</th></tr></thead>
          <tbody>
            <tr style="font-weight:500;background:var(--info-light)"><td>一、经营活动产生的现金流量</td><td></td></tr>
            <tr><td style="padding-left:32px">销售商品、提供劳务收到的现金</td>
              <td class="amount positive">${r(cf.operating.inflow.sale_revenue)}</td></tr>
            <tr style="font-weight:500"><td style="padding-left:16px">经营活动现金流入小计</td>
              <td class="amount positive" style="font-size:14px">${r(cf.operating.inflow_total)}</td></tr>

            <tr><td style="padding-left:32px;padding-top:8px">购买商品、接受劳务支付的现金</td>
              <td class="amount negative" style="padding-top:8px">${r(cf.operating.outflow.purchase)}</td></tr>
            <tr><td style="padding-left:32px">支付给职工以及为职工支付的现金</td>
              <td class="amount negative">${r(cf.operating.outflow.staff)}</td></tr>
            <tr><td style="padding-left:32px">支付的各项税费</td>
              <td class="amount negative">${r(cf.operating.outflow.tax)}</td></tr>
            <tr><td style="padding-left:32px">支付其他与经营活动有关的现金</td>
              <td class="amount negative">${r(cf.operating.outflow.other)}</td></tr>
            <tr style="font-weight:500"><td style="padding-left:16px">经营活动现金流出小计</td>
              <td class="amount negative" style="font-size:14px">${r(cf.operating.outflow_total)}</td></tr>

            <tr style="font-weight:500;background:${cf.operating.net >= 0 ? 'var(--success-light)' : 'var(--danger-light)'}">
              <td style="padding-left:16px">经营活动产生的现金流量净额</td>
              <td class="amount ${cf.operating.net >= 0 ? 'positive' : 'negative'}" style="font-size:14px">${r(cf.operating.net)}</td></tr>

            <tr><td colspan="2" style="height:8px;padding:0"></td></tr>
            <tr style="font-weight:500;background:var(--info-light)"><td>二、投资活动产生的现金流量</td><td></td></tr>
            <tr><td style="padding-left:32px">购建固定资产、无形资产支付的现金</td>
              <td class="amount negative">${r(cf.investing.outflow.fixed_assets)}</td></tr>
            <tr style="font-weight:500;background:${cf.investing.net >= 0 ? 'var(--success-light)' : 'var(--danger-light)'}">
              <td style="padding-left:16px">投资活动产生的现金流量净额</td>
              <td class="amount ${cf.investing.net >= 0 ? 'positive' : 'negative'}" style="font-size:14px">${r(cf.investing.net)}</td></tr>

            <tr><td colspan="2" style="height:8px;padding:0"></td></tr>
            <tr style="font-weight:500;background:var(--info-light)"><td>三、筹资活动产生的现金流量</td><td></td></tr>
            <tr><td style="padding-left:32px">吸收投资收到的现金</td>
              <td class="amount positive">${r(cf.financing.inflow.capital)}</td></tr>
            <tr style="font-weight:500;background:${cf.financing.net >= 0 ? 'var(--success-light)' : 'var(--danger-light)'}">
              <td style="padding-left:16px">筹资活动产生的现金流量净额</td>
              <td class="amount ${cf.financing.net >= 0 ? 'positive' : 'negative'}" style="font-size:14px">${r(cf.financing.net)}</td></tr>

            <tr><td colspan="2" style="height:8px;padding:0"></td></tr>
            <tr><td style="font-weight:500">四、现金及现金等价物净增加额</td>
              <td class="amount ${cf.net_increase >= 0 ? 'positive' : 'negative'}" style="font-size:14px;font-weight:500">${r(cf.net_increase)}</td></tr>
            <tr><td>加：期初现金及现金等价物余额</td>
              <td class="amount">${r(cf.opening_cash)}</td></tr>
            <tr style="font-weight:bold;background:var(--success-light)"><td>五、期末现金及现金等价物余额</td>
              <td class="amount positive" style="font-size:16px">${r(cf.closing_cash)}</td></tr>
          </tbody>
        </table>
      </div>
    `;
  }
};

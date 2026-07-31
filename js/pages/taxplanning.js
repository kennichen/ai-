/**
 * 税筹中心 — 税费概览 / 企业所得税试算 / 税负率分析 / 税务风险预警
 *
 * 对于餐饮行业中小企业，主要涉税事项：
 * 1. 增值税：小规模纳税人 3%(目前减免至1%)���一般纳税人 6%
 * 2. 企业所得税：标准 25%，小微企业优惠(年利润≤100万实际2.5%，100-300万实际5%)
 * 3. 附加税费：城建税(7%/5%/1%) + 教育费附加(3%) + 地方教育附加(2%)
 * 4. 个人所得税：工资代扣代缴
 * 5. 印花税：购销合同万分之三
 */
const TaxPlanning = {
  render(container) {
    container.innerHTML = '';
    const storeId = App.currentStore;
    const startDate = App.monthStart();
    const endDate = App.today();
    const yearStart = new Date().getFullYear() + '-01-01';

    // 获取税务设置
    const taxCfg = DB.getTaxSettings();
    const isSmall = taxCfg.taxpayerType === 'small';

    // 获取本月利润表数据
    const stmt = DB.getIncomeStatement(storeId, startDate, endDate);
    const monthNum = new Date().getMonth() + 1;
    const annualEstRevenue = stmt.revenue.total / (monthNum || 1) * 12;
    const annualEstProfit = stmt.net_profit / (monthNum || 1) * 12;

    // ===== 税务数据计算（使用可编辑税率）=====
    // 1. 增值税
    const vatRateMonthly = taxCfg.vatRate;
    const vatMonthly = Math.round(stmt.revenue.total * vatRateMonthly);

    // 2. 附加税费
    const surchargeRate = taxCfg.vatSurchargeRate;
    const surchargeMonthly = Math.round(vatMonthly * surchargeRate);

    // 3. 企业所得税
    const annualProfit = annualEstProfit;
    let CITRate, CITDesc;
    if (annualProfit <= taxCfg.smallProfitThreshold) {
      CITRate = taxCfg.citRateSmall;
      CITDesc = `小微企业优惠（利润≤${(taxCfg.smallProfitThreshold / 10000).toFixed(0)}万，实际税率${(CITRate * 100).toFixed(1)}%）`;
    } else if (annualProfit <= taxCfg.midProfitThreshold) {
      CITRate = taxCfg.citRateMid;
      CITDesc = `小微企业优惠（${(taxCfg.smallProfitThreshold / 10000).toFixed(0)}万<利润≤${(taxCfg.midProfitThreshold / 10000).toFixed(0)}万，实际税率${(CITRate * 100).toFixed(1)}%）`;
    } else {
      CITRate = taxCfg.citRateStd;
      CITDesc = `标准税率${(CITRate * 100).toFixed(1)}%`;
    }
    const citMonthly = Math.round(stmt.net_profit * CITRate);

    // 4. 印花税
    const stampTax = Math.round(stmt.revenue.total * taxCfg.stampRate);

    // 本月应交税费合计
    const totalTaxMonthly = vatMonthly + surchargeMonthly + citMonthly + stampTax;

    // 已计提
    const bs = DB.getBalanceSheet(storeId, endDate);
    const taxPayable = bs.liabilities.current.tax_payable || 0;
    const salaryPayable = bs.liabilities.current.salary_payable || 0;

    // ===== 税务风险预警 =====
    // 行业参考税负率（餐饮业）
    const industryVATRate = 0.012;   // 1.2%
    const industryCITRate = 0.015;   // 1.5%
    const actualVATRate = stmt.revenue.total > 0 ? (vatMonthly / stmt.revenue.total) : 0;
    const actualCITRate = stmt.revenue.total > 0 ? (citMonthly / stmt.revenue.total) : 0;

    const risks = [];
    if (actualVATRate < industryVATRate * 0.7) {
      risks.push({ level: 'high', title: '增值税税负率偏低', detail: `实际${(actualVATRate * 100).toFixed(2)}% 低于行业参考${(industryVATRate * 100).toFixed(1)}%，可能存在预警风险` });
    }
    if (actualVATRate > industryVATRate * 1.5) {
      risks.push({ level: 'medium', title: '增值税税负率偏高', detail: `实际${(actualVATRate * 100).toFixed(2)}% 高于行业平均，可能有多缴税情况` });
    }
    if (stmt.net_profit > 0 && citMonthly === 0) {
      risks.push({ level: 'high', title: '有利润未计提所得税', detail: '本期存在净利润但未计提企业所得税，请核查' });
    }
    if (salaryPayable > 100000) {
      risks.push({ level: 'medium', title: '应付职工薪酬余额偏高', detail: `期末余额${App.fmtMoney(salaryPayable)}，可能存在个税未及时申报的风险` });
    }
    if (stmt.net_margin > 0.25) {
      risks.push({ level: 'low', title: '净利率高于行业平均', detail: `净利率${(stmt.net_margin * 100).toFixed(1)}%，行业通常15-20%，税局可能关注` });
    }
    if (stmt.net_margin < 0) {
      risks.push({ level: 'high', title: '本期亏损', detail: `净利润${App.fmtMoney(stmt.net_profit)}，连续亏损可能引起税局关注` });
    }

    // 默认无风险
    if (risks.length === 0) {
      risks.push({ level: 'safe', title: '暂无税务风险', detail: '各项指标均在正常范围内' });
    }

    // ===== 渲染 =====
    const monthName = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'][new Date().getMonth()];

    let html = `
      <!-- KPI -->
      <div class="kpi-row">
        <div class="stat-card kpi-item">
          <div class="kpi-value" style="color:var(--warm)">${App.fmtMoneyShort(totalTaxMonthly)}</div>
          <div class="kpi-label">${monthName}应交税费合计</div>
        </div>
        <div class="stat-card kpi-item">
          <div class="kpi-value" style="color:var(--primary-dark)">${App.fmtMoneyShort(taxPayable)}</div>
          <div class="kpi-label">应交税费余额</div>
        </div>
        <div class="stat-card kpi-item">
          <div class="kpi-value" style="color:var(--primary)">${App.fmtMoneyShort(stmt.revenue.total)}</div>
          <div class="kpi-label">${monthName}营业收入</div>
        </div>
        <div class="stat-card kpi-item">
          <div class="kpi-value" style="color:${stmt.net_profit >= 0 ? 'var(--success)' : 'var(--danger)'}">${App.fmtMoneyShort(stmt.net_profit)}</div>
          <div class="kpi-label">${monthName}净利润</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:16px">
        <!-- 税费明细表 -->
        <div class="card" style="padding:0;overflow:hidden">
          <div style="padding:12px 16px;background:var(--info-light);font-size:12px;color:#185FA5;border-bottom:1px solid var(--accent-light)">
            ${monthName}税费测算明细（基于本期经营数据）
          </div>
          <table class="data-table">
            <thead><tr><th>税种</th><th>计税依据</th><th>税率</th><th style="text-align:right">应纳税额</th></tr></thead>
            <tbody>
              <tr>
                <td>增值税</td>
                <td style="font-size:12px;color:var(--gray-600)">营业收入 ${App.fmtMoney(stmt.revenue.total)}</td>
                <td><span class="badge badge-accent">${(vatRateMonthly * 100).toFixed(1)}%</span> ${isSmall ? '小规模' : '一般纳税人'}</td>
                <td class="amount negative">${App.fmtMoney(vatMonthly)}</td>
              </tr>
              <tr>
                <td style="padding-left:24px;font-size:12px;color:var(--gray-600)">城建税</td>
                <td style="font-size:12px;color:var(--gray-600)">增值税额 ${App.fmtMoney(vatMonthly)}</td>
                <td><span class="badge badge-gold">${(taxCfg.urbanRate * 100).toFixed(0)}%</span></td>
                <td class="amount negative" style="font-size:12px">${App.fmtMoney(Math.round(vatMonthly * taxCfg.urbanRate))}</td>
              </tr>
              <tr>
                <td style="padding-left:24px;font-size:12px;color:var(--gray-600)">教育费附加</td>
                <td style="font-size:12px;color:var(--gray-600)">增值税额 ${App.fmtMoney(vatMonthly)}</td>
                <td><span class="badge badge-gold">${(taxCfg.localEduRate * 100).toFixed(0)}%</span></td>
                <td class="amount negative" style="font-size:12px">${App.fmtMoney(Math.round(vatMonthly * 0.05))}</td>
              </tr>
              <tr>
                <td style="font-weight:500">增值税及附加小计</td>
                <td></td>
                <td></td>
                <td class="amount negative" style="font-weight:500">${App.fmtMoney(vatMonthly + surchargeMonthly)}</td>
              </tr>
              <tr>
                <td>企业所得税</td>
                <td style="font-size:12px;color:var(--gray-600)">应纳税所得额 ${App.fmtMoney(stmt.net_profit)}</td>
                <td><span class="badge badge-primary">${(CITRate * 100).toFixed(1)}%</span></td>
                <td class="amount negative">${App.fmtMoney(citMonthly)}</td>
              </tr>
              <tr style="font-size:11px;color:var(--gray-400)">
                <td colspan="4" style="padding-left:32px">${CITDesc} · 年预估利润 ${App.fmtMoney(annualProfit)}</td>
              </tr>
              <tr>
                <td>印花税</td>
                <td style="font-size:12px;color:var(--gray-600)">营业收入 ${App.fmtMoney(stmt.revenue.total)}</td>
                <td><span class="badge badge-accent">${(taxCfg.stampRate * 100).toFixed(2)}%</span></td>
                <td class="amount negative" style="font-size:12px">${App.fmtMoney(stampTax)}</td>
              </tr>
              <tr style="font-weight:bold;background:var(--danger-light)">
                <td>${monthName}税费合计</td>
                <td></td>
                <td>综合税负 ${stmt.revenue.total > 0 ? (totalTaxMonthly / stmt.revenue.total * 100).toFixed(2) : 0}%</td>
                <td class="amount negative" style="font-size:15px">${App.fmtMoney(totalTaxMonthly)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 税务风险预警 -->
        <div class="card" style="padding:0;overflow:hidden">
          <div style="padding:12px 16px;background:var(--warm-light);font-size:12px;color:#633806;border-bottom:1px solid var(--gold-light)">
            &#x26A0; 税务风险预警
          </div>
          <div style="padding:12px">
    `;

    risks.forEach(r => {
      const colors = {
        high: { bg: 'var(--danger-light)', dot: 'var(--danger)', text: '#791F1F', label: '高风险' },
        medium: { bg: 'var(--warning-light)', dot: 'var(--warm)', text: '#633806', label: '中风险' },
        low: { bg: 'var(--gold-light)', dot: 'var(--gold)', text: '#412402', label: '低风险' },
        safe: { bg: 'var(--success-light)', dot: 'var(--success)', text: '#27500A', label: '正常' }
      };
      const c = colors[r.level] || colors.low;
      html += `
        <div style="margin-bottom:8px;padding:10px 12px;background:${c.bg};border-radius:8px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="width:8px;height:8px;border-radius:50%;background:${c.dot};display:inline-block"></span>
            <span style="font-size:12px;font-weight:500;color:${c.text}">${r.title}</span>
            <span class="badge" style="margin-left:auto;background:${c.dot}22;color:${c.text};font-size:10px">${c.label}</span>
          </div>
          <div style="font-size:11px;color:${c.text};opacity:0.8">${r.detail}</div>
        </div>
      `;
    });

    html += `
          </div>
        </div>
      </div>

      <!-- 税负率对比分析 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="card">
          <div class="card-header"><div class="card-title">税负率对比分析</div></div>
          <table class="data-table">
            <thead><tr><th>指标</th><th style="text-align:right">企业实际</th><th style="text-align:right">行业参考</th><th style="text-align:right">偏差</th></tr></thead>
            <tbody>
              <tr>
                <td>增值税税负率</td>
                <td class="amount">${(actualVATRate * 100).toFixed(2)}%</td>
                <td class="amount" style="color:var(--gray-400)">${(industryVATRate * 100).toFixed(1)}%</td>
                <td class="amount" style="color:${Math.abs(actualVATRate - industryVATRate) < 0.005 ? 'var(--success)' : 'var(--warm)'}">
                  ${((actualVATRate - industryVATRate) * 100).toFixed(2)}%
                </td>
              </tr>
              <tr>
                <td>所得税税负率</td>
                <td class="amount">${(actualCITRate * 100).toFixed(2)}%</td>
                <td class="amount" style="color:var(--gray-400)">${(industryCITRate * 100).toFixed(1)}%</td>
                <td class="amount" style="color:${Math.abs(actualCITRate - industryCITRate) < 0.005 ? 'var(--success)' : 'var(--warm)'}">
                  ${((actualCITRate - industryCITRate) * 100).toFixed(2)}%
                </td>
              </tr>
              <tr>
                <td>综合税负率</td>
                <td class="amount">${stmt.revenue.total > 0 ? (totalTaxMonthly / stmt.revenue.total * 100).toFixed(2) : 0}%</td>
                <td class="amount" style="color:var(--gray-400)">3.0%</td>
                <td class="amount" style="color:var(--gray-600)">
                  ${stmt.revenue.total > 0 ? ((totalTaxMonthly / stmt.revenue.total - 0.03) * 100).toFixed(2) : 0}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">企业所得税试算（年度预估）</div></div>
          <table class="data-table">
            <thead><tr><th>项目</th><th style="text-align:right">金额/说明</th></tr></thead>
            <tbody>
              <tr>
                <td>年预估营业收入</td>
                <td class="amount positive">${App.fmtMoney(annualEstRevenue)}</td>
              </tr>
              <tr>
                <td>年预估利润总额</td>
                <td class="amount positive">${App.fmtMoney(annualEstProfit)}</td>
              </tr>
              <tr>
                <td>适用税率</td>
                <td class="amount" style="color:var(--primary)">${(CITRate * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td>适用条件</td>
                <td style="font-size:11px;color:var(--gray-600)">${CITDesc}</td>
              </tr>
              <tr style="font-weight:500;background:var(--success-light)">
                <td>年度预估应缴所得税</td>
                <td class="amount" style="color:var(--success);font-size:14px;font-weight:500">${App.fmtMoney(Math.round(annualEstProfit * CITRate))}</td>
              </tr>
              <tr>
                <td style="font-size:11px;color:var(--gray-400)">实际应缴</td>
                <td class="amount" style="font-size:11px;color:var(--gray-400)">
                  按季度预缴 · 年度汇算清缴
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 税务合规指引 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">&#x1F4D6; 税务合规指引（餐饮行业）</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
          <div style="padding:12px;background:var(--info-light);border-radius:8px">
            <div style="font-size:12px;font-weight:500;color:#185FA5;margin-bottom:6px">增值税</div>
            <div style="font-size:11px;color:#0C447C;line-height:1.7">
              小规模纳税人：征收率1%（现行优惠）<br>
              一般纳税人：税率6%<br>
              申报周期：季度/月度<br>
              餐饮服务外卖适用同样税率
            </div>
          </div>
          <div style="padding:12px;background:var(--success-light);border-radius:8px">
            <div style="font-size:12px;font-weight:500;color:#27500A;margin-bottom:6px">企业所得税</div>
            <div style="font-size:11px;color:#173404;line-height:1.7">
              季度预缴（预缴率按实际利润）<br>
              年度汇算清缴（5月31日前）<br>
              小微企业优惠政策<br>
              餐饮行业利润率通常15-20%
            </div>
          </div>
          <div style="padding:12px;background:var(--warm-light);border-radius:8px">
            <div style="font-size:12px;font-weight:500;color:#633806;margin-bottom:6px">个税 & 其他</div>
            <div style="font-size:11px;color:#412402;line-height:1.7">
              工资个税：按月代扣代缴（15日前）<br>
              印花税：按季度申报<br>
              社保费：按月缴纳<br>
              小规模纳税人减半征收"六税两费"
            </div>
          </div>
        </div>
      </div>

      <!-- 税务设置 -->
      <div class="glass-card-thin" style="margin-top:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div>
            <span style="font-size:13px;font-weight:500;color:var(--text-primary)">&#x2699; 税务设置</span>
            <span style="font-size:11px;color:var(--text-tertiary);margin-left:8px">${isSmall ? '小规模纳税人' : '一般纳税人'}</span>
          </div>
          <button class="btn btn-sm btn-outline" onclick="TaxPlanning.showTaxSettings()">编辑税率</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;font-size:11px;color:var(--text-secondary)">
          <div><span style="color:var(--text-tertiary)">增值税</span><br/><span style="font-weight:500;color:var(--text-primary)">${(taxCfg.vatRate * 100).toFixed(1)}%</span></div>
          <div><span style="color:var(--text-tertiary)">城建税</span><br/><span style="font-weight:500;color:var(--text-primary)">${(taxCfg.urbanRate * 100).toFixed(0)}%</span></div>
          <div><span style="color:var(--text-tertiary)">教育费附加</span><br/><span style="font-weight:500;color:var(--text-primary)">${(taxCfg.eduRate * 100).toFixed(0)}%</span></div>
          <div><span style="color:var(--text-tertiary)">企业所得税</span><br/><span style="font-weight:500;color:var(--text-primary)">${(CITRate * 100).toFixed(1)}%</span></div>
          <div><span style="color:var(--text-tertiary)">印花税</span><br/><span style="font-weight:500;color:var(--text-primary)">${(taxCfg.stampRate * 100).toFixed(3)}%</span></div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  showTaxSettings() {
    const t = DB.getTaxSettings();
    const html = `
      <div class="form-row-3">
        <div class="form-group">
          <label>纳税人类型</label>
          <select class="form-control" id="tsTaxpayerType">
            <option value="small" ${t.taxpayerType === 'small' ? 'selected' : ''}>小规模纳税人</option>
            <option value="general" ${t.taxpayerType === 'general' ? 'selected' : ''}>一般纳税人</option>
          </select>
        </div>
        <div class="form-group">
          <label>增值税征收率 (%)</label>
          <input type="number" class="form-control" id="tsVatRate" value="${(t.vatRate * 100).toFixed(1)}" step="0.1" min="0" max="13">
        </div>
        <div class="form-group">
          <label>城建税率 (%)</label>
          <input type="number" class="form-control" id="tsUrbanRate" value="${(t.urbanRate * 100).toFixed(0)}" step="1" min="0" max="7">
        </div>
      </div>
      <div class="form-row-3">
        <div class="form-group">
          <label>教育费附加率 (%)</label>
          <input type="number" class="form-control" id="tsEduRate" value="${(t.eduRate * 100).toFixed(0)}" step="0.5" min="0" max="5">
        </div>
        <div class="form-group">
          <label>地方教育附加率 (%)</label>
          <input type="number" class="form-control" id="tsLocalEduRate" value="${(t.localEduRate * 100).toFixed(0)}" step="0.5" min="0" max="3">
        </div>
        <div class="form-group">
          <label>印花税率 (%)</label>
          <input type="number" class="form-control" id="tsStampRate" value="${(t.stampRate * 100).toFixed(3)}" step="0.01" min="0" max="1">
        </div>
      </div>
      <div class="form-row-3">
        <div class="form-group">
          <label>小微企业税率（利润≤${(t.smallProfitThreshold / 10000).toFixed(0)}万）(%)</label>
          <input type="number" class="form-control" id="tsCitSmall" value="${(t.citRateSmall * 100).toFixed(1)}" step="0.1" min="0" max="25">
        </div>
        <div class="form-group">
          <label>中型企业税率（利润≤${(t.midProfitThreshold / 10000).toFixed(0)}万）(%)</label>
          <input type="number" class="form-control" id="tsCitMid" value="${(t.citRateMid * 100).toFixed(1)}" step="0.1" min="0" max="25">
        </div>
        <div class="form-group">
          <label>标准企业所得税率 (%)</label>
          <input type="number" class="form-control" id="tsCitStd" value="${(t.citRateStd * 100).toFixed(0)}" step="0.5" min="0" max="25">
        </div>
      </div>
      <div style="font-size:11px;color:var(--text-tertiary);background:rgba(99,102,241,0.06);padding:8px 12px;border-radius:8px;margin-top:4px">
        &#x2139; 各类企业的实际税率请咨询您的税务专员。修改后页面将自动重新计算。
      </div>
    `;
    App.showModal('税务设置', html,
      `<button class="btn btn-primary" onclick="TaxPlanning.saveTaxSettings()">保存设置</button>
       <button class="btn btn-outline" onclick="App.closeModal()">取消</button>`
    );
  },

  saveTaxSettings() {
    const getVal = (id) => parseFloat(document.getElementById(id)?.value || 0) / 100;
    const settings = {
      taxpayerType: document.getElementById('tsTaxpayerType')?.value || 'small',
      vatRate: getVal('tsVatRate'),
      urbanRate: getVal('tsUrbanRate'),
      eduRate: getVal('tsEduRate'),
      localEduRate: getVal('tsLocalEduRate'),
      stampRate: getVal('tsStampRate'),
      citRateSmall: getVal('tsCitSmall'),
      citRateMid: getVal('tsCitMid'),
      citRateStd: getVal('tsCitStd'),
      vatSurchargeRate: 0
    };
    // 自动计算附加税费合计
    settings.vatSurchargeRate = settings.urbanRate + settings.eduRate + settings.localEduRate;
    DB.saveTaxSettings(settings);
    App.closeModal();
    const container = document.getElementById('pageContent');
    this.render(container);
  }
};

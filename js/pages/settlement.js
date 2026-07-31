/**
 * 外卖对账 — 上传美团/饿了么结算单，自动解析、生成记账分录、核对实收
 */
const Settlement = {
  render(container) {
    container.innerHTML = '';
    this._container = container;
    this._parsedData = null;
    this._imported = [];

    let html = `
      <!-- 导入区 -->
      <div class="glass-card" style="margin-bottom:14px">
        <div class="glass-card-header">
          <div class="glass-card-title">&#x1F4E6; 导入外卖结算单</div>
          <span class="card-subtitle">上传美团/饿了么 CSV 结算文件</span>
        </div>
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">
          <select class="form-control" id="settlementPlatform" style="width:140px">
            <option value="meituan">美团</option>
            <option value="eleme">饿了么</option>
            <option value="taobao">淘宝闪购</option>
          </select>
          <input type="file" id="settlementFile" accept=".csv,.txt" onchange="Settlement.importFile(this)" style="display:none">
          <button class="btn btn-sm btn-primary" onclick="document.getElementById('settlementFile').click()">选择文件</button>
          <span style="font-size:11px;color:var(--text-tertiary)">支持 CSV / TXT 格式</span>
        </div>
        <div style="font-size:11px;color:var(--text-tertiary);background:var(--info-light);padding:8px 12px;border-radius:8px;margin-bottom:10px">
          &#x1F4C1; <b>测试用结算单示例</b> — 下载示例 CSV 测试导入功能：
          <button class="btn btn-sm btn-outline" style="font-size:10px;padding:2px 8px;margin-left:4px" onclick="Settlement.downloadSample('meituan')">美团模板</button>
          <button class="btn btn-sm btn-outline" style="font-size:10px;padding:2px 8px" onclick="Settlement.downloadSample('eleme')">饿了么模板</button>
          <button class="btn btn-sm btn-outline" style="font-size:10px;padding:2px 8px" onclick="Settlement.downloadSample('taobao')">淘宝闪购模板</button>
        </div>
        <div id="settlementPreview"></div>
      </div>

      <!-- 已生成记录 -->
      <div class="glass-card">
        <div class="glass-card-header">
          <div class="glass-card-title">&#x1F4CB; 已生成记账分录</div>
        </div>
        <div id="settlementResults">
          <div class="empty-state">
            <div class="icon">&#x1F4C4;</div>
            <p>暂无对账记录，上传结算单后自动生成</p>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  importFile(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const platform = document.getElementById('settlementPlatform')?.value || 'meituan';
      const result = DB.parseSettlementCSV(text, platform);
      if (result.rows && result.rows.length > 0) {
        this._parsedData = result;
        this.showPreview(result, platform, file.name);
      } else {
        this._showMsg('无法解析文件，请确认是有效的结算单 CSV', true);
      }
    };
    reader.readAsText(file);
    input.value = '';
  },

  showPreview(result, platform, fileName) {
    const { rows, fields } = result;
    const sample = rows.slice(0, 5);
    const totalAmount = rows.reduce((s, r) => {
      const v = fields.amount ? parseFloat(r[fields.amount]) || 0 : 0;
      return s + v;
    }, 0);
    const platformLabel = platform === 'meituan' ? '美团' : '饿了么';

    // 试试自动识别实收以外的字段
    let commissionTotal = 0, deliveryTotal = 0, subsidyTotal = 0;
    if (fields.commission) commissionTotal = rows.reduce((s, r) => s + (parseFloat(r[fields.commission]) || 0), 0);
    if (fields.delivery) deliveryTotal = rows.reduce((s, r) => s + (parseFloat(r[fields.delivery]) || 0), 0);
    if (fields.subsidy) subsidyTotal = rows.reduce((s, r) => s + (parseFloat(r[fields.subsidy]) || 0), 0);

    const preview = document.getElementById('settlementPreview');
    preview.innerHTML = `
      <div style="background:rgba(99,102,241,0.06);border-radius:10px;padding:12px 14px;margin-top:4px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div>
            <span style="font-weight:500;font-size:13px">${fileName}</span>
            <span style="font-size:11px;color:var(--text-tertiary);margin-left:8px">${platformLabel} · ${rows.length} 条记录</span>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-primary" onclick="Settlement.generateEntries()">生成记账分录</button>
            <button class="btn btn-sm btn-outline" onclick="Settlement.clearPreview()">取消</button>
          </div>
        </div>

        <!-- 汇总 -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:10px">
          <div style="background:#fff;border-radius:8px;padding:8px 10px;border:0.5px solid rgba(0,0,0,0.05)">
            <div style="font-size:10px;color:var(--text-tertiary)">实收金额</div>
            <div style="font-size:15px;font-weight:500;color:var(--text-primary)">${App.fmtMoney(totalAmount)}</div>
          </div>
          ${fields.commission ? `
          <div style="background:#fff;border-radius:8px;padding:8px 10px;border:0.5px solid rgba(0,0,0,0.05)">
            <div style="font-size:10px;color:var(--text-tertiary)">平台佣金</div>
            <div style="font-size:15px;font-weight:500;color:var(--danger)">${App.fmtMoney(commissionTotal)}</div>
          </div>` : ''}
          ${fields.delivery ? `
          <div style="background:#fff;border-radius:8px;padding:8px 10px;border:0.5px solid rgba(0,0,0,0.05)">
            <div style="font-size:10px;color:var(--text-tertiary)">配送费</div>
            <div style="font-size:15px;font-weight:500;color:var(--warning)">${App.fmtMoney(deliveryTotal)}</div>
          </div>` : ''}
          ${fields.subsidy ? `
          <div style="background:#fff;border-radius:8px;padding:8px 10px;border:0.5px solid rgba(0,0,0,0.05)">
            <div style="font-size:10px;color:var(--text-tertiary)">活动补贴</div>
            <div style="font-size:15px;font-weight:500;color:var(--success)">${App.fmtMoney(subsidyTotal)}</div>
          </div>` : ''}
        </div>

        <!-- 预览表头 -->
        <div style="font-size:11px;color:var(--text-tertiary);margin-bottom:6px">
          识别字段：${Object.entries(fields).filter(([,v]) => v).map(([k,v]) => `${k}=${v}`).join(' · ')}
        </div>
        <div style="overflow-x:auto;font-size:11px">
          <table class="data-table">
            <thead><tr>${Object.keys(sample[0] || {}).slice(0, 6).map(k => `<th>${k}</th>`).join('')}</tr></thead>
            <tbody>${sample.map(r => `<tr>${Object.values(r).slice(0, 6).map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
          ${rows.length > 5 ? `<div style="font-size:10px;color:var(--text-tertiary);text-align:center;padding:6px">… 仅显示前 5 条，共 ${rows.length} 条</div>` : ''}
        </div>

        <div style="margin-top:10px;padding:8px 10px;background:var(--warning-light);border-radius:6px;font-size:11px;color:#633806">
          &#x26A0; 请确认以上识别结果正确。自动识别的字段名仅供参考，你可以手动调整。
          <button class="btn btn-sm btn-outline" style="margin-left:8px;font-size:10px;padding:2px 8px" onclick="Settlement.editFieldMapping()">调整字段映射</button>
        </div>
      </div>
    `;
  },

  clearPreview() {
    document.getElementById('settlementPreview').innerHTML = '';
    this._parsedData = null;
  },

  editFieldMapping() {
    if (!this._parsedData) return;
    const { fields } = this._parsedData;
    const fieldNames = Object.keys(this._parsedData.rows[0] || {});

    const bodyHtml = `
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">将 CSV 列名映射到系统识别的字段</div>
      ${Object.entries(fields).map(([key, val]) => `
        <div class="form-group">
          <label>${key === 'date' ? '日期' : key === 'amount' ? '实收金额' : key === 'orderNo' ? '订单号' : key === 'commission' ? '平台佣金' : key === 'delivery' ? '配送费' : key === 'subsidy' ? '活动补贴' : key}</label>
          <select class="form-control" id="map_${key}">
            <option value="">未识别</option>
            ${fieldNames.map(f => `<option value="${f}" ${f === val ? 'selected' : ''}>${f}</option>`).join('')}
          </select>
        </div>
      `).join('')}
    `;

    App.showModal('调整字段映射', bodyHtml, `
      <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Settlement.applyFieldMapping()">应用</button>
    `);
  },

  applyFieldMapping() {
    const newFields = {};
    ['date', 'amount', 'orderNo', 'commission', 'delivery', 'subsidy'].forEach(key => {
      newFields[key] = document.getElementById(`map_${key}`)?.value || '';
    });
    if (this._parsedData) {
      this._parsedData.fields = newFields;
      this.showPreview(this._parsedData, document.getElementById('settlementPlatform')?.value || 'meituan', this._lastFileName || '结算单');
    }
    App.closeModal();
  },

  generateEntries() {
    if (!this._parsedData || !this._parsedData.rows.length) return;

    const { rows, fields } = this._parsedData;
    const amountField = fields.amount;
    if (!amountField) { alert('未识别实收金额字段，请先调整字段映射'); return; }

    const date = new Date().toISOString().split('T')[0];
    const totalAmount = rows.reduce((s, r) => s + (parseFloat(r[amountField]) || 0), 0);
    const platform = document.getElementById('settlementPlatform')?.value || 'meituan';
    const platformNames = { meituan: '外卖-美团', eleme: '外卖-饿了么', taobao: '外卖-淘宝闪购' };
    const platformName = platformNames[platform] || '外卖-其他';
    const platformAccount = DB.getAccounts().find(a => a.name.includes(platformName) || a.name.includes('外卖'));
    const bankAccount = DB.getAccounts().find(a => a.name === '银行存款');
    const costAccount = DB.getAccounts().find(a => a.name.includes('平台佣金'));

    if (!bankAccount) { alert('未找到「银行存款」科目，请先在设置中确认科目表'); return; }
    if (!costAccount) { alert('未找到「平台佣金」科目，请添加或确认科目表'); return; }

    // 生成收入记账
    const incomeData = {
      date, amount: totalAmount,
      account_id: platformAccount ? platformAccount.id : bankAccount.id,
      type: 'income', channel: 'delivery',
      description: `${platformName}结算收入 ${rows.length} 单`,
      store_id: App.currentStore,
      fund_account_id: ''
    };
    DB.addTransaction(incomeData);

    // 如果有佣金，生成费用记账
    const commission = fields.commission
      ? rows.reduce((s, r) => s + (parseFloat(r[fields.commission]) || 0), 0)
      : 0;
    if (commission > 0) {
      DB.addTransaction({
        date, amount: commission,
        account_id: costAccount.id,
        type: 'expense', channel: 'delivery',
        description: `${platformName}平台佣金`,
        store_id: App.currentStore,
        fund_account_id: ''
      });
    }

    // 如果有配送费，生成费用记账
    const delivery = fields.delivery
      ? rows.reduce((s, r) => s + (parseFloat(r[fields.delivery]) || 0), 0)
      : 0;
    if (delivery > 0) {
      const deliveryAccount = DB.getAccounts().find(a => a.name.includes('配送费')) || costAccount;
      DB.addTransaction({
        date, amount: delivery,
        account_id: deliveryAccount.id,
        type: 'expense', channel: 'delivery',
        description: `${platformName}配送费`,
        store_id: App.currentStore,
        fund_account_id: ''
      });
    }

    // 保存对账记录
    if (!this._imported) this._imported = [];
    this._imported.push({
      date: App.today(),
      platform: platformName,
      orders: rows.length,
      totalAmount,
      commission
    });

    // 更新界面
    this._showMsg(`已生成记账分录：收入 ${App.fmtMoney(totalAmount)}${commission > 0 ? ` + 佣金 ${App.fmtMoney(commission)}` : ''}`, false);
    this.clearPreview();
    this._renderResults();
  },

  _renderResults() {
    const el = document.getElementById('settlementResults');
    if (!el) return;
    if (!this._imported || this._imported.length === 0) {
      el.innerHTML = `<div class="empty-state"><div class="icon">&#x1F4C4;</div><p>暂无对账记录，上传结算单后自动生成</p></div>`;
      return;
    }
    let html = `<table class="data-table"><thead><tr><th>日期</th><th>平台</th><th>订单数</th><th style="text-align:right">实收金额</th><th style="text-align:right">平台佣金</th><th style="text-align:right">操作</th></tr></thead><tbody>`;
    this._imported.forEach((r, i) => {
      html += `<tr>
        <td>${r.date}</td>
        <td>${r.platform}</td>
        <td>${r.orders}</td>
        <td class="amount positive">${App.fmtMoney(r.totalAmount)}</td>
        <td class="amount negative">${App.fmtMoney(r.commission)}</td>
        <td style="text-align:right"><button class="btn btn-sm btn-outline" onclick="Settlement._imported.splice(${i},1);Settlement._renderResults()">删除</button></td>
      </tr>`;
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  },

  _showMsg(msg, isErr) {
    const el = document.getElementById('settlementPreview');
    if (el) {
      const div = document.createElement('div');
      div.style.cssText = `padding:10px 14px;margin-top:8px;border-radius:8px;font-size:12px;background:${isErr ? 'var(--danger-light)' : 'var(--success-light)'};color:${isErr ? '#991b1b' : '#065f46'}`;
      div.textContent = msg;
      el.prepend(div);
      setTimeout(() => div.remove(), 5000);
    }
  },

  // 下载示例结算单 CSV
  downloadSample(platform) {
    const samples = {
      meituan: {
        name: '美团结算示例.csv',
        data: [
          '订单号,日期,商品金额,平台佣金,配送费,活动补贴,实收金额',
          'MT20260701001,2026-07-01,68.00,3.40,5.00,2.00,61.60',
          'MT20260701002,2026-07-01,45.00,2.25,5.00,0.00,42.75',
          'MT20260701003,2026-07-01,128.00,6.40,5.00,5.00,121.60',
          'MT20260702001,2026-07-02,89.00,4.45,5.00,3.00,84.55',
          'MT20260702002,2026-07-02,36.00,1.80,5.00,0.00,34.20',
          'MT20260702003,2026-07-02,156.00,7.80,5.00,8.00,150.20',
          'MT20260703001,2026-07-03,72.00,3.60,5.00,2.00,68.40',
          'MT20260703002,2026-07-03,95.00,4.75,5.00,4.00,90.25',
          'MT20260703003,2026-07-03,210.00,10.50,5.00,10.00,204.50'
        ].join('\n')
      },
      eleme: {
        name: '饿了么结算示例.csv',
        data: [
          '订单编号,交易时间,订单金额,平台服务费,物流费,商家补贴,商家实收',
          'EL20260701001,2026-07-01 12:30,55.00,2.75,4.00,1.00,51.25',
          'EL20260701002,2026-07-01 18:20,88.00,4.40,4.00,3.00,80.60',
          'EL20260701003,2026-07-01 20:15,42.00,2.10,4.00,0.00,37.90',
          'EL20260702001,2026-07-02 11:45,120.00,6.00,4.00,5.00,110.00',
          'EL20260702002,2026-07-02 19:30,66.00,3.30,4.00,2.00,59.70',
          'EL20260703001,2026-07-03 12:00,95.00,4.75,4.00,4.00,86.25',
          'EL20260703002,2026-07-03 21:00,150.00,7.50,4.00,8.00,141.50'
        ].join('\n')
      },
      taobao: {
        name: '淘宝闪购结算示例.csv',
        data: [
          '订单号,结算日期,商品总价,技术服务费,配送费,营销优惠,结算金额',
          'TB20260701001,2026-07-01,78.00,3.90,6.00,2.00,72.10',
          'TB20260701002,2026-07-01,135.00,6.75,6.00,5.00,127.25',
          'TB20260701003,2026-07-02,56.00,2.80,6.00,0.00,50.20',
          'TB20260702001,2026-07-02,198.00,9.90,6.00,10.00,184.10',
          'TB20260702002,2026-07-03,88.00,4.40,6.00,3.00,81.60',
          'TB20260703001,2026-07-03,165.00,8.25,6.00,8.00,156.75'
        ].join('\n')
      }
    };

    const sample = samples[platform];
    if (!sample) return;
    const blob = new Blob(['\uFEFF' + sample.data], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = sample.name;
    a.click();
    URL.revokeObjectURL(a.href);
  }
};

/**
 * 餐饮财务工作台 - 数据模型与存储层
 */

const DB = {
  // ========== 预置餐饮行业科目体系 ==========
  DEFAULT_ACCOUNTS: [
    // 资产类 (1xxx)
    { code: '1001', name: '库存现金', type: 'asset', category: '流动资产', is_default: true },
    { code: '1002', name: '银行存款', type: 'asset', category: '流动资产', is_default: true },
    { code: '1122', name: '应收账款', type: 'asset', category: '流动资产', is_default: true },
    { code: '1123', name: '预付账款', type: 'asset', category: '流动资产', is_default: true },
    { code: '1221', name: '其他应收款', type: 'asset', category: '流动资产', is_default: true },
    { code: '1403', name: '原材料-食材', type: 'asset', category: '存货', is_default: true, is_restaurant: true },
    { code: '1404', name: '原材料-酒水饮料', type: 'asset', category: '存货', is_default: true, is_restaurant: true },
    { code: '1405', name: '库存商品-调料', type: 'asset', category: '存货', is_default: true, is_restaurant: true },
    { code: '1406', name: '周转材料', type: 'asset', category: '存货', is_default: true },
    { code: '1471', name: '存货跌价准备', type: 'asset', category: '存货', is_default: true },
    { code: '1601', name: '固定资产', type: 'asset', category: '非流动资产', is_default: true },
    { code: '1602', name: '累计折旧', type: 'asset', category: '非流动资产', is_default: true },
    { code: '1701', name: '无形资产', type: 'asset', category: '非流动资产', is_default: true },
    { code: '1801', name: '长期待摊费用-装修', type: 'asset', category: '非流动资产', is_default: true, is_restaurant: true },

    // 负债类 (2xxx)
    { code: '2001', name: '短期借款', type: 'liability', category: '流动负债', is_default: true },
    { code: '2201', name: '应付账款-供应商', type: 'liability', category: '流动负债', is_default: true, is_restaurant: true },
    { code: '2202', name: '应付账款-外卖平台', type: 'liability', category: '流动负债', is_default: true, is_restaurant: true },
    { code: '2211', name: '应付职工薪酬', type: 'liability', category: '流动负债', is_default: true },
    { code: '2221', name: '应交税费', type: 'liability', category: '流动负债', is_default: true },
    { code: '2241', name: '其他应付款', type: 'liability', category: '流动负债', is_default: true },
    { code: '2501', name: '长期借款', type: 'liability', category: '非流动负债', is_default: true },

    // 所有者权益类 (3xxx)
    { code: '4001', name: '实收资本', type: 'equity', category: '所有者权益', is_default: true },
    { code: '4002', name: '资本公积', type: 'equity', category: '所有者权益', is_default: true },
    { code: '4101', name: '盈余公积', type: 'equity', category: '所有者权益', is_default: true },
    { code: '4103', name: '本年利润', type: 'equity', category: '所有者权益', is_default: true },
    { code: '4104', name: '利润分配', type: 'equity', category: '所有者权益', is_default: true },

    // 收入类 (4xxx) - 餐饮专用
    { code: '5001', name: '主营业务收入-堂食', type: 'revenue', category: '收入', is_restaurant: true, is_default: true },
    { code: '5002', name: '主营业务收入-外卖', type: 'revenue', category: '收入', is_restaurant: true, is_default: true },
    { code: '5003', name: '主营业务收入-自提', type: 'revenue', category: '收入', is_restaurant: true, is_default: true },
    { code: '5004', name: '主营业务收入-团购核销', type: 'revenue', category: '收入', is_restaurant: true, is_default: true },
    { code: '5005', name: '主营业务收入-会员储值', type: 'revenue', category: '收入', is_restaurant: true, is_default: true },
    { code: '5051', name: '其他业务收入', type: 'revenue', category: '收入', is_default: true },
    { code: '5101', name: '营业外收入', type: 'revenue', category: '收入', is_default: true },

    // 成本类 (5xxx) - 餐饮专用
    { code: '6001', name: '主营业务成本-食材成本', type: 'cost', category: '成本', is_restaurant: true, is_default: true },
    { code: '6002', name: '主营业务成本-酒水成本', type: 'cost', category: '成本', is_restaurant: true, is_default: true },
    { code: '6003', name: '主营业务成本-调料成本', type: 'cost', category: '成本', is_restaurant: true, is_default: true },
    { code: '6004', name: '主营业务成本-包装耗材', type: 'cost', category: '成本', is_restaurant: true, is_default: true },

    // 费用类 (6xxx) - 餐饮专用
    { code: '6601', name: '销售费用-外卖佣金', type: 'expense', category: '销售费用', is_restaurant: true, is_default: true },
    { code: '6602', name: '销售费用-平台推广', type: 'expense', category: '销售费用', is_restaurant: true, is_default: true },
    { code: '6603', name: '销售费用-优惠券补贴', type: 'expense', category: '销售费用', is_restaurant: true, is_default: true },
    { code: '6604', name: '销售费用-营销活动', type: 'expense', category: '销售费用', is_restaurant: true, is_default: true },
    { code: '6605', name: '管理费用-房租', type: 'expense', category: '管理费用', is_restaurant: true, is_default: true },
    { code: '6606', name: '管理费用-人工工资', type: 'expense', category: '管理费用', is_restaurant: true, is_default: true },
    { code: '6607', name: '管理费用-社保公积金', type: 'expense', category: '管理费用', is_default: true },
    { code: '6608', name: '管理费用-水电煤气', type: 'expense', category: '管理费用', is_restaurant: true, is_default: true },
    { code: '6609', name: '管理费用-折旧摊销', type: 'expense', category: '管理费用', is_default: true },
    { code: '6610', name: '管理费用-办公费', type: 'expense', category: '管理费用', is_default: true },
    { code: '6611', name: '管理费用-维修费', type: 'expense', category: '管理费用', is_restaurant: true, is_default: true },
    { code: '6612', name: '管理费用-物业费', type: 'expense', category: '管理费用', is_restaurant: true, is_default: true },
    { code: '6613', name: '管理费用-燃料费', type: 'expense', category: '管理费用', is_restaurant: true, is_default: true },
    { code: '6621', name: '财务费用', type: 'expense', category: '财务费用', is_default: true },
    { code: '6711', name: '营业外支出', type: 'expense', category: '营业外支出', is_default: true },
    { code: '6801', name: '所得税费用', type: 'expense', category: '所得税', is_default: true },
  ],

  // ========== 初始化 ==========
  init() {
    this.initAccounts();
    this.initStores();
  },

  initAccounts() {
    if (!localStorage.getItem('wb_accounts')) {
      const accounts = this.DEFAULT_ACCOUNTS.map((a, i) => ({
        id: `acc_${i + 1}`,
        ...a,
        created_at: new Date().toISOString()
      }));
      localStorage.setItem('wb_accounts', JSON.stringify(accounts));
    }
  },

  initStores() {
    if (!localStorage.getItem('wb_stores')) {
      const stores = [
        { id: 'store_1', name: '总店', address: '', is_headquarters: true, created_at: new Date().toISOString() }
      ];
      localStorage.setItem('wb_stores', JSON.stringify(stores));
    }
  },

  // ========== 通用 CRUD ==========
  _get(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch { return []; }
  },

  _set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  _genId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  },

  // ========== 门店管理 ==========
  getStores() { return this._get('wb_stores'); },
  getStore(id) { return this.getStores().find(s => s.id === id); },
  addStore(data) {
    const stores = this.getStores();
    const store = { id: this._genId('store'), ...data, created_at: new Date().toISOString() };
    stores.push(store);
    this._set('wb_stores', stores);
    return store;
  },

  // ========== 科目管理 ==========
  getAccounts() { return this._get('wb_accounts'); },
  getAccount(id) { return this.getAccounts().find(a => a.id === id); },
  addAccount(data) {
    const accounts = this.getAccounts();
    const account = { id: this._genId('acc'), ...data, created_at: new Date().toISOString() };
    accounts.push(account);
    this._set('wb_accounts', accounts);
    return account;
  },

  updateAccount(id, data) {
    const accounts = this.getAccounts();
    const idx = accounts.findIndex(a => a.id === id);
    if (idx === -1) return null;
    // 不允许通过更新修改内部 id / 来源标记
    const next = { ...accounts[idx], ...data, id: accounts[idx].id, updated_at: new Date().toISOString() };
    accounts[idx] = next;
    this._set('wb_accounts', accounts);
    return next;
  },

  // 删除科目；若该科目已被记账引用则拒绝删除，避免产生孤儿分录
  deleteAccount(id) {
    const usedCount = this.getTransactions({ account_id: id }).length;
    if (usedCount > 0) return { ok: false, count: usedCount };
    let accounts = this.getAccounts();
    accounts = accounts.filter(a => a.id !== id);
    this._set('wb_accounts', accounts);
    return { ok: true };
  },

  // 按科目编码查找（修复硬编码ID偏移问题）
  getAccountByCode(code) {
    return this.getAccounts().find(a => a.code === code);
  },

  // ========== 流水/凭证 ==========
  getTransactions(filters = {}) {
    let txns = this._get('wb_transactions');
    if (filters.store_id) txns = txns.filter(t => t.store_id === filters.store_id);
    if (filters.type) txns = txns.filter(t => t.type === filters.type);
    if (filters.start_date) txns = txns.filter(t => t.date >= filters.start_date);
    if (filters.end_date) txns = txns.filter(t => t.date <= filters.end_date);
    if (filters.account_id) txns = txns.filter(t => t.account_id === filters.account_id);
    if (filters.channel) txns = txns.filter(t => t.channel === filters.channel);
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      txns = txns.filter(t => (t.description || '').toLowerCase().includes(kw));
    }
    // 按科目类型过滤（修复：收入支出筛选的不准确问题）
    if (filters.account_type) {
      const accounts = this.getAccounts();
      txns = txns.filter(t => {
        const a = accounts.find(ac => ac.id === t.account_id);
        if (!a) return false;
        if (filters.account_type === 'revenue') return a.type === 'revenue';
        if (filters.account_type === 'expense') return a.type === 'cost' || a.type === 'expense';
        return true;
      });
    }
    return txns.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  },

  addTransaction(data) {
    const txns = this.getTransactions();
    const txn = {
      id: this._genId('txn'),
      date: new Date().toISOString().split('T')[0],
      ...data,
      created_at: new Date().toISOString()
    };
    txns.push(txn);
    this._set('wb_transactions', txns);

    // 自动生成会计分录（noJournal 时由调用方自行生成复式凭证，避免重复）
    if (!data.noJournal) this._autoJournalEntry(txn);
    return txn;
  },

  // ========== 复式记账辅助 ==========
  // 生成一条完整复式凭证（借 debitCode 贷 creditCode），并记录一条 UI 流水（挂 viewAccountCode）
  // 返回凭证。debitCode/creditCode 为科目编码，viewAccountCode 为记账页面展示的科目编码（可为空=不记流水）
  _postEntry(debitCode, creditCode, amount, date, description, viewAccountCode, storeId, channel) {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return null;
    const d = date || App.today();
    const accounts = this.getAccounts();
    const debitAcc = this.getAccountByCode(debitCode) || accounts.find(a => a.name.includes(debitCode));
    const creditAcc = this.getAccountByCode(creditCode) || accounts.find(a => a.name.includes(creditCode));
    if (!debitAcc || !creditAcc) {
      console.warn('复式凭证科目缺失:', debitCode, creditCode);
      return null;
    }
    // 1. UI 流水（单科目视图，供记账页面/明细账展示）
    if (viewAccountCode && viewAccountCode !== 'NONE') {
      const viewAcc = this.getAccountByCode(viewAccountCode) || debitAcc;
      this.addTransaction({
        date: d, amount: amt, account_id: viewAcc.id,
        type: viewAcc.type === 'revenue' ? 'income' : 'expense',
        channel: channel || 'other', description, store_id: storeId || App.currentStore,
        noJournal: true
      });
    }
    // 2. 复式凭证
    const entries = this.getJournalEntries();
    entries.push({
      id: this._genId('je'),
      transaction_id: 'je_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      date: d,
      description,
      entries: [
        { account_id: debitAcc.id, account_code: debitAcc.code, debit: amt, credit: 0, account_name: debitAcc.name },
        { account_id: creditAcc.id, account_code: creditAcc.code, debit: 0, credit: amt, account_name: creditAcc.name }
      ],
      created_at: new Date().toISOString()
    });
    this._set('wb_journal_entries', entries);
    return { debit: debitAcc, credit: creditAcc, amount: amt };
  },

  // 按科目编码前缀统计复式借贷余额（asset 类: 借-贷; 负债/权益类: 贷-借）
  _jeBalance(codePrefix, startDate, endDate) {
    let balance = 0;
    this.getJournalEntries({ start_date: startDate || '2000-01-01', end_date: endDate || App.today() }).forEach(je => {
      (je.entries || []).forEach(e => {
        const acc = this.getAccount(e.account_id);
        if (!acc || !acc.code || !acc.code.startsWith(codePrefix)) return;
        const isAsset = acc.type === 'asset';
        balance += isAsset ? (parseFloat(e.debit || 0) - parseFloat(e.credit || 0)) : (parseFloat(e.credit || 0) - parseFloat(e.debit || 0));
      });
    });
    return Math.round(balance * 100) / 100;
  },

  // 现金科目（1001 库存现金 + 1002 银行存款）复式余额
  _cashBalance(startDate, endDate) {
    return this._jeBalance('1001', startDate, endDate) + this._jeBalance('1002', startDate, endDate);
  },

  // 科目借方发生额合计（成本/费用类）
  _jeDebit(codePrefix, startDate, endDate) {
    let total = 0;
    this.getJournalEntries({ start_date: startDate || '2000-01-01', end_date: endDate || App.today() }).forEach(je => {
      (je.entries || []).forEach(e => {
        const acc = this.getAccount(e.account_id);
        if (acc && acc.code && acc.code.startsWith(codePrefix)) total += parseFloat(e.debit || 0);
      });
    });
    return Math.round(total * 100) / 100;
  },

  // 科目贷方发生额合计（收入类）
  _jeCredit(codePrefix, startDate, endDate) {
    let total = 0;
    this.getJournalEntries({ start_date: startDate || '2000-01-01', end_date: endDate || App.today() }).forEach(je => {
      (je.entries || []).forEach(e => {
        const acc = this.getAccount(e.account_id);
        if (acc && acc.code && acc.code.startsWith(codePrefix)) total += parseFloat(e.credit || 0);
      });
    });
    return Math.round(total * 100) / 100;
  },

  updateTransaction(id, data) {
    const txns = this.getTransactions();
    const idx = txns.findIndex(t => t.id === id);
    if (idx === -1) return null;
    txns[idx] = { ...txns[idx], ...data, updated_at: new Date().toISOString() };
    this._set('wb_transactions', txns);
    return txns[idx];
  },

  deleteTransaction(id) {
    let txns = this.getTransactions();
    txns = txns.filter(t => t.id !== id);
    this._set('wb_transactions', txns);
    // 同时删除对应的分录
    let entries = this.getJournalEntries();
    entries = entries.filter(e => e.transaction_id !== id);
    this._set('wb_journal_entries', entries);
  },

  // ========== 自动会计分录 ==========
  _autoJournalEntry(txn) {
    const entries = this.getJournalEntries();
    const account = this.getAccount(txn.account_id);
    if (!account) return;

    const entry = {
      id: this._genId('je'),
      transaction_id: txn.id,
      date: txn.date,
      description: txn.description || '',
      entries: [],
      created_at: new Date().toISOString()
    };

    if (account.type === 'revenue') {
      // 收入: 借银行存款/库存现金, 贷主营业务收入
      entry.entries = [
        { account_id: '1002', debit: parseFloat(txn.amount), credit: 0, account_name: '银行存款' },
        { account_id: txn.account_id, debit: 0, credit: parseFloat(txn.amount), account_name: account.name }
      ];
    } else if (account.type === 'cost' || account.type === 'expense') {
      // 成本/费用: 借成本/费用, 贷银行存款/库存现金
      entry.entries = [
        { account_id: txn.account_id, debit: parseFloat(txn.amount), credit: 0, account_name: account.name },
        { account_id: '1002', debit: 0, credit: parseFloat(txn.amount), account_name: '银行存款' }
      ];
    } else if (txn.type === 'transfer') {
      entry.entries = [
        { account_id: txn.from_account, debit: 0, credit: parseFloat(txn.amount), account_name: '转出账户' },
        { account_id: txn.to_account, debit: parseFloat(txn.amount), credit: 0, account_name: '转入账户' }
      ];
    }

    if (entry.entries.length > 0) {
      entries.push(entry);
      this._set('wb_journal_entries', entries);
    }
  },

  getJournalEntries(filters = {}) {
    let entries = this._get('wb_journal_entries');
    if (filters.start_date) entries = entries.filter(e => e.date >= filters.start_date);
    if (filters.end_date) entries = entries.filter(e => e.date <= filters.end_date);
    return entries.sort((a, b) => b.date.localeCompare(a.date));
  },

  // ========== 菜品库 ==========
  getMenuItems() { return this._get('wb_menu_items'); },
  addMenuItem(data) {
    const items = this.getMenuItems();
    const item = { id: this._genId('menu'), ...data, created_at: new Date().toISOString() };
    items.push(item);
    this._set('wb_menu_items', items);
    return item;
  },
  updateMenuItem(id, data) {
    const items = this.getMenuItems();
    const idx = items.findIndex(i => i.id === id);
    if (idx >= 0) { items[idx] = { ...items[idx], ...data }; this._set('wb_menu_items', items); return items[idx]; }
    return null;
  },
  deleteMenuItem(id) {
    let items = this.getMenuItems();
    items = items.filter(i => i.id !== id);
    this._set('wb_menu_items', items);
  },

  // ========== 供应商 ==========
  getSuppliers() { return this._get('wb_suppliers'); },
  addSupplier(data) {
    const suppliers = this.getSuppliers();
    const s = { id: this._genId('sup'), ...data, created_at: new Date().toISOString() };
    suppliers.push(s);
    this._set('wb_suppliers', suppliers);
    return s;
  },

  // ========== 计算函数 ==========
  // 获取某时间段的科目余额
  getAccountBalance(accountId, startDate, endDate) {
    // 兼容：传入科目编码（如 '2211'）或内部ID（如 'acc_18'）均可
    let id = accountId;
    const acc = this.getAccountByCode(accountId);
    if (acc) id = acc.id;
    const txns = this.getTransactions({
      account_id: id,
      start_date: startDate,
      end_date: endDate
    });
    return txns.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  },

  // ========== 利润表（企业会计准则标准格式，基于复式凭证）==========
  getIncomeStatement(storeId, startDate, endDate) {
    const start = startDate || '2000-01-01';
    const end = endDate || App.today();
    const credit = (p) => this._jeCredit(p, start, end);
    const debit = (p) => this._jeDebit(p, start, end);

    // 主营业务收入（5001~5005）
    const mainRevenue = credit('5001') + credit('5002') + credit('5003') + credit('5004') + credit('5005');
    const otherRevenue = credit('5051');
    const nonOpRevenue = credit('5101');

    // 营业成本（6001~6004）
    const mainCost = debit('6001') + debit('6002') + debit('6003') + debit('6004');

    // 税金及附加
    const taxSurcharge = debit('640') + debit('222');

    // 期间费用
    const sellingExp = debit('6601') + debit('6602') + debit('6603') + debit('6604');
    const adminExp = debit('6605') + debit('6606') + debit('6607') + debit('6608') + debit('6609') + debit('6610') + debit('6611') + debit('6612') + debit('6613');
    const financeExp = debit('6621');

    // 营业外支出 / 所得税
    const nonOpExpense = debit('6711');
    const incomeTax = debit('6801');

    const totalRevenue = mainRevenue + otherRevenue + nonOpRevenue;
    const grossProfit = mainRevenue - mainCost;
    const totalExpense = sellingExp + adminExp + financeExp;
    const operatingProfit = grossProfit - totalExpense - taxSurcharge;
    const totalProfit = operatingProfit + nonOpRevenue - nonOpExpense;
    const netProfit = totalProfit - incomeTax;

    // 明细 breakdown（按凭证借方归集费用、贷方归集收入）
    const cleanMap = (m) => {
      const o = {};
      Object.entries(m).forEach(([k, v]) => { if (v !== 0) o[k] = v; });
      return o;
    };
    const expenseMap = {};
    const costMap = {};
    this.getJournalEntries({ start_date: start, end_date: end }).forEach(je => {
      (je.entries || []).forEach(e => {
        const a = this.getAccount(e.account_id);
        if (!a || !a.code) return;
        if (a.code.startsWith('660')) expenseMap[a.name] = (expenseMap[a.name] || 0) + parseFloat(e.debit || 0);
        if (a.code.startsWith('600')) costMap[a.name] = (costMap[a.name] || 0) + parseFloat(e.debit || 0);
      });
    });

    return {
      // ===== 顶层聚合（供分析页等按统一字段名读取）=====
      total_revenue: totalRevenue,
      total_cost: mainCost,
      total_expense: totalExpense,
      net_profit: netProfit,
      gross_profit: grossProfit,
      gross_margin: totalRevenue > 0 ? grossProfit / totalRevenue : 0,
      net_margin: totalRevenue > 0 ? netProfit / totalRevenue : 0,
      operating_profit: operatingProfit,
      total_profit: totalProfit,

      // ===== 报表用 =====
      revenue: { main_revenue: mainRevenue, other_revenue: otherRevenue, total: totalRevenue },
      cost: mainCost,
      tax_surcharge: taxSurcharge,
      selling_expense: sellingExp,
      admin_expense: adminExp,
      finance_expense: financeExp,
      non_operating_revenue: nonOpRevenue,
      non_operating_expense: nonOpExpense,
      income_tax: incomeTax,

      // ===== 图表用明细 =====
      cost_breakdown: cleanMap(costMap),
      expense_breakdown: cleanMap(expenseMap)
    };
  },

  // ========== 资产负债表（企业会计准则标准格式）==========
  getBalanceSheet(storeId, asOfDate) {
    const accounts = this.getAccounts();
    const startDate = '2000-01-01';
    const endDate = asOfDate;

    // ===== 复式借贷余额（资产=借-贷；负债/权益=贷-借）=====
    const bal = (prefix) => this._jeBalance(prefix, startDate, endDate);

    // 流动资产
    const monetaryFunds = bal('1001') + bal('1002');                    // 货币资金
    const accountsRecv = bal('1122');                                   // 应收账款
    const prepayments = bal('1123');                                    // 预付账款
    const otherReceivables = bal('1221');                               // 其他应收款
    const inventory = bal('140');                                       // 存货（1403/1404/1405/1406）

    const currentAssets = monetaryFunds + accountsRecv + prepayments + otherReceivables + inventory;

    // 非流动资产
    const fixedAssets = bal('1601') - bal('1602');                      // 固定资产净值
    const intangible = bal('1701');
    const longDeferred = bal('1801');
    const nonCurrentAssets = fixedAssets + intangible + longDeferred;

    const totalAssets = currentAssets + nonCurrentAssets;

    // 流动负债
    const shortBorrow = bal('2001');
    const acctsPayable = bal('2201') + bal('2202');                     // 应付账款+应付-外卖平台
    const salaryPayable = bal('2211');
    const taxPayable = bal('2221');
    const otherPayable = bal('2241');
    const currentLiabilities = shortBorrow + acctsPayable + salaryPayable + taxPayable + otherPayable;

    // 非流动负债
    const longBorrow = bal('2501');
    const totalLiabilities = currentLiabilities + longBorrow;

    // 所有者权益
    const paidCapital = bal('4001');
    const capitalReserve = bal('4002');
    const surplusReserve = bal('4101');
    // 未分配利润（累计净利润，由利润表结转）
    const cumulativeIS = this.getIncomeStatement(storeId, startDate, endDate);
    const retainedEarnings = cumulativeIS.net_profit;
    const profitDist = bal('4104');
    const totalEquity = paidCapital + capitalReserve + surplusReserve + retainedEarnings + profitDist;

    return {
      // 资产
      assets: {
        current: {
          monetary_funds: monetaryFunds,
          accounts_receivable: accountsRecv,
          prepayments: prepayments,
          other_receivables: otherReceivables,
          inventory: inventory
        },
        current_total: currentAssets,
        non_current: {
          fixed_assets_net: fixedAssets,
          intangible_assets: intangible,
          long_term_deferred: longDeferred
        },
        non_current_total: nonCurrentAssets
      },
      total_assets: totalAssets,

      // 负债
      liabilities: {
        current: {
          short_term_borrowing: shortBorrow,
          accounts_payable: acctsPayable,
          salary_payable: salaryPayable,
          tax_payable: taxPayable,
          other_payable: otherPayable
        },
        current_total: currentLiabilities,
        non_current: {
          long_term_borrowing: longBorrow
        },
        non_current_total: longBorrow
      },
      total_liabilities: totalLiabilities,

      // 所有者权益
      equity: {
        paid_in_capital: paidCapital,
        capital_reserve: capitalReserve,
        surplus_reserve: surplusReserve,
        current_year_profit: retainedEarnings,
        profit_distribution: profitDist
      },
      total_equity: totalEquity
    };
  },

  // ========== 现金流量表（企业会计准则标准格式）==========
  getCashFlowStatement(storeId, startDate, endDate) {
    const start = startDate || '2000-01-01';
    const end = endDate || App.today();
    const accounts = this.getAccounts();
    const cashCodes = ['1001', '1002'];
    const isCash = (code) => code && cashCodes.some(c => code === c);

    // 期初/期末现金（复式余额）
    const closingCash = this._cashBalance('2000-01-01', end);
    const openingCash = this._cashBalance('2000-01-01', start);
    const netIncrease = closingCash - openingCash;

    // 分类统计本期现金流入/流出：按凭证对方科目归类
    let inflowSale = 0, inflowReceivable = 0, inflowOther = 0, inflowInvest = 0, inflowFinance = 0;
    let outflowPurchase = 0, outflowStaff = 0, outflowTax = 0, outflowOther = 0, outflowInvest = 0;

    this.getJournalEntries({ start_date: start, end_date: end }).forEach(je => {
      const lines = je.entries || [];
      // 找出涉及现金科目的行 + 对方行
      const cashLine = lines.find(e => isCash(this.getAccount(e.account_id)?.code));
      if (!cashLine) return;
      const otherLine = lines.find(e => e !== cashLine && this.getAccount(e.account_id));
      if (!otherLine) return;
      const otherAcc = this.getAccount(otherLine.account_id);
      const otherCode = otherAcc ? otherAcc.code : '';
      const amt = parseFloat(cashLine.debit || 0) + parseFloat(cashLine.credit || 0);

      if (parseFloat(cashLine.debit) > 0) {
        // 现金流入
        if (otherCode.startsWith('500')) inflowSale += amt;              // 销售收到现金
        else if (otherCode.startsWith('112')) inflowReceivable += amt;   // 收回货款/应收
        else if (otherCode.startsWith('160')) inflowInvest += amt;       // 处置资产（简化无）
        else if (otherCode.startsWith('400') || otherCode.startsWith('2001') || otherCode.startsWith('2501')) inflowFinance += amt; // 吸收投资/借款
        else inflowOther += amt;
      } else {
        // 现金流出
        if (otherCode.startsWith('600')) outflowPurchase += amt;         // 购买商品
        else if (otherCode.startsWith('6606') || otherCode.startsWith('6607')) outflowStaff += amt; // 支付职工
        else if (otherCode.startsWith('680') || otherCode.startsWith('222')) outflowTax += amt;     // 支付税费
        else if (otherCode.startsWith('160')) outflowInvest += amt;      // 购建固定资产
        else if (otherCode.startsWith('220') || otherCode.startsWith('2001') || otherCode.startsWith('2501')) outflowOther += amt; // 偿还应付款/借款
        else outflowOther += amt;
      }
    });

    const operatingInflow = inflowSale + inflowReceivable + inflowOther;
    const operatingOutflow = outflowPurchase + outflowStaff + outflowTax + outflowOther;
    const operatingNet = operatingInflow - operatingOutflow;
    const investNet = inflowInvest - outflowInvest;
    const financeNet = inflowFinance - 0;

    return {
      operating: {
        inflow: { sale_revenue: inflowSale, receivable: inflowReceivable, other: inflowOther },
        inflow_total: operatingInflow,
        outflow: {
          purchase: outflowPurchase,
          staff: outflowStaff,
          tax: outflowTax,
          other: outflowOther
        },
        outflow_total: operatingOutflow,
        net: operatingNet
      },
      investing: {
        inflow: { total: inflowInvest },
        inflow_total: inflowInvest,
        outflow: { fixed_assets: outflowInvest },
        outflow_total: outflowInvest,
        net: investNet
      },
      financing: {
        inflow: { capital: inflowFinance },
        inflow_total: inflowFinance,
        outflow: { debt_repayment: 0 },
        outflow_total: 0,
        net: financeNet
      },
      net_increase: netIncrease,
      opening_cash: openingCash,
      closing_cash: closingCash
    };
  },

  // ========== 初始化演示数据（完全修复：科目编码查找 + 新增负债Mock）==========
  loadDemoData() {
    this.initAccounts();
    const today = new Date();
    const txns = [];
    const byCode = (c) => { const a = this.getAccountByCode(c); return a ? a.id : null; };

    // ---- 菜品数据（25道菜）----
    const fullMenu = [
      { name: '招牌红烧肉', category: '热菜·招牌', cost: 18, price: 58, desc: '精选五花肉慢炖2小时' },
      { name: '清蒸鲈鱼', category: '热菜·招牌', cost: 22, price: 68, desc: '鲜活鲈鱼清蒸 豉油淋汁' },
      { name: '葱烧海参', category: '热菜·招牌', cost: 38, price: 128, desc: '即食海参 葱烧入味' },
      { name: '宫保鸡丁', category: '热菜·经典', cost: 12, price: 38, desc: '鸡丁花生 甜辣适口' },
      { name: '麻婆豆腐', category: '热菜·经典', cost: 5, price: 18, desc: '嫩豆腐 麻辣鲜香' },
      { name: '鱼香肉丝', category: '热菜·经典', cost: 10, price: 32, desc: '里脊肉丝 鱼香汁' },
      { name: '糖醋里脊', category: '热菜·经典', cost: 13, price: 42, desc: '外酥里嫩 糖醋汁' },
      { name: '干锅花菜', category: '热菜·经典', cost: 7, price: 28, desc: '有机花菜 五花肉片' },
      { name: '蒜蓉粉丝蒸虾', category: '热菜·海鲜', cost: 25, price: 78, desc: '鲜虾开背 蒜蓉粉丝' },
      { name: '椒盐皮皮虾', category: '热菜·海鲜', cost: 30, price: 88, desc: '鲜活皮皮虾 椒盐炒制' },
      { name: '白灼菜心', category: '素菜', cost: 4, price: 16, desc: '广东菜心 白灼淋油' },
      { name: '蒜蓉西兰花', category: '素菜', cost: 6, price: 22, desc: '新鲜西兰花 蒜蓉清炒' },
      { name: '酸辣土豆丝', category: '素菜', cost: 4, price: 16, desc: '爽脆土豆丝 酸辣口味' },
      { name: '凉拌黄瓜', category: '凉菜', cost: 3, price: 12, desc: '拍黄瓜 蒜泥醋汁' },
      { name: '口水鸡', category: '凉菜', cost: 8, price: 28, desc: '鸡腿肉 红油麻辣汁' },
      { name: '五香牛肉', category: '凉菜', cost: 15, price: 45, desc: '酱牛肉 五香入味' },
      { name: '蛋炒饭', category: '主食', cost: 4, price: 15, desc: '米饭 鸡蛋 葱花' },
      { name: '手工水饺(12个)', category: '主食', cost: 6, price: 22, desc: '现包猪肉白菜馅' },
      { name: '葱油拌面', category: '主食', cost: 4, price: 16, desc: '面条 葱油 酱油' },
      { name: '酸辣粉', category: '主食', cost: 5, price: 18, desc: '红薯粉 酸辣汤底' },
      { name: '肥牛米线', category: '主食', cost: 10, price: 32, desc: '米线 肥牛 酸菜' },
      { name: '杨枝甘露', category: '甜品·饮品', cost: 6, price: 22, desc: '芒果 西柚 椰奶' },
      { name: '红豆双皮奶', category: '甜品·饮品', cost: 5, price: 18, desc: '双皮奶 红豆 炼乳' },
      { name: '可乐', category: '甜品·饮品', cost: 2.5, price: 8, desc: '可口可乐 冰镇' },
      { name: '酸梅汤', category: '甜品·饮品', cost: 3, price: 10, desc: '手工熬制 冰镇酸梅汤' },
    ];
    localStorage.setItem('wb_menu_items', JSON.stringify(fullMenu.map((m, i) => ({
      id: `menu_${i + 1}`, ...m, store_id: 'store_1', created_at: new Date().toISOString()
    }))));

    // ---- 供应商数据 ----
    const suppliers = [
      { name: '鑫源食材批发', contact: '张经理', phone: '138****5566', category: '蔬菜肉类' },
      { name: '海发水产', contact: '李老板', phone: '139****7788', category: '海鲜水产' },
      { name: '川味调料行', contact: '王姐', phone: '137****9900', category: '调味品' },
      { name: '冰源冻品', contact: '刘总', phone: '136****3322', category: '冻品' },
      { name: '鲜果时光', contact: '陈老板', phone: '135****1144', category: '水果饮品' },
      { name: '阳光油粮', contact: '马经理', phone: '134****5566', category: '粮油' },
      { name: '洁星餐具消毒', contact: '周主管', phone: '133****7788', category: '耗材' },
    ];
    localStorage.setItem('wb_suppliers', JSON.stringify(suppliers.map((s, i) => ({
      id: `sup_${i + 1}`, ...s, created_at: new Date().toISOString()
    }))));

    // ========== 期初余额（用科目编码查找）==========
    const A = (code) => byCode(code);
    function add(date, code, type, amount, desc, ch) {
      txns.push({ id: DB._genId('txn'), date, account_id: A(code), type, amount, channel: ch || 'other',
        description: desc, store_id: 'store_1', created_at: date });
    }
    // 现金过账：每笔经营收支同步影响银行存款（1002），维持会计等式 A = L + E
    // 注意：本系统单笔录账无借贷符号，现金流入记正、流出记负（减少银行存款）
    function addCash(date, amount, isIn, desc) {
      add(date, '1002', isIn ? 'income' : 'expense', isIn ? amount : -amount, desc);
    }

    // 期初：资产合计 = 负债 + 权益 必须平衡（净资产 136万）
    add('2026-05-01', '1002', 'income', 500000, '期初银行存款');
    add('2026-05-01', '1001', 'income', 20000, '期初库存现金');
    add('2026-05-01', '1601', 'income', 800000, '固定资产原值-厨房设备/桌椅');
    add('2026-05-01', '1602', 'expense', 80000, '累计折旧（期初3年累计）');
    add('2026-05-01', '1801', 'income', 120000, '装修长期待摊（期初）');
    add('2026-05-01', '4001', 'expense', 1360000, '实收资本（股东投资）'); // = 资产合计 136万

    // ========== 90天每日经营数据 ==========
    for (let i = 90; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const isTue = d.getDay() === 2;
      const factor = (0.9 + (i / 90) * 0.2) * (isWeekend ? 1.3 : 1.0) * (isTue ? 1.15 : 1.0) * (0.85 + Math.random() * 0.3);

      const dineIn = Math.round(3500 * factor);
      const delivery = Math.round(1200 * factor);
      const takeout = Math.round(500 * factor);
      const coupon = Math.round(300 * factor * (isWeekend ? 1.5 : 1));
      const storedVal = Math.round(200 * factor * (isWeekend ? 0.7 : 1.2));
      const totalInc = dineIn + delivery + takeout + coupon + storedVal;

      // 收入（按科目编码查）+ 同步过账现金
      add(ds, '5001', 'income', dineIn, '堂食收入', 'dine-in'); addCash(ds, dineIn, true, '现金-堂食收入');
      add(ds, '5002', 'income', delivery, '外卖收入-美团/饿了么', 'delivery'); addCash(ds, delivery, true, '现金-外卖收入');
      add(ds, '5003', 'income', takeout, '到店自提-小程序', 'takeout'); addCash(ds, takeout, true, '现金-自提收入');
      if (isWeekend || Math.random() > 0.6) { const c = coupon; add(ds, '5004', 'income', c, '团购核销-抖音/美团券'); addCash(ds, c, true, '现金-团购核销'); }
      if (Math.random() > 0.7) { const s = storedVal; add(ds, '5005', 'income', s, '会员储值充值'); addCash(ds, s, true, '现金-会员储值'); }

      // 食材成本（6001）+ 酒水（6002）+ 外卖佣金（6601）均为现金支出
      const foodCost = Math.round(totalInc * (0.34 + Math.random() * 0.08));
      const drinkCost = Math.round(totalInc * (0.03 + Math.random() * 0.02));
      const commission = Math.round(delivery * (0.15 + Math.random() * 0.05));
      add(ds, '6001', 'expense', foodCost, '食材采购', '食材成本'); addCash(ds, foodCost, false, '现金-食材采购');
      add(ds, '6002', 'expense', drinkCost, '酒水采购', '食材成本'); addCash(ds, drinkCost, false, '现金-酒水采购');
      add(ds, '6601', 'expense', commission, '平台佣金', '平台佣金'); addCash(ds, commission, false, '现金-平台佣金');
    }

    // ========== 固定月结费用（按科目编码）==========
    for (let m = -2; m <= 0; m++) {
      const base = new Date(today.getFullYear(), today.getMonth() + m, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + m + 1, 0);
      const mn = base.getMonth() + 1;

      // 房租 第1日（现金）
      if (base <= today) { const amt = 12000 + Math.round(Math.random() * 500); add(base.toISOString().split('T')[0], '6605', 'expense', amt, `房租-${mn}月`); addCash(base.toISOString().split('T')[0], amt, false, `现金-房租-${mn}月`); }
      // 当月工资金额（统一口径，保证"计提"与"发放"金额一致）
      const salaryAmount = 35000 + Math.round(Math.random() * 3000);
      const socialAmount = 8500 + Math.round(Math.random() * 500);
      const payrollTotal = salaryAmount + socialAmount;

      // 水电 第20日（现金）
      const utD = new Date(today.getFullYear(), today.getMonth() + m, 20);
      if (utD <= today) { const season = ([5,6,7,8].includes(today.getMonth())) ? 1.3 : 1.0; const amt = Math.round((2800 + Math.random() * 1200) * season); add(utD.toISOString().split('T')[0], '6608', 'expense', amt, `水电燃气费-${mn}月`); addCash(utD.toISOString().split('T')[0], amt, false, `现金-水电-${mn}月`); }
      // 营销推广 第8日（现金）
      const pmD = new Date(today.getFullYear(), today.getMonth() + m, 8);
      if (pmD <= today) { const amt = Math.round(2000 + Math.random() * 2000); add(pmD.toISOString().split('T')[0], '6604', 'expense', amt, `抖音推广费-${mn}月`); addCash(pmD.toISOString().split('T')[0], amt, false, `现金-推广-${mn}月`); }
      // 折旧 月底（非现金：费用入账 + 累计折旧增加）
      if (monthEnd <= today) { add(monthEnd.toISOString().split('T')[0], '6609', 'expense', 22222, `折旧费用-${mn}月`); add(monthEnd.toISOString().split('T')[0], '1602', 'expense', 22222, `累计折旧-${mn}月`); }

      // ====== 应付职工薪酬：月末计提（费用+负债），次月末发放（负债冲减+现金）======
      if (monthEnd <= today) {
        const me = monthEnd.toISOString().split('T')[0];
        // 计提：借 管理费用-工资/社保（费用），贷 应付职工薪酬（负债）
        add(me, '6606', 'expense', salaryAmount, `计提工资-${mn}月`, '人工成本');
        add(me, '6607', 'expense', socialAmount, `计提社保公积金-${mn}月`, '人工成本');
        add(me, '2211', 'income', payrollTotal, `计提应付职工薪酬-${mn}月（工资${App.fmtMoneyShort ? App.fmtMoneyShort(salaryAmount) : salaryAmount}+社保${App.fmtMoneyShort ? App.fmtMoneyShort(socialAmount) : socialAmount}）`);

        // 次月末实际发放：借 应付职工薪酬（负债冲减），贷 银行存款（现金流出）
        const payDate = new Date(today.getFullYear(), today.getMonth() + m + 2, 0); // 次月最后一天
        if (payDate <= today) {
          add(payDate.toISOString().split('T')[0], '2211', 'income', -payrollTotal, `发放职工薪酬-${mn}月（冲减应付）`);
          addCash(payDate.toISOString().split('T')[0], payrollTotal, false, `现金-发放职工薪酬-${mn}月`);
        }
      }

      // ====== 每月计提应交税费（所得税，按小微企业优惠税率；暂未缴纳，体现应交余额）======
      if (monthEnd <= today) {
        const me = monthEnd.toISOString().split('T')[0];
        const estProfit = 25000 + Math.random() * 30000;
        const taxRate = estProfit * 12 < 1000000 ? 0.025 : 0.05; // 年利润<100万按2.5%
        const estTax = Math.round(estProfit * taxRate);
        add(me, '6801', 'expense', estTax, `计提企业所得税-${mn}月`);
        add(me, '2221', 'income', estTax, `应交企业所得税-${mn}月`);
      }
    }

    // ========== 不定期费用 ==========
    // 维修费（code 6611）
    for (let i = 90; i >= 0; i -= Math.floor(10 + Math.random() * 8)) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      if (d > today) continue;
      const ds = d.toISOString().split('T')[0];
      const items = ['油烟机清洗','冰箱维修','空调检修','下水道疏通','换灯泡','灶具维修'];
      const ramt = Math.round(200 + Math.random() * 800);
      add(ds, '6611', 'expense', ramt, `维修费-${items[Math.floor(Math.random() * items.length)]}`); addCash(ds, ramt, false, `现金-维修-${ds}`);
    }
    // 办公费（code 6610）
    for (let m = -2; m <= 0; m++) {
      const d = new Date(today.getFullYear(), today.getMonth() + m, Math.floor(5 + Math.random() * 20));
      if (d > today) continue;
      const oamt = Math.round(100 + Math.random() * 400);
      add(d.toISOString().split('T')[0], '6610', 'expense', oamt, '办公用品'); addCash(d.toISOString().split('T')[0], oamt, false, `现金-办公-${d.toISOString().split('T')[0]}`);
    }
    // 包装耗材（code 6004）
    for (let i = 90; i >= 0; i -= 7) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      if (d > today) continue;
      const pmat = Math.round(150 + Math.random() * 200);
      add(d.toISOString().split('T')[0], '6004', 'expense', pmat, '外卖包装耗材', '包装成本'); addCash(d.toISOString().split('T')[0], pmat, false, `现金-包装-${d.toISOString().split('T')[0]}`);
    }

    // ---- 一次性大额支出 ----
    const fridgeD = new Date(today); fridgeD.setDate(fridgeD.getDate() - 75);
    add(fridgeD.toISOString().split('T')[0], '6611', 'expense', 6800, '冰柜采购-不锈钢冷柜'); addCash(fridgeD.toISOString().split('T')[0], 6800, false, '现金-冰柜采购');

    // ---- 清理重复ID ----
    const seen = new Map();
    txns.forEach(t => { if (seen.has(t.id)) t.id = this._genId('txn'); seen.set(t.id, true); });

    localStorage.setItem('wb_transactions', JSON.stringify(txns));
    localStorage.setItem('wb_journal_entries', JSON.stringify([{
      id: 'je_demo', transaction_id: 'demo_batch',
      date: today.toISOString().split('T')[0],
      description: '演示数据批量会计分录',
      entries: [{ account_id: '1002', debit: 0, credit: 0, account_name: '汇总' }],
      created_at: today.toISOString()
    }]));

    return txns.length;
  },

  // ========== 税务设置 ==========
  TAX_SETTINGS_KEY: 'wb_tax_settings',

  getTaxSettings() {
    try {
      const raw = localStorage.getItem(this.TAX_SETTINGS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    // 默认值（小规模纳税人）
    return {
      taxpayerType: 'small', // 'small' | 'general'
      vatRate: 0.01,         // 增值税征收率
      vatSurchargeRate: 0.12, // 附加税费率（城建+教附+地教）
      urbanRate: 0.07,       // 城建税率
      eduRate: 0.03,         // 教育费附加率
      localEduRate: 0.02,    // 地方教育附加率
      citRateSmall: 0.025,   // 小微企业优惠税率（利润≤100万）
      citRateMid: 0.05,      // 小微企业优惠税率（100万<利润≤300万）
      citRateStd: 0.25,      // 标准税率
      stampRate: 0.0003,     // 印花税率
      smallProfitThreshold: 1000000,  // 小微企业利润阈值
      midProfitThreshold: 3000000     // 中型企业利润阈值
    };
  },

  saveTaxSettings(settings) {
    const current = this.getTaxSettings();
    Object.assign(current, settings);
    localStorage.setItem(this.TAX_SETTINGS_KEY, JSON.stringify(current));
    return current;
  },

  // ========== 资金账户管理 ==========
  FUND_ACCOUNTS_KEY: 'wb_fund_accounts',

  getFundAccounts() {
    try {
      const raw = localStorage.getItem(this.FUND_ACCOUNTS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    // 默认两个账户
    return [
      { id: 'fund_default_main', name: '银行主账户', type: 'bank', accountNo: '****', openingBalance: 0, isDefault: true },
      { id: 'fund_default_cash', name: '库存现金', type: 'cash', accountNo: '', openingBalance: 0, isDefault: true }
    ];
  },

  saveFundAccount(account) {
    const list = this.getFundAccounts();
    const idx = list.findIndex(a => a.id === account.id);
    if (idx >= 0) list[idx] = account;
    else list.push(account);
    localStorage.setItem(this.FUND_ACCOUNTS_KEY, JSON.stringify(list));
    return list;
  },

  deleteFundAccount(id) {
    let list = this.getFundAccounts();
    list = list.filter(a => a.id !== id);
    localStorage.setItem(this.FUND_ACCOUNTS_KEY, JSON.stringify(list));
    return list;
  },

  getFundAccountBalance(id, startDate, endDate) {
    const txns = this.getTransactions({ store_id: App.currentStore, start_date: startDate || '2000-01-01', end_date: endDate || App.today() });
    const account = this.getFundAccounts().find(a => a.id === id);
    let balance = account ? account.openingBalance : 0;
    txns.forEach(t => {
      if (t.fund_account_id === id) {
        const acc = this.getAccounts().find(a => a.id === t.account_id);
        if (acc) {
          if (acc.type === 'revenue') balance += parseFloat(t.amount || 0);
          else if (acc.type === 'cost' || acc.type === 'expense') balance -= parseFloat(t.amount || 0);
          else if (acc.type === 'asset') { /* 资产类科目根据 direction 判断 */ }
        }
      }
    });
    return balance;
  },

  // ========== 银行流水导入（CSV） ==========
  parseBankCSV(csvText) {
    const lines = csvText.split(/[\n\r]+/).filter(l => l.trim());
    if (lines.length < 2) return [];
    // 自动检测分隔符
    const delim = csvText.includes('\t') ? '\t' : ',';  
    const headers = lines[0].split(delim).map(h => h.trim().replace(/^"|"$/g, ''));
    const results = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delim).map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 3) continue;
      const row = {};
      headers.forEach((h, idx) => { row[h] = cols[idx] || ''; });
      results.push(row);
    }
    return { headers, rows: results };
  },

  // ========== 外卖平台结算单解析 ==========
  parseSettlementCSV(csvText, platform) {
    const lines = csvText.split(/[\n\r]+/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const delim = csvText.includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delim).map(h => h.trim().replace(/^"|"$/g, ''));
    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delim).map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 3) continue;
      const row = {};
      headers.forEach((h, idx) => { row[h] = cols[idx] || ''; });
      parsed.push(row);
    }
    // 尝试自动识别常见字段
    const keys = Object.keys(parsed[0] || {});
    const guessField = (patterns) => {
      for (const p of patterns) {
        const found = keys.find(k => k.toLowerCase().includes(p.toLowerCase()));
        if (found) return found;
      }
      return null;
    };
    const dateField = guessField(['日期', 'time', 'date', '结算', '订单']);
    const amountField = guessField(['金额', '实收', '实际', '收入', 'total', 'amount']);
    const orderField = guessField(['订单', 'order', '流水号', '编号']);
    const feeField = guessField(['佣金', '服务费', 'fee', 'commission', '平台费']);
    const deliveryField = guessField(['配送', 'delivery', '物流']);
    const subsidyField = guessField(['补贴', '活动', 'subsidy', 'promotion', '优惠']);
    return { headers, rows: parsed, fields: { date: dateField, amount: amountField, orderNo: orderField, commission: feeField, delivery: deliveryField, subsidy: subsidyField } };
  },

  // ========== 应收应付 ==========
  getReceivables() { return this._get('wb_receivables'); },
  addReceivable(data) {
    const list = this.getReceivables();
    const item = { id: this._genId('rec'), ...data, status: data.status || '未收', created_at: new Date().toISOString() };
    list.push(item);
    this._set('wb_receivables', list);
    // 同步复式记账：确认应收 → 借:应收账款 贷:主营业务收入（报表口径）
    if (data.post !== false) {
      const incomeCode = data.type === '外卖' ? '5002' : '5001';
      const ch = data.type === '外卖' ? 'delivery' : (data.type === '团购' ? 'delivery' : 'other');
      this._postEntry('1122', incomeCode, parseFloat(data.amount) || 0, data.date || App.today(),
        `应收-${data.party || ''}（${data.type || ''}）`, '1122', data.store_id, ch);
    }
    return item;
  },
  updateReceivable(id, data) {
    const list = this.getReceivables();
    const idx = list.findIndex(i => i.id === id);
    if (idx >= 0) { list[idx] = { ...list[idx], ...data }; this._set('wb_receivables', list); }
  },
  deleteReceivable(id) {
    this._set('wb_receivables', this.getReceivables().filter(i => i.id !== id));
  },
  getPayables() { return this._get('wb_payables'); },
  addPayable(data) {
    const list = this.getPayables();
    const item = { id: this._genId('pay'), ...data, status: data.status || '未付', created_at: new Date().toISOString() };
    list.push(item);
    this._set('wb_payables', list);
    // 同步复式记账：确认应付 → 借:原材料/费用 贷:应付账款（debitCode 指定借方科目，默认原材料）
    if (data.post !== false) {
      const debitCode = data.debitCode || '1403';
      this._postEntry(debitCode, '2201', parseFloat(data.amount) || 0, data.date || App.today(),
        `应付-${data.party || ''}（${data.type || ''}）`, '2201', data.store_id);
    }
    return item;
  },
  updatePayable(id, data) {
    const list = this.getPayables();
    const idx = list.findIndex(i => i.id === id);
    if (idx >= 0) { list[idx] = { ...list[idx], ...data }; this._set('wb_payables', list); }
  },
  deletePayable(id) {
    this._set('wb_payables', this.getPayables().filter(i => i.id !== id));
  },
  // 账龄分组: 返回 {current, d30, d60, d90}
  aging(list, field = 'due_date') {
    const today = new Date();
    const res = { current: [], d30: [], d60: [], d90: [] };
    (list || []).forEach(i => {
      if (i.status === '已收' || i.status === '已付') return;
      const due = new Date(i[field] || i.date);
      const days = Math.floor((today - due) / 86400000);
      if (days <= 0) res.current.push(i);
      else if (days <= 30) res.d30.push(i);
      else if (days <= 60) res.d60.push(i);
      else if (days <= 90) res.d90.push(i);
      else res.d90.push(i);
    });
    return res;
  },

  // ========== 食材进销存 ==========
  getInventory() { return this._get('wb_inventory'); },
  addInventory(data) {
    const list = this.getInventory();
    const item = { id: this._genId('inv'), ...data, qty: data.qty || 0, created_at: new Date().toISOString() };
    list.push(item);
    this._set('wb_inventory', list);
    return item;
  },
  updateInventory(id, data) {
    const list = this.getInventory();
    const idx = list.findIndex(i => i.id === id);
    if (idx >= 0) { list[idx] = { ...list[idx], ...data }; this._set('wb_inventory', list); }
  },
  deleteInventory(id) {
    this._set('wb_inventory', this.getInventory().filter(i => i.id !== id));
  },
  getStockMovements() { return this._get('wb_stock_movements'); },
  // 库存变动：type = 入库/出库/领用/盘点, qty>0 为增加(入库), 负数或按方向判断
  addStockMovement(data) {
    const list = this.getStockMovements();
    const item = { id: this._genId('stk'), ...data, created_at: new Date().toISOString() };
    list.push(item);
    this._set('wb_stock_movements', list);
    // 更新库存数量
    const inv = this.getInventory().find(i => i.id === data.inventory_id);
    if (inv) {
      const delta = data.type === '入库' ? data.qty : -Math.abs(data.qty);
      let newQty = Math.max(0, (parseFloat(inv.qty) || 0) + delta);
      // 入库时更新加权平均成本
      let newCost = inv.avg_cost || 0;
      if (data.type === '入库' && data.unit_cost) {
        const oldQty = parseFloat(inv.qty) || 0;
        const total = oldQty * (inv.avg_cost || 0) + data.qty * data.unit_cost;
        newCost = (oldQty + data.qty) > 0 ? total / (oldQty + data.qty) : newCost;
      }
      this.updateInventory(data.inventory_id, { qty: newQty, avg_cost: data.type === '入库' ? Math.round(newCost * 10000) / 10000 : inv.avg_cost });
    }
    return item;
  },

  // ========== 供应链采购 ==========
  getPurchaseOrders() { return this._get('wb_purchase_orders'); },
  addPurchaseOrder(data) {
    const list = this.getPurchaseOrders();
    const item = { id: this._genId('po'), ...data, status: data.status || '待收货', created_at: new Date().toISOString() };
    list.push(item);
    this._set('wb_purchase_orders', list);
    return item;
  },
  updatePurchaseOrder(id, data) {
    const list = this.getPurchaseOrders();
    const idx = list.findIndex(i => i.id === id);
    if (idx >= 0) { list[idx] = { ...list[idx], ...data }; this._set('wb_purchase_orders', list); }
  },
  deletePurchaseOrder(id) {
    this._set('wb_purchase_orders', this.getPurchaseOrders().filter(i => i.id !== id));
  },
  getPurchaseItems() { return this._get('wb_purchase_items'); },
  addPurchaseItem(data) {
    const list = this.getPurchaseItems();
    const item = { id: this._genId('pit'), ...data };
    list.push(item);
    this._set('wb_purchase_items', list);
    return item;
  },
  deletePurchaseItemsByOrder(orderId) {
    this._set('wb_purchase_items', this.getPurchaseItems().filter(i => i.order_id !== orderId));
  },

  // ========== 采购入库：联动库存 + 自动挂应付 ==========
  receivePurchaseOrder(orderId, date) {
    const order = this.getPurchaseOrders().find(o => o.id === orderId);
    if (!order) return { ok: false, msg: '订单不存在' };
    const items = this.getPurchaseItems().filter(i => i.order_id === orderId);
    const d = date || App.today();

    // 1. 逐项入库
    items.forEach(it => {
      let inv = this.getInventory().find(i => i.id === it.inventory_id);
      if (!inv) {
        inv = this.addInventory({ name: it.material_name, category: it.category || '食材', unit: it.unit || '份', qty: 0, avg_cost: 0, safe_qty: 0 });
      }
      this.addStockMovement({ inventory_id: inv.id, type: '入库', qty: it.qty, unit_cost: it.unit_price, date: d, ref_order_id: orderId, note: `采购入库-${order.supplier_name || ''}` });
    });

    // 2. 自动挂应付账款（post:false，双分录凭证由下面 _postEntry 统一生成）
    const pay = this.addPayable({
      supplier_id: order.supplier_id, party: order.supplier_name,
      type: '货款', amount: order.total_amount, date: d,
      due_date: order.pay_due_date || d, paid: 0, status: '未付',
      ref_order_id: orderId, note: `采购订单 ${order.id.slice(-6)}`,
      post: false
    });

    // 3. 复式记账：借:原材料 贷:应付账款（存货增加 + 负债增加）
    this._postEntry('1403', '2201', order.total_amount, d, `采购入库-${order.supplier_name}`, '1403');

    // 4. 更新订单状态
    this.updatePurchaseOrder(orderId, { status: '已入库' });
    return { ok: true, items: items.length, total: order.total_amount, payable_id: pay.id };
  },

  // ========== 应付付款：核销 + 自动记账 ==========
  payPayable(payableId, amount, fundAccountId, date) {
    const payable = this.getPayables().find(p => p.id === payableId);
    if (!payable) return { ok: false, msg: '应付记录不存在' };
    const pay = parseFloat(amount) || 0;
    const newPaid = (parseFloat(payable.paid) || 0) + pay;
    const status = newPaid >= (parseFloat(payable.amount) || 0) - 0.001 ? '已付' : '部分';
    this.updatePayable(payableId, { paid: newPaid, status });
    const d = date || App.today();

    // 复式记账：借:应付账款 贷:银行存款（负债减少 + 现金减少）
    this._postEntry('2201', '1002', pay, d, `付款核销-${payable.party}`, '2201');
    return { ok: true, status };
  },

  // ========== 收款核销 ==========
  collectReceivable(receivableId, amount, fundAccountId, date) {
    const rec = this.getReceivables().find(r => r.id === receivableId);
    if (!rec) return { ok: false, msg: '应收记录不存在' };
    const pay = parseFloat(amount) || 0;
    const newPaid = (parseFloat(rec.paid) || 0) + pay;
    const status = newPaid >= (parseFloat(rec.amount) || 0) - 0.001 ? '已收' : '部分';
    const d = date || App.today();
    this.updateReceivable(receivableId, { paid: newPaid, status });

    // 复式记账：借:银行存款 贷:应收账款（现金增加 + 应收减少）
    this._postEntry('1002', '1122', pay, d, `收款核销-${rec.party}`, '1122');
    return { ok: true, status };
  },

  // ========== 业务演示数据（联动 mock） ==========
  mockBusinessData() {
    const d0 = new Date();
    const dateOff = (days) => { const t = new Date(d0); t.setDate(t.getDate() - days); return t.toISOString().split('T')[0]; };

    // 0. 清空业务数据（保留科目/菜品/供应商）
    ['wb_transactions', 'wb_journal_entries', 'wb_inventory', 'wb_stock_movements',
     'wb_purchase_orders', 'wb_purchase_items', 'wb_receivables', 'wb_payables',
     'wb_fund_accounts', 'wb_menu_items', 'wb_suppliers'].forEach(k => localStorage.removeItem(k));
    localStorage.setItem('wb_fund_accounts', JSON.stringify([
      { id: 'fund_main', name: '银行主账户', type: 'bank', accountNo: '8888', openingBalance: 120000, isDefault: true },
      { id: 'fund_cash', name: '收银备用金', type: 'cash', accountNo: '', openingBalance: 5000, isDefault: false },
      { id: 'fund_wechat', name: '微信收款', type: 'wechat', accountNo: '', openingBalance: 8000, isDefault: false }
    ]));

    // 1. 食材档案（30 种）
    const materials = [
      { n: '五花肉', c: '食材', u: 'kg', p: 26 }, { n: '猪里脊', c: '食材', u: 'kg', p: 30 },
      { n: '鸡胸肉', c: '食材', u: 'kg', p: 18 }, { n: '鲜虾仁', c: '食材', u: 'kg', p: 55 },
      { n: '鲈鱼', c: '食材', u: 'kg', p: 32 }, { n: '鸡蛋', c: '食材', u: '板', p: 24 },
      { n: '有机西兰花', c: '食材', u: 'kg', p: 12 }, { n: '白玉水果黄瓜', c: '食材', u: 'kg', p: 10 },
      { n: '美人椒', c: '食材', u: 'kg', p: 8 }, { n: '小米椒', c: '食材', u: 'kg', p: 15 },
      { n: '泰国进口山竹', c: '食材', u: 'kg', p: 38 }, { n: '西州蜜瓜', c: '食材', u: 'kg', p: 9 },
      { n: '鲜雷笋', c: '食材', u: 'kg', p: 16 }, { n: '哈尔滨清爽啤酒', c: '酒水', u: '瓶', p: 4 },
      { n: '优赐猪梅岭', c: '食材', u: 'kg', p: 28 }, { n: '有机散养黑风土鸡', c: '食材', u: 'kg', p: 45 },
      { n: '湘佳麻鸭', c: '食材', u: 'kg', p: 24 }, { n: '五常大米', c: '食材', u: '袋', p: 58 },
      { n: '金龙鱼调和油', c: '调料', u: '桶', p: 65 }, { n: '海天生抽', c: '调料', u: '瓶', p: 12 },
      { n: '料酒', c: '调料', u: '瓶', p: 8 }, { n: '白胡椒粉', c: '调料', u: '罐', p: 15 },
      { n: '一次性餐盒', c: '包装', u: '个', p: 0.8 }, { n: '一次性筷子', c: '包装', u: '包', p: 5 },
      { n: '打包袋', c: '包装', u: '卷', p: 6 }, { n: '淀粉', c: '调料', u: 'kg', p: 7 },
      { n: '老抽', c: '调料', u: '瓶', p: 10 }, { n: '白糖', c: '调料', u: 'kg', p: 6 },
      { n: '葱姜蒜', c: '食材', u: 'kg', p: 9 }, { n: '豆腐', c: '食材', u: 'kg', p: 5 }
    ];
    const invIds = {};
    materials.forEach((m, i) => {
      const inv = this.addInventory({ name: m.n, category: m.c, unit: m.u, qty: 0, avg_cost: m.p, safe_qty: i % 4 === 0 ? 10 : 5, expiry_date: dateOff(-(10 + i * 3)) });
      invIds[m.n] = inv.id;
    });

    // 2. 供应商（8 家）
    const suppliers = [
      { name: '鲜丰食材批发', contact: '王老板', phone: '138****1122', address: '城南农贸市场A区12号', pay_type: '月结' },
      { name: '绿源生鲜配送', contact: '李经理', phone: '139****3344', address: '城东冷库3号库', pay_type: '账期' },
      { name: '鑫鑫粮油', contact: '张姐', phone: '137****5566', address: '粮油批发城B2', pay_type: '现结' },
      { name: '海味水产', contact: '陈总', phone: '136****7788', address: '城西水产市场', pay_type: '月结' },
      { name: '鲜果汇', contact: '刘老板', phone: '135****9900', address: '水果批发市场C5', pay_type: '现结' },
      { name: '恒通包装材料', contact: '赵工', phone: '134****2233', address: '工业园8栋', pay_type: '月结' },
      { name: '酒水直供站', contact: '孙总', phone: '133****4455', address: '酒水批发城D1', pay_type: '现结' },
      { name: '调味品大全', contact: '周老板', phone: '132****6677', address: '调味品市场E3', pay_type: '月结' }
    ];
    const supIds = {};
    suppliers.forEach(s => { const sp = this.addSupplier(s); supIds[sp.name] = sp.id; });

    // 2.5 期初实收资本（资产负债表权益基础）
    this._postEntry('1002', '4001', 300000, dateOff(95), '期初实收资本', '1002');
    // 期初固定资产（简化：冰箱/桌椅等）
    this._postEntry('1601', '1002', 80000, dateOff(94), '期初固定资产-厨房设备', '1601');
    this._postEntry('1002', '4001', 20000, dateOff(93), '期初资本公积', '1002');

    // 3. 采购订单 20 单（近 100 天），每单 2-4 项 → 全部入库（总额约 13 万，覆盖 90 天领用）
    const poDefs = [];
    const supNames = suppliers.map(s => s.name);
    for (let i = 0; i < 20; i++) {
      const days = Math.floor(i * 5 + (i % 3));
      const sup = supNames[i % supNames.length];
      const itemCount = 2 + (i % 3);
      const items = [];
      for (let j = 0; j < itemCount; j++) {
        const mat = materials[(i * 2 + j * 3) % materials.length];
        const qty = +(40 + (i % 4) * 25 + j * 18).toFixed(1);   // 采购量（kg/瓶），20单合计约 12 万，覆盖 90 天领用
        items.push({ inv: mat.n, qty, price: mat.p + (i % 3) });
      }
      poDefs.push({ sup, days, items });
    }
    let receivedCount = 0;
    poDefs.forEach((def, idx) => {
      const order = this.addPurchaseOrder({
        supplier_id: supIds[def.sup], supplier_name: def.sup,
        order_date: dateOff(def.days), pay_due_date: dateOff(Math.max(0, def.days - 15)),
        total_amount: 0, status: '待收货'
      });
      let total = 0;
      def.items.forEach(it => {
        const amt = +(it.qty * it.price).toFixed(2);
        total += amt;
        this.addPurchaseItem({ order_id: order.id, inventory_id: invIds[it.inv], material_name: it.inv, unit: materials.find(m => m.n === it.inv).u, qty: it.qty, unit_price: it.price, amount: amt });
      });
      this.updatePurchaseOrder(order.id, { total_amount: +total.toFixed(2) });
      // 全部已入库（入库日期=下单后2天）
      const res = this.receivePurchaseOrder(order.id, dateOff(Math.max(0, def.days - 2)));
      if (res.ok) receivedCount++;
      // 60% 的订单已全额付款，20% 部分付款，20% 未付
      const payable = this.getPayables().find(p => p.ref_order_id === order.id);
      if (payable) {
        const payKind = idx % 5;
        if (payKind < 3) this.payPayable(payable.id, payable.amount, 'fund_main', dateOff(Math.max(0, def.days - 5)));
        else if (payKind === 3) this.payPayable(payable.id, +(payable.amount * 0.5).toFixed(2), 'fund_main', dateOff(Math.max(0, def.days - 8)));
      }
    });

    // 4. 应收（外卖结算 12 + 团购 6 + 储值 5 + 赊账 4 = 27 条）→ 确认应收即确认收入（借应收 贷收入）
    const recDefs = [];
    const platformNames = ['美团', '饿了么', '淘宝闪购'];
    for (let i = 0; i < 12; i++) {
      recDefs.push({ party: platformNames[i % 3], type: '外卖', amount: +(3200 + i * 620).toFixed(2), days: i * 7, due: i * 5 });
    }
    for (let i = 0; i < 6; i++) {
      recDefs.push({ party: '大众点评', type: '团购', amount: +(800 + i * 210).toFixed(2), days: i * 9 + 3, due: i * 7 });
    }
    for (let i = 0; i < 5; i++) {
      recDefs.push({ party: '会员储值-' + (i + 1), type: '储值', amount: +(500 + i * 300).toFixed(2), days: i * 11 + 5, due: i * 9 });
    }
    ['李记公司', '王总朋友', '张老板', '陈经理'].forEach((p, i) => {
      recDefs.push({ party: p, type: '赊账', amount: +(1200 + i * 450).toFixed(2), days: i * 14 + 7, due: i * 12 });
    });
    recDefs.forEach((def, idx) => {
      const rec = this.addReceivable({
        party: def.party, type: def.type, amount: def.amount, paid: 0,
        date: dateOff(def.days), due_date: dateOff(def.due), status: '未收', note: '批量生成'
      });
      // 70% 全额收，15% 部分收，15% 未收
      const kind = idx % 20;
      if (kind < 14) this.collectReceivable(rec.id, rec.amount, 'fund_main', dateOff(Math.max(0, def.days - 2)));
      else if (kind < 17) this.collectReceivable(rec.id, +(rec.amount * 0.4).toFixed(2), 'fund_main', dateOff(Math.max(0, def.days - 4)));
    });

    // 5. 日常收支（复式：堂食/自提收现；外卖走应收；食材领用从存货出）
    let txnCount = 0;
    for (let day = 0; day < 90; day++) {
      const d = dateOff(day);
      const dow = new Date(d).getDay();
      const weekendBoost = (dow === 0 || dow === 6) ? 1.4 : 1.0;
      const base = +(3000 + Math.sin(day / 6) * 800).toFixed(0);
      const dine = +(base * 0.55 * weekendBoost).toFixed(2);
      const takeout = +(base * 0.15 * weekendBoost).toFixed(2);
      // 堂食收现：借现金 贷堂食收入（渠道 dine-in）
      if (dine > 0) { this._postEntry('1002', '5001', dine, d, '堂食收入', '5001', 'store_1', 'dine-in'); txnCount++; }
      // 自提收现：借现金 贷自提收入（渠道 takeout）
      if (takeout > 0) { this._postEntry('1002', '5003', takeout, d, '自提收入', '5003', 'store_1', 'takeout'); txnCount++; }
      // 每周一次包装耗材：借包装成本 贷现金
      if (day % 7 === 0) {
        this._postEntry('6004', '1002', +(150 + day % 5 * 30).toFixed(2), d, '包装耗材采购', '6004', 'store_1', '包装成本'); txnCount++;
      }
    }
    // 食材领用：每 7 天盘点式出库（按库存比例扣数量 + 结转成本金额=数量×平均成本）
    let totalOut = 0;
    for (let wk = 0; wk < 13; wk++) {
      const d = dateOff(wk * 7 + 3);
      let outAmt = 0;
      DB.getInventory().forEach(inv => {
        const qty = parseFloat(inv.qty) || 0;
        if (qty <= 2) return;
        const outQty = +(qty * 0.12).toFixed(2);
        if (outQty <= 0) return;
        outAmt += outQty * (parseFloat(inv.avg_cost) || 0);
        this.addStockMovement({ inventory_id: inv.id, type: '出库', qty: outQty, date: d, note: '后厨领用' });
      });
      if (outAmt > 0) {
        this._postEntry('6001', '1403', +outAmt.toFixed(2), d, '食材领用出库', '6001');
        txnCount++;
        totalOut += outAmt;
      }
    }
    // 月结支出：工资/社保/房租/水电（借费用 贷现金）
    for (let m = 0; m < 3; m++) {
      this._postEntry('6606', '1002', 35000, dateOff(m * 30), '员工工资', '6606', 'store_1', '人工成本'); txnCount++;
      this._postEntry('6607', '1002', 12000, dateOff(m * 30), '员工社保', '6607', 'store_1', '人工成本'); txnCount++;
      this._postEntry('6605', '1002', 12000, dateOff(m * 30 + 1), '门店房租', '6605', 'store_1', 'other'); txnCount++;
      this._postEntry('6611', '1002', +(2500 + m * 300).toFixed(2), dateOff(m * 30 + 2), '水电燃气费', '6611', 'store_1', 'other'); txnCount++;
      // 外卖平台佣金（按当期外卖应收的 5%，应付挂账）
      this._postEntry('6601', '2202', 1800, dateOff(m * 30 + 3), '外卖平台佣金', '6601', 'store_1', '平台佣金'); txnCount++;
      // 平台佣金结算付款
      this._postEntry('2202', '1002', 1800, dateOff(m * 30 + 5), '平台佣金付款', '2202', 'store_1', 'other'); txnCount++;
    }

    // 6. 菜品库 25 道
    const dishes = [
      { n: '招牌红烧肉', cost: 18, price: 58 }, { n: '清蒸鲈鱼', cost: 22, price: 68 },
      { n: '白灼菜心', cost: 4, price: 18 }, { n: '糖醋里脊', cost: 12, price: 42 },
      { n: '麻婆豆腐', cost: 5, price: 22 }, { n: '宫保鸡丁', cost: 10, price: 36 },
      { n: '蒜蓉西兰花', cost: 6, price: 24 }, { n: '香辣虾仁', cost: 20, price: 66 },
      { n: '酸菜鱼', cost: 24, price: 78 }, { n: '农家小炒肉', cost: 14, price: 46 },
      { n: '清炒时蔬', cost: 4, price: 16 }, { n: '西红柿炒蛋', cost: 6, price: 20 },
      { n: '水煮鱼', cost: 26, price: 82 }, { n: '干锅花菜', cost: 8, price: 28 },
      { n: '鱼香肉丝', cost: 11, price: 38 }, { n: '椒盐排骨', cost: 16, price: 52 },
      { n: '葱爆羊肉', cost: 28, price: 88 }, { n: '香菇滑鸡', cost: 13, price: 44 },
      { n: '红烧茄子', cost: 5, price: 20 }, { n: '冬瓜排骨汤', cost: 9, price: 30 },
      { n: '紫菜蛋花汤', cost: 3, price: 12 }, { n: '扬州炒饭', cost: 6, price: 22 },
      { n: '牛肉拉面', cost: 8, price: 26 }, { n: '手工水饺', cost: 7, price: 24 },
      { n: '凉拌黄瓜', cost: 3, price: 14 }
    ];
    dishes.forEach((d, i) => {
      this.addMenuItem({ name: d.n, cost: d.cost, price: d.price, category: i % 4 === 0 ? '招牌菜' : (i % 3 === 0 ? '热菜' : (i % 2 === 0 ? '主食' : '凉菜')), is_available: true, store_id: 'store_1' });
    });

    return {
      transactions: txnCount,
      purchaseOrders: poDefs.length,
      received: receivedCount,
      receivables: recDefs.length,
      inventory: materials.length
    };
  }
};

// 自动初始化
DB.init();

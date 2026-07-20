import React, { useState, useEffect, useMemo } from 'react';

const API_BASE = 'https://goinfosales-n8n.zeabur.app/webhook';
const initialSystemForm = { SystemId: '', SystemCode: '', SystemName: '', Category: '', IsActive: true, Note: '' };
const initialRuleForm = { PricingRuleId: '', SystemId: '', RuleType: 'LICENSE', VersionNo: 1, EffectiveStartDate: new Date().toISOString().slice(0, 10), EffectiveEndDate: '', FirstUserPrice: '', AdditionalUserPrice: '', MinimumUsers: 1, IsActive: true, Remark: '' };

export default function App() {
  const [activeTab, setActiveTab] = useState('customer');
  const [systemList, setSystemList] = useState([]);
  const [pricingRuleList, setPricingRuleList] = useState([]);
  const [systemForm, setSystemForm] = useState(initialSystemForm);
  const [ruleForm, setRuleForm] = useState(initialRuleForm);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(sessionStorage.getItem('goinfo_admin_token') !== null);
  const [adminToken, setAdminToken] = useState(sessionStorage.getItem('goinfo_admin_token') || '');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminLoginForm, setAdminLoginForm] = useState({ username: 'admin', password: '' });
  const [adminLoginError, setAdminLoginError] = useState('');
  const [pressTimer, setPressTimer] = useState(null);

  const initialCustomerForm = { Code: '', Name: '', Ucode: '', Boss: '', Contacter: '', Tel: '', Fax: '', Phone: '', Addr1: '', Addr2: '', Email: '', PayM: '0', State: '1', demoT: '', ContT: '', SetupT: '', Note: '', StateReason: '', PayMDetail: '' };
  const [customerForm, setCustomerForm] = useState(initialCustomerForm);
  const [customerList, setCustomerList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerCode, setSelectedCustomerCode] = useState(null);
  const [customerCode, setCustomerCode] = useState('');
  const [quoteItems, setQuoteItems] = useState([]);
  const [warrantyMonths, setWarrantyMonths] = useState(18);
  const [maintenanceDiscountAmount, setMaintenanceDiscountAmount] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerPickerTerm, setCustomerPickerTerm] = useState('');
  const [quoteList, setQuoteList] = useState([]);
  const [quoteListLoading, setQuoteListLoading] = useState(false);
  const [showQuotePreview, setShowQuotePreview] = useState(false);
  const [previewQuote, setPreviewQuote] = useState(null);

  const normalizeList = (data) => Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : (data && typeof data === 'object' ? Object.values(data).find(Array.isArray) || [data] : []);
  const getApiList = async (url) => { const res = await fetch(url); if (!res.ok) throw new Error(String(res.status)); return normalizeList(await res.json()); };
  const loadCustomers = async () => { try { setCustomerList(await getApiList(`${API_BASE}/get-customers`)); } catch (e) { console.error('讀取客戶失敗', e); } };
  // 使用既有 get-systems 工作流；回傳格式必須是 { systems: [...], rules: [...] }。
  const loadSystemSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/get-systems`);
      if (!response.ok) throw new Error(String(response.status));
      const raw = await response.json();
      const data = Array.isArray(raw) ? (raw[0] || {}) : raw;
      setSystemList(Array.isArray(data.systems) ? data.systems : []);
      setPricingRuleList(Array.isArray(data.rules) ? data.rules : []);
    } catch (e) {
      console.error('讀取系統設定失敗', e);
      setSystemList([]);
      setPricingRuleList([]);
    }
  };
  useEffect(() => { loadCustomers(); loadSystemSettings(); }, []);
  useEffect(() => { loadQuotes(); }, []);
  useEffect(() => { if (customerList.length && !selectedCustomerCode) handleSelectCustomer(customerList[0]); }, [customerList]);

  const formatDateForInput = (v) => v ? String(v).slice(0, 10) : '';
  const handleCustomerChange = (e) => setCustomerForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleNewCustomer = () => { setCustomerForm(initialCustomerForm); setSelectedCustomerCode(null); };
  const handleSelectCustomer = (customer) => { setCustomerForm({ ...initialCustomerForm, ...customer, PayM: String(customer.PayM ?? 0), State: String(customer.State ?? 1), demoT: formatDateForInput(customer.demoT), ContT: formatDateForInput(customer.ContT), SetupT: formatDateForInput(customer.SetupT) }); setSelectedCustomerCode(customer.Code); };
  const saveCustomer = async () => { if (!customerForm.Code?.trim()) return alert('請輸入客戶代號'); const payload = { ...customerForm, Code: customerForm.Code.trim(), Name: customerForm.Name?.trim() || '', PayM: Number(customerForm.PayM) || 0, State: Number(customerForm.State) || 1, demoT: customerForm.demoT || null, ContT: customerForm.ContT || null, SetupT: customerForm.SetupT || null }; try { const res = await fetch(`${API_BASE}/save-customer`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) }); if (!res.ok) throw new Error(await res.text()); setCustomerList(prev => { const i=prev.findIndex(c=>c.Code===payload.Code); return i < 0 ? [payload,...prev] : prev.map((c,n)=>n===i?payload:c); }); setSelectedCustomerCode(payload.Code); alert('客戶資料已成功存入資料庫！'); } catch (e) { console.error(e); alert('儲存客戶失敗。'); } };

  const handleAdminLogin = async (e) => { e.preventDefault(); setAdminLoginError(''); try { const res = await fetch(`${API_BASE}/admin-login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(adminLoginForm) }); const data = await res.json(); if (!res.ok || !data?.success) return setAdminLoginError(data?.message || '帳號或密碼錯誤'); const token=data.token || `admin-${Date.now()}`; sessionStorage.setItem('goinfo_admin_token', token); setAdminToken(token); setIsAdminLoggedIn(true); setShowAdminLogin(false); setAdminLoginForm({username:'admin',password:''}); setActiveTab('system_settings'); } catch(e) { setAdminLoginError('無法連線至後台驗證服務'); } };
  const handleAdminLogout = () => { sessionStorage.removeItem('goinfo_admin_token'); setAdminToken(''); setIsAdminLoggedIn(false); setActiveTab('customer'); };
  const authorizedPost = async (path, payload) => fetch(`${API_BASE}/${path}`, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${adminToken}`}, body:JSON.stringify(payload) });
  const saveSystem = async () => { if (!systemForm.SystemCode.trim() || !systemForm.SystemName.trim()) return alert('請填寫系統代號及系統名稱'); try { const r=await authorizedPost('save-system-product', {...systemForm, IsActive:!!systemForm.IsActive}); if(!r.ok) throw new Error(); await loadSystemSettings(); setSystemForm(initialSystemForm); alert('系統資料已儲存'); } catch(e){ alert('系統資料儲存失敗'); } };
  const saveRule = async () => { if (!ruleForm.SystemId || ruleForm.FirstUserPrice === '' || ruleForm.AdditionalUserPrice === '') return alert('請填寫系統、首位價格及增購單價'); try { const r=await authorizedPost('save-pricing-rule', {...ruleForm, SystemId:Number(ruleForm.SystemId), VersionNo:Number(ruleForm.VersionNo)||1, FirstUserPrice:Number(ruleForm.FirstUserPrice), AdditionalUserPrice:Number(ruleForm.AdditionalUserPrice), MinimumUsers:Number(ruleForm.MinimumUsers)||1, IsActive:!!ruleForm.IsActive, EffectiveEndDate:ruleForm.EffectiveEndDate||null}); if(!r.ok) throw new Error(); await loadSystemSettings(); setRuleForm(initialRuleForm); alert('價格規則已儲存'); } catch(e){ alert('價格規則儲存失敗'); } };

  const addItem = (itemType='NEW_LICENSE') => setQuoteItems(p => [...p, { id:`${Date.now()}-${Math.random()}`, systemId:'', itemType, userCount:1, discountRate:100, specialPrice:'' }]);
  const updateItem = (id, field, value) => setQuoteItems(p => p.map(x => x.id===id ? {...x,[field]:value} : x));
  const removeItem = (id) => setQuoteItems(p => p.filter(x => x.id !== id));
  const getEffectivePricingRule = (systemId, itemType) => { const today=new Date().toISOString().slice(0,10), type=itemType==='MAINTENANCE'?'MAINTENANCE':'LICENSE'; return pricingRuleList.filter(r => Number(r.SystemId)===Number(systemId) && r.RuleType===type && (r.IsActive===true || r.IsActive===1 || r.IsActive==='true') && (!r.EffectiveStartDate || String(r.EffectiveStartDate).slice(0,10)<=today) && (!r.EffectiveEndDate || String(r.EffectiveEndDate).slice(0,10)>=today)).sort((a,b)=>String(b.EffectiveStartDate||'').localeCompare(String(a.EffectiveStartDate||'')))[0]; };
  const calculateListAmount = (item) => { const rule=getEffectivePricingRule(item.systemId,item.itemType); if(!rule) return 0; const users=Math.max(Number(item.userCount)||0,0), first=Number(rule.FirstUserPrice)||0, add=Number(rule.AdditionalUserPrice)||0; return item.itemType==='ADD_USER' ? users*add : users>=1 ? first+(users-1)*add : 0; };
  const getDiscountPercent = (item) => Math.min(Math.max(Number(item.discountRate) || 100, 0), 100);
  const calculateTaxIncludedListAmount = (item) => Math.round(calculateListAmount(item) * 1.05);
  // Discount 表示「幾折」：80 代表 8 折（80%）；DiscountAmount 為含稅牌價乘折數後的含稅金額。
  const calculateDiscountAmount = (item) => Math.round(calculateTaxIncludedListAmount(item) * (getDiscountPercent(item) / 100));
  // FinalAmount 為含稅折後金額再行議價的最終含稅價格；未填時採用 DiscountAmount。
  const hasFinalAmount = (item) => item.specialPrice !== '' && Number.isFinite(Number(item.specialPrice)) && Number(item.specialPrice) >= 0;
  const calculateFinalTaxIncludedAmount = (item) => hasFinalAmount(item) ? Math.round(Number(item.specialPrice)) : calculateDiscountAmount(item);
  const calculateLineAmount = (item) => Math.round(calculateFinalTaxIncludedAmount(item) / 1.05);
  const quoteSummary = useMemo(() => { const listAmount=quoteItems.reduce((s,x)=>s+calculateListAmount(x),0), taxIncludedListAmount=quoteItems.reduce((s,x)=>s+calculateTaxIncludedListAmount(x),0), discountAmount=quoteItems.reduce((s,x)=>s+calculateDiscountAmount(x),0), taxIncludedAmount=quoteItems.reduce((s,x)=>s+calculateFinalTaxIncludedAmount(x),0), taxExcludedAmount=Math.round(taxIncludedAmount/1.05), taxAmount=taxIncludedAmount-taxExcludedAmount; const annualMaintenanceAmount = quoteItems.reduce((sum, item) => { const rule = getMaintenanceRule(item.systemId); const n = Math.max(Number(item.userCount) || 0, 0); return sum + (rule && n ? Number(rule.FirstUserPrice || 0) + Math.max(n - 1, 0) * Number(rule.AdditionalUserPrice || 0) : 0); }, 0); return {listAmount,taxIncludedListAmount,discountAmount,taxExcludedAmount,taxAmount,taxIncludedAmount,annualMaintenanceAmount}; }, [quoteItems, pricingRuleList]);
  const loadQuotes = async () => {
    setQuoteListLoading(true);
    try { setQuoteList(await getApiList(`${API_BASE}/get-quotes`)); }
    catch (e) { console.error('讀取報價清單失敗', e); }
    finally { setQuoteListLoading(false); }
  };
  const formatRocDate = (value) => { const d = new Date(value); if (Number.isNaN(d.getTime())) return '－'; return `${d.getFullYear()-1911}年${String(d.getMonth()+1).padStart(2,'0')}月${String(d.getDate()).padStart(2,'0')}日`; };
  const quoteValidDate = (quote) => { const d = new Date(quote.QuoteDate); d.setDate(d.getDate()+30); return `${d.getFullYear()}年${String(d.getMonth()+1).padStart(2,'0')}月${String(d.getDate()).padStart(2,'0')}日`; };
  const quoteStatusLabel = (status) => ({ '1':'1. 新購', '2':'2. 增設', '3':'3. 維護', '4':'4. 其他', NEW_LICENSE:'1. 新購', ADD_USER:'2. 增設', MAINTENANCE:'3. 維護', OTHER:'4. 其他', DRAFT:'4. 其他' }[String(status)] || '4. 其他');
  const itemTypeLabel = (type) => ({ NEW_LICENSE:'新購', ADD_USER:'增設', MAINTENANCE:'維護', OTHER:'其他' }[String(type)] || String(type || '其他'));

  const getMaintenanceRule = (systemId) => {
    const today = new Date().toISOString().slice(0, 10);
    return pricingRuleList.filter(r => Number(r.SystemId) === Number(systemId) && String(r.RuleType).toUpperCase() === 'MAINTENANCE' && (r.IsActive === true || r.IsActive === 1 || r.IsActive === 'true') && (!r.EffectiveStartDate || String(r.EffectiveStartDate).slice(0,10) <= today) && (!r.EffectiveEndDate || String(r.EffectiveEndDate).slice(0,10) >= today)).sort((a,b) => String(b.EffectiveStartDate || '').localeCompare(String(a.EffectiveStartDate || '')))[0];
  };
  const getSystemInfo = (systemId) => systemList.find(s => Number(s.SystemId) === Number(systemId)) || {};
  const quoteFormalDetails = (detail) => {
    const isNewPurchase = String(detail.quote.Status) === '1' || detail.quote.Status === 'NEW_LICENSE';
    const lines = detail.items.map(item => {
      const system = getSystemInfo(item.SystemId);
      const maintenance = getMaintenanceRule(item.SystemId);
      const users = Number(item.UserCount || 1);
      const discount = Number(item.Discount ?? 100) / 100;
      const maintenanceTaxIncluded = maintenance ? Math.round(Number(maintenance.FirstUserPrice || 0) + Math.max(users - 1, 0) * Number(maintenance.AdditionalUserPrice || 0)) : null;
      const addUserMaintenanceTaxIncluded = maintenance ? Math.round(Number(maintenance.AdditionalUserPrice || 0)) : null;
      const licenseAddUserTaxIncluded = Math.round(Number(item.AdditionalUserPriceSnapshot || 0) * (Number(item.Discount ?? 100) / 100) * 1.05);
      return { ...item, SystemCode: item.SystemCode || system.SystemCode, SystemName: item.SystemName || system.SystemName, Note: system.Note || '', maintenanceTaxIncluded, addUserMaintenanceTaxIncluded, licenseAddUserTaxIncluded };
    });
    return { ...detail, isNewPurchase, items: lines, maintenanceTotal: Number(detail.quote.AnnualMaintenanceAmount ?? detail.quote.annualMaintenanceAmount ?? lines.reduce((sum, x) => sum + Number(x.maintenanceTaxIncluded || 0), 0)), warrantyMonths: Number(detail.quote.WarrantyMonths ?? detail.quote.warrantyMonths ?? 0), maintenanceDiscountAmount: detail.quote.MaintenanceDiscountAmount ?? detail.quote.maintenanceDiscountAmount ?? null };
  };

  const normalizeQuoteDetail = (raw) => {
    const data = Array.isArray(raw) ? (raw[0] || {}) : raw;
    const quote = data.quote || data.Quote || data.header || data;
    const items = Array.isArray(data.items) ? data.items : Array.isArray(data.Items) ? data.Items : [];
    const itemListAmount = items.reduce((sum, item) => sum + Number(item.LineAmount ?? item.lineAmount ?? 0), 0);
    const itemFinalAmount = items.reduce((sum, item) => sum + Number(item.FinalAmount ?? item.finalAmount ?? item.DiscountAmount ?? item.discountAmount ?? 0), 0);
    const taxIncludedAmount = Number(quote.FinalAmount ?? quote.finalAmount ?? quote.TaxIncludedAmount ?? quote.taxIncludedAmount ?? quote.TotalAmount ?? quote.totalAmount ?? itemFinalAmount);
    const taxExcludedAmount = Number(quote.TaxExcludedAmount ?? quote.taxExcludedAmount ?? quote.SubtotalAmount ?? quote.subtotalAmount ?? Math.round(taxIncludedAmount / 1.05));
    const taxAmount = Number(quote.TaxAmount ?? quote.taxAmount ?? (taxIncludedAmount - taxExcludedAmount));
    return { quote: { ...quote, SubtotalAmount: Number(quote.SubtotalAmount ?? quote.subtotalAmount ?? itemListAmount), TaxExcludedAmount: taxExcludedAmount, TaxAmount: taxAmount, TaxIncludedAmount: Math.round(Number(quote.SubtotalAmount ?? quote.subtotalAmount ?? itemListAmount) * 1.05), DiscountAmount: Number(quote.DiscountAmount ?? quote.discountAmount ?? itemFinalAmount), TotalAmount: taxIncludedAmount, FinalAmount: taxIncludedAmount }, items };
  };

  const previewQuoteById = async (quotationId) => {
    try {
      const response = await fetch(`${API_BASE}/get-quote-detail?quotationId=${encodeURIComponent(quotationId)}`);
      if (!response.ok) throw new Error(String(response.status));
      const raw = await response.json();
      const detail = normalizeQuoteDetail(raw);
      setPreviewQuote(quoteFormalDetails(detail));
      setShowQuotePreview(true);
    } catch (e) { console.error(e); alert('無法讀取報價單詳細資料，請確認 get-quote-detail 工作流。'); }
  };
  const voidQuote = async (quote) => {
    if (!window.confirm(`確定要作廢報價單「${quote.QuotationNo}」嗎？作廢後可保留歷史紀錄，但不能再使用。`)) return;
    try {
      const response = await fetch(`${API_BASE}/void-quote`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({quotationId: quote.QuotationId}) });
      if (!response.ok) throw new Error(String(response.status));
      alert('報價單已作廢');
      await loadQuotes();
    } catch (e) { console.error(e); alert('作廢失敗，請確認 void-quote 工作流。'); }
  };
  const editQuote = async (quote) => {
    try {
      const response = await fetch(`${API_BASE}/get-quote-detail?quotationId=${encodeURIComponent(quote.QuotationId)}`);
      if (!response.ok) throw new Error(String(response.status));
      const raw = await response.json(); const data = normalizeQuoteDetail(raw);
      const header = data.quote;
      const items = data.items;
      setCustomerCode(header.CustomerId);
      setQuoteItems(items.map((item, index) => ({ id: item.QuotationItemId || `${Date.now()}-${index}`, systemId: String(item.SystemId), itemType: item.ItemType, userCount: item.UserCount, discountRate: item.Discount ?? 100, specialPrice: item.FinalAmount ?? '' })));
      setShowQuotePreview(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      alert('已帶入報價資料。此版本會另存為一張新報價單，原報價不會被覆寫。');
    } catch (e) { console.error(e); alert('無法載入報價資料，請確認 get-quote-detail 工作流。'); }
  };

  const handleSubmit = async (action) => {
    if (!customerCode) return alert('請先選擇客戶');
    if (!quoteItems.length || quoteItems.some(x => !x.systemId)) return alert('請至少新增一筆完整的系統報價明細');
    if (quoteItems.some(x => !getEffectivePricingRule(x.systemId, x.itemType))) return alert('選取的系統找不到有效價格規則，請先至系統設定建立並啟用價格。');
    const customer = customerList.find(c => String(c.CustomerId) === String(customerCode));
    if (!customer?.CustomerId) return alert('客戶資料缺少 CustomerId，請先依下方說明更新 get-customers 工作流。');
    const now = new Date();
    const rocYear = now.getFullYear() - 1911;
    const quoteNo = `Q${rocYear}${String(now.getMonth()+1).padStart(2,'0')}${String(Date.now()).slice(-4)}`;
    const payload = {
      action,
      status: action === 'CreateNewSystemQuote' ? '1' : action === 'CreateAddUserQuote' ? '2' : action === 'CreateMaintenanceQuote' ? '3' : '4',
      quoteNo,
      customerId: Number(customer.CustomerId),
      customerCode: customer.Code,
      customerName: customer.Name || '',
      taxRate: 0.05,
      warrantyMonths: Number(warrantyMonths) || 0,
      annualMaintenanceAmount: quoteSummary.annualMaintenanceAmount,
      maintenanceDiscountAmount: maintenanceDiscountAmount === '' ? null : Number(maintenanceDiscountAmount),
      listAmount: quoteSummary.listAmount,
      discountAmount: quoteSummary.discountAmount,
      taxExcludedAmount: quoteSummary.taxExcludedAmount,
      taxAmount: quoteSummary.taxAmount,
      taxIncludedAmount: quoteSummary.taxIncludedAmount,
      totalAmount: quoteSummary.taxIncludedAmount,
      items: quoteItems.map((x, index) => {
        const rule = getEffectivePricingRule(x.systemId, x.itemType);
        return {
          systemId: Number(x.systemId),
          pricingRuleId: Number(rule?.PricingRuleId) || 0,
          itemType: x.itemType,
          userCount: Number(x.userCount),
          firstUserPriceSnapshot: Number(rule?.FirstUserPrice) || 0,
          additionalUserPriceSnapshot: Number(rule?.AdditionalUserPrice) || 0,
          listAmount: calculateListAmount(x),
          discount: Number(x.discountRate) || 100,
          discountRate: Number(x.discountRate) || 100,
          discountAmount: calculateDiscountAmount(x),
          specialPrice: x.specialPrice === '' ? null : Number(x.specialPrice),
          finalAmount: hasFinalAmount(x) ? calculateFinalTaxIncludedAmount(x) : null,
          taxExcludedAmount: calculateLineAmount(x),
          lineAmount: calculateListAmount(x),
          sortOrder: index + 1
        };
      })
    };
    try { const r = await fetch(`${API_BASE}/save-quote`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); if(!r.ok) throw new Error(); alert(`[${action}] 報價單已成功存入資料庫！`); setQuoteItems([]); await loadQuotes(); } catch(e) { alert('報價單儲存失敗，請檢查網路狀態。'); }
  };

  // 1. (潛在)客戶資料建檔 - Master/Detail 版面
  const renderCustomerForm = () => {
    // 過濾客戶清單
    const filteredCustomers = customerList.filter(c => 
      (c.Name && c.Name.includes(searchTerm)) || 
      (c.Code && c.Code.includes(searchTerm))
    );

    return (
      <div className="flex flex-col lg:flex-row h-full gap-4 max-h-[calc(100vh-3rem)]">
        {/* 左側清單區塊 (Master) */}
        <div className="w-full lg:w-1/3 flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden shrink-0">
          
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col gap-3">
             <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-700">客戶清單</h3>
                <button 
                  onClick={handleNewCustomer}
                  className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-md shadow-sm transition"
                >
                  + 新增客戶
                </button>
             </div>
             
             {/* 搜尋列 */}
             <div className="relative">
                <input 
                  type="text" 
                  placeholder="搜尋客戶代號或名稱..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
             </div>
          </div>
          
          {/* 清單捲動區 */}
          <div className="flex-1 overflow-y-auto">
             <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-100 sticky top-0">
                   <tr>
                      <th className="px-3 py-2 border-b">客戶代號</th>
                      <th className="px-3 py-2 border-b">客戶名稱</th>
                   </tr>
                </thead>
                <tbody>
                   {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan="2" className="text-center py-4 text-gray-400">找不到相符的客戶</td>
                      </tr>
                   ) : (
                     filteredCustomers.map(c => (
                        <tr 
                          key={c.Code} 
                          onClick={() => handleSelectCustomer(c)}
                          className={`cursor-pointer border-b last:border-b-0 hover:bg-blue-50 transition-colors ${selectedCustomerCode === c.Code ? 'bg-blue-100 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
                        >
                           <td className="px-3 py-2.5 font-medium">{c.Code}</td>
                           <td className="px-3 py-2.5 truncate max-w-[150px]">{c.Name}</td>
                        </tr>
                     ))
                   )}
                </tbody>
             </table>
          </div>
        </div>

        {/* 右側詳細資料表單 (Detail) */}
        <div className="w-full lg:w-2/3 bg-white p-6 rounded-lg shadow-sm border border-gray-200 overflow-y-auto flex-1">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 sticky top-0 bg-white z-10 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {selectedCustomerCode ? '編輯客戶資料' : '新增客戶資料'}
              </h2>
              <p className="text-gray-500 text-sm mt-1">對應資料表：<code>dbo.Customer</code></p>
            </div>
            <button 
              onClick={saveCustomer}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow transition whitespace-nowrap"
            >
              儲存客戶資料
            </button>
          </div>

          <div className="space-y-8">
            {/* 基本資料 */}
            <section>
              <h3 className="text-base font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-4">基本資料</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">客戶代號 (Code) <span className="text-red-500">*</span></label>
                  <input type="text" name="Code" value={customerForm.Code} onChange={handleCustomerChange} disabled={!!selectedCustomerCode} className={`w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none ${selectedCustomerCode ? 'bg-gray-100 cursor-not-allowed' : ''}`} required placeholder="如: TC-1150701" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">客戶名稱 (Name)</label>
                  <input type="text" name="Name" value={customerForm.Name} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" placeholder="輸入公司全名" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">統一編號 (Ucode)</label>
                  <input type="text" name="Ucode" value={customerForm.Ucode} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">負責人 (Boss)</label>
                  <input type="text" name="Boss" value={customerForm.Boss} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </section>

            {/* 聯絡資訊 */}
            <section>
              <h3 className="text-base font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-4">聯絡資訊</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">聯絡人 (Contacter)</label>
                  <input type="text" name="Contacter" value={customerForm.Contacter} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">聯絡電話 (Tel)</label>
                  <input type="text" name="Tel" value={customerForm.Tel} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">行動電話 (Phone)</label>
                  <input type="text" name="Phone" value={customerForm.Phone} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">傳真電話 (Fax)</label>
                  <input type="text" name="Fax" value={customerForm.Fax} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">E-Mail (Email)</label>
                  <input type="email" name="Email" value={customerForm.Email} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" placeholder="example@company.com" />
                </div>
              </div>
            </section>

            {/* 地址資訊 */}
            <section>
              <h3 className="text-base font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-4">地址資訊</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">發票地址 (Addr1)</label>
                  <input type="text" name="Addr1" value={customerForm.Addr1} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">通訊地址 (Addr2)</label>
                  <input type="text" name="Addr2" value={customerForm.Addr2} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </section>

            {/* 狀態與歷程 */}
            <section>
              <h3 className="text-base font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-4">狀態與歷程</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">銷售狀態 (State)</label>
                  <select name="State" value={customerForm.State} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    <option value="1">1 - 潛在開發中</option>
                    <option value="2">2 - 已傳報價單</option>
                    <option value="3">3 - 議價中</option>
                    <option value="4">4 - 已簽約成交</option>
                    <option value="5">5 - 已安裝並完成教育訓練</option>
                    <option value="6">6 - 懸而未決</option>
                    <option value="7">7 - 未成案(未購買)</option>
                  </select>
                </div>
                {(customerForm.State === '6' || customerForm.State === '7') ? (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-600 mb-1">懸而未決/未成案原因 <span className="text-red-500">*</span></label>
                    <input type="text" name="StateReason" value={customerForm.StateReason} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-red-50" placeholder="請詳細說明原因..." />
                  </div>
                ) : <div className="hidden md:block md:col-span-2"></div>}

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">付款方式 (PayM)</label>
                  <select name="PayM" value={customerForm.PayM} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    <option value="0">0 - 尚未確認</option>
                    <option value="1">1 - 現金</option>
                    <option value="2">2 - 匯款</option>
                    <option value="3">3 - 支票</option>
                    <option value="4">4 - 分期支付(匯款)</option>
                    <option value="5">5 - 分期支付(支票)</option>
                    <option value="6">6 - 多管道付款</option>
                  </select>
                </div>
                {customerForm.PayM === '6' ? (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-600 mb-1">多管道付款方式說明 <span className="text-blue-500">*</span></label>
                    <input type="text" name="PayMDetail" value={customerForm.PayMDetail} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50" placeholder="請說明詳細的付款拆分方式..." />
                  </div>
                ) : <div className="hidden md:block md:col-span-2"></div>}
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">展示日期 (demoT)</label>
                  <input type="date" name="demoT" value={customerForm.demoT} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">最後聯絡日期 (ContT)</label>
                  <input type="date" name="ContT" value={customerForm.ContT} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">安裝日期 (SetupT)</label>
                  <input type="date" name="SetupT" value={customerForm.SetupT} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </section>

            {/* 備註 */}
            <section>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">備註 (Note)</label>
                  <textarea name="Note" value={customerForm.Note} onChange={handleCustomerChange} rows="3" className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  const selectedQuoteCustomer = customerList.find(c => String(c.CustomerId) === String(customerCode));
  const pickerCustomers = customerList.filter(c => {
    const term = customerPickerTerm.trim().toLowerCase();
    return !term || String(c.Code || '').toLowerCase().includes(term) || String(c.Name || '').toLowerCase().includes(term);
  });
  const selectQuoteCustomer = (customer) => {
    setCustomerCode(customer.CustomerId);
    setShowCustomerPicker(false);
    setCustomerPickerTerm('');
  };

  const renderQuotationForm = (title, defaultItemType, actionType) => (
    <>
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">{title}</h2>
      <div className="mb-6"><label className="block text-sm font-medium text-gray-700 mb-2">選擇客戶</label><div className="flex gap-2"><input type="text" readOnly value={selectedQuoteCustomer ? `${selectedQuoteCustomer.Code}－${selectedQuoteCustomer.Name}` : ''} placeholder="請點選右側按鈕選擇客戶" className="flex-1 border border-gray-300 rounded-lg p-2 bg-gray-50 text-gray-700"/><button type="button" onClick={()=>setShowCustomerPicker(true)} className="px-4 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium whitespace-nowrap">選擇客戶</button></div></div>
      <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-gray-800">報價明細</h3><button onClick={()=>addItem(defaultItemType)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm">+ 新增模組</button></div>
      <div className="space-y-4 mb-6">{quoteItems.length===0 && <div className="text-center text-gray-400 py-4 border-2 border-dashed rounded-lg">尚無項目</div>}{quoteItems.map(item=><div key={item.id} className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end bg-gray-50 p-4 rounded-lg border"><div className="lg:col-span-3"><label className="text-xs text-gray-500">系統</label><select className="w-full border p-2 rounded" value={item.systemId} onChange={e=>updateItem(item.id,'systemId',e.target.value)}><option value="">選擇系統</option>{systemList.filter(s=>s.IsActive!==false && s.IsActive!==0).map(s=><option key={s.SystemId} value={s.SystemId}>{s.SystemCode}－{s.SystemName}</option>)}</select></div><div className="lg:col-span-2"><label className="text-xs text-gray-500">報價類型</label><select className="w-full border p-2 rounded" value={item.itemType} onChange={e=>updateItem(item.id,'itemType',e.target.value)}><option value="NEW_LICENSE">新購授權</option><option value="ADD_USER">增設授權</option><option value="MAINTENANCE">維護費</option></select></div><div className="lg:col-span-1"><label className="text-xs text-gray-500">人數</label><input type="number" min="1" className="w-full border p-2 rounded text-right" value={item.userCount} onChange={e=>updateItem(item.id,'userCount',e.target.value)}/></div><div className="lg:col-span-2"><label className="text-xs text-gray-500">牌價</label><div className="border bg-white p-2 rounded text-right">${calculateListAmount(item).toLocaleString()}</div></div><div className="lg:col-span-1"><label className="text-xs text-gray-500">折數（80＝8折）</label><input type="number" min="0" max="100" step="1" className="w-full border p-2 rounded text-right" value={item.discountRate} onChange={e=>updateItem(item.id,'discountRate',e.target.value)}/></div><div className="lg:col-span-1"><label className="text-xs text-gray-500">最終優惠價</label><input type="number" min="0" placeholder="選填" className="w-full border p-2 rounded text-right" value={item.specialPrice} onChange={e=>updateItem(item.id,'specialPrice',e.target.value)}/></div><div className="lg:col-span-1"><label className="text-xs text-gray-500">折後金額（含稅）</label><div className="font-bold text-blue-600 text-right p-2">${calculateFinalTaxIncludedAmount(item).toLocaleString()}</div></div><button type="button" onClick={()=>removeItem(item.id)} className="lg:col-span-1 text-red-500 hover:text-red-700 p-2">刪除</button></div>)}</div>
      {quoteItems.length>0 && <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-5 items-start"><div className="text-left space-y-3 border-l-4 border-blue-500 pl-4"><div className="font-semibold text-gray-700">保固與維護設定</div><label className="block text-sm">免費保固年限：<input type="number" min="0" step="1" value={warrantyMonths} onChange={e=>setWarrantyMonths(e.target.value)} className="ml-2 w-20 border rounded p-1 text-right"/> 個月　<span className="text-gray-500">（{Number(warrantyMonths)%12 === 0 ? `${Math.floor(Number(warrantyMonths)/12)} 年` : `${Number(warrantyMonths)||0} 個月`}）</span></label><div className="text-sm">每年維護費用：<b>NT${quoteSummary.annualMaintenanceAmount.toLocaleString()}（含稅）</b></div><label className="block text-sm">維護費優惠金額：NT$ <input type="number" min="0" placeholder="選填" value={maintenanceDiscountAmount} onChange={e=>setMaintenanceDiscountAmount(e.target.value)} className="ml-1 w-32 border rounded p-1 text-right"/> <span className="text-gray-500">（含稅）</span></label></div><div className="text-right space-y-1"><div className="text-gray-500">原始牌價（未稅）：${quoteSummary.listAmount.toLocaleString()}</div><div className="text-gray-500">原始牌價（含稅）：${quoteSummary.taxIncludedListAmount.toLocaleString()}</div><div>優惠總計（未稅）：${quoteSummary.taxExcludedAmount.toLocaleString()}</div><div>營業稅（5%）：${quoteSummary.taxAmount.toLocaleString()}</div><div className="text-xl font-bold">優惠總計（含稅）：${quoteSummary.taxIncludedAmount.toLocaleString()}</div><div className="text-orange-600">最終議價（含稅）：-${(quoteSummary.discountAmount - quoteSummary.taxIncludedAmount).toLocaleString()}</div><button onClick={()=>handleSubmit(actionType)} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded shadow">產生並存檔</button></div></div>}
    </div>
    <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-4"><div><h3 className="text-lg font-bold text-gray-800">已建立報價單</h3><p className="text-sm text-gray-500 mt-1">可預覽、帶入修改或作廢報價紀錄。</p></div><button onClick={loadQuotes} className="border px-3 py-2 rounded-lg text-sm hover:bg-gray-50">重新整理</button></div>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-100 text-gray-600"><tr><th className="p-3">報價單號</th><th className="p-3">報價日期</th><th className="p-3">客戶名稱</th><th className="p-3 text-right">未稅金額</th><th className="p-3 text-right">優惠金額（含稅）</th><th className="p-3">狀態</th><th className="p-3 text-center">操作</th></tr></thead><tbody>{quoteListLoading ? <tr><td colSpan="7" className="p-8 text-center text-gray-400">讀取中...</td></tr> : quoteList.length ? quoteList.map(q=><tr key={q.QuotationId} className="border-b hover:bg-blue-50"><td className="p-3 font-medium">{q.QuotationNo}</td><td className="p-3">{formatDateForInput(q.QuoteDate)}</td><td className="p-3">{q.CustomerName || q.CustomerCode || "－"}</td><td className="p-3 text-right">${Number(q.ListAmount ?? q.SubtotalAmount ?? 0).toLocaleString()}</td><td className="p-3 text-right font-medium">${Number(q.DiscountAmount ?? q.FinalAmount ?? q.TotalAmount ?? 0).toLocaleString()}</td><td className="p-3"><span className={`px-2 py-1 rounded text-xs ${q.Status === 'VOID' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{quoteStatusLabel(q.Status)}</span></td><td className="p-3"><div className="flex gap-2 justify-center"><button onClick={()=>previewQuoteById(q.QuotationId)} className="text-blue-600 hover:underline">預覽</button><button onClick={()=>editQuote(q)} className="text-amber-600 hover:underline">修改</button><button onClick={()=>voidQuote(q)} disabled={q.Status === 'VOID'} className="text-red-600 hover:underline disabled:text-gray-300">作廢</button></div></td></tr>) : <tr><td colSpan="7" className="p-8 text-center text-gray-400">尚無已建立的報價單</td></tr>}</tbody></table></div>
    </div>
    </>
  );

  const renderSystemSettings = () => <div className="space-y-6"><div className="bg-white p-6 rounded-lg shadow-sm border"><h2 className="text-xl font-bold">系統設定：軟體及價格</h2><p className="text-sm text-gray-500 mt-1">管理可報價的軟體產品與生效中的價格規則。</p></div><div className="grid grid-cols-1 xl:grid-cols-2 gap-6"><div className="bg-white p-5 rounded-lg border shadow-sm"><h3 className="font-bold mb-4">軟體產品設定</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><input placeholder="系統代號 *" className="border p-2 rounded" value={systemForm.SystemCode} onChange={e=>setSystemForm(p=>({...p,SystemCode:e.target.value}))}/><input placeholder="系統名稱 *" className="border p-2 rounded" value={systemForm.SystemName} onChange={e=>setSystemForm(p=>({...p,SystemName:e.target.value}))}/><input placeholder="分類" className="border p-2 rounded" value={systemForm.Category} onChange={e=>setSystemForm(p=>({...p,Category:e.target.value}))}/><label className="flex items-center gap-2 p-2"><input type="checkbox" checked={!!systemForm.IsActive} onChange={e=>setSystemForm(p=>({...p,IsActive:e.target.checked}))}/>啟用</label><textarea placeholder="系統內容說明" className="border p-2 rounded md:col-span-2" value={systemForm.Note} onChange={e=>setSystemForm(p=>({...p,Note:e.target.value}))}/></div><div className="mt-3 flex gap-2"><button onClick={saveSystem} className="bg-blue-600 text-white px-4 py-2 rounded">儲存軟體</button><button onClick={()=>setSystemForm(initialSystemForm)} className="border px-4 py-2 rounded">新增／清除</button></div><div className="mt-5 overflow-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-100 text-left"><th className="p-2">代號</th><th className="p-2">名稱</th><th className="p-2">分類</th><th className="p-2">狀態</th><th></th></tr></thead><tbody>{systemList.map(s=><tr key={s.SystemId} className="border-b"><td className="p-2">{s.SystemCode}</td><td className="p-2">{s.SystemName}</td><td className="p-2">{s.Category}</td><td className="p-2">{s.IsActive===false||s.IsActive===0?'停用':'啟用'}</td><td><button className="text-blue-600" onClick={()=>setSystemForm({...initialSystemForm,...s,IsActive:s.IsActive!==false&&s.IsActive!==0})}>編輯</button></td></tr>)}</tbody></table></div></div><div className="bg-white p-5 rounded-lg border shadow-sm"><h3 className="font-bold mb-4">價格規則設定</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><select className="border p-2 rounded" value={ruleForm.SystemId} onChange={e=>setRuleForm(p=>({...p,SystemId:e.target.value}))}><option value="">選擇系統 *</option>{systemList.map(s=><option key={s.SystemId} value={s.SystemId}>{s.SystemCode}－{s.SystemName}</option>)}</select><select className="border p-2 rounded" value={ruleForm.RuleType} onChange={e=>setRuleForm(p=>({...p,RuleType:e.target.value}))}><option value="LICENSE">授權價格</option><option value="MAINTENANCE">維護價格</option></select><input type="date" className="border p-2 rounded" value={ruleForm.EffectiveStartDate} onChange={e=>setRuleForm(p=>({...p,EffectiveStartDate:e.target.value}))}/><input type="date" className="border p-2 rounded" value={ruleForm.EffectiveEndDate} onChange={e=>setRuleForm(p=>({...p,EffectiveEndDate:e.target.value}))}/><input type="number" placeholder="首位價格 *" className="border p-2 rounded" value={ruleForm.FirstUserPrice} onChange={e=>setRuleForm(p=>({...p,FirstUserPrice:e.target.value}))}/><input type="number" placeholder="增購單價 *" className="border p-2 rounded" value={ruleForm.AdditionalUserPrice} onChange={e=>setRuleForm(p=>({...p,AdditionalUserPrice:e.target.value}))}/><input type="number" min="1" placeholder="最低人數" className="border p-2 rounded" value={ruleForm.MinimumUsers} onChange={e=>setRuleForm(p=>({...p,MinimumUsers:e.target.value}))}/><label className="flex items-center gap-2 p-2"><input type="checkbox" checked={!!ruleForm.IsActive} onChange={e=>setRuleForm(p=>({...p,IsActive:e.target.checked}))}/>啟用</label><textarea placeholder="備註" className="border p-2 rounded md:col-span-2" value={ruleForm.Remark} onChange={e=>setRuleForm(p=>({...p,Remark:e.target.value}))}/></div><div className="mt-3 flex gap-2"><button onClick={saveRule} className="bg-blue-600 text-white px-4 py-2 rounded">儲存價格</button><button onClick={()=>setRuleForm(initialRuleForm)} className="border px-4 py-2 rounded">新增／清除</button></div><div className="mt-5 overflow-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-100 text-left"><th className="p-2">系統</th><th className="p-2">類型</th><th className="p-2">首位</th><th className="p-2">增購</th><th></th></tr></thead><tbody>{pricingRuleList.map(r=><tr key={r.PricingRuleId||`${r.SystemId}-${r.RuleType}-${r.EffectiveStartDate}`} className="border-b"><td className="p-2">{systemList.find(s=>Number(s.SystemId)===Number(r.SystemId))?.SystemName||r.SystemId}</td><td className="p-2">{r.RuleType==='MAINTENANCE'?'維護':'授權'}</td><td className="p-2">${Number(r.FirstUserPrice||0).toLocaleString()}</td><td className="p-2">${Number(r.AdditionalUserPrice||0).toLocaleString()}</td><td><button className="text-blue-600" onClick={()=>setRuleForm({...initialRuleForm,...r,SystemId:String(r.SystemId),EffectiveStartDate:formatDateForInput(r.EffectiveStartDate),EffectiveEndDate:formatDateForInput(r.EffectiveEndDate),IsActive:r.IsActive!==false&&r.IsActive!==0})}>編輯</button></td></tr>)}</tbody></table></div></div></div></div>;

  // 3. 業務銷售追蹤專區
  const renderSalesTracking = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">3. 業務銷售追蹤專區</h2>
      <p className="text-gray-500 mb-4">此區塊將透過 n8n 撈取 `Quotation` 資料表狀態為 DRAFT 或 SENT 的報價單，以 Kanban (看板) 或列表呈現。</p>
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">開發建置中...</div>
    </div>
  );

  // 4. 客戶合約資料專區
  const renderContracts = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">4. 客戶合約資料專區</h2>
      <p className="text-gray-500 mb-4">此區塊顯示已成交的報價轉換成的正式合約記錄，包含授權範圍與維護到期日。</p>
      <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">開發建置中...</div>
    </div>
  );

  return (
    <div className="h-screen bg-gray-100 flex flex-col md:flex-row font-sans overflow-hidden">
      
      {/* 左側 Sidebar 導覽列 */}
      <div className="w-full md:w-64 bg-gray-900 text-white shadow-lg flex-shrink-0 z-20">
        <div className="p-6 bg-gray-950 border-b border-gray-800 select-none" onContextMenu={e=>{e.preventDefault();setAdminLoginError('');setShowAdminLogin(true);}} onTouchStart={()=>setPressTimer(setTimeout(()=>{setAdminLoginError('');setShowAdminLogin(true);},700))} onTouchEnd={()=>{if(pressTimer) clearTimeout(pressTimer);setPressTimer(null);}} onTouchMove={()=>{if(pressTimer) clearTimeout(pressTimer);setPressTimer(null);}}><h1 className="text-xl font-bold text-blue-400 cursor-pointer">高益營建軟體</h1><div className="text-xs text-gray-400 mt-1">業務整合系統 v2</div><div className="text-[10px] text-gray-600 mt-2">右鍵／長按進入系統設定</div></div>
        <nav className="p-4 space-y-2 overflow-y-auto">
          <button onClick={() => setActiveTab('customer')} className={`w-full text-left px-4 py-3 rounded transition ${activeTab === 'customer' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
            1. (潛在)客戶資料建檔
          </button>
          <button onClick={() => {setActiveTab('quote_new'); setQuoteItems([]); setCustomerCode('');}} className={`w-full text-left px-4 py-3 rounded transition ${activeTab === 'quote_new' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
            2. 營建系統報價建檔
          </button>
          <button onClick={() => setActiveTab('sales_track')} className={`w-full text-left px-4 py-3 rounded transition ${activeTab === 'sales_track' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
            3. 業務銷售追蹤專區
          </button>
          <button onClick={() => setActiveTab('contracts')} className={`w-full text-left px-4 py-3 rounded transition ${activeTab === 'contracts' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
            4. 客戶合約資料專區
          </button>
          <button onClick={() => {setActiveTab('quote_add'); setQuoteItems([]); setCustomerCode('');}} className={`w-full text-left px-4 py-3 rounded transition ${activeTab === 'quote_add' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
            5. 增設授權報價建檔
          </button>
          <button onClick={() => {setActiveTab('quote_maint'); setQuoteItems([]); setCustomerCode('');}} className={`w-full text-left px-4 py-3 rounded transition ${activeTab === 'quote_maint' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
            6. 維護合約報價建檔
          </button>
          {isAdminLoggedIn && <><div className="border-t border-gray-700 my-3"/><button onClick={()=>setActiveTab('system_settings')} className={`w-full text-left px-4 py-3 rounded transition ${activeTab === 'system_settings' ? 'bg-amber-500 text-white' : 'text-amber-300 hover:bg-gray-800'}`}>⚙ 系統設定：軟體與價格</button><button onClick={handleAdminLogout} className="w-full text-left px-4 py-2 rounded text-sm text-gray-400 hover:bg-gray-800">登出後台</button></>}
        </nav>
      </div>

      {/* 右側主內容區 */}
      <div className="flex-1 p-6 overflow-y-auto bg-gray-100">
        <div className="max-w-7xl mx-auto h-full">
          {activeTab === 'customer' && renderCustomerForm()}
          {activeTab === 'quote_new' && renderQuotationForm('2. 營建系統報價建檔 (新購)', 'NEW_LICENSE', 'CreateNewSystemQuote')}
          {activeTab === 'sales_track' && renderSalesTracking()}
          {activeTab === 'system_settings' && isAdminLoggedIn && renderSystemSettings()}
          {activeTab === 'contracts' && renderContracts()}
          {activeTab === 'quote_add' && renderQuotationForm('5. 增設授權報價建檔 (舊客加買人數)', 'ADD_USER', 'CreateAddUserQuote')}
          {activeTab === 'quote_maint' && renderQuotationForm('6. 維護合約報價建檔 (續約)', 'MAINTENANCE', 'CreateMaintenanceQuote')}
        </div>
      </div>
      
      {showQuotePreview && previewQuote && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 print:p-0 print:bg-white" onMouseDown={()=>setShowQuotePreview(false)}>
          <div className="quote-print w-full max-w-5xl max-h-[94vh] overflow-y-auto bg-white shadow-2xl p-4 text-black" onMouseDown={e=>e.stopPropagation()}>
            <style>{`@media print { body * { visibility:hidden; } .quote-print, .quote-print * { visibility:visible; } .quote-print { position:absolute; left:0; top:0; width:100%; max-width:none; max-height:none; overflow:visible; padding:5mm; box-shadow:none; } .no-print {display:none!important;} @page {size:A4 portrait;margin:5mm;} } .quote-sheet{border:1px solid #111;padding:6mm;font-family:Arial,'Microsoft JhengHei',sans-serif;font-size:11px;line-height:1.3}.quote-sheet table{border-collapse:collapse;width:100%}.quote-sheet th,.quote-sheet td{border:1px solid #111;padding:4px;vertical-align:middle}.quote-sheet .noborder td{border:0;padding:1px}.quote-sheet .compact{font-size:10px;line-height:1.25}`}</style>
            <div className="quote-sheet">
              <button onClick={()=>setShowQuotePreview(false)} className="no-print float-right text-2xl text-gray-400">×</button>
              <header className="border-b-2 border-black pb-2 mb-2">
                <div className="flex items-center gap-3"><img src="/goinfo.jpg" alt="Goinfo" className="h-10 object-contain"/><div className="text-xl font-bold">高益電腦股份有限公司 Goinfo Auto Co., Ltd.</div></div>
                <table className="noborder compact mt-1"><tbody><tr><td className="w-16">總公司台北</td><td>地址：台北市松山區復興北路333號9樓之3</td><td>電話：02-2713-7188</td><td>傳真：02-2713-4563</td></tr><tr><td>總公司台中</td><td>地址：台中市西屯區文心路三段241號16樓之9</td><td>電話：04-2298-1378</td><td>傳真：04-2298-1328</td></tr><tr><td>總公司高雄</td><td>地址：高雄市左營區大順一路93號5樓之5</td><td>電話：07-5580096</td><td>傳真：07-5580128</td></tr></tbody></table>
                <h1 className="text-center text-xl font-bold mt-1">軟體買賣報價單</h1><div className="text-center font-semibold">QUOTATION</div>
              </header>
              <table className="mb-2"><tbody><tr><td>報價單號：{previewQuote.quote.QuotationNo}（類型：{quoteStatusLabel(previewQuote.quote.Status)}）</td><td>報價日期：{formatDateForInput(previewQuote.quote.QuoteDate)}</td></tr><tr><td>客戶代號：{previewQuote.quote.CustomerCode || '－'}</td><td>客戶電話：{previewQuote.quote.Tel || previewQuote.quote.CustomerTel || '－'}</td></tr><tr><td>客戶名稱：{previewQuote.quote.CustomerName || '－'}　{previewQuote.quote.ContactName || previewQuote.quote.Contacter || ''}</td><td>客戶傳真：{previewQuote.quote.Fax || previewQuote.quote.CustomerFax || '－'}</td></tr></tbody></table>
              <table><colgroup><col className="w-[47%]"/><col className="w-[16%]"/><col className="w-[7%]"/><col className="w-[13%]"/><col className="w-[17%]"/></colgroup><thead><tr className="text-center bg-gray-100"><th>品名</th><th className="whitespace-nowrap">定價（未稅）</th><th>數量</th><th className="whitespace-nowrap">小計（未稅）</th><th>備註</th></tr></thead><tbody>{previewQuote.items.map(item=><tr key={item.QuotationItemId || item.SystemId}><td>{item.SystemCode && item.SystemName ? `${item.SystemCode}－${item.SystemName}` : (item.SystemName || item.SystemCode || '－')}（網路 {item.UserCount} 人版）</td><td className="text-right whitespace-nowrap">NT${Number(item.LineAmount||0).toLocaleString()}</td><td className="text-center">1</td><td className="text-right whitespace-nowrap">NT${Number(item.LineAmount||0).toLocaleString()}</td><td>折數 {item.Discount ?? 100}%<br/>優惠含稅 NT${Number(item.DiscountAmount||0).toLocaleString()}</td></tr>)}</tbody></table>
              <table><colgroup><col className="w-[47%]"/><col className="w-[16%]"/><col className="w-[7%]"/><col className="w-[13%]"/><col className="w-[17%]"/></colgroup><tbody><tr><td></td><td className="text-right whitespace-nowrap">未稅金額</td><td></td><td className="text-right whitespace-nowrap">NT${Number(previewQuote.quote.SubtotalAmount||0).toLocaleString()}</td><td></td></tr><tr><td></td><td className="text-right whitespace-nowrap">含稅金額</td><td></td><td className="text-right whitespace-nowrap">NT${Math.round(Number(previewQuote.quote.SubtotalAmount||0)*1.05).toLocaleString()}</td><td></td></tr><tr><td></td><td className="text-right whitespace-nowrap font-bold">優惠金額（含稅）</td><td></td><td className="text-right whitespace-nowrap font-bold">NT${Number(previewQuote.quote.DiscountAmount ?? previewQuote.quote.FinalAmount ?? previewQuote.quote.TotalAmount ?? 0).toLocaleString()}</td><td></td></tr></tbody></table>
              {previewQuote.isNewPurchase && <section className="mt-3 compact"><h2 className="font-bold text-sm border-b-2 border-black">系統說明</h2>{previewQuote.items.map(item=><div key={`note-${item.SystemId}`} className="mt-1"><b>{item.SystemCode}－{item.SystemName}：</b><span className="whitespace-pre-wrap">{item.Note || '尚未設定系統內容說明'}</span></div>)}<h2 className="font-bold text-sm border-b-2 border-black mt-3">維護說明</h2><ol className="list-decimal pl-5"><li>軟體系統自簽約日起免費提供教育訓練及維護修復，免費保固期為 {previewQuote.warrantyMonths % 12 === 0 ? `${previewQuote.warrantyMonths / 12} 年` : `${previewQuote.warrantyMonths} 個月`}。保固期滿後年度維護費為 NT${previewQuote.maintenanceTotal.toLocaleString()}（含稅）{previewQuote.maintenanceDiscountAmount !== null && previewQuote.maintenanceDiscountAmount !== '' ? `，優惠金額為 NT$${Number(previewQuote.maintenanceDiscountAmount).toLocaleString()}（含稅）` : ''}。</li><li>第二年起各系統年度維護費合計為 NT${previewQuote.maintenanceTotal.toLocaleString()}（含稅）。日後若新增授權人數，各系統每增加一使用者維護費：{previewQuote.items.map((item,i)=><span key={`m-${item.SystemId}`}>{i?'；':''}{item.SystemCode} NT${Number(item.addUserMaintenanceTaxIncluded||0).toLocaleString()}（含稅）</span>)}。</li><li>網路版同時作業人數，各系統每增加一人優惠金額如下（含稅）：{previewQuote.items.map((item,i)=><span key={`l-${item.SystemId}`}>{i?'；':''}{item.SystemCode} NT${Number(item.licenseAddUserTaxIncluded||0).toLocaleString()}</span>)}。</li></ol></section>}
              <table className="mt-3"><tbody><tr><th className="w-[34%] text-center">客戶確認簽章</th><th className="w-[30%] text-center">報價專用章</th><th className="w-[36%] text-center">承辦人資料</th></tr><tr className="h-32"><td></td><td className="text-center"><img src="/seal.JPG" alt="報價專用章" className="h-28 mx-auto object-contain"/></td><td className="p-0"><table className="h-full"><tbody><tr><td className="w-16">承辦人</td><td>產品規劃部副理　鐘廷睿</td></tr><tr><td>電話</td><td>(04)2298-1378#20</td></tr><tr><td>傳真</td><td>(04)2298-1328</td></tr><tr><td>承辦人簽名</td><td><img src="/sign.jpg" alt="承辦人簽名" className="h-7 object-contain"/></td></tr></tbody></table></td></tr></tbody></table>
              <div className="border-t border-black mt-2 pt-1 compact">說明：1. 本報價單以上金額含稅，有效期至 {quoteValidDate(previewQuote.quote)}。　2. 安裝完成後30日內，100%（30日到期票）。</div>
            </div>
            <div className="no-print mt-4 flex justify-end gap-3"><button onClick={()=>window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg">列印</button><button onClick={()=>editQuote(previewQuote.quote)} className="px-4 py-2 border border-amber-500 text-amber-600 rounded-lg">帶入修改</button><button onClick={()=>setShowQuotePreview(false)} className="px-4 py-2 border rounded-lg">關閉</button></div>
          </div>
        </div>
      )}
      {showCustomerPicker && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onMouseDown={()=>setShowCustomerPicker(false)}><div className="w-full max-w-2xl max-h-[80vh] bg-white rounded-xl shadow-2xl flex flex-col" onMouseDown={e=>e.stopPropagation()}><div className="flex items-center justify-between p-5 border-b"><h2 className="text-xl font-bold text-gray-800">選擇客戶</h2><button type="button" onClick={()=>setShowCustomerPicker(false)} className="text-2xl text-gray-400 hover:text-gray-700">×</button></div><div className="p-4 border-b"><div className="relative"><input autoFocus type="text" value={customerPickerTerm} onChange={e=>setCustomerPickerTerm(e.target.value)} placeholder="搜尋客戶代號或名稱關鍵字..." className="w-full border border-blue-400 rounded-lg py-2.5 pl-10 pr-3 outline-none focus:ring-2 focus:ring-blue-300"/><span className="absolute left-3 top-2.5 text-gray-400">⌕</span></div></div><div className="overflow-y-auto flex-1">{pickerCustomers.length ? pickerCustomers.map(c=><button type="button" key={c.CustomerId || c.Code} onClick={()=>selectQuoteCustomer(c)} className="w-full grid grid-cols-[140px_1fr] gap-4 text-left px-5 py-4 border-b hover:bg-blue-50 transition"><span className="font-medium text-blue-700">{c.Code}</span><span className="text-gray-800">{c.Name}</span></button>) : <div className="py-10 text-center text-gray-400">找不到符合的客戶</div>}</div><div className="p-4 border-t text-right"><button type="button" onClick={()=>setShowCustomerPicker(false)} className="px-4 py-2 border rounded-lg">取消</button></div></div></div>}
      {showAdminLogin && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><form onSubmit={handleAdminLogin} className="w-full max-w-sm bg-white rounded-xl shadow-2xl p-6"><h2 className="text-xl font-bold text-gray-800">系統設定登入</h2><p className="text-sm text-gray-500 mt-1 mb-5">請輸入管理者帳號與密碼</p><label className="block text-sm font-medium text-gray-700 mb-1">帳號</label><input value={adminLoginForm.username} onChange={e=>setAdminLoginForm(p=>({...p,username:e.target.value}))} className="w-full border rounded-lg p-2 mb-4" required/><label className="block text-sm font-medium text-gray-700 mb-1">密碼</label><input type="password" value={adminLoginForm.password} onChange={e=>setAdminLoginForm(p=>({...p,password:e.target.value}))} className="w-full border rounded-lg p-2" autoFocus required/>{adminLoginError&&<div className="mt-3 rounded bg-red-50 p-2 text-sm text-red-600">{adminLoginError}</div>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={()=>setShowAdminLogin(false)} className="px-4 py-2 rounded-lg border">取消</button><button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white">登入設定</button></div></form></div>}
    </div>
  );
}
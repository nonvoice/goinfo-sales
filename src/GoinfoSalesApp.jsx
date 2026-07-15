import React, { useState, useEffect, useMemo } from 'react';

const mockSystems = [
  { SystemId: 1, SystemCode: 'ERP01', SystemName: '營建ERP主系統', Category: '核心系統' },
  { SystemId: 2, SystemCode: 'EST01', SystemName: '發包計價模組', Category: '工程管理' },
  { SystemId: 3, SystemCode: 'HR01', SystemName: '出勤計薪模組', Category: '人事管理' },
];
const mockPricingRules = [
  { SystemId: 1, RuleType: 'LICENSE', FirstUserPrice: 100000, AdditionalUserPrice: 20000 },
  { SystemId: 1, RuleType: 'MAINTENANCE', FirstUserPrice: 15000, AdditionalUserPrice: 3000 },
  { SystemId: 2, RuleType: 'LICENSE', FirstUserPrice: 60000, AdditionalUserPrice: 15000 },
  { SystemId: 2, RuleType: 'MAINTENANCE', FirstUserPrice: 9000, AdditionalUserPrice: 2000 },
  { SystemId: 3, RuleType: 'LICENSE', FirstUserPrice: 40000, AdditionalUserPrice: 10000 },
  { SystemId: 3, RuleType: 'MAINTENANCE', FirstUserPrice: 6000, AdditionalUserPrice: 1500 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('customer');
  const initialCustomerForm = { Code: '', Name: '', Ucode: '', Boss: '', Contacter: '', Tel: '', Fax: '', Phone: '', Addr1: '', Addr2: '', Email: '', PayM: '0', State: '1', demoT: '', ContT: '', SetupT: '', Note: '', StateReason: '', PayMDetail: '' };
  const [customerForm, setCustomerForm] = useState(initialCustomerForm);
  const [customerList, setCustomerList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerCode, setSelectedCustomerCode] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [quoteItems, setQuoteItems] = useState([]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('https://goinfosales-n8n.zeabur.app/webhook/get-customers');
        if (!response.ok) return;
        const data = await response.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : data?.Code !== undefined ? [data] : Object.values(data || {}).find(Array.isArray) || [];
        setCustomerList(list);
      } catch (error) { console.error('Error fetching customers:', error); }
    };
    fetchCustomers();
  }, []);

  const formatDateForInput = (value) => value ? String(value).slice(0, 10) : '';
  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setCustomerForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleNewCustomer = () => { setCustomerForm(initialCustomerForm); setSelectedCustomerCode(null); };
  const handleSelectCustomer = (customer) => {
    setCustomerForm({ ...initialCustomerForm, ...customer, PayM: String(customer.PayM ?? 0), State: String(customer.State ?? 1), demoT: formatDateForInput(customer.demoT), ContT: formatDateForInput(customer.ContT), SetupT: formatDateForInput(customer.SetupT) });
    setSelectedCustomerCode(customer.Code);
  };
  const saveCustomer = async () => {
    if (!customerForm.Code?.trim()) { alert('請輸入客戶代號'); return; }
    const nullableDate = (value) => value && value.trim() !== '' ? value : null;
    const payload = { ...customerForm, Code: customerForm.Code.trim(), Name: customerForm.Name?.trim() || '', PayM: Number(customerForm.PayM) || 0, State: Number(customerForm.State) || 1, demoT: nullableDate(customerForm.demoT), ContT: nullableDate(customerForm.ContT), SetupT: nullableDate(customerForm.SetupT) };
    try {
      const response = await fetch('https://goinfosales-n8n.zeabur.app/webhook/save-customer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) { const message = await response.text(); throw new Error(message || `HTTP ${response.status}`); }
      alert('客戶資料已成功存入資料庫！');
      setCustomerList((prev) => { const idx = prev.findIndex((c) => c.Code === payload.Code); if (idx < 0) return [payload, ...prev]; const list = [...prev]; list[idx] = payload; return list; });
      setCustomerForm({ ...payload, demoT: payload.demoT || '', ContT: payload.ContT || '', SetupT: payload.SetupT || '' });
      setSelectedCustomerCode(payload.Code);
    } catch (error) { console.error('Error saving customer:', error); alert(`儲存失敗：${error.message}`); }
  };

  const addItem = (defaultType = 'NEW_LICENSE') => setQuoteItems([...quoteItems, { id: Date.now(), systemId: '', itemType: defaultType, userCount: 1 }]);
  const updateItem = (id, field, value) => setQuoteItems(quoteItems.map((item) => item.id === id ? { ...item, [field]: value } : item));
  const removeItem = (id) => setQuoteItems(quoteItems.filter((item) => item.id !== id));
  const calculateLineAmount = (item) => {
    if (!item.systemId) return 0;
    const ruleType = item.itemType === 'MAINTENANCE' ? 'MAINTENANCE' : 'LICENSE';
    const rule = mockPricingRules.find((r) => r.SystemId === parseInt(item.systemId, 10) && r.RuleType === ruleType);
    const users = parseInt(item.userCount, 10) || 0;
    if (!rule || users < 1) return 0;
    if (item.itemType === 'ADD_USER') return users * rule.AdditionalUserPrice;
    return rule.FirstUserPrice + ((users - 1) * rule.AdditionalUserPrice);
  };
  const totalAmount = useMemo(() => quoteItems.reduce((sum, item) => sum + calculateLineAmount(item), 0), [quoteItems]);
  const handleSubmit = async (actionType) => {
    const payload = { action: actionType, customer: customerName, items: quoteItems.map((item) => ({ systemId: item.systemId, itemType: item.itemType, userCount: item.userCount, lineAmount: calculateLineAmount(item) })), totalAmount: totalAmount * 1.05 };
    try { const response = await fetch('https://goinfosales-n8n.zeabur.app/webhook/save-quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error(); alert(`[${actionType}] 報價單已成功存入資料庫！`); setQuoteItems([]); } catch (error) { console.error(error); alert('報價單儲存失敗，請檢查網路狀態。'); }
  };

  const inputClass = 'w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none';
  const Field = ({ label, name, type = 'text', className = '' }) => <div className={className}><label className="block text-sm font-medium text-gray-600 mb-1">{label}</label><input type={type} name={name} value={customerForm[name] ?? ''} onChange={handleCustomerChange} className={inputClass} /></div>;
  const renderCustomerForm = () => {
    const filteredCustomers = customerList.filter((c) => (c.Name && c.Name.includes(searchTerm)) || (c.Code && c.Code.includes(searchTerm)));
    return <div className="flex flex-col lg:flex-row h-full gap-4">
      <div className="w-full lg:w-1/3 bg-white rounded-lg shadow-sm border overflow-hidden"><div className="p-4 border-b bg-gray-50"><div className="flex justify-between mb-3"><h3 className="font-bold text-gray-700">客戶清單</h3><button onClick={handleNewCustomer} className="bg-green-500 text-white text-xs px-3 py-1.5 rounded-md">新增</button></div><input type="text" placeholder="搜尋客戶名稱或代號" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={inputClass} /></div><div className="overflow-y-auto"><table className="w-full text-sm"><thead className="text-xs text-gray-500 bg-gray-100"><tr><th className="px-3 py-2 text-left">客戶代號</th><th className="px-3 py-2 text-left">客戶名稱</th></tr></thead><tbody>{filteredCustomers.map((c) => <tr key={c.Code} onClick={() => handleSelectCustomer(c)} className={`cursor-pointer border-b hover:bg-blue-50 ${selectedCustomerCode === c.Code ? 'bg-blue-100' : ''}`}><td className="px-3 py-2.5">{c.Code}</td><td className="px-3 py-2.5">{c.Name}</td></tr>)}</tbody></table></div></div>
      <div className="w-full lg:w-2/3 bg-white p-6 rounded-lg shadow-sm border overflow-y-auto"><div className="flex justify-between items-center mb-6 border-b pb-4"><div><h2 className="text-xl font-bold text-gray-800">{selectedCustomerCode ? '編輯客戶資料' : '新增客戶資料'}</h2><p className="text-gray-500 text-sm">dbo.Customer</p></div><button onClick={saveCustomer} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg">儲存客戶資料</button></div><section className="space-y-5"><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Field label="客戶代號 *" name="Code" /><Field label="客戶名稱" name="Name" className="md:col-span-2" /><Field label="統一編號" name="Ucode" /><Field label="負責人" name="Boss" /></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Field label="聯絡人" name="Contacter" /><Field label="聯絡電話" name="Tel" /><Field label="手機" name="Phone" /><Field label="傳真" name="Fax" /><Field label="E-Mail" name="Email" type="email" /></div><div className="grid gap-4"><Field label="發票地址" name="Addr1" /><Field label="通訊地址" name="Addr2" /></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Field label="展示日期" name="demoT" type="date" /><Field label="最後聯絡日期" name="ContT" type="date" /><Field label="安裝日期" name="SetupT" type="date" /></div><div><label className="block text-sm font-medium text-gray-600 mb-1">備註</label><textarea name="Note" value={customerForm.Note ?? ''} onChange={handleCustomerChange} rows="3" className={inputClass} /></div></section></div>
    </div>;
  };
  const renderQuotationForm = (title, defaultItemType, actionType) => <div className="bg-white p-6 rounded-lg shadow-sm border"><h2 className="text-xl font-bold mb-4">{title}</h2><input className={`${inputClass} mb-6`} placeholder="客戶名稱" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />{quoteItems.map((item) => <div key={item.id} className="flex gap-4 items-center bg-gray-50 p-4 rounded-lg border mb-3"><select className="flex-1 border p-2 rounded" value={item.systemId} onChange={(e) => updateItem(item.id, 'systemId', e.target.value)}><option value="">選擇系統</option>{mockSystems.map((sys) => <option key={sys.SystemId} value={sys.SystemId}>{sys.SystemName}</option>)}</select><input type="number" min="1" className="w-24 border p-2 rounded" value={item.userCount} onChange={(e) => updateItem(item.id, 'userCount', e.target.value)} /><span className="w-32 text-right font-bold text-blue-600">{calculateLineAmount(item).toLocaleString()}</span><button onClick={() => removeItem(item.id)} className="text-red-500">刪除</button></div>)}<button onClick={() => addItem(defaultItemType)} className="bg-green-500 text-white px-4 py-2 rounded-lg">加入項目</button><div className="border-t pt-4 text-right mt-6"><div>未稅合計：{totalAmount.toLocaleString()}</div><div className="text-xl font-bold mt-2">含稅總計：{(totalAmount * 1.05).toLocaleString()}</div><button onClick={() => handleSubmit(actionType)} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded">儲存報價單</button></div></div>;
  return <div className="h-screen bg-gray-100 flex flex-col md:flex-row font-sans overflow-hidden"><aside className="w-full md:w-64 bg-gray-900 text-white p-4"><h1 className="text-xl font-bold text-blue-400 mb-6">Goinfo Sales</h1><button onClick={() => setActiveTab('customer')} className="w-full text-left px-4 py-3 rounded hover:bg-gray-800">1. 客戶建檔</button><button onClick={() => { setActiveTab('quotenew'); setQuoteItems([]); }} className="w-full text-left px-4 py-3 rounded hover:bg-gray-800">2. 新系統報價</button><button onClick={() => { setActiveTab('quoteadd'); setQuoteItems([]); }} className="w-full text-left px-4 py-3 rounded hover:bg-gray-800">5. 加購帳號</button><button onClick={() => { setActiveTab('quotemaint'); setQuoteItems([]); }} className="w-full text-left px-4 py-3 rounded hover:bg-gray-800">6. 維護報價</button></aside><main className="flex-1 p-6 overflow-y-auto">{activeTab === 'customer' && renderCustomerForm()}{activeTab === 'quotenew' && renderQuotationForm('新系統報價', 'NEW_LICENSE', 'NEW_LICENSE')}{activeTab === 'quoteadd' && renderQuotationForm('加購帳號報價', 'ADD_USER', 'ADD_USER')}{activeTab === 'quotemaint' && renderQuotationForm('維護報價', 'MAINTENANCE', 'MAINTENANCE')}</main></div>;
}

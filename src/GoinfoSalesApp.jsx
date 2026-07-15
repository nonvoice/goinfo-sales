import React, { useState, useEffect, useMemo } from 'react';

// === 模擬資料庫資料 (未來由 n8n Webhook 提供) ===
const mockSystems = [
  { SystemId: 1, SystemCode: 'ERP01', SystemName: '營建ERP主系統', Category: '核心系統' },
  { SystemId: 2, SystemCode: 'EST01', SystemName: '發包計價模組', Category: '工程管理' },
  { SystemId: 3, SystemCode: 'HR01', SystemName: '出勤計薪模組', Category: '人事管理' }
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
  const [activeTab, setActiveTab] = useState('customer'); // 預設頁面改為客戶建檔

  // --- 1. (潛在)客戶資料建檔的表單與列表狀態 ---
  const initialCustomerForm = {
    Code: '', Name: '', Ucode: '', Boss: '', Contacter: '',
    Tel: '', Fax: '', Phone: '', Addr1: '', Addr2: '',
    Email: '', PayM: '0', State: '1', demoT: '', ContT: '',
    SetupT: '', Note: '', StateReason: '', PayMDetail: ''
  };

  const [customerForm, setCustomerForm] = useState(initialCustomerForm);
  const [customerList, setCustomerList] = useState([]); // 清空假資料
  const [searchTerm, setSearchTerm] = useState(''); // 搜尋關鍵字
  const [selectedCustomerCode, setSelectedCustomerCode] = useState(null); // 目前選中的客戶

  // --- 初始化：向 n8n 索取真實客戶清單 ---
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('https://goinfosales-n8n.zeabur.app/webhook/get-customers');
        if (response.ok) {
          const data = await response.json();
          
          let list = [];
          if (Array.isArray(data)) {
            list = data;
          } else if (data && data.data && Array.isArray(data.data)) {
            list = data.data;
          } else if (data && typeof data === 'object' && data.Code !== undefined) {
            list = [data];
          } else {
            const arrayProperty = Object.values(data).find(val => Array.isArray(val));
            list = arrayProperty || [];
          }
          setCustomerList(list);
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
      }
    };
    fetchCustomers();
  }, []);

  // --- 自動預設選取第一筆資料 ---
  useEffect(() => {
    if (customerList.length > 0 && !selectedCustomerCode) {
      handleSelectCustomer(customerList[0]);
    }
  }, [customerList]);

  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setCustomerForm(prev => ({ ...prev, [name]: value }));
  };

  const handleNewCustomer = () => {
    setCustomerForm(initialCustomerForm);
    setSelectedCustomerCode(null);
  };

const formatDateForInput = (value) => {
  if (!value) return '';
  return String(value).slice(0, 10);
};

const handleSelectCustomer = (customer) => {
  setCustomerForm({
    ...initialCustomerForm,
    ...customer,
    PayM: String(customer.PayM ?? 0),
    State: String(customer.State ?? 1),
    demoT: formatDateForInput(customer.demoT),
    ContT: formatDateForInput(customer.ContT),
    SetupT: formatDateForInput(customer.SetupT),
  });

  setSelectedCustomerCode(customer.Code);
};

  const saveCustomer = async () => {
  if (!customerForm.Code?.trim()) {
    alert('請輸入客戶代號');
    return;
  }

  const toNullableDate = (value) => {
    return value && value.trim() !== '' ? value : null;
  };

  const payload = {
    ...customerForm,
    Code: customerForm.Code.trim(),
    Name: customerForm.Name?.trim() || '',
    PayM: Number(customerForm.PayM) || 0,
    State: Number(customerForm.State) || 1,
    demoT: toNullableDate(customerForm.demoT),
    ContT: toNullableDate(customerForm.ContT),
    SetupT: toNullableDate(customerForm.SetupT),
  };

  try {
    const response = await fetch(
      'https://goinfosales-n8n.zeabur.app/webhook/save-customer',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('儲存客戶失敗：', errorText);
      alert(`儲存失敗：${errorText || response.status}`);
      return;
    }

    alert('客戶資料已成功存入資料庫！');

    setCustomerList((prev) => {
      const idx = prev.findIndex((c) => c.Code === payload.Code);

      if (idx >= 0) {
        const list = [...prev];
        list[idx] = payload;
        return list;
      }

      return [payload, ...prev];
    });

    setSelectedCustomerCode(payload.Code);
  } catch (error) {
    console.error('儲存客戶發生錯誤：', error);
    alert('發生錯誤，無法連線至 n8n 伺服器。');
  }
};


  // --- 營建系統報價建檔 (New Quote) 的狀態 ---
  const [customerName, setCustomerName] = useState('');
  const [quoteItems, setQuoteItems] = useState([]);
  
  const addItem = (defaultType = 'NEW_LICENSE') => {
    setQuoteItems([...quoteItems, {
      id: Date.now(),
      systemId: '',
      itemType: defaultType, 
      userCount: 1,
    }]);
  };

  const updateItem = (id, field, value) => {
    setQuoteItems(quoteItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (id) => {
    setQuoteItems(quoteItems.filter(item => item.id !== id));
  };

  const calculateLineAmount = (item) => {
    if (!item.systemId) return 0;
    const ruleType = item.itemType === 'MAINTENANCE' ? 'MAINTENANCE' : 'LICENSE';
    const rule = mockPricingRules.find(r => r.SystemId === parseInt(item.systemId) && r.RuleType === ruleType);
    if (!rule) return 0;

    let amount = 0;
    const users = parseInt(item.userCount) || 0;
    if (item.itemType === 'NEW_LICENSE' || item.itemType === 'MAINTENANCE') {
      if (users >= 1) amount = rule.FirstUserPrice + ((users - 1) * rule.AdditionalUserPrice);
    } else if (item.itemType === 'ADD_USER') {
      amount = users * rule.AdditionalUserPrice;
    }
    return amount;
  };

  const totalAmount = useMemo(() => {
    return quoteItems.reduce((sum, item) => sum + calculateLineAmount(item), 0);
  }, [quoteItems]);

  const handleSubmit = async (actionType) => {
    const payload = {
      action: actionType,
      customer: customerName,
      items: quoteItems.map(item => ({
        systemId: item.systemId,
        itemType: item.itemType,
        userCount: item.userCount,
        lineAmount: calculateLineAmount(item)
      })),
      totalAmount: totalAmount * 1.05
    };

    try {
      const response = await fetch('https://goinfosales-n8n.zeabur.app/webhook/save-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        alert(`[${actionType}] 報價單已成功存入資料庫！`);
        setQuoteItems([]);
      } else {
        alert('報價單儲存失敗，請檢查網路狀態。');
      }
    } catch (error) {
      console.error('Error saving quote:', error);
      alert('發生錯誤，無法連線至 n8n 伺服器。');
    }
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

  // 2. 營建系統報價建檔 (共用的報價介面)
  const renderQuotationForm = (title, defaultItemType, actionType) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
       <h2 className="text-xl font-bold mb-4 text-gray-800">{title}</h2>
       
       <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">選擇客戶</label>
          <input type="text" className="w-full border border-gray-300 rounded-lg p-2" placeholder="請輸入或選擇客戶..." value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
       </div>

       <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">報價明細</h3>
          <button onClick={() => addItem(defaultItemType)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm">
            + 新增模組
          </button>
       </div>

       <div className="space-y-4 mb-6">
          {quoteItems.length === 0 && <div className="text-center text-gray-400 py-4 border-2 border-dashed rounded-lg">尚無項目</div>}
          {quoteItems.map(item => (
            <div key={item.id} className="flex gap-4 items-center bg-gray-50 p-4 rounded-lg border">
              <select className="flex-1 border p-2 rounded" value={item.systemId} onChange={(e) => updateItem(item.id, 'systemId', e.target.value)}>
                <option value="">選擇系統</option>
                {mockSystems.map(sys => <option key={sys.SystemId} value={sys.SystemId}>{sys.SystemName}</option>)}
              </select>
              <select className="flex-1 border p-2 rounded" value={item.itemType} onChange={(e) => updateItem(item.id, 'itemType', e.target.value)}>
                <option value="NEW_LICENSE">新購授權</option>
                <option value="ADD_USER">增設授權</option>
                <option value="MAINTENANCE">維護費</option>
              </select>
              <input type="number" min="1" className="w-24 border p-2 rounded text-right" value={item.userCount} onChange={(e) => updateItem(item.id, 'userCount', e.target.value)} />
              <div className="w-32 text-right font-bold text-blue-600">${calculateLineAmount(item).toLocaleString()}</div>
              <button onClick={() => removeItem(item.id)} className="text-red-500">X</button>
            </div>
          ))}
       </div>

       {quoteItems.length > 0 && (
         <div className="border-t pt-4 text-right">
           <div className="text-gray-600">未稅: ${totalAmount.toLocaleString()}</div>
           <div className="text-xl font-bold mt-2">含稅總計: ${(totalAmount * 1.05).toLocaleString()}</div>
           <button onClick={() => handleSubmit(actionType)} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded shadow">
             產生並存檔
           </button>
         </div>
       )}
    </div>
  );

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
        <div className="p-6 bg-gray-950 border-b border-gray-800">
          <h1 className="text-xl font-bold text-blue-400">高益營建軟體</h1>
          <div className="text-xs text-gray-400 mt-1">業務整合系統 v2</div>
        </div>
        <nav className="p-4 space-y-2 overflow-y-auto">
          <button onClick={() => setActiveTab('customer')} className={`w-full text-left px-4 py-3 rounded transition ${activeTab === 'customer' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
            1. (潛在)客戶資料建檔
          </button>
          <button onClick={() => {setActiveTab('quote_new'); setQuoteItems([]);}} className={`w-full text-left px-4 py-3 rounded transition ${activeTab === 'quote_new' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
            2. 營建系統報價建檔
          </button>
          <button onClick={() => setActiveTab('sales_track')} className={`w-full text-left px-4 py-3 rounded transition ${activeTab === 'sales_track' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
            3. 業務銷售追蹤專區
          </button>
          <button onClick={() => setActiveTab('contracts')} className={`w-full text-left px-4 py-3 rounded transition ${activeTab === 'contracts' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
            4. 客戶合約資料專區
          </button>
          <button onClick={() => {setActiveTab('quote_add'); setQuoteItems([]);}} className={`w-full text-left px-4 py-3 rounded transition ${activeTab === 'quote_add' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
            5. 增設授權報價建檔
          </button>
          <button onClick={() => {setActiveTab('quote_maint'); setQuoteItems([]);}} className={`w-full text-left px-4 py-3 rounded transition ${activeTab === 'quote_maint' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
            6. 維護合約報價建檔
          </button>
        </nav>
      </div>

      {/* 右側主內容區 */}
      <div className="flex-1 p-6 overflow-y-auto bg-gray-100">
        <div className="max-w-7xl mx-auto h-full">
          {activeTab === 'customer' && renderCustomerForm()}
          {activeTab === 'quote_new' && renderQuotationForm('2. 營建系統報價建檔 (新購)', 'NEW_LICENSE', 'CreateNewSystemQuote')}
          {activeTab === 'sales_track' && renderSalesTracking()}
          {activeTab === 'contracts' && renderContracts()}
          {activeTab === 'quote_add' && renderQuotationForm('5. 增設授權報價建檔 (舊客加買人數)', 'ADD_USER', 'CreateAddUserQuote')}
          {activeTab === 'quote_maint' && renderQuotationForm('6. 維護合約報價建檔 (續約)', 'MAINTENANCE', 'CreateMaintenanceQuote')}
        </div>
      </div>
      
    </div>
  );
}

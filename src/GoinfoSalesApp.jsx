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
  const [activeTab, setActiveTab] = useState('quote_new'); // 預設頁面

  // --- 1. (潛在)客戶資料建檔的表單狀態 ---
  const [customerForm, setCustomerForm] = useState({
    Code: '', Name: '', Ucode: '', Boss: '', Contacter: '',
    Tel: '', Fax: '', Phone: '', Addr1: '', Addr2: '',
    Email: '', PayM: '1', State: '1', demoT: '', ContT: '',
    SetupT: '', Note: '', StateReason: '', PayMDetail: ''
  });

  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setCustomerForm(prev => ({ ...prev, [name]: value }));
  };

  // --- 營建系統報價建檔 (New Quote) 的狀態 ---
  const [customerName, setCustomerName] = useState('');
  const [quoteItems, setQuoteItems] = useState([]);
  
  // 新增報價項目
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

  const handleSubmit = (actionType) => {
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
    alert(`[${actionType}] 已送出至 n8n 工作流！\n` + JSON.stringify(payload, null, 2));
  };

  
  // 1. (潛在)客戶資料建檔
  const renderCustomerForm = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">1. (潛在)客戶資料建檔</h2>
          <p className="text-gray-500 text-sm mt-1">對應資料表：<code>dbo.Customer</code></p>
        </div>
        <button 
          onClick={() => alert('客戶資料已準備好送出儲存！\n\n' + JSON.stringify(customerForm, null, 2))}
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
              <input type="text" name="Code" value={customerForm.Code} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none" required placeholder="如: CUST-001" />
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
            
            {/* 銷售狀態與條件欄位 */}
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

            {/* 付款方式與條件欄位 */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">付款方式 (PayM)</label>
              <select name="PayM" value={customerForm.PayM} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white">
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
            
            {/* 日期區塊 */}
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
  );

  // 2. 營建系統報價建檔 (共用的報價介面，可傳入預設類型)
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
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans">
      
      {/* 左側 Sidebar 導覽列 */}
      <div className="w-full md:w-64 bg-gray-900 text-white shadow-lg flex-shrink-0">
        <div className="p-6 bg-gray-950 border-b border-gray-800">
          <h1 className="text-xl font-bold text-blue-400">高益營建軟體</h1>
          <div className="text-xs text-gray-400 mt-1">業務整合系統 v2</div>
        </div>
        <nav className="p-4 space-y-2">
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
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-5xl mx-auto">
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

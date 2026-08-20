import React, { useState, useEffect, useMemo } from 'react';

const API_BASE = 'https://goinfosales-n8n.zeabur.app/webhook';
console.log('Goinfo Sales frontend version: 2026-08-20-clean-build');
const initialSystemForm = { SystemId: '', SystemCode: '', SystemName: '', Category: '', IsActive: true, Note: '' };
const initialRuleForm = { PricingRuleId: '', SystemId: '', RuleType: 'LICENSE', VersionNo: 1, EffectiveStartDate: new Date().toISOString().slice(0, 10), EffectiveEndDate: '', FirstUserPrice: '', AdditionalUserPrice: '', MinimumUsers: 1, IsActive: true, Remark: '' };

const permissionFunctions = [
  { code: 'CUSTOMER', label: '潛在客戶資料建檔' },
  { code: 'QUOTE', label: '營建系統報價作業' },
  { code: 'SALES_TRACK', label: '業務銷售追蹤專區' },
  { code: 'CONTRACT', label: '客戶合約資料專區' },
  { code: 'ADD_USER_QUOTE', label: '增設授權報價建檔' },
  { code: 'MAINTENANCE_QUOTE', label: '維護合約報價建檔' },
];

const createDefaultPermissionRows = () =>
  permissionFunctions.map((item) => ({
    functionCode: item.code,
    canQuery: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  }));

const toBoolean = (value) =>
  value === true ||
  value === 1 ||
  value === '1' ||
  value === 'true';

const toIsoDate = (value) => {
  if (!value) return '';
  const raw = String(value).trim();
  const matched = raw.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})/);

  if (matched) {
    return `${matched[1]}-${matched[2]}-${matched[3]}`;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatAmountInput = (value) => {
  const digits = String(value ?? '').replace(/[^\d]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('en-US');
};

const parseAmountInput = (value) => {
  const digits = String(value ?? '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
};

const isIsoDate = (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);

function SalesLoginPage({ onLoginSuccess }) {
  const [form, setForm] = useState({ loginAccount: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.loginAccount.trim() || !form.password) {
      setError('請輸入帳號與密碼');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/auth-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginAccount: form.loginAccount.trim(),
          password: form.password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.token || !data.user) {
        throw new Error(data.message || '帳號或密碼錯誤');
      }

      sessionStorage.setItem('salesToken', data.token);
      sessionStorage.setItem('salesUser', JSON.stringify(data.user));

      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || '登入失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold text-slate-800">Goinfo Sales</h1>
          <p className="mt-2 text-sm text-slate-500">業務案件管理系統</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">帳號</label>
          <input
            type="text"
            autoComplete="username"
            value={form.loginAccount}
            onChange={(event) => setForm((prev) => ({ ...prev, loginAccount: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="請輸入帳號"
          />
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-slate-700">密碼</label>
          <input
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="請輸入密碼"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading ? '登入驗證中...' : '登入'}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const initialUserForm = {
    userId: '',
    loginAccount: '',
    displayName: '',
    password: '',
    roleCode: 'SALES',
    isActive: true,
    mustChangePassword: true,
    canViewCustomer: true,
    canViewQuote: false,
    canViewSalesTrack: true,
    canViewContracts: false,
    canViewSystemSettings: false,
    canManageUsers: false,
    permissions: createDefaultPermissionRows(),
  };

  const [appUsers, setAppUsers] = useState([]);
  const [appUsersLoading, setAppUsersLoading] = useState(false);
  const [userForm, setUserForm] = useState(initialUserForm);
  const [userSaving, setUserSaving] = useState(false);
  const [selectedManagedUserId, setSelectedManagedUserId] = useState(null);
  
  const [activeTab, setActiveTab] = useState('salestrack');
  const [salesAuthReady, setSalesAuthReady] = useState(false);
  const [salesUser, setSalesUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem('salesUser');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const currentRole = String(salesUser?.role || salesUser?.Role || salesUser?.RoleCode || '').toUpperCase();
  const isRoot = currentRole === 'ROOT';

  const can = (functionCode, action) => {
    if (isRoot) return true;
    const newPermission = salesUser?.permissions?.[functionCode]?.[action];
    if (newPermission !== undefined) return Boolean(newPermission);
    if (action !== 'canQuery') return false;

    const legacyPermissions = salesUser?.permissions || salesUser || {};
    const legacyFieldMap = {
      CUSTOMER: 'canViewCustomer',
      QUOTE: 'canViewQuote',
      SALES_TRACK: 'canViewSalesTrack',
      CONTRACT: 'canViewContracts',
      ADD_USER_QUOTE: 'canViewQuote',
      MAINTENANCE_QUOTE: 'canViewQuote',
      SYSTEM_SETTINGS: 'canViewSystemSettings',
      USER_PERMISSION: 'canManageUsers',
    };
    const fieldName = legacyFieldMap[functionCode];
    if (!fieldName) return false;

    const value =
      legacyPermissions?.[fieldName] ??
      legacyPermissions?.[fieldName.charAt(0).toUpperCase() + fieldName.slice(1)] ??
      salesUser?.[fieldName] ??
      salesUser?.[fieldName.charAt(0).toUpperCase() + fieldName.slice(1)];
    return value === true || value === 1 || value === '1';
  };

  const [opportunityList, setOpportunityList] = useState([]);
  const [opportunityLoading, setOpportunityLoading] = useState(false);
  const [opportunityError, setOpportunityError] = useState('');
  const [selectedOpportunityId, setSelectedOpportunityId] = useState(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [followUpList, setFollowUpList] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showOpportunityForm, setShowOpportunityForm] = useState(false);
  const [opportunitySaving, setOpportunitySaving] = useState(false);

  const initialOpportunityForm = {
    opportunityId: '', customerId: '', quotationIds: [], primaryQuotationId: '',
    opportunityName: '', stage: 'INITIAL_CONTACT', customerGrade: 'B',
    createdAt: new Date().toISOString().slice(0, 10), estimatedAmount: '',
    expectedCloseDate: '', nextFollowUpDate: '', description: '',
  };
  const [opportunityForm, setOpportunityForm] = useState(initialOpportunityForm);

  const initialFollowUpForm = {
    followUpType: 'PHONE', content: '', nextFollowUpDate: '', contactName: '',
    contactMethod: '電話', stage: '', customerGrade: '', 
    followUpDate: new Date().toISOString().slice(0, 10), quotationId: '',
  };
  const [followUpForm, setFollowUpForm] = useState(initialFollowUpForm);
  const [followUpSaving, setFollowUpSaving] = useState(false);
  
  const [opportunityDateFrom, setOpportunityDateFrom] = useState('');
  const [opportunityDateTo, setOpportunityDateTo] = useState('');
  const [opportunitySearch, setOpportunitySearch] = useState('');
  const [opportunityOwnerName, setOpportunityOwnerName] = useState('');
  const [opportunitySort, setOpportunitySort] = useState('CreatedAt');
  const [hideNoFollowUp, setHideNoFollowUp] = useState(true);
  const [showOpportunityCustomerPicker, setShowOpportunityCustomerPicker] = useState(false);
  const [opportunityCustomerSearch, setOpportunityCustomerSearch] = useState('');

  const [systemList, setSystemList] = useState([]);
  const [pricingRuleList, setPricingRuleList] = useState([]);
  const [systemForm, setSystemForm] = useState(initialSystemForm);
  const [ruleForm, setRuleForm] = useState(initialRuleForm);
  
  const initialCustomerForm = { Code: '', Name: '', Ucode: '', Boss: '', Contacter: '', Tel: '', Fax: '', Phone: '', Addr1: '', Addr2: '', Email: '', PayM: '0', State: '1', demoT: '', ContT: '', SetupT: '', Note: '', StateReason: '', PayMDetail: '' };
  const [customerForm, setCustomerForm] = useState(initialCustomerForm);
  const [customerList, setCustomerList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerCode, setSelectedCustomerCode] = useState(null);
  const [customerCode, setCustomerCode] = useState('');
  
  const [quoteItems, setQuoteItems] = useState([]);
  const [warrantyMonths, setWarrantyMonths] = useState(12);
  const [maintenanceDiscountAmount, setMaintenanceDiscountAmount] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerPickerTerm, setCustomerPickerTerm] = useState('');
  
  const [quoteList, setQuoteList] = useState([]);
  const [quoteListLoading, setQuoteListLoading] = useState(false);
  const [quoteDateFrom, setQuoteDateFrom] = useState('');
  const [quoteDateTo, setQuoteDateTo] = useState('');
  const [quoteOwnerUserId, setQuoteOwnerUserId] = useState('');
  const [salesUserOptions, setSalesUserOptions] = useState([]);
  const [showQuotePreview, setShowQuotePreview] = useState(false);
  const [previewQuote, setPreviewQuote] = useState(null);
  const [customerQuoteOptions, setCustomerQuoteOptions] = useState([]);
  const [customerQuoteLoading, setCustomerQuoteLoading] = useState(false);

  const normalizeList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.quotes)) return data.quotes;
    if (Array.isArray(data?.rows)) return data.rows;
    return data && typeof data === 'object' ? [data] : [];
  };
  
  const getApiList = async (url) => { 
    const res = await fetch(url); 
    if (!res.ok) throw new Error(String(res.status)); 
    return normalizeList(await res.json()); 
  };

  const handleSalesLogout = () => {
    sessionStorage.removeItem('salesToken');
    sessionStorage.removeItem('salesUser');
    setSalesUser(null);
    setOpportunityList([]);
    setSelectedOpportunity(null);
    setFollowUpList([]);
    setSelectedOpportunityId(null);
    setActiveTab('customer');
  };

  const salesApiFetch = async (path, options = {}) => {
    const token = sessionStorage.getItem('salesToken');
    if (!token) {
      handleSalesLogout();
      throw new Error('請先登入');
    }
    const response = await fetch(`${API_BASE}/${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) { handleSalesLogout(); throw new Error(data.message || '登入已失效，請重新登入'); }
    if (response.status === 403) throw new Error(data.message || '您沒有此案件的存取權限');
    if (!response.ok) throw new Error(data.message || `系統處理失敗：${response.status}`);
    return data;
  };

  const getResultList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.rows)) return data.rows;
    return [];
  };

  const loadAppUsers = async () => {
    setAppUsersLoading(true);
    try {
      const result = await salesApiFetch('get-app-users');
      const users = result?.users || result?.data || result?.rows || (Array.isArray(result) ? result : []);
      setAppUsers(Array.isArray(users) ? users : []);
    } catch (error) {
      console.error('loadAppUsers error:', error);
      alert(error.message || '讀取使用者清單失敗');
      setAppUsers([]);
    } finally {
      setAppUsersLoading(false);
    }
  };

  const loadUserPermissionRows = async (userId) => {
    try {
      const result = await salesApiFetch(`get-app-user-permissions?userId=${encodeURIComponent(userId)}`);
      const rows = Array.isArray(result) ? result : result?.rows || result?.data || [];
      return permissionFunctions.map((item) => {
        const found = rows.find((row) => row.FunctionCode === item.code);
        return {
          functionCode: item.code,
          canQuery: toBoolean(found?.CanQuery),
          canCreate: toBoolean(found?.CanCreate),
          canUpdate: toBoolean(found?.CanUpdate),
          canDelete: toBoolean(found?.CanDelete),
        };
      });
    } catch (error) {
      return createDefaultPermissionRows();
    }
  };

  const saveAppUser = async () => {
    if (currentRole !== 'ROOT') return alert('僅 ROOT 可管理使用者');
    if (!userForm.loginAccount.trim()) return alert('請輸入登入帳號');
    if (!userForm.displayName.trim()) return alert('請輸入顯示名稱');
    if (!userForm.userId && !userForm.password) return alert('新增使用者時必須設定初始密碼');
    if (!userForm.userId && userForm.password.length < 8) return alert('初始密碼至少需要 8 個字元');
    if (String(userForm.roleCode).toUpperCase() === 'ROOT') return alert('不可從此畫面新增或修改 ROOT 帳號');

    setUserSaving(true);
    try {
      await salesApiFetch('save-app-user', {
        method: 'POST',
        body: JSON.stringify({
          action: userForm.userId ? 'update' : 'create',
          loginAccount: userForm.loginAccount.trim(),
          displayName: userForm.displayName.trim(),
          password: userForm.password || null,
          roleCode: userForm.roleCode,
          isActive: Boolean(userForm.isActive),
          mustChangePassword: Boolean(userForm.mustChangePassword),
          canViewCustomer: Boolean(userForm.canViewCustomer),
          canViewQuote: Boolean(userForm.canViewQuote),
          canViewSalesTrack: Boolean(userForm.canViewSalesTrack),
          canViewContracts: Boolean(userForm.canViewContracts),
          canViewSystemSettings: Boolean(userForm.canViewSystemSettings),
          canManageUsers: Boolean(userForm.canManageUsers),
          permissions: userForm.permissions,
        }),
      });
      setUserForm(initialUserForm);
      setSelectedManagedUserId(null);
      await loadAppUsers();
      alert(userForm.userId ? '使用者資料已更新' : '使用者已新增');
    } catch (error) {
      alert(error.message || '儲存使用者失敗');
    } finally {
      setUserSaving(false);
    }
  };

  const loadOpportunities = async () => {
    setOpportunityLoading(true);
    setOpportunityError('');
    try {
      const result = await salesApiFetch('get-sales-opportunities');
      setOpportunityList(getResultList(result));
    } catch (error) {
      setOpportunityError(error.message || '讀取案件清單失敗');
    } finally {
      setOpportunityLoading(false);
    }
  };

  const loadOpportunityDetail = async (opportunityId) => {
    if (!opportunityId) return;
    setDetailLoading(true);
    try {
      const result = await salesApiFetch(`get-sales-opportunity-detail?opportunityId=${encodeURIComponent(opportunityId)}`);
      const detail = Array.isArray(result) ? result[0] : result;
      const opportunity = detail?.opportunity || detail?.data?.opportunity || detail?.data || detail;
      const followUps = detail?.followUps || detail?.data?.followUps || detail?.followUpList || [];
      if (!opportunity?.OpportunityId && !opportunity?.opportunityId) throw new Error('找不到案件');

      const linkedQuotations = detail?.linkedQuotations || detail?.data?.linkedQuotations || [];
      setSelectedOpportunity({ ...opportunity, linkedQuotations: Array.isArray(linkedQuotations) ? linkedQuotations : [] });
      setFollowUpList(Array.isArray(followUps) ? followUps : []);
      setSelectedOpportunityId(opportunity.OpportunityId || opportunity.opportunityId);
    } catch (error) {
      alert(error.message || '讀取案件明細失敗');
    } finally {
      setDetailLoading(false);
    }
  };

  const openNewOpportunity = () => {
    setOpportunityForm(initialOpportunityForm);
    setShowOpportunityForm(true);
  };

  const openEditOpportunity = () => {
    if (!selectedOpportunity) return;
    const customerId = selectedOpportunity.CustomerId || selectedOpportunity.customerId || '';
    const linkedQuotations = Array.isArray(selectedOpportunity.linkedQuotations) ? selectedOpportunity.linkedQuotations : [];
    const quotationIds = linkedQuotations.map((quote) => String(quote.QuotationId || quote.quotationId || '')).filter(Boolean);
    const primaryQuotation = linkedQuotations.find((quote) => quote.IsPrimary === true || quote.IsPrimary === 1 || String(quote.isPrimary) === 'true' || String(quote.IsPrimary) === '1');
    const primaryQuotationId = String(primaryQuotation?.QuotationId || primaryQuotation?.quotationId || selectedOpportunity.QuotationId || selectedOpportunity.quotationId || quotationIds[0] || '');

    setOpportunityForm({
      opportunityId: selectedOpportunity.OpportunityId || selectedOpportunity.opportunityId || '',
      customerId: String(customerId),
      quotationIds,
      primaryQuotationId,
      opportunityName: selectedOpportunity.OpportunityName || selectedOpportunity.opportunityName || '',
      stage: selectedOpportunity.Stage || selectedOpportunity.stage || 'INITIAL_CONTACT',
      customerGrade: selectedOpportunity.CustomerGrade || selectedOpportunity.customerGrade || 'B',
      createdAt: formatDateForInput(selectedOpportunity.CreatedAt || selectedOpportunity.createdAt || selectedOpportunity.FillDate || selectedOpportunity.fillDate) || new Date().toISOString().slice(0, 10),
      estimatedAmount: selectedOpportunity.EstimatedAmount || selectedOpportunity.estimatedAmount || '',
      expectedCloseDate: formatDateForInput(selectedOpportunity.ExpectedCloseDate || selectedOpportunity.expectedCloseDate),
      nextFollowUpDate: formatDateForInput(selectedOpportunity.NextFollowUpDate || selectedOpportunity.nextFollowUpDate),
      description: selectedOpportunity.Description || selectedOpportunity.description || '',
    });
    setShowOpportunityForm(true);
  };

  const saveOpportunity = async () => {
    if (!opportunityForm.customerId) return alert('請選擇客戶');
    if (!opportunityForm.opportunityName.trim()) return alert('請輸入案件名稱');
    if (!isIsoDate(opportunityForm.createdAt) || !isIsoDate(opportunityForm.expectedCloseDate) || !isIsoDate(opportunityForm.nextFollowUpDate)) {
      return alert('日期請使用 YYYY-MM-DD 格式');
    }

    setOpportunitySaving(true);
    try {
      const payload = {
        action: opportunityForm.opportunityId ? 'update' : 'create',
        opportunityId: opportunityForm.opportunityId ? Number(opportunityForm.opportunityId) : null,
        customerId: Number(opportunityForm.customerId),
        quotationIds: (opportunityForm.quotationIds || []).map((id) => Number(id)).filter(Number.isSafeInteger),
        primaryQuotationId: Number.isSafeInteger(Number(opportunityForm.primaryQuotationId)) ? Number(opportunityForm.primaryQuotationId) : null,
        opportunityName: opportunityForm.opportunityName.trim(),
        stage: opportunityForm.stage,
        customerGrade: opportunityForm.customerGrade || null,
        estimatedAmount: Number(opportunityForm.estimatedAmount || 0),
        expectedCloseDate: opportunityForm.expectedCloseDate || null,
        nextFollowUpDate: opportunityForm.nextFollowUpDate || null,
        description: opportunityForm.description || null,
        createdAt: opportunityForm.createdAt || new Date().toISOString().slice(0, 10),
      };

      await salesApiFetch('save-sales-opportunity', { method: 'POST', body: JSON.stringify(payload) });
      setShowOpportunityForm(false);
      await loadOpportunities();
      if (payload.opportunityId) await loadOpportunityDetail(payload.opportunityId);
      alert('案件已儲存');
    } catch (error) {
      alert(error.message || '儲存案件失敗');
    } finally {
      setOpportunitySaving(false);
    }
  };

  const saveFollowUp = async () => {
    if (!selectedOpportunityId) return alert('請先選擇案件');
    if (!followUpForm.content.trim()) return alert('請輸入追蹤內容');
    if (!isIsoDate(followUpForm.followUpDate) || !isIsoDate(followUpForm.nextFollowUpDate)) return alert('日期請使用 YYYY-MM-DD 格式');

    setFollowUpSaving(true);
    try {
      await salesApiFetch('save-sales-follow-up', {
        method: 'POST',
        body: JSON.stringify({
          opportunityId: Number(selectedOpportunityId),
          quotationId: Number.isSafeInteger(Number(followUpForm.quotationId)) ? Number(followUpForm.quotationId) : null,
          followUpType: followUpForm.followUpType,
          content: followUpForm.content.trim(),
          nextFollowUpDate: followUpForm.nextFollowUpDate || null,
          contactName: followUpForm.contactName || null,
          contactMethod: followUpForm.contactMethod || null,
          followUpDate: followUpForm.followUpDate || new Date().toISOString().slice(0, 10),
          stage: followUpForm.stage || null,
          customerGrade: followUpForm.customerGrade || null,
        }),
      });
      setFollowUpForm(initialFollowUpForm);
      await loadOpportunityDetail(selectedOpportunityId);
      await loadOpportunities();
      alert('追蹤紀錄已儲存');
    } catch (error) {
      alert(error.message || '儲存追蹤紀錄失敗');
    } finally {
      setFollowUpSaving(false);
    }
  };

  const loadCustomers = async () => { try { setCustomerList(await getApiList(`${API_BASE}/get-customers`)); } catch (e) { console.error('讀取客戶失敗', e); } };
  const loadSystemSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/get-systems`);
      if (!response.ok) throw new Error(String(response.status));
      const raw = await response.json();
      const data = Array.isArray(raw) ? (raw[0] || {}) : raw;
      setSystemList(Array.isArray(data.systems) ? data.systems : []);
      setPricingRuleList(Array.isArray(data.rules) ? data.rules : []);
    } catch (e) {
      setSystemList([]);
      setPricingRuleList([]);
    }
  };

  useEffect(() => { setSalesAuthReady(true); }, []);
  useEffect(() => { 
    if (salesAuthReady && salesUser) {
      loadQuotes(); loadCustomers(); loadSystemSettings(); loadSalesUserOptions();
    }
  }, [salesAuthReady, salesUser]);

  useEffect(() => { if (customerList.length && !selectedCustomerCode) handleSelectCustomer(customerList[0]); }, [customerList]);
  useEffect(() => { if (salesUser && activeTab === 'salestrack') loadOpportunities(); }, [salesUser, activeTab]);
  useEffect(() => { if (activeTab === 'usermanagement' && isRoot) loadAppUsers(); }, [activeTab, salesUser, isRoot]);

  const formatDateForInput = (v) => toIsoDate(v);
  const handleCustomerChange = (e) => setCustomerForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleNewCustomer = () => { setCustomerForm(initialCustomerForm); setSelectedCustomerCode(null); };
  const handleSelectCustomer = (customer) => { 
    setCustomerForm({ ...initialCustomerForm, ...customer, PayM: String(customer.PayM ?? 0), State: String(customer.State ?? 1), demoT: formatDateForInput(customer.demoT), ContT: formatDateForInput(customer.ContT), SetupT: formatDateForInput(customer.SetupT) }); 
    setSelectedCustomerCode(customer.Code); 
  };
  
  const saveCustomer = async () => { 
    if (!customerForm.Code?.trim()) return alert('請輸入客戶代號'); 
    const payload = { ...customerForm, Code: customerForm.Code.trim(), Name: customerForm.Name?.trim() || '', PayM: Number(customerForm.PayM) || 0, State: Number(customerForm.State) || 1, demoT: customerForm.demoT || null, ContT: customerForm.ContT || null, SetupT: customerForm.SetupT || null }; 
    try { 
      const res = await fetch(`${API_BASE}/save-customer`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) }); 
      if (!res.ok) throw new Error(await res.text()); 
      setCustomerList(prev => { const i=prev.findIndex(c=>c.Code===payload.Code); return i < 0 ? [payload,...prev] : prev.map((c,n)=>n===i?payload:c); }); 
      setSelectedCustomerCode(payload.Code); 
      alert('客戶資料已成功存入資料庫！'); 
    } catch (e) { alert('儲存客戶失敗。'); } 
  };

  const authorizedPost = async (path, payload) => {
    if (!isRoot) throw new Error('僅 ROOT 可修改系統設定');
    return salesApiFetch(path, { method: 'POST', body: JSON.stringify(payload) });
  };

  const saveSystem = async () => {
    if (!systemForm.SystemCode.trim() || !systemForm.SystemName.trim()) return alert('請填寫系統代號及名稱');
    try {
      const result = await authorizedPost('save-system-product', { ...systemForm, IsActive: Boolean(systemForm.IsActive) });
      if (result?.success === false) throw new Error(result.message || '儲存失敗');
      await loadSystemSettings();
      setSystemForm(initialSystemForm);
      alert('系統資料已儲存');
    } catch (error) { alert(error.message || '儲存失敗'); }
  };

  const saveRule = async () => {
    if (!ruleForm.SystemId || ruleForm.FirstUserPrice === '' || ruleForm.AdditionalUserPrice === '') return alert('請填寫必填欄位');
    try {
      const result = await authorizedPost('save-pricing-rule', {
        ...ruleForm, SystemId: Number(ruleForm.SystemId), VersionNo: Number(ruleForm.VersionNo) || 1,
        FirstUserPrice: Number(ruleForm.FirstUserPrice), AdditionalUserPrice: Number(ruleForm.AdditionalUserPrice),
        MinimumUsers: Number(ruleForm.MinimumUsers) || 1, IsActive: Boolean(ruleForm.IsActive), EffectiveEndDate: ruleForm.EffectiveEndDate || null,
      });
      if (result?.success === false) throw new Error(result.message || '儲存失敗');
      await loadSystemSettings();
      setRuleForm(initialRuleForm);
      alert('價格規則已儲存');
    } catch (error) { alert(error.message || '儲存失敗'); }
  };

  const addItem = (itemType='NEW_LICENSE') => setQuoteItems(p => [...p, { id:`${Date.now()}-${Math.random()}`, systemId:'', itemType, userCount:1, discountRate:100, specialPrice:'' }]);
  const updateItem = (id, field, value) => setQuoteItems(p => p.map(x => x.id===id ? {...x,[field]:value} : x));
  const removeItem = (id) => setQuoteItems(p => p.filter(x => x.id !== id));
  
  const getEffectivePricingRule = (systemId, itemType) => {
    const today = new Date().toISOString().slice(0, 10);
    const type = itemType === 'MAINTENANCE' ? 'MAINTENANCE' : 'LICENSE';
    return pricingRuleList.filter((rule) => Number(rule.SystemId) === Number(systemId) && rule.RuleType === type && toBoolean(rule.IsActive) && (!rule.EffectiveStartDate || String(rule.EffectiveStartDate).slice(0, 10) <= today) && (!rule.EffectiveEndDate || String(rule.EffectiveEndDate).slice(0, 10) >= today)).sort((a, b) => String(b.EffectiveStartDate || '').localeCompare(String(a.EffectiveStartDate || '')))[0];
  };

  const calculateListAmount = (item) => { const rule=getEffectivePricingRule(item.systemId,item.itemType); if(!rule) return 0; const users=Math.max(Number(item.userCount)||0,0), first=Number(rule.FirstUserPrice)||0, add=Number(rule.AdditionalUserPrice)||0; return item.itemType==='ADD_USER' ? users*add : users>=1 ? first+(users-1)*add : 0; };
  const getDiscountPercent = (item) => Math.min(Math.max(Number(item.discountRate) || 100, 0), 100);
  const calculateTaxIncludedListAmount = (item) => Math.round(calculateListAmount(item) * 1.05);
  const calculateDiscountAmount = (item) => Math.round(calculateTaxIncludedListAmount(item) * (getDiscountPercent(item) / 100));
  const hasFinalAmount = (item) => item.specialPrice !== '' && Number.isFinite(Number(item.specialPrice)) && Number(item.specialPrice) >= 0;
  const calculateFinalTaxIncludedAmount = (item) => hasFinalAmount(item) ? Math.round(Number(item.specialPrice)) : calculateDiscountAmount(item);
  const calculateLineAmount = (item) => Math.round(calculateFinalTaxIncludedAmount(item) / 1.05);
  const getMaintenanceRule = (systemId) => {
    const today = new Date().toISOString().slice(0, 10);
    return pricingRuleList.filter(r => Number(r.SystemId) === Number(systemId) && String(r.RuleType).toUpperCase() === 'MAINTENANCE' && toBoolean(r.IsActive) && (!r.EffectiveStartDate || String(r.EffectiveStartDate).slice(0,10) <= today) && (!r.EffectiveEndDate || String(r.EffectiveEndDate).slice(0,10) >= today)).sort((a,b) => String(b.EffectiveStartDate || '').localeCompare(String(a.EffectiveStartDate || '')))[0];
  };

  const quoteSummary = useMemo(() => {
    const listAmount = quoteItems.reduce((sum, item) => sum + calculateListAmount(item), 0);
    const taxIncludedListAmount = quoteItems.reduce((sum, item) => sum + calculateTaxIncludedListAmount(item), 0);
    const discountAmount = quoteItems.reduce((sum, item) => sum + calculateDiscountAmount(item), 0);
    const taxIncludedAmount = quoteItems.reduce((sum, item) => sum + calculateFinalTaxIncludedAmount(item), 0);
    const taxExcludedAmount = Math.round(taxIncludedAmount / 1.05);
    const taxAmount = taxIncludedAmount - taxExcludedAmount;
    const annualMaintenanceAmount = quoteItems.reduce((sum, item) => {
      const rule = getMaintenanceRule(item.systemId);
      const users = Math.max(Number(item.userCount) || 0, 0);
      if (!rule || !users) return sum;
      return sum + Number(rule.FirstUserPrice || 0) + Math.max(users - 1, 0) * Number(rule.AdditionalUserPrice || 0);
    }, 0);
    return { listAmount, taxIncludedListAmount, discountAmount, taxExcludedAmount, taxAmount, taxIncludedAmount, annualMaintenanceAmount, discountTaxIncludedAmount: discountAmount, hasManualFinalPrice: quoteItems.some(hasFinalAmount), finalOfferTaxIncludedAmount: taxIncludedAmount };
  }, [quoteItems, pricingRuleList]);

  const loadQuotes = async () => {
    setQuoteListLoading(true);
    try {
      const params = new URLSearchParams();
      if (quoteDateFrom) params.set('dateFrom', quoteDateFrom);
      if (quoteDateTo) params.set('dateTo', quoteDateTo);
      if (quoteOwnerUserId) params.set('ownerUserId', quoteOwnerUserId);
      const queryString = params.toString();
      setQuoteList(await getApiList(`${API_BASE}/get-quotes${queryString ? `?${queryString}` : ''}`));
    } catch (e) {
      console.error('loadQuotes error:', e);
    } finally {
      setQuoteListLoading(false);
    }
  };

  const loadCustomerQuoteOptions = async (customerId) => {
    if (!customerId) return setCustomerQuoteOptions([]);
    setCustomerQuoteLoading(true);
    try {
      const data = await salesApiFetch(`get-quotes?customerId=${encodeURIComponent(customerId)}`);
      setCustomerQuoteOptions(getResultList(data).filter((quote) => String(quote.Status) !== 'VOID'));
    } catch (error) {
      setCustomerQuoteOptions([]);
    } finally {
      setCustomerQuoteLoading(false);
    }
  };

  const loadSalesUserOptions = async () => {
    try { setSalesUserOptions(normalizeList(await getApiList(`${API_BASE}/get-sales-users`))); } 
    catch (error) { setSalesUserOptions([]); }
  };

  const quoteValidDate = (quote) => { const d = new Date(quote.QuoteDate); d.setDate(d.getDate()+30); return `${d.getFullYear()}年${String(d.getMonth()+1).padStart(2,'0')}月${String(d.getDate()).padStart(2,'0')}日`; };
  const quoteStatusLabel = (status) => ({ '1':'1. 新購', '2':'2. 增設', '3':'3. 維護', '4':'4. 作廢', NEW_LICENSE:'1. 新購', ADD_USER:'2. 增設', MAINTENANCE:'3. 維護', OTHER:'4. 作廢', DRAFT:'4. 作廢', VOID:'4. 作廢' }[String(status)] || '4. 其他');

  const getSystemInfo = (systemId) => systemList.find(s => Number(s.SystemId) === Number(systemId)) || {};
  const quoteFormalDetails = (detail) => {
    const isNewPurchase = String(detail.quote.Status) === '1' || detail.quote.Status === 'NEW_LICENSE';
    const lines = detail.items.map(item => {
      const system = getSystemInfo(item.SystemId);
      const maintenance = getMaintenanceRule(item.SystemId);
      const users = Number(item.UserCount || 1);
      const maintenanceTaxIncluded = maintenance ? Math.round(Number(maintenance.FirstUserPrice || 0) + Math.max(users - 1, 0) * Number(maintenance.AdditionalUserPrice || 0)) : null;
      return { ...item, SystemCode: item.SystemCode || system.SystemCode, SystemName: item.SystemName || system.SystemName, Note: system.Note || '', maintenanceTaxIncluded };
    });
    return { ...detail, isNewPurchase, items: lines, maintenanceTotal: Number(detail.quote.AnnualMaintenanceAmount ?? detail.quote.annualMaintenanceAmount ?? lines.reduce((sum, x) => sum + Number(x.maintenanceTaxIncluded || 0), 0)), warrantyMonths: Number(detail.quote.WarrantyMonths ?? detail.quote.warrantyMonths ?? 0) };
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
      setPreviewQuote(quoteFormalDetails(normalizeQuoteDetail(await response.json())));
      setShowQuotePreview(true);
    } catch (e) { alert('無法讀取報價單詳細資料'); }
  };

  const voidQuote = async (quote) => {
    if (!window.confirm(`確定要作廢報價單「${quote.QuotationNo}」嗎？`)) return;
    try {
      await fetch(`${API_BASE}/void-quote`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({quotationId: quote.QuotationId}) });
      alert('報價單已作廢');
      await loadQuotes();
    } catch (e) { alert('作廢失敗'); }
  };

  const editQuote = async (quote) => {
    try {
      const response = await fetch(`${API_BASE}/get-quote-detail?quotationId=${encodeURIComponent(quote.QuotationId)}`);
      if (!response.ok) throw new Error(String(response.status));
      const data = normalizeQuoteDetail(await response.json());
      setCustomerCode(data.quote.CustomerId);
      setQuoteItems(data.items.map((item, index) => ({ id: item.QuotationItemId || `${Date.now()}-${index}`, systemId: String(item.SystemId), itemType: item.ItemType, userCount: item.UserCount, discountRate: item.Discount ?? 100, specialPrice: item.FinalAmount ?? '' })));
      setShowQuotePreview(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      alert('已帶入報價資料。儲存將產生新報價單。');
    } catch (e) { alert('無法載入報價資料'); }
  };

  const handleSubmit = async (action) => {
    if (!customerCode) return alert('請先選擇客戶');
    if (!quoteItems.length || quoteItems.some(x => !x.systemId)) return alert('請至少新增一筆完整的系統報價明細');
    if (quoteItems.some(x => !getEffectivePricingRule(x.systemId, x.itemType))) return alert('選取的系統找不到有效價格規則');
    const customer = customerList.find(c => String(c.CustomerId) === String(customerCode));
    if (!customer?.CustomerId) return alert('客戶資料缺少 CustomerId');
    const now = new Date();
    const quoteNo = `Q${now.getFullYear() - 1911}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(Date.now()).slice(-6)}`;
    
    const payload = {
      action,
      status: action === 'CreateNewSystemQuote' ? '1' : action === 'CreateAddUserQuote' ? '2' : action === 'CreateMaintenanceQuote' ? '3' : '4',
      quoteNo, customerId: Number(customer.CustomerId), customerCode: customer.Code, customerName: customer.Name || '',
      taxRate: 0.05, warrantyMonths: Number(warrantyMonths) || 0,
      annualMaintenanceAmount: quoteSummary.annualMaintenanceAmount,
      maintenanceDiscountAmount: maintenanceDiscountAmount === '' ? null : Number(maintenanceDiscountAmount),
      listAmount: quoteSummary.listAmount, discountAmount: quoteSummary.discountTaxIncludedAmount,
      taxExcludedAmount: quoteSummary.taxExcludedAmount, taxAmount: quoteSummary.taxAmount,
      taxIncludedAmount: quoteSummary.finalOfferTaxIncludedAmount, totalAmount: quoteSummary.finalOfferTaxIncludedAmount,
      hasManualFinalPrice: quoteSummary.hasManualFinalPrice,
      items: quoteItems.map((x, index) => {
        const rule = getEffectivePricingRule(x.systemId, x.itemType);
        return {
          systemId: Number(x.systemId), pricingRuleId: Number(rule?.PricingRuleId) || 0, itemType: x.itemType, userCount: Number(x.userCount),
          firstUserPriceSnapshot: Number(rule?.FirstUserPrice) || 0, additionalUserPriceSnapshot: Number(rule?.AdditionalUserPrice) || 0,
          listAmount: calculateListAmount(x), discount: Number(x.discountRate) || 100, discountRate: Number(x.discountRate) || 100,
          discountAmount: calculateDiscountAmount(x), specialPrice: x.specialPrice === '' ? null : Number(x.specialPrice),
          finalAmount: hasFinalAmount(x) ? calculateFinalTaxIncludedAmount(x) : null,
          taxExcludedAmount: calculateLineAmount(x), lineAmount: calculateListAmount(x), sortOrder: index + 1
        };
      })
    };
    try {
      await salesApiFetch('save-quote', { method: 'POST', body: JSON.stringify(payload) });
      setQuoteItems([]); setCustomerCode(''); alert('報價單已成功存入資料庫！');
      await loadQuotes();
    } catch (error) { alert('報價單儲存失敗：' + error.message); }
  };

  const renderCustomerForm = () => {
    const filteredCustomers = customerList.filter(c => (c.Name && c.Name.includes(searchTerm)) || (c.Code && c.Code.includes(searchTerm)));
    return (
      <div className="flex flex-col lg:flex-row h-full gap-4 max-h-[calc(100vh-3rem)]">
        <div className="w-full lg:w-1/3 flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden shrink-0">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col gap-3">
             <div className="flex justify-between items-center"><h3 className="font-bold text-gray-700">客戶清單</h3>{can('CUSTOMER', 'canCreate') && <button onClick={handleNewCustomer} className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-md shadow-sm">新增客戶</button>}</div>
             <div className="relative"><input type="text" placeholder="搜尋客戶代號或名稱..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500" /><svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg></div>
          </div>
          <div className="flex-1 overflow-y-auto">
             <table className="w-full text-sm text-left"><thead className="text-xs text-gray-500 uppercase bg-gray-100 sticky top-0"><tr><th className="px-3 py-2 border-b">客戶代號</th><th className="px-3 py-2 border-b">客戶名稱</th></tr></thead><tbody>{filteredCustomers.length === 0 ? <tr><td colSpan="2" className="text-center py-4 text-gray-400">找不到相符的客戶</td></tr> : filteredCustomers.map(c => <tr key={c.Code} onClick={() => handleSelectCustomer(c)} className={`cursor-pointer border-b last:border-b-0 hover:bg-blue-50 transition-colors ${selectedCustomerCode === c.Code ? 'bg-blue-100 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}><td className="px-3 py-2.5 font-medium">{c.Code}</td><td className="px-3 py-2.5 truncate max-w-[150px]">{c.Name}</td></tr>)}</tbody></table>
          </div>
        </div>
        <div className="w-full lg:w-2/3 bg-white p-6 rounded-lg shadow-sm border border-gray-200 overflow-y-auto flex-1">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 sticky top-0 bg-white z-10 pb-4 border-b border-gray-100">
            <div><h2 className="text-xl font-bold text-gray-800">{selectedCustomerCode ? '編輯客戶資料' : '新增客戶資料'}</h2></div>
            {(selectedCustomerCode ? can('CUSTOMER', 'canUpdate') : can('CUSTOMER', 'canCreate')) && <button onClick={saveCustomer} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg shadow transition whitespace-nowrap">儲存客戶</button>}
          </div>
          <div className="space-y-8">
            <section><h3 className="text-base font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-4">基本資料</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label className="block text-sm font-medium text-gray-600 mb-1">客戶代號 (Code) <span className="text-red-500">*</span></label><input type="text" name="Code" value={customerForm.Code} onChange={handleCustomerChange} disabled={!!selectedCustomerCode} className={`w-full border border-gray-300 p-2 rounded-md ${selectedCustomerCode ? 'bg-gray-100 cursor-not-allowed' : ''}`} required placeholder="如: TC-1150701" /></div><div className="md:col-span-2"><label className="block text-sm font-medium text-gray-600 mb-1">客戶名稱 (Name)</label><input type="text" name="Name" value={customerForm.Name} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md" /></div><div><label className="block text-sm font-medium text-gray-600 mb-1">統一編號 (Ucode)</label><input type="text" name="Ucode" value={customerForm.Ucode} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md" /></div><div><label className="block text-sm font-medium text-gray-600 mb-1">負責人 (Boss)</label><input type="text" name="Boss" value={customerForm.Boss} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md" /></div></div></section>
            <section><h3 className="text-base font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-4">聯絡資訊</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label className="block text-sm font-medium text-gray-600 mb-1">聯絡人 (Contacter)</label><input type="text" name="Contacter" value={customerForm.Contacter} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md" /></div><div><label className="block text-sm font-medium text-gray-600 mb-1">聯絡電話 (Tel)</label><input type="text" name="Tel" value={customerForm.Tel} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md" /></div><div><label className="block text-sm font-medium text-gray-600 mb-1">行動電話 (Phone)</label><input type="text" name="Phone" value={customerForm.Phone} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md" /></div><div><label className="block text-sm font-medium text-gray-600 mb-1">傳真電話 (Fax)</label><input type="text" name="Fax" value={customerForm.Fax} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md" /></div><div className="md:col-span-2"><label className="block text-sm font-medium text-gray-600 mb-1">E-Mail (Email)</label><input type="email" name="Email" value={customerForm.Email} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md" /></div></div></section>
            <section><h3 className="text-base font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-4">狀態與歷程</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label className="block text-sm font-medium text-gray-600 mb-1">銷售狀態 (State)</label><select name="State" value={customerForm.State} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md bg-white"><option value="1">1 - 潛在開發中</option><option value="2">2 - 已傳報價單</option><option value="3">3 - 議價中</option><option value="4">4 - 已簽約成交</option><option value="7">7 - 未成案(未購買)</option></select></div><div><label className="block text-sm font-medium text-gray-600 mb-1">付款方式 (PayM)</label><select name="PayM" value={customerForm.PayM} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md bg-white"><option value="0">0 - 尚未確認</option><option value="1">1 - 現金</option></select></div><div><label className="block text-sm font-medium text-gray-600 mb-1">展示日期 (demoT)</label><input type="date" name="demoT" value={customerForm.demoT} onChange={handleCustomerChange} className="w-full border border-gray-300 p-2 rounded-md" /></div></div></section>
          </div>
        </div>
      </div>
    );
  };

  const selectedQuoteCustomer = customerList.find(c => String(c.CustomerId) === String(customerCode));
  const pickerCustomers = customerList.filter(c => !customerPickerTerm.trim() || String(c.Code).toLowerCase().includes(customerPickerTerm.trim().toLowerCase()) || String(c.Name).toLowerCase().includes(customerPickerTerm.trim().toLowerCase()));
  const selectQuoteCustomer = (customer) => { setCustomerCode(customer.CustomerId); setShowCustomerPicker(false); setCustomerPickerTerm(''); };

  const renderQuotationForm = (title, defaultItemType, actionType) => (
    <>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-gray-800">{title}</h2>
        <div className="mb-6"><label className="block text-sm font-medium text-gray-700 mb-2">選擇客戶</label><div className="flex gap-2"><input type="text" readOnly value={selectedQuoteCustomer ? `${selectedQuoteCustomer.Code}－${selectedQuoteCustomer.Name}` : ''} placeholder="請點選右側按鈕選擇客戶" className="flex-1 border border-gray-300 rounded-lg p-2 bg-gray-50 text-gray-700" /><button type="button" onClick={() => setShowCustomerPicker(true)} className="px-4 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium whitespace-nowrap">選擇客戶</button></div></div>
        <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-gray-800">報價明細</h3><button type="button" onClick={() => addItem(defaultItemType)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm">+ 新增模組</button></div>
        <div className="space-y-4 mb-6">
          {quoteItems.length === 0 && <div className="text-center text-gray-400 py-4 border-2 border-dashed rounded-lg">尚無項目</div>}
          {quoteItems.map((item) => (
            <div key={item.id} className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end bg-gray-50 p-4 rounded-lg border">
              <div className="lg:col-span-3"><label className="text-xs text-gray-500">系統</label><select className="w-full border p-2 rounded" value={item.systemId} onChange={(e) => updateItem(item.id, 'systemId', e.target.value)}><option value="">選擇系統</option>{systemList.filter(s => s.IsActive !== false && s.IsActive !== 0).map(s => <option key={s.SystemId} value={s.SystemId}>{s.SystemCode}－{s.SystemName}</option>)}</select></div>
              <div className="lg:col-span-2"><label className="text-xs text-gray-500">報價類型</label><select className="w-full border p-2 rounded" value={item.itemType} onChange={(e) => updateItem(item.id, 'itemType', e.target.value)}><option value="NEW_LICENSE">新購授權</option><option value="ADD_USER">增設授權</option><option value="MAINTENANCE">維護費</option></select></div>
              <div className="lg:col-span-1"><label className="text-xs text-gray-500">人數</label><input type="number" min="1" className="w-full border p-2 rounded text-right" value={item.userCount} onChange={(e) => updateItem(item.id, 'userCount', e.target.value)} /></div>
              <div className="lg:col-span-2"><label className="text-xs text-gray-500">牌價</label><div className="border bg-white p-2 rounded text-right">${calculateListAmount(item).toLocaleString()}</div></div>
              <div className="lg:col-span-1"><label className="text-xs text-gray-500">折數(%)</label><input type="number" min="0" max="100" step="1" className="w-full border p-2 rounded text-right" value={item.discountRate} onChange={(e) => updateItem(item.id, 'discountRate', e.target.value)} /></div>
              <div className="lg:col-span-1"><label className="text-xs text-gray-500">最終優惠含稅</label><input type="number" min="0" placeholder="選填" className="w-full border p-2 rounded text-right" value={item.specialPrice} onChange={(e) => updateItem(item.id, 'specialPrice', e.target.value)} /></div>
              <div className="lg:col-span-1"><label className="text-xs text-gray-500">折後金額</label><div className="font-bold text-blue-600 text-right p-2">${calculateFinalTaxIncludedAmount(item).toLocaleString()}</div></div>
              <button type="button" onClick={() => removeItem(item.id)} className="lg:col-span-1 text-red-500 hover:text-red-700 p-2">刪除</button>
            </div>
          ))}
        </div>
        {quoteItems.length > 0 && (
          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            <div className="text-left space-y-3 border-l-4 border-blue-500 pl-4"><div className="font-semibold text-gray-700">保固與維護設定</div><label className="block text-sm">免費保固年限：<input type="number" min="0" step="1" value={warrantyMonths} onChange={(e) => setWarrantyMonths(e.target.value)} className="ml-2 w-20 border rounded p-1 text-right" /><span className="ml-2">個月</span></label><div className="text-sm">每年維護費用：<b>NT${quoteSummary.annualMaintenanceAmount.toLocaleString()}（含稅）</b></div></div>
            <div className="text-right space-y-1"><div className="text-gray-500">優惠總計（未稅）：${quoteSummary.taxExcludedAmount.toLocaleString()}</div><div>營業稅（5%）：${quoteSummary.taxAmount.toLocaleString()}</div><div className="text-xl font-bold text-red-600">最終優惠（含稅）：${quoteSummary.finalOfferTaxIncludedAmount.toLocaleString()}</div><button type="button" onClick={() => handleSubmit(actionType)} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded shadow">產生並存檔</button></div>
          </div>
        )}
      </div>
      <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between border-b pb-4"><h3 className="text-lg font-bold">已建立報價單</h3><button onClick={loadQuotes} className="rounded-lg border px-3 py-2 text-sm">重新整理</button></div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm text-left"><thead className="bg-gray-100 text-gray-600"><tr><th className="p-3">單號</th><th className="p-3">日期</th><th className="p-3">客戶名稱</th><th className="p-3">系統</th><th className="p-3 text-right">金額</th><th className="p-3">業務</th><th className="p-3">狀態</th><th className="p-3 text-center">操作</th></tr></thead><tbody>{quoteListLoading ? <tr><td colSpan={8} className="p-8 text-center text-gray-400">載入中...</td></tr> : quoteList.map((q) => <tr key={q.QuotationId} className="border-b hover:bg-blue-50"><td className="p-3 font-medium">{q.QuotationNo}</td><td className="p-3">{formatDateForInput(q.QuoteDate)}</td><td className="p-3">{q.CustomerName || '-'}</td><td className="p-3">{q.QuoteSystemCodes || '-'}</td><td className="p-3 text-right font-medium">${Number(q.QuoteAmount ?? 0).toLocaleString()}</td><td className="p-3">{q.CreatedByName || '-'}</td><td className="p-3">{quoteStatusLabel(q.Status)}</td><td className="p-3"><div className="flex justify-center gap-2"><button onClick={() => previewQuoteById(q.QuotationId)} className="text-blue-600 hover:underline">預覽</button><button onClick={() => voidQuote(q)} className="text-red-600 hover:underline">作廢</button></div></td></tr>)}</tbody></table>
        </div>
      </div>
    </>
  );

  const renderSystemSettings = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border"><h2 className="text-xl font-bold">系統設定</h2></div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-lg border shadow-sm"><h3 className="font-bold mb-4">軟體產品設定</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><input placeholder="代號 *" className="border p-2 rounded" value={systemForm.SystemCode} onChange={e=>setSystemForm(p=>({...p,SystemCode:e.target.value}))}/><input placeholder="名稱 *" className="border p-2 rounded" value={systemForm.SystemName} onChange={e=>setSystemForm(p=>({...p,SystemName:e.target.value}))}/></div><div className="mt-3"><button onClick={saveSystem} className="bg-blue-600 text-white px-4 py-2 rounded">儲存軟體</button></div></div>
        <div className="bg-white p-5 rounded-lg border shadow-sm"><h3 className="font-bold mb-4">價格規則設定</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><select className="border p-2 rounded" value={ruleForm.SystemId} onChange={e=>setRuleForm(p=>({...p,SystemId:e.target.value}))}><option value="">選擇系統 *</option>{systemList.map(s=><option key={s.SystemId} value={s.SystemId}>{s.SystemCode}</option>)}</select><input type="text" placeholder="首位價格 *" className="border p-2 rounded" value={formatAmountInput(ruleForm.FirstUserPrice)} onChange={e=>setRuleForm(p=>({...p,FirstUserPrice:e.target.value.replace(/[^\d]/g,'')}))}/><input type="text" placeholder="增購單價 *" className="border p-2 rounded" value={formatAmountInput(ruleForm.AdditionalUserPrice)} onChange={e=>setRuleForm(p=>({...p,AdditionalUserPrice:e.target.value.replace(/[^\d]/g,'')}))}/></div><div className="mt-3"><button onClick={saveRule} className="bg-blue-600 text-white px-4 py-2 rounded">儲存價格</button></div></div>
      </div>
    </div>
  );

  const renderSalesTracking = () => {
    const stageLabel = { INITIAL_CONTACT: '初步接洽', QUOTED: '已報價', WON: '成交' };
    const filteredOpportunities = opportunityList.filter(item => !opportunitySearch || String(item.CustomerName).includes(opportunitySearch));
    return (
      <div className="space-y-5">
        <div className="rounded-lg border bg-white p-5"><div className="flex justify-between"><h2 className="text-xl font-bold text-gray-800">3. 銷售案件追蹤</h2><button onClick={openNewOpportunity} className="bg-blue-600 px-4 py-2 text-sm text-white rounded">新增案件</button></div></div>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
          <div className="overflow-hidden rounded-lg border bg-white xl:col-span-2"><div className="max-h-[680px] overflow-y-auto">{filteredOpportunities.map(item=><button key={item.OpportunityId || item.opportunityId} onClick={()=>loadOpportunityDetail(item.OpportunityId || item.opportunityId)} className="w-full border-b p-4 text-left hover:bg-gray-50"><b>{item.OpportunityName || item.opportunityName}</b><div>{item.CustomerName}</div></button>)}</div></div>
          <div className="rounded-lg border bg-white p-6 xl:col-span-3">
            {!selectedOpportunity ? <div className="text-center text-gray-400 py-10">請從左側選擇案件</div> : (
              <div className="space-y-6">
                <div className="flex justify-between border-b pb-4"><h3 className="text-xl font-bold">{selectedOpportunity.OpportunityName || selectedOpportunity.opportunityName}</h3><button onClick={openEditOpportunity} className="border border-blue-600 px-4 py-2 text-blue-600 rounded">編輯案件</button></div>
                <div className="border-t pt-5"><h4 className="mb-3 font-semibold">新增追蹤紀錄</h4><div className="grid grid-cols-3 gap-3"><input type="date" value={followUpForm.followUpDate} onChange={e=>setFollowUpForm(p=>({...p,followUpDate:e.target.value}))} className="border p-2 rounded" /><textarea value={followUpForm.content} onChange={e=>setFollowUpForm(p=>({...p,content:e.target.value}))} className="col-span-3 border p-2 rounded" placeholder="追蹤內容" /></div><div className="mt-3 text-right"><button onClick={saveFollowUp} className="bg-green-600 px-5 py-2 text-white rounded">新增紀錄</button></div></div>
                <div className="border-t pt-5"><h4 className="mb-3 font-semibold">歷史追蹤紀錄</h4>{followUpList.map((item, i) => <div key={i} className="rounded border p-4 mb-3"><b>{item.ContactMethod} {item.ContactName}</b><p>{item.Content || item.content}</p></div>)}</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Modals for Opportunity */}
        {showOpportunityForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={() => setShowOpportunityForm(false)}>
            <div className="w-full max-w-2xl bg-white p-6 rounded-xl" onMouseDown={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">{opportunityForm.opportunityId ? '編輯案件' : '新增案件'}</h3>
              <div className="space-y-4">
                 <div><label className="text-sm">客戶</label><div className="flex gap-2"><input readOnly value={opportunityForm.customerId} className="flex-1 border p-2 bg-gray-50" /><button onClick={()=>setShowOpportunityCustomerPicker(true)} className="border border-blue-600 text-blue-600 px-4">選擇</button></div></div>
                 <div><label className="text-sm">案件名稱</label><input value={opportunityForm.opportunityName} onChange={e=>setOpportunityForm(p=>({...p,opportunityName:e.target.value}))} className="w-full border p-2" /></div>
              </div>
              <div className="mt-6 flex justify-end gap-3"><button onClick={()=>setShowOpportunityForm(false)} className="border px-5 py-2 rounded">取消</button><button onClick={saveOpportunity} className="bg-blue-600 text-white px-5 py-2 rounded">儲存</button></div>
            </div>
          </div>
        )}
        {showOpportunityCustomerPicker && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onMouseDown={() => setShowOpportunityCustomerPicker(false)}>
            <div className="w-full max-w-xl bg-white p-6 rounded-xl" onMouseDown={e => e.stopPropagation()}>
              <div className="flex justify-between"><h3 className="text-lg font-bold">選擇客戶</h3><button onClick={()=>setShowOpportunityCustomerPicker(false)}>×</button></div>
              <div className="mt-4 max-h-80 overflow-y-auto">{customerList.map(c=><button key={c.CustomerId} onClick={()=>{setOpportunityForm(p=>({...p,customerId:String(c.CustomerId)})); setShowOpportunityCustomerPicker(false);}} className="block w-full border-b p-3 text-left hover:bg-blue-50">{c.Name}</button>)}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderUserManagement = () => {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-5"><h2 className="text-xl font-bold text-red-800">🔐 權限設定</h2></div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="rounded-lg border bg-white p-5 shadow-sm xl:col-span-2"><h3 className="font-bold mb-4">使用者表單</h3><input value={userForm.loginAccount} onChange={e=>setUserForm(p=>({...p,loginAccount:e.target.value}))} placeholder="帳號" className="w-full border p-2 mb-2"/><button onClick={saveAppUser} className="w-full bg-red-600 text-white p-2 rounded">儲存</button></div>
          <div className="rounded-lg border bg-white p-5 shadow-sm xl:col-span-3"><h3 className="font-bold mb-4">清單</h3>{appUsers.map(u => <div key={u.UserId} className="border-b py-2">{u.LoginAccount} - {u.DisplayName}</div>)}</div>
        </div>
      </div>
    );
  };

  const renderContracts = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"><h2 className="text-xl font-bold mb-4 text-gray-800">4. 客戶合約資料專區</h2><div className="bg-green-50 border-l-4 border-green-400 p-4">開發建置中...</div></div>
  );

  if (!salesAuthReady) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">載入中...</div>;
  if (!salesUser) return <SalesLoginPage onLoginSuccess={(u) => { setSalesUser(u); setActiveTab('salestrack'); }} />;

  return (
    <div className="min-h-screen md:h-screen bg-gray-100 flex flex-col md:flex-row font-sans md:overflow-hidden">
      <div className="w-full md:w-64 bg-gray-900 text-white shadow-lg flex-shrink-0 z-20">
        <div className="p-6 border-b border-gray-800"><h1 className="text-xl font-bold text-blue-400">高益營建軟體</h1></div>
        <div className="border-b border-gray-800 px-6 py-4">
          <div className="text-sm font-medium">{salesUser?.displayName || salesUser?.DisplayName}</div>
          <button onClick={handleSalesLogout} className="mt-3 text-xs text-gray-400">登出</button>
        </div>
        <nav className="flex gap-2 overflow-x-auto p-3 md:block md:space-y-2 md:p-4">
          {can('CUSTOMER', 'canQuery') && <button onClick={() => setActiveTab('customer')} className={`w-full text-left px-4 py-3 rounded ${activeTab === 'customer' ? 'bg-blue-600' : 'text-gray-300'}`}>1. 客戶資料建檔</button>}
          {can('QUOTE', 'canQuery') && <button onClick={() => {setActiveTab('quotenew'); setQuoteItems([]); setCustomerCode('');}} className={`w-full text-left px-4 py-3 rounded ${activeTab === 'quotenew' ? 'bg-blue-600' : 'text-gray-300'}`}>2. 營建系統報價</button>}
          {can('SALES_TRACK', 'canQuery') && <button onClick={() => setActiveTab('salestrack')} className={`w-full text-left px-4 py-3 rounded ${activeTab === 'salestrack' ? 'bg-blue-600' : 'text-gray-300'}`}>3. 業務銷售追蹤</button>}
          {isRoot && <button onClick={() => setActiveTab('systemsettings')} className={`w-full text-left px-4 py-3 rounded mt-4 ${activeTab === 'systemsettings' ? 'bg-amber-500' : 'text-amber-300'}`}>⚙ 系統設定</button>}
          {isRoot && <button onClick={() => setActiveTab('usermanagement')} className={`w-full text-left px-4 py-3 rounded mt-2 ${activeTab === 'usermanagement' ? 'bg-red-600' : 'text-red-300'}`}>🔐 權限設定</button>}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-100 p-3 sm:p-4 md:p-6">
        <div className="mx-auto min-h-full max-w-7xl">
          {activeTab === 'customer' && renderCustomerForm()}
          {activeTab === 'quotenew' && renderQuotationForm('2. 建置系統報價單', 'NEW_LICENSE', 'CreateNewSystemQuote')}
          {activeTab === 'salestrack' && renderSalesTracking()}
          {activeTab === 'systemsettings' && isRoot && renderSystemSettings()}
          {activeTab === 'usermanagement' && isRoot && renderUserManagement()}
          {activeTab === 'contracts' && renderContracts()}
          {activeTab === 'quoteadd' && renderQuotationForm('5. 增設授權報價單', 'ADD_USER', 'CreateAddUserQuote')}
          {activeTab === 'quotemaint' && renderQuotationForm('6. 維護合約報價單', 'MAINTENANCE', 'CreateMaintenanceQuote')}
        </div>
      </div>
      
      {showQuotePreview && previewQuote && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3" onMouseDown={() => setShowQuotePreview(false)}>
          <div className="w-full max-w-5xl max-h-[94vh] overflow-y-auto bg-white p-4" onMouseDown={e => e.stopPropagation()}>
            <div className="quote-sheet">
               <h1 className="text-xl font-bold text-center mb-4">報價單預覽</h1>
               <div className="border p-4 mb-4">單號：{previewQuote.quote.QuotationNo} / 客戶：{previewQuote.quote.CustomerName}</div>
               <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => setShowQuotePreview(false)} className="border px-4 py-2 rounded">關閉</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {showCustomerPicker && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onMouseDown={() => setShowCustomerPicker(false)}>
          <div className="w-full max-w-2xl bg-white rounded-xl flex flex-col" onMouseDown={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between"><h2 className="font-bold">選擇客戶</h2><button onClick={() => setShowCustomerPicker(false)}>×</button></div>
            <div className="p-4 border-b"><input type="text" value={customerPickerTerm} onChange={e => setCustomerPickerTerm(e.target.value)} placeholder="搜尋..." className="w-full border p-2 rounded" /></div>
            <div className="overflow-y-auto max-h-80">{pickerCustomers.map(c => <button key={c.CustomerId} onClick={() => selectQuoteCustomer(c)} className="w-full text-left p-3 border-b hover:bg-blue-50">{c.Code} - {c.Name}</button>)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

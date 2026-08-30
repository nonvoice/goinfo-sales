import React, { useState, useEffect, useMemo } from 'react';

const API_BASE = 'https://goinfosales-n8n.zeabur.app/webhook';
console.log('Goinfo Sales frontend version: 2026-08-04-tab-fix');
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

  if (!digits) {
    return '';
  }

  return Number(digits).toLocaleString('en-US');
};

const parseAmountInput = (value) => {
  const digits = String(value ?? '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
};


const isIsoDate = (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);

function SalesLoginPage({ onLoginSuccess }) {
  const [form, setForm] = useState({
    loginAccount: '',
    password: '',
  });
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
      const response = await fetch(
        'https://goinfosales-n8n.zeabur.app/webhook/auth-login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            loginAccount: form.loginAccount.trim(),
            password: form.password,
          }),
        }
      );

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
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8"
      >
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold text-slate-800">
            Goinfo Sales
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            業務案件管理系統
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            帳號
          </label>
          <input
            type="text"
            autoComplete="username"
            value={form.loginAccount}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                loginAccount: event.target.value,
              }))
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="請輸入帳號"
          />
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            密碼
          </label>
          <input
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                password: event.target.value,
              }))
            }
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
  const [salesUser, setSalesUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem('salesUser');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const currentRole = String(
    salesUser?.role ||
    salesUser?.Role ||
    salesUser?.RoleCode ||
    ''
  ).toUpperCase();

  const isRoot = currentRole === 'ROOT';

  const can = (functionCode, action) => {
  if (isRoot) return true;

  const newPermission = salesUser?.permissions?.[functionCode]?.[action];

  if (newPermission !== undefined) {
    return Boolean(newPermission);
  }

  if (action !== 'canQuery') {
    return false;
  }

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

  if (!fieldName) {
    return false;
  }

  const value =
    legacyPermissions?.[fieldName] ??
    legacyPermissions?.[
      fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
    ] ??
    salesUser?.[fieldName] ??
    salesUser?.[
      fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
    ];

  return value === true || value === 1 || value === '1';
};

  const [salesAuthReady, setSalesAuthReady] = useState(false);

  const [opportunityList, setOpportunityList] = useState([]);
  const [opportunityLoading, setOpportunityLoading] = useState(false);
  const [opportunityError, setOpportunityError] = useState('');

  const [selectedOpportunityId, setSelectedOpportunityId] = useState(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [followUpList, setFollowUpList] = useState([]);
  const [opportunityQuotationList, setOpportunityQuotationList] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showOpportunityForm, setShowOpportunityForm] = useState(false);
  const [opportunitySaving, setOpportunitySaving] = useState(false);

  const initialOpportunityForm = {
     opportunityId: '',
     customerId: '',
     quotationId: '',
     quotationIds: [],
     opportunityName: '',
     stage: 'INITIAL_CONTACT',
     customerGrade: 'B',
     createdAt: new Date().toISOString().slice(0, 10),
     estimatedAmount: '',
     expectedCloseDate: '',
     nextFollowUpDate: '',
     description: '',
  };


  const [opportunityForm, setOpportunityForm] = useState(
    initialOpportunityForm
  );

  const initialFollowUpForm = {
     followUpType: 'PHONE',
     content: '',
     nextFollowUpDate: '',
     contactName: '',
     contactMethod: '',
     stage: '',
     customerGrade: '',
     followUpDate: new Date().toISOString().slice(0, 10),
     quotationIds: [],
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
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerPickerTerm, setCustomerPickerTerm] = useState('');
  const [quoteList, setQuoteList] = useState([]);
  const [quoteListLoading, setQuoteListLoading] = useState(false);
  const [quoteDateFrom, setQuoteDateFrom] = useState('');
  const [quoteDateTo, setQuoteDateTo] = useState('');
  const [quoteOwnerUserId, setQuoteOwnerUserId] = useState('');
  const [hideVoidedQuotes, setHideVoidedQuotes] = useState(true);
  const [salesUserOptions, setSalesUserOptions] = useState([]);
  const [showQuotePreview, setShowQuotePreview] = useState(false);
  const [previewQuote, setPreviewQuote] = useState(null);

  const normalizeList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.quotes)) return data.quotes;
    if (Array.isArray(data?.rows)) return data.rows;
    return data && typeof data === 'object' ? [data] : [];
  };
  const getApiList = async (url) => { const res = await fetch(url); if (!res.ok) throw new Error(String(res.status)); return normalizeList(await res.json()); };
  const SALES_API_BASE = `${API_BASE}`;

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

    const response = await fetch(`${SALES_API_BASE}/${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      handleSalesLogout();
      throw new Error(data.message || '登入已失效，請重新登入');
    }

    if (response.status === 403) {
      throw new Error(data.message || '您沒有此案件的存取權限');
    }

    if (!response.ok) {
      throw new Error(data.message || `系統處理失敗：${response.status}`);
    }

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

    const users =
      result?.users ||
      result?.data ||
      result?.rows ||
      (Array.isArray(result) ? result : []);

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
    const result = await salesApiFetch(
      `get-app-user-permissions?userId=${encodeURIComponent(userId)}`
    );

    const rows = Array.isArray(result)
      ? result
      : result?.rows || result?.data || [];

    return permissionFunctions.map((item) => {
      const found = rows.find(
        (row) => row.FunctionCode === item.code
      );

      return {
         functionCode: item.code,
         canQuery: toBoolean(found?.CanQuery),
         canCreate: toBoolean(found?.CanCreate),
         canUpdate: toBoolean(found?.CanUpdate),
         canDelete: toBoolean(found?.CanDelete),
      };
    });
  } catch (error) {
    console.error('loadUserPermissionRows error:', error);
    return createDefaultPermissionRows();
  }
};

const saveAppUser = async () => {
  const currentRole = String(
    salesUser?.role ||
    salesUser?.Role ||
    salesUser?.RoleCode ||
    ''
  ).toUpperCase();

  if (currentRole !== 'ROOT') {
    alert('僅 ROOT 可管理使用者');
    return;
  }

  if (!userForm.loginAccount.trim()) {
    alert('請輸入登入帳號');
    return;
  }

  if (!userForm.displayName.trim()) {
    alert('請輸入顯示名稱');
    return;
  }

  if (!userForm.userId && !userForm.password) {
    alert('新增使用者時必須設定初始密碼');
    return;
  }

  if (!userForm.userId && userForm.password.length < 8) {
    alert('初始密碼至少需要 8 個字元');
    return;
  }

  if (String(userForm.roleCode).toUpperCase() === 'ROOT') {
    alert('不可從此畫面新增或修改 ROOT 帳號');
    return;
  }

  setUserSaving(true);

  try {
    await salesApiFetch('save-app-user', {
      method: 'POST',
      body: JSON.stringify({
        action: userForm.userId ? 'update' : 'create',
        userId: userForm.userId ? Number(userForm.userId) : null,
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
    console.error('saveAppUser error:', error);
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
    console.error('loadOpportunities error:', error);
    setOpportunityError(error.message || '讀取案件清單失敗');
  } finally {
    setOpportunityLoading(false);
  }
};

const loadOpportunityDetail = async (opportunityId) => {
  if (!opportunityId) return;

  setDetailLoading(true);

  try {
    const result = await salesApiFetch(
      `get-sales-opportunity-detail?opportunityId=${encodeURIComponent(opportunityId)}`
    );

    const detail = Array.isArray(result) ? result[0] : result;

    const opportunity =
      detail?.opportunity ||
      detail?.data?.opportunity ||
      detail?.data ||
      detail;

    const followUps =
      detail?.followUps ||
      detail?.data?.followUps ||
      detail?.followUpList ||
      [];

    const opportunityQuotations =
      detail?.opportunityQuotations ||
      detail?.data?.opportunityQuotations ||
      [];

    if (!opportunity?.OpportunityId && !opportunity?.opportunityId) {
      throw new Error('找不到案件，或您沒有檢視此案件的權限');
    }

    setSelectedOpportunity(opportunity);
    setFollowUpList(Array.isArray(followUps) ? followUps : []);

    // 下一步會新增這個 state
    setOpportunityQuotationList(
      Array.isArray(opportunityQuotations)
        ? opportunityQuotations
        : []
    );

    setSelectedOpportunityId(
      opportunity.OpportunityId || opportunity.opportunityId
    );
  } catch (error) {
    console.error('loadOpportunityDetail error:', error);
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

  setOpportunityForm({
    opportunityId:
      selectedOpportunity.OpportunityId ||
      selectedOpportunity.opportunityId ||
      '',
    customerId:
      selectedOpportunity.CustomerId ||
      selectedOpportunity.customerId ||
      '',
   quotationId:
     selectedOpportunity.QuotationId ||
     selectedOpportunity.quotationId ||
     '',
   quotationIds: (
     selectedOpportunity.quotationIds ||
     selectedOpportunity.QuotationIds ||
       (
         selectedOpportunity.QuotationId ||
         selectedOpportunity.quotationId
           ? [
               Number(
                 selectedOpportunity.QuotationId ||
                 selectedOpportunity.quotationId
               ),
             ]
           : []
       )
     ).map(Number),
    opportunityName:
      selectedOpportunity.OpportunityName ||
      selectedOpportunity.opportunityName ||
      '',
    stage: selectedOpportunity.Stage || selectedOpportunity.stage || 'INITIAL_CONTACT',
    customerGrade:
      selectedOpportunity.CustomerGrade ||
      selectedOpportunity.customerGrade ||
      'B',
  createdAt:
     formatDateForInput(
        selectedOpportunity.CreatedAt ||
        selectedOpportunity.createdAt ||
        selectedOpportunity.FillDate ||
        selectedOpportunity.fillDate
    ) || new Date().toISOString().slice(0, 10),
estimatedAmount:
      selectedOpportunity.EstimatedAmount ||
      selectedOpportunity.estimatedAmount ||
      '',
    expectedCloseDate: formatDateForInput(
      selectedOpportunity.ExpectedCloseDate ||
        selectedOpportunity.expectedCloseDate
    ),
    nextFollowUpDate: formatDateForInput(
      selectedOpportunity.NextFollowUpDate ||
        selectedOpportunity.nextFollowUpDate
    ),
    description:
      selectedOpportunity.Description ||
      selectedOpportunity.description ||
      '',
  });

  setShowOpportunityForm(true);
};

const saveOpportunity = async () => {
  if (!opportunityForm.customerId) {
    alert('請選擇客戶');
    return;
  }

  if (!opportunityForm.opportunityName.trim()) {
    alert('請輸入案件名稱');
    return;
  }

  if (
    !isIsoDate(opportunityForm.createdAt) ||
    !isIsoDate(opportunityForm.expectedCloseDate) ||
    !isIsoDate(opportunityForm.nextFollowUpDate)
  ) {
    alert('日期格式請使用 YYYY-MM-DD');
    return;
  }

  setOpportunitySaving(true);

  try {
    const quotationIds = [
      ...new Set(
        (opportunityForm.quotationIds || [])
          .map(Number)
          .filter((id) => Number.isInteger(id) && id > 0)
      ),
    ];

    const payload = {
      action: opportunityForm.opportunityId ? 'update' : 'create',

      opportunityId: opportunityForm.opportunityId
        ? Number(opportunityForm.opportunityId)
        : null,

      customerId: Number(opportunityForm.customerId),

      // 相容既有 dbo.SalesOpportunity.QuotationId
      quotationId: quotationIds[0] || null,

      // 新增多張案件關聯報價單
      quotationIds,

      opportunityName: opportunityForm.opportunityName.trim(),
      stage: opportunityForm.stage,
      customerGrade: opportunityForm.customerGrade || null,
      estimatedAmount: Number(opportunityForm.estimatedAmount || 0),
      expectedCloseDate: opportunityForm.expectedCloseDate || null,
      nextFollowUpDate: opportunityForm.nextFollowUpDate || null,
      description: opportunityForm.description || null,
      createdAt:
        opportunityForm.createdAt ||
        new Date().toISOString().slice(0, 10),
    };

    await salesApiFetch('save-sales-opportunity', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    setShowOpportunityForm(false);

    await loadOpportunities();

    if (payload.opportunityId) {
      await loadOpportunityDetail(payload.opportunityId);
    }

    alert('案件已儲存');
  } catch (error) {
    console.error('saveOpportunity error:', error);
    alert(error.message || '儲存案件失敗');
  } finally {
    setOpportunitySaving(false);
  }
};

const deleteOpportunity = async () => {
  const opportunityId =
    selectedOpportunity?.OpportunityId ||
    selectedOpportunity?.opportunityId;

  if (!opportunityId) {
    alert('找不到要刪除的案件');
    return;
  }

  const opportunityName =
    selectedOpportunity?.OpportunityName ||
    selectedOpportunity?.opportunityName ||
    '此案件';

  const confirmed = window.confirm(
    `確定要刪除「${opportunityName}」嗎？\n\n` +
    '警告：此操作會永久刪除該案件、該案件的所有追蹤紀錄，' +
    '以及所有案件／追蹤報價關聯資料，且無法復原。'
  );

  if (!confirmed) {
    return;
  }

  try {
    await salesApiFetch('delete-sales-opportunity', {
      method: 'POST',
      body: JSON.stringify({
        opportunityId: Number(opportunityId),
      }),
    });

    setSelectedOpportunity(null);
    setSelectedOpportunityId(null);
    setFollowUpList([]);
    setOpportunityQuotationList([]);

    await loadOpportunities();

    alert('案件及其所有追蹤紀錄已刪除');
  } catch (error) {
    console.error('deleteOpportunity error:', error);
    alert(error.message || '刪除案件失敗');
  }
};

const deleteFollowUp = async (followUp) => {
  const followUpId =
    followUp?.FollowUpId ||
    followUp?.followUpId;

  if (!followUpId) {
    alert('找不到要刪除的追蹤紀錄');
    return;
  }

  const followUpDate = toIsoDate(
    followUp?.FollowUpDate ||
    followUp?.followUpDate
  );

  const confirmed = window.confirm(
    `確定要刪除 ${followUpDate || '此筆'} 追蹤紀錄嗎？\n\n` +
    '此操作只會刪除本筆追蹤紀錄及其關聯報價單；' +
    '案件與其他追蹤紀錄都會保留。'
  );

  if (!confirmed) {
    return;
  }

  try {
    await salesApiFetch('delete-sales-follow-up', {
      method: 'POST',
      body: JSON.stringify({
        followUpId: Number(followUpId),
      }),
    });

    await loadOpportunityDetail(selectedOpportunityId);
    await loadOpportunities();

    alert('單筆追蹤紀錄已刪除');
  } catch (error) {
    console.error('deleteFollowUp error:', error);
    alert(error.message || '刪除追蹤紀錄失敗');
  }
};

const saveFollowUp = async () => {
  if (!selectedOpportunityId) {
    alert('請先選擇案件');
    return;
  }

  if (!followUpForm.content.trim()) {
    alert('請輸入追蹤內容');
    return;
  }

  if (
  !isIsoDate(followUpForm.followUpDate) ||
  !isIsoDate(followUpForm.nextFollowUpDate)
  ) {
  alert('追蹤日期及下次追蹤日請使用 YYYY-MM-DD 格式');
  return;
  }

 setFollowUpSaving(true);

try {
  await salesApiFetch('save-sales-follow-up', {
    method: 'POST',
    body: JSON.stringify({
      opportunityId: Number(selectedOpportunityId),
      followUpType: followUpForm.followUpType,
      content: followUpForm.content.trim(),
      nextFollowUpDate: followUpForm.nextFollowUpDate || null,
      contactName: followUpForm.contactName || null,
      contactMethod: followUpForm.contactMethod || null,
      followUpDate:
        followUpForm.followUpDate ||
        new Date().toISOString().slice(0, 10),
      stage: followUpForm.stage || null,
      customerGrade: followUpForm.customerGrade || null,

      // 多選的關聯報價單
      quotationIds: [
        ...new Set(
          (followUpForm.quotationIds || [])
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0)
        ),
      ],
    }),
  });

  setFollowUpForm(initialFollowUpForm);

  await loadOpportunityDetail(selectedOpportunityId);
  await loadOpportunities();

  alert('追蹤紀錄已儲存');
} catch (error) {
  console.error('saveFollowUp error:', error);
  alert(error.message || '儲存追蹤紀錄失敗');
} finally {
  setFollowUpSaving(false);
}
};

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

  useEffect(() => { loadQuotes(); loadSalesUserOptions();}, []);
  useEffect(() => { if (customerList.length && !selectedCustomerCode) handleSelectCustomer(customerList[0]); }, [customerList]);
  useEffect(() => {
    setSalesAuthReady(true);
  }, []);
  useEffect(() => { 
    loadCustomers(); 
    loadSystemSettings(); 
    loadSalesUserOptions();
  }, []);

  useEffect(() => {
    if (salesUser && activeTab === 'salestrack') {
      loadOpportunities();
    }
  }, [salesUser, activeTab]);

  useEffect(() => {
    const currentRole = String(
      salesUser?.role ||
      salesUser?.Role ||
      salesUser?.RoleCode ||
      ''
    ).toUpperCase();

    if (activeTab === 'usermanagement' && currentRole === 'ROOT') {
      loadAppUsers();
    }
  }, [activeTab, salesUser]);

  const formatDateForInput = (v) => toIsoDate(v);
  const handleCustomerChange = (e) => setCustomerForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleNewCustomer = () => { setCustomerForm(initialCustomerForm); setSelectedCustomerCode(null); };
  const handleSelectCustomer = (customer) => { setCustomerForm({ ...initialCustomerForm, ...customer, PayM: String(customer.PayM ?? 0), State: String(customer.State ?? 1), demoT: formatDateForInput(customer.demoT), ContT: formatDateForInput(customer.ContT), SetupT: formatDateForInput(customer.SetupT) }); setSelectedCustomerCode(customer.Code); };
  const saveCustomer = async () => { if (!customerForm.Code?.trim()) return alert('請輸入客戶代號'); const payload = { ...customerForm, Code: customerForm.Code.trim(), Name: customerForm.Name?.trim() || '', PayM: Number(customerForm.PayM) || 0, State: Number(customerForm.State) || 1, demoT: customerForm.demoT || null, ContT: customerForm.ContT || null, SetupT: customerForm.SetupT || null }; try { const res = await fetch(`${API_BASE}/save-customer`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) }); if (!res.ok) throw new Error(await res.text()); setCustomerList(prev => { const i=prev.findIndex(c=>c.Code===payload.Code); return i < 0 ? [payload,...prev] : prev.map((c,n)=>n===i?payload:c); }); setSelectedCustomerCode(payload.Code); alert('客戶資料已成功存入資料庫！'); } catch (e) { console.error(e); alert('儲存客戶失敗。'); } };

   const authorizedPost = async (path, payload) => {
    if (!isRoot) {
      throw new Error('僅 ROOT 可修改系統設定');
    }

    return salesApiFetch(path, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  };

  const saveSystem = async () => {
  if (!systemForm.SystemCode.trim() || !systemForm.SystemName.trim()) {
    alert('請填寫系統代號及系統名稱');
    return;
  }

  try {
    const result = await authorizedPost('save-system-product', {
      ...systemForm,
      IsActive: Boolean(systemForm.IsActive),
    });

    if (result?.success === false) {
      throw new Error(result.message || '系統資料儲存失敗');
    }

    await loadSystemSettings();
    setSystemForm(initialSystemForm);

    alert(result?.message || '系統資料已儲存');
  } catch (error) {
    console.error('saveSystem error:', error);
    alert(error.message || '系統資料儲存失敗');
  }
};

  const saveRule = async () => {
  if (
    !ruleForm.SystemId ||
    ruleForm.FirstUserPrice === '' ||
    ruleForm.AdditionalUserPrice === ''
  ) {
    alert('請填寫系統、首位價格及增購單價');
    return;
  }

  try {
    const result = await authorizedPost('save-pricing-rule', {
      ...ruleForm,
      SystemId: Number(ruleForm.SystemId),
      VersionNo: Number(ruleForm.VersionNo) || 1,
      FirstUserPrice: Number(ruleForm.FirstUserPrice),
      AdditionalUserPrice: Number(ruleForm.AdditionalUserPrice),
      MinimumUsers: Number(ruleForm.MinimumUsers) || 1,
      IsActive: Boolean(ruleForm.IsActive),
      EffectiveEndDate: ruleForm.EffectiveEndDate || null,
    });

    if (result?.success === false) {
      throw new Error(result.message || '價格規則儲存失敗');
    }

    await loadSystemSettings();
    setRuleForm(initialRuleForm);

    alert(result?.message || '價格規則已儲存');
  } catch (error) {
    console.error('saveRule error:', error);
    alert(error.message || '價格規則儲存失敗');
  }
};

  const addItem = (itemType = 'NEW_LICENSE') =>
  setQuoteItems((p) => [
    ...p,
    {
      id: `${Date.now()}-${Math.random()}`,
      systemId: '',
      itemType,
      userCount: 1,
      discountRate: 100,
      specialPrice: '',
      upgradeCreditAmount: 0,
      upgradeCreditDescription: '',
    },
  ]);
  const updateItem = (id, field, value) => setQuoteItems(p => p.map(x => x.id===id ? {...x,[field]:value} : x));
  const removeItem = (id) => setQuoteItems(p => p.filter(x => x.id !== id));
  const getEffectivePricingRule = (systemId, itemType) => {
  const today = new Date().toISOString().slice(0, 10);
  const type = itemType === 'MAINTENANCE' ? 'MAINTENANCE' : 'LICENSE';

  return pricingRuleList
    .filter(
      (rule) =>
        Number(rule.SystemId) === Number(systemId) &&
        rule.RuleType === type &&
        toBoolean(rule.IsActive) &&
        (!rule.EffectiveStartDate ||
          String(rule.EffectiveStartDate).slice(0, 10) <= today) &&
        (!rule.EffectiveEndDate ||
          String(rule.EffectiveEndDate).slice(0, 10) >= today)
    )
    .sort((a, b) =>
      String(b.EffectiveStartDate || '').localeCompare(
        String(a.EffectiveStartDate || '')
      )
    )[0];
};
  const calculateListAmount = (item) => {
  const rule = getEffectivePricingRule(item.systemId, item.itemType);

  if (!rule) {
    return 0;
  }

  const users = Math.max(Number(item.userCount) || 0, 0);
  const first = Number(rule.FirstUserPrice) || 0;
  const add = Number(rule.AdditionalUserPrice) || 0;

  return item.itemType === 'ADD_USER'
    ? users * add
    : users >= 1
      ? first + (users - 1) * add
      : 0;
};

const getDiscountPercent = (item) =>
  Math.min(Math.max(Number(item.discountRate) || 100, 0), 100);

/* 原始牌價（含稅） */
const calculateTaxIncludedListAmount = (item) =>
  Math.round(calculateListAmount(item) * 1.05);

const hasFinalAmount = (item) =>
  item.specialPrice !== '' &&
  item.specialPrice !== null &&
  item.specialPrice !== undefined &&
  Number.isFinite(Number(item.specialPrice)) &&
  Number(item.specialPrice) >= 0;

/* 升級折抵：輸入正數，例如 85000 */
const getUpgradeCreditAmount = (item) =>
  Math.max(Number(item.upgradeCreditAmount) || 0, 0);

/*
  優惠總計計算基礎（含稅）：
  一律使用「牌價 × 折數 × 1.05」，
  不使用手動最終優惠價 specialPrice。
*/
const calculateDiscountTaxIncludedAmount = (item) =>
  Math.round(
    calculateTaxIncludedListAmount(item) *
      getDiscountPercent(item) / 100
  );

/*
  優惠後金額（含稅）：
  優惠總計基礎 − 升級折抵。
  範例：180000 × 70% × 1.05 − 85000 ＝ 47300
*/
const calculateAfterUpgradeCreditTaxIncludedAmount = (item) =>
  Math.max(
    calculateDiscountTaxIncludedAmount(item) -
      getUpgradeCreditAmount(item),
    0
  );

/*
  手動最終優惠金額（含稅）：
  有填 specialPrice 使用 specialPrice；
  沒填則使用「牌價 × 折數 × 1.05」。
*/
const calculateManualFinalTaxIncludedAmount = (item) =>
  hasFinalAmount(item)
    ? Math.round(Number(item.specialPrice))
    : calculateDiscountTaxIncludedAmount(item);

/*
  細項最終優惠（含稅）：
  有手動最終優惠價就用 specialPrice；
  沒有才使用折數優惠。
  注意：細項不扣升級折抵。
*/
const calculateFinalTaxIncludedAmount = (item) =>
  calculateManualFinalTaxIncludedAmount(item);

/* 相容舊畫面程式 */
const calculateDiscountAmount = (item) =>
  calculateDiscountTaxIncludedAmount(item);

/* 實際最終成交金額換算未稅 */
const calculateLineAmount = (item) =>
  Math.round(calculateFinalTaxIncludedAmount(item) / 1.05);

  const getMaintenanceRule = (systemId) => {
    const today = new Date().toISOString().slice(0, 10);
    return pricingRuleList.filter(r => Number(r.SystemId) === Number(systemId) && String(r.RuleType).toUpperCase() === 'MAINTENANCE' && (r.IsActive === true || r.IsActive === 1 || r.IsActive === 'true') && (!r.EffectiveStartDate || String(r.EffectiveStartDate).slice(0,10) <= today) && (!r.EffectiveEndDate || String(r.EffectiveEndDate).slice(0,10) >= today)).sort((a,b) => String(b.EffectiveStartDate || '').localeCompare(String(a.EffectiveStartDate || '')))[0];
  };

  const quoteSummary = useMemo(() => {
  const listAmount = quoteItems.reduce(
    (sum, item) => sum + calculateListAmount(item),
    0
  );

  const taxIncludedListAmount = quoteItems.reduce(
    (sum, item) =>
      sum + calculateTaxIncludedListAmount(item),
    0
  );

  /*
    升級折抵先算出來。
    因為優惠總計與最終優惠都會使用。
  */
  const upgradeCreditAmount = quoteItems.reduce(
    (sum, item) =>
      sum + getUpgradeCreditAmount(item),
    0
  );

  /*
    優惠折數的未扣款總額：
    各系統牌價 × 折數 × 1.05。
  */
  const discountBeforeCreditTaxIncludedAmount = quoteItems.reduce(
    (sum, item) =>
      sum + calculateDiscountTaxIncludedAmount(item),
    0
  );

  /*
    優惠總計（含稅）：
    折數優惠總額 − 升級折抵。
  */
  const discountTaxIncludedAmount = Math.max(
    discountBeforeCreditTaxIncludedAmount -
      upgradeCreditAmount,
    0
  );

  const discountTaxExcludedAmount = Math.round(
    discountTaxIncludedAmount / 1.05
  );

  const discountTaxAmount =
    discountTaxIncludedAmount -
    discountTaxExcludedAmount;

  /*
    最終優惠的未扣款總額：
    specialPrice 有填時優先使用，否則使用折數優惠。
  */
  const finalBeforeCreditTaxIncludedAmount = quoteItems.reduce(
    (sum, item) =>
      sum + calculateFinalTaxIncludedAmount(item),
    0
  );

  /*
    最終優惠（含稅）：
    細項最終優惠合計 − 升級折抵。
  */
  const finalOfferTaxIncludedAmount = Math.max(
    finalBeforeCreditTaxIncludedAmount -
      upgradeCreditAmount,
    0
  );

  const finalOfferTaxExcludedAmount = Math.round(
    finalOfferTaxIncludedAmount / 1.05
  );

  const finalOfferTaxAmount =
    finalOfferTaxIncludedAmount -
    finalOfferTaxExcludedAmount;

  const annualMaintenanceAmount = quoteItems.reduce(
    (sum, item) => {
      const rule = getMaintenanceRule(item.systemId);
      const users = Math.max(Number(item.userCount) || 0, 0);

      if (!rule || !users) return sum;

      return (
        sum +
        Number(rule.FirstUserPrice || 0) +
        Math.max(users - 1, 0) *
          Number(rule.AdditionalUserPrice || 0)
      );
    },
    0
  );

  return {
    listAmount,
    taxIncludedListAmount,

    upgradeCreditAmount,

    discountBeforeCreditTaxIncludedAmount,
    discountTaxIncludedAmount,
    discountTaxExcludedAmount,
    discountTaxAmount,

    finalBeforeCreditTaxIncludedAmount,
    finalOfferTaxIncludedAmount,
    finalOfferTaxExcludedAmount,
    finalOfferTaxAmount,

    annualMaintenanceAmount,

    /* 相容既有畫面欄位 */
    discountAmount: discountTaxIncludedAmount,
    taxExcludedAmount: discountTaxExcludedAmount,
    taxAmount: discountTaxAmount,
    taxIncludedAmount: discountTaxIncludedAmount,

    hasManualFinalPrice: quoteItems.some(hasFinalAmount),
  };
}, [quoteItems, pricingRuleList]);

    const loadQuotes = async () => {
       setQuoteListLoading(true);

  try {
    const params = new URLSearchParams();

    if (quoteDateFrom) {
      params.set('dateFrom', quoteDateFrom);
    }

    if (quoteDateTo) {
      params.set('dateTo', quoteDateTo);
    }

    if (quoteOwnerUserId) {
      params.set('ownerUserId', quoteOwnerUserId);
    }

    const queryString = params.toString();

    setQuoteList(
      await getApiList(
        `${API_BASE}/get-quotes${queryString ? `?${queryString}` : ''}`
      )
    );
  } catch (e) {
    console.error('loadQuotes error:', e);
  } finally {
    setQuoteListLoading(false);
  }
};

const loadSalesUserOptions = async () => {
  try {
    const users = await getApiList(`${API_BASE}/get-sales-users`);
    setSalesUserOptions(Array.isArray(users) ? users : []);
  } catch (error) {
    console.error('loadSalesUserOptions error:', error);
    setSalesUserOptions([]);
  }
};

  const formatRocDate = (value) => { const d = new Date(value); if (Number.isNaN(d.getTime())) return '－'; return `${d.getFullYear()-1911}年${String(d.getMonth()+1).padStart(2,'0')}月${String(d.getDate()).padStart(2,'0')}日`; };
  const quoteValidDate = (quote) => { const d = new Date(quote.QuoteDate); d.setDate(d.getDate()+30); return `${d.getFullYear()}年${String(d.getMonth()+1).padStart(2,'0')}月${String(d.getDate()).padStart(2,'0')}日`; };
  const quoteStatusLabel = (status) => ({ '1':'1. 新購', '2':'2. 增設', '3':'3. 維護', '4':'4. 作廢', NEW_LICENSE:'1. 新購', ADD_USER:'2. 增設', MAINTENANCE:'3. 維護', OTHER:'4. 作廢', DRAFT:'4. 作廢', VOID:'4. 作廢' }[String(status)] || '4. 其他');
  const itemTypeLabel = (type) => ({ NEW_LICENSE:'新購', ADD_USER:'增設', MAINTENANCE:'維護', OTHER:'其他' }[String(type)] || String(type || '其他'));

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

  const formatQuoteSystemCode = (systemCode) =>
  String(systemCode ?? '')
    .replace(/\d+$/g, '')
    .trim();

const formatQuoteItemName = (item) => {
  const code = formatQuoteSystemCode(
    item.SystemCode || item.systemCode
  );

  const name = String(
    item.SystemName || item.systemName || ''
  ).trim();

  const isStandalone =
    name.includes('單機版') || name.includes('單機');

  const users = Number(item.UserCount ?? item.userCount ?? 1);

  // 單機版：不要加入「網路 1 人版」
  if (isStandalone) {
    return `${code}－${name}`;
  }

  // 網路版：若原名稱已有網路人數文字，就不重複加
  const alreadyHasNetworkText =
    /[（(]網路\s*\d+\s*人版[）)]/.test(name);

  return alreadyHasNetworkText
    ? `${code}－${name}`
    : `${code}－${name}（網路 ${users} 人版）`;
};


const previewQuoteById = async (quotationId) => {
  try {
    const response = await fetch(
      `${API_BASE}/get-quote-detail?quotationId=${encodeURIComponent(quotationId)}`
    );
    if (!response.ok) throw new Error(String(response.status));

    const raw = await response.json();
    const detail = normalizeQuoteDetail(raw);

    setPreviewQuote(quoteFormalDetails(detail));
    setShowQuotePreview(true);
  } catch (e) {
    console.error(e);
    alert('無法讀取報價單詳細資料，請確認 get-quote-detail 工作流。');
  }
};

  const printQuoteSheet = () => {
     window.print();
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
  if (!customerCode) {
    alert('請先選擇客戶');
    return;
  }

  if (!isIsoDate(quoteDate)) {
    alert('請選擇有效的報價日期');
    return;
  }

  if (!quoteItems.length || quoteItems.some((x) => !x.systemId)) {
    alert('請至少新增一筆完整的系統報價明細');
    return;
  }

  if (
    quoteItems.some(
      (x) => !getEffectivePricingRule(x.systemId, x.itemType)
    )
  ) {
    alert('選取的系統找不到有效價格規則，請先至系統設定建立並啟用價格。');
    return;
  }

  const customer = customerList.find(
    (c) => String(c.CustomerId) === String(customerCode)
  );

  if (!customer?.CustomerId) {
    alert('客戶資料缺少 CustomerId，請先依下方說明更新 get-customers 工作流。');
    return;
  }

  const now = new Date();
  const rocYear = now.getFullYear() - 1911;

  const quoteNo =
    `Q${rocYear}` +
    `${String(now.getMonth() + 1).padStart(2, '0')}` +
    `${String(now.getDate()).padStart(2, '0')}` +
    `${String(Date.now()).slice(-6)}`;

  const payload = {
    action,
    status:
      action === 'CreateNewSystemQuote'
        ? '1'
        : action === 'CreateAddUserQuote'
          ? '2'
          : action === 'CreateMaintenanceQuote'
            ? '3'
            : '4',

    quoteNo,
    quoteDate,

    customerId: Number(customer.CustomerId),
    customerCode: customer.Code,
    customerName: customer.Name || '',

    taxRate: 0.05,
    warrantyMonths: Number(warrantyMonths) || 0,

    annualMaintenanceAmount:
      quoteSummary.annualMaintenanceAmount,

    maintenanceDiscountAmount:
      maintenanceDiscountAmount === ''
        ? null
        : Number(maintenanceDiscountAmount),

    listAmount: quoteSummary.listAmount,
    discountAmount: quoteSummary.discountTaxIncludedAmount,

    taxExcludedAmount: quoteSummary.taxExcludedAmount,
    taxAmount: quoteSummary.taxAmount,

    /* 優惠總計（含稅），不受手動最終優惠影響 */
    taxIncludedAmount:
      quoteSummary.discountTaxIncludedAmount,

    totalAmount:
      quoteSummary.discountTaxIncludedAmount,

    /* 最終成交優惠價 */
    finalAmount:
      quoteSummary.finalOfferTaxIncludedAmount,

    hasManualFinalPrice:
      quoteSummary.hasManualFinalPrice,

    items: quoteItems.map((x, index) => {
      const rule = getEffectivePricingRule(
        x.systemId,
        x.itemType
      );

      return {
        systemId: Number(x.systemId),
        pricingRuleId: Number(rule?.PricingRuleId) || 0,
        itemType: x.itemType,

        userCount: Number(x.userCount) || 0,

        firstUserPriceSnapshot:
          Number(rule?.FirstUserPrice) || 0,

        additionalUserPriceSnapshot:
          Number(rule?.AdditionalUserPrice) || 0,

        listAmount: calculateListAmount(x),

        discount: Number(x.discountRate) || 100,
        discountRate: Number(x.discountRate) || 100,

        /* 優惠總計（含稅） */
        discountAmount:
          calculateDiscountTaxIncludedAmount(x),

        specialPrice: hasFinalAmount(x)
          ? Number(x.specialPrice)
          : null,

        /* 手動最終優惠才寫入 FinalAmount */
        finalAmount: hasFinalAmount(x)
          ? calculateFinalTaxIncludedAmount(x)
          : null,

        upgradeCreditAmount:
          Number(x.upgradeCreditAmount) || 0,

        upgradeCreditDescription:
          x.upgradeCreditDescription || '',

        taxExcludedAmount: calculateLineAmount(x),

        lineAmount: calculateListAmount(x),
        sortOrder: index + 1,
      };
    }),
  };

  try {
    await salesApiFetch('save-quote', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    setQuoteItems([]);
    setQuoteDate(new Date().toISOString().slice(0, 10));
    setCustomerCode('');

    alert('報價單已成功存入資料庫！');

    try {
      await loadQuotes();
    } catch (refreshError) {
      console.error('報價清單更新失敗：', refreshError);
    }
  } catch (error) {
    console.error('save-quote error:', error);
    alert('報價單儲存失敗：' + error.message);
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
                {can('CUSTOMER', 'canCreate') && (
                   <button
                       onClick={handleNewCustomer}
                       className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-md shadow-sm transition"
                   >
                       新增客戶
                   </button>
                )}
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
            {(selectedCustomerCode
               ? can('CUSTOMER', 'canUpdate')
               : can('CUSTOMER', 'canCreate')) && (
               <button
                   onClick={saveCustomer}
                   className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow transition whitespace-nowrap"
               >
                   儲存客戶
               </button>
            )}
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

  const renderQuotationForm = (
  title,
  defaultItemType,
  actionType
) => {
  const isVoidedQuote = (quote) => {
    const status = String(
      quote.Status ??
      quote.status ??
      ''
    ).toUpperCase();

    return status === 'VOID' || status === '4';
  };

  const visibleQuoteList = hideVoidedQuotes
    ? quoteList.filter((quote) => !isVoidedQuote(quote))
    : quoteList;

  return (
    <>
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">
        {title}
      </h2>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
  {/* 客戶：桌機佔 2/3 */}
  <div className="md:col-span-2">
    <label className="mb-2 block text-sm font-medium text-gray-700">
      選擇客戶
    </label>

    <div className="flex gap-2">
      <input
        type="text"
        readOnly
        value={
          selectedQuoteCustomer
            ? `${selectedQuoteCustomer.Code}－${selectedQuoteCustomer.Name}`
            : ''
        }
        placeholder="請點選右側按鈕選擇客戶"
        className="flex-1 rounded-lg border border-gray-300 bg-gray-50 p-2 text-gray-700"
      />

      <button
        type="button"
        onClick={() => setShowCustomerPicker(true)}
        className="whitespace-nowrap rounded-lg border border-blue-600 px-4 text-blue-600 hover:bg-blue-50"
      >
        選擇客戶
      </button>
    </div>
  </div>

  {/* 報價日期：桌機佔 1/3 */}
  <div>
    <label className="mb-2 block text-sm font-medium text-gray-700">
      報價日期
    </label>

    <input
      type="date"
      value={quoteDate}
      onChange={(e) => setQuoteDate(e.target.value)}
      className="w-full rounded-lg border border-gray-300 p-2"
    />
  </div>
</div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">
          報價明細
        </h3>

        <button
          type="button"
          onClick={() => addItem(defaultItemType)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          + 新增模組
        </button>
      </div>

      <div className="space-y-4 mb-6 overflow-x-auto pb-2">
        {quoteItems.length === 0 && (
          <div className="text-center text-gray-400 py-4 border-2 border-dashed rounded-lg">
            尚無項目
          </div>
        )}

        {quoteItems.map((item) => (
          <div
            key={item.id}
            className="grid min-w-[1230px] grid-cols-[1.7fr_0.9fr_0.45fr_0.75fr_0.55fr_0.8fr_1.6fr_0.65fr_0.8fr_0.4fr] gap-2 items-end bg-gray-50 p-3 rounded-lg border"
          >
            <div>
              <label className="block whitespace-nowrap text-xs text-gray-500">
                系統
              </label>

              <select
                className="w-full border px-2 py-1.5 rounded text-sm"
                value={item.systemId}
                onChange={(e) =>
                  updateItem(item.id, 'systemId', e.target.value)
                }
              >
                <option value="">選擇系統</option>

                {systemList
                  .filter(
                    (system) =>
                      system.IsActive !== false &&
                      system.IsActive !== 0
                  )
                  .map((system) => (
                    <option
                      key={system.SystemId}
                      value={system.SystemId}
                    >
                      {system.SystemCode}－{system.SystemName}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block whitespace-nowrap text-xs text-gray-500">
                報價類型
              </label>

              <select
                className="w-full border px-2 py-1.5 rounded text-sm"
                value={item.itemType}
                onChange={(e) =>
                  updateItem(item.id, 'itemType', e.target.value)
                }
              >
                <option value="NEW_LICENSE">新購授權</option>
                <option value="ADD_USER">增設授權</option>
                <option value="MAINTENANCE">維護費</option>
              </select>
            </div>

            <div>
              <label className="block whitespace-nowrap text-xs text-gray-500">
                人數
              </label>

              <input
                type="number"
                min="1"
                className="w-full border px-2 py-1.5 rounded text-right text-sm"
                value={item.userCount}
                onChange={(e) =>
                  updateItem(item.id, 'userCount', e.target.value)
                }
              />
            </div>

            <div>
              <label className="block whitespace-nowrap text-xs text-gray-500">
                牌價
              </label>

              <div className="w-full border px-2 py-1.5 rounded text-right text-sm">
                ${calculateListAmount(item).toLocaleString()}
              </div>
            </div>

            <div>
              <label className="block whitespace-nowrap text-xs text-gray-500">
                折數(80=8折)
              </label>

              <input
                type="number"
                min="0"
                max="100"
                step="1"
                className="w-full border px-2 py-1.5 rounded text-right text-sm"
                value={item.discountRate}
                onChange={(e) =>
                  updateItem(item.id, 'discountRate', e.target.value)
                }
              />
            </div>

            <div>
              <label className="block whitespace-nowrap text-xs text-gray-500">
                最終優惠(含稅)
              </label>

              <input
                type="number"
                min="0"
                placeholder="選填"
                className="w-full border px-2 py-1.5 rounded text-right text-sm"
                value={item.specialPrice}
                onChange={(e) =>
                  updateItem(item.id, 'specialPrice', e.target.value)
                }
              />
            </div>

            <div>
              <label className="block whitespace-nowrap text-xs text-gray-500">扣項說明</label>
              <input
                type="text"
                className="w-full border px-2 py-1.5 rounded text-sm"
                placeholder="例如：扣原購買單機版"
                value={item.upgradeCreditDescription || ''}
                onChange={(e) =>
                  updateItem(item.id, 'upgradeCreditDescription', e.target.value)
                }
              />
            </div>

            <div>
              <label className="block whitespace-nowrap text-xs text-gray-500">升級折抵</label>
              <input
                type="number"
                min="0"
                step="1"
                className="w-full border px-2 py-1.5 rounded text-right text-sm"
                placeholder="0"
                value={item.upgradeCreditAmount || ''}
                onChange={(e) =>
                  updateItem(item.id, 'upgradeCreditAmount', e.target.value)
                }
              />
            </div>

            <div>
              <label className="block whitespace-nowrap text-xs text-gray-500">
                折後金額（含稅）
              </label>

              <div className="font-bold text-blue-600 text-right p-2">
                ${calculateManualFinalTaxIncludedAmount(item).toLocaleString()}
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="p-2 text-red-500 hover:text-red-700 whitespace-nowrap"
            >
              刪除
            </button>
          </div>
        ))}
      </div>

      {quoteItems.length > 0 && (
        <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          <div className="text-left space-y-3 border-l-4 border-blue-500 pl-4">
            <div className="font-semibold text-gray-700">
              保固與維護設定
            </div>

            <label className="block text-sm">
              免費保固年限：

              <input
                type="number"
                min="0"
                step="1"
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(e.target.value)}
                className="ml-2 w-20 border rounded p-1 text-right"
              />

              <span className="ml-2">個月</span>

              <span className="text-gray-500">
                （
                {Number(warrantyMonths) % 12 === 0
                  ? `${Math.floor(Number(warrantyMonths) / 12)} 年`
                  : `${Number(warrantyMonths) || 0} 個月`}
                ）
              </span>
            </label>

            <div className="text-sm">
              每年維護費用：
              <b>
                NT$
                {quoteSummary.annualMaintenanceAmount.toLocaleString()}
                （含稅）
              </b>
            </div>

            <label className="block text-sm">
              維護費優惠金額：NT$

              <input
                type="number"
                min="0"
                placeholder="選填"
                value={maintenanceDiscountAmount}
                onChange={(e) =>
                  setMaintenanceDiscountAmount(e.target.value)
                }
                className="ml-1 w-32 border rounded p-1 text-right"
              />

              <span className="text-gray-500">
                （含稅）
              </span>
            </label>
          </div>

          <div className="text-right space-y-1">
            <div className="text-gray-500">
              原始牌價（未稅）：
              ${quoteSummary.listAmount.toLocaleString()}
            </div>

            <div className="text-gray-500">
              原始牌價（含稅）：
              ${quoteSummary.taxIncludedListAmount.toLocaleString()}
            </div>

            <div>
              優惠總計（未稅）：
              ${quoteSummary.discountTaxExcludedAmount.toLocaleString()}
            </div>

            <div>
              營業稅（5%）：
              ${quoteSummary.discountTaxAmount.toLocaleString()}
            </div>

            <div className="text-xl font-bold">
              優惠總計（含稅）：
              ${quoteSummary.discountTaxIncludedAmount.toLocaleString()}
            </div>

            <div className="text-xl font-bold text-red-600">
              最終優惠（含稅）：
              ${quoteSummary.finalOfferTaxIncludedAmount.toLocaleString()}
            </div>

            <button
              type="button"
              onClick={() => handleSubmit(actionType)}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded shadow"
            >
              產生並存檔
            </button>
          </div>
        </div>
      )}
    </div>

<div className="mt-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
  <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-end md:justify-between">
    <div>
      <h3 className="text-lg font-bold text-gray-800">
        已建立報價單
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        可預覽、帶入修改或作廢報價紀錄。
      </p>
    </div>

    <button
      type="button"
      onClick={loadQuotes}
      className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
    >
      重新整理
    </button>
  </div>

  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
    <label className="text-sm text-gray-600">
      報價日期篩選
      <input
        type="date"
        value={quoteDateFrom}
        onChange={(e) => setQuoteDateFrom(e.target.value)}
        className="mt-1 w-full rounded border p-2"
      />
    </label>

    <label className="text-sm text-gray-600">
      至
      <input
        type="date"
        value={quoteDateTo}
        onChange={(e) => setQuoteDateTo(e.target.value)}
        className="mt-1 w-full rounded border p-2"
      />
    </label>

    <label className="text-sm text-gray-600">
      業務篩選
      <select
        value={quoteOwnerUserId}
        onChange={(e) => setQuoteOwnerUserId(e.target.value)}
        className="mt-1 w-full rounded border p-2"
      >
        <option value="">全部</option>

        {salesUserOptions.map((user) => (
          <option key={user.UserId} value={user.UserId}>
            {user.DisplayName}（{user.RoleCode}）
          </option>
        ))}
      </select>
    </label>

    <label className="flex items-center gap-2 pt-6 text-sm font-medium text-gray-700">
      <input
        type="checkbox"
        checked={hideVoidedQuotes}
        onChange={(e) => setHideVoidedQuotes(e.target.checked)}
      />
      已作廢者略
    </label>

    <div className="flex items-end">
      <button
        type="button"
        onClick={loadQuotes}
        className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        查詢
      </button>
    </div>
  </div>

  <div className="mt-5 overflow-x-auto">
    <table className="w-full text-sm text-left">
  <thead className="bg-gray-100 text-gray-600">
    <tr>
      <th className="p-3">報價單號</th>
      <th className="p-3">報價日期</th>
      <th className="p-3">客戶名稱</th>
      <th className="p-3">報價系統</th>
      <th className="p-3 text-right">報價金額</th>
      <th className="p-3">報價業務</th>
      <th className="p-3">狀態</th>
      <th className="p-3 text-center">操作</th>
    </tr>
  </thead>

  <tbody>
    {quoteListLoading ? (
      <tr>
        <td colSpan={8} className="p-8 text-center text-gray-400">
          載入中...
        </td>
      </tr>
   ) : visibleQuoteList.length > 0 ? (
     visibleQuoteList.map((q) => (
        <tr key={q.QuotationId} className="border-b hover:bg-blue-50">
          <td className="p-3 font-medium">
            {q.QuotationNo}
          </td>

          <td className="p-3">
            {formatDateForInput(q.QuoteDate)}
          </td>

          <td className="p-3">
            {q.CustomerName || q.CustomerCode || '－'}
          </td>

          <td className="p-3">
            {q.QuoteSystemCodes || '－'}
          </td>

          <td className="p-3 text-right font-medium">
            ${Number(q.QuoteAmount ?? 0).toLocaleString()}
          </td>

          <td className="p-3">
            {q.CreatedByName || q.CreatedByAccount || '－'}
          </td>

          <td className="p-3">
            <span
              className={`px-2 py-1 rounded text-xs ${
                q.Status === 'VOID'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {quoteStatusLabel(q.Status)}
            </span>
          </td>

          <td className="p-3">
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => previewQuoteById(q.QuotationId)}
                className="text-blue-600 hover:underline"
              >
                預覽
              </button>

              <button
                type="button"
                onClick={() => editQuote(q)}
                className="text-amber-600 hover:underline"
              >
                修改
              </button>

              <button
                type="button"
                onClick={() => voidQuote(q)}
                disabled={q.Status === 'VOID'}
                className="text-red-600 hover:underline disabled:text-gray-300"
              >
                作廢
              </button>
            </div>
          </td>
        </tr>
      ))
    ) : (
      <tr>
        <td colSpan={8} className="p-8 text-center text-gray-400">
            {hideVoidedQuotes
               ? '查無符合條件的未作廢報價單'
                : '查無符合條件的報價單'}
       </td>
      </tr>
    )}
  </tbody>
</table>
  </div>
</div>
</>
  );
};
const renderSystemSettings = () => (
  <div className="space-y-6">
    {/* 頁面標題 */}
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">
        系統設定：軟體及價格
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        管理可報價的軟體產品與生效中的價格規則。
      </p>
    </div>

    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* 軟體產品設定 */}
      <div className="rounded-lg border bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold">
          軟體產品設定
        </h3>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            placeholder="系統代號 *"
            className="rounded border p-2"
            value={systemForm.SystemCode}
            onChange={(e) =>
              setSystemForm((prev) => ({
                ...prev,
                SystemCode: e.target.value,
              }))
            }
          />

          <input
            placeholder="系統名稱 *"
            className="rounded border p-2"
            value={systemForm.SystemName}
            onChange={(e) =>
              setSystemForm((prev) => ({
                ...prev,
                SystemName: e.target.value,
              }))
            }
          />

          <input
            placeholder="分類"
            className="rounded border p-2"
            value={systemForm.Category}
            onChange={(e) =>
              setSystemForm((prev) => ({
                ...prev,
                Category: e.target.value,
              }))
            }
          />

          <label className="flex items-center gap-2 p-2">
            <input
              type="checkbox"
              checked={!!systemForm.IsActive}
              onChange={(e) =>
                setSystemForm((prev) => ({
                  ...prev,
                  IsActive: e.target.checked,
                }))
              }
            />
            啟用
          </label>

          <textarea
            placeholder="系統內容說明"
            className="rounded border p-2 md:col-span-2"
            value={systemForm.Note}
            onChange={(e) =>
              setSystemForm((prev) => ({
                ...prev,
                Note: e.target.value,
              }))
            }
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={saveSystem}
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            儲存軟體
          </button>

          <button
            type="button"
            onClick={() => setSystemForm(initialSystemForm)}
            className="rounded border px-4 py-2"
          >
            新增／清除
          </button>
        </div>

        {/* 軟體產品清單 */}
        <div className="mt-5 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">代號</th>
                <th className="p-2">名稱</th>
                <th className="p-2">分類</th>
                <th className="p-2">狀態</th>
                <th className="p-2" />
              </tr>
            </thead>

            <tbody>
              {systemList.map((system) => (
                <tr
                  key={system.SystemId}
                  className="border-b"
                >
                  <td className="p-2">
                    {system.SystemCode}
                  </td>

                  <td className="p-2">
                    {system.SystemName}
                  </td>

                  <td className="p-2">
                    {system.Category}
                  </td>

                  <td className="p-2">
                    {system.IsActive === false ||
                    system.IsActive === 0
                      ? '停用'
                      : '啟用'}
                  </td>

                  <td className="p-2">
                    <button
                      type="button"
                      className="text-blue-600"
                      onClick={() =>
                        setSystemForm({
                          ...initialSystemForm,
                          ...system,
                          IsActive:
                            system.IsActive !== false &&
                            system.IsActive !== 0,
                        })
                      }
                    >
                      編輯
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 價格規則設定 */}
      <div className="rounded-lg border bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold">
          價格規則設定
        </h3>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <select
            className="rounded border p-2"
            value={ruleForm.SystemId}
            onChange={(e) =>
              setRuleForm((prev) => ({
                ...prev,
                SystemId: e.target.value,
              }))
            }
          >
            <option value="">選擇系統 *</option>

            {systemList.map((system) => (
              <option
                key={system.SystemId}
                value={system.SystemId}
              >
                {system.SystemCode}－{system.SystemName}
              </option>
            ))}
          </select>

          <select
            className="rounded border p-2"
            value={ruleForm.RuleType}
            onChange={(e) =>
              setRuleForm((prev) => ({
                ...prev,
                RuleType: e.target.value,
              }))
            }
          >
            <option value="LICENSE">授權價格</option>
            <option value="MAINTENANCE">維護價格</option>
          </select>

          <input
            type="date"
            className="rounded border p-2"
            value={ruleForm.EffectiveStartDate}
            onChange={(e) =>
              setRuleForm((prev) => ({
                ...prev,
                EffectiveStartDate: e.target.value,
              }))
            }
          />

          <input
            type="date"
            className="rounded border p-2"
            value={ruleForm.EffectiveEndDate}
            onChange={(e) =>
              setRuleForm((prev) => ({
                ...prev,
                EffectiveEndDate: e.target.value,
              }))
            }
          />

          <input
            type="text"
            inputMode="numeric"
            placeholder="首位價格 *"
            className="rounded border p-2 text-right"
            value={formatAmountInput(ruleForm.FirstUserPrice)}
            onChange={(e) =>
              setRuleForm((prev) => ({
                ...prev,
                FirstUserPrice: e.target.value.replace(/[^\d]/g, ''),
              }))
            }
          />

          <input
            type="text"
            inputMode="numeric"
            placeholder="增購單價 *"
            className="rounded border p-2 text-right"
            value={formatAmountInput(ruleForm.AdditionalUserPrice)}
            onChange={(e) =>
              setRuleForm((prev) => ({
                ...prev,
                AdditionalUserPrice: e.target.value.replace(/[^\d]/g, ''),
              }))
            }
          />

          <input
            type="number"
            min="1"
            placeholder="最低人數"
            className="rounded border p-2"
            value={ruleForm.MinimumUsers}
            onChange={(e) =>
              setRuleForm((prev) => ({
                ...prev,
                MinimumUsers: e.target.value,
              }))
            }
          />

          <label className="flex items-center gap-2 p-2">
            <input
              type="checkbox"
              checked={!!ruleForm.IsActive}
              onChange={(e) =>
                setRuleForm((prev) => ({
                  ...prev,
                  IsActive: e.target.checked,
                }))
              }
            />
            啟用
          </label>

          <textarea
            placeholder="備註"
            className="rounded border p-2 md:col-span-2"
            value={ruleForm.Remark}
            onChange={(e) =>
              setRuleForm((prev) => ({
                ...prev,
                Remark: e.target.value,
              }))
            }
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={saveRule}
            className="rounded bg-blue-600 px-4 py-2 text-white"
          >
            儲存價格
          </button>

          <button
            type="button"
            onClick={() => setRuleForm(initialRuleForm)}
            className="rounded border px-4 py-2"
          >
            新增／清除
          </button>
        </div>

        {/* 價格規則清單 */}
        <div className="mt-5 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">系統</th>
                <th className="p-2">類型</th>
                <th className="p-2">首位</th>
                <th className="p-2">增購</th>
                <th className="p-2" />
              </tr>
            </thead>

            <tbody>
              {pricingRuleList.map((rule) => (
                <tr
                  key={
                    rule.PricingRuleId ||
                    `${rule.SystemId}-${rule.RuleType}-${rule.EffectiveStartDate}`
                  }
                  className="border-b"
                >
                  <td className="p-2">
                    {systemList.find(
                      (system) =>
                        Number(system.SystemId) ===
                        Number(rule.SystemId)
                    )?.SystemName || rule.SystemId}
                  </td>

                  <td className="p-2">
                    {rule.RuleType === 'MAINTENANCE'
                      ? '維護'
                      : '授權'}
                  </td>

                  <td className="p-2">
                    ${Number(
                      rule.FirstUserPrice || 0
                    ).toLocaleString()}
                  </td>

                  <td className="p-2">
                    ${Number(
                      rule.AdditionalUserPrice || 0
                    ).toLocaleString()}
                  </td>

                  <td className="p-2">
                    <button
                      type="button"
                      className="text-blue-600"
                      onClick={() =>
                        setRuleForm({
                          ...initialRuleForm,
                          ...rule,
                          SystemId: String(rule.SystemId),
                          EffectiveStartDate: formatDateForInput(
                            rule.EffectiveStartDate
                          ),
                          EffectiveEndDate: formatDateForInput(
                            rule.EffectiveEndDate
                          ),
                          IsActive:
                            rule.IsActive !== false &&
                            rule.IsActive !== 0,
                        })
                      }
                    >
                      編輯
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);

  // 3. 業務銷售追蹤專區
const renderSalesTracking = () => {
  const stageOptions = [
    ['INITIAL_CONTACT', '初步接洽'], ['REQUIREMENT_CONFIRMED', '需求確認'],
    ['DEMO_COMPLETED', '系統展示完成'], ['QUOTED', '已進行報價'],
    ['NEGOTIATION', '洽談磋商中'], ['WON', '確定成交'], ['LOST', '不需再追'],
  ];

const getQuoteDisplayName = (quote) => {
  const quotationNo = quote.QuotationNo || quote.quotationNo || '未命名報價單';
  const customerName =
    quote.CustomerName ||
    quote.customerName ||
    quote.CustomerCode ||
    quote.customerCode ||
    '未指定客戶';

  const amount = Number(
    quote.QuoteAmount ??
    quote.quoteAmount ??
    quote.FinalAmount ??
    quote.finalAmount ??
    0
  ).toLocaleString();

  return `${quotationNo}｜${customerName}｜NT$ ${amount}`;
};

const toggleQuotationId = (ids, quotationId) => {
  const normalizedId = Number(quotationId);

  return ids.includes(normalizedId)
    ? ids.filter((id) => id !== normalizedId)
    : [...ids, normalizedId];
};

const renderQuotationSelector = ({  selectedIds = [],
  onChange,
  customerId,
}) => {
  const normalizedCustomerId = String(customerId || '');

  const availableQuotes = quoteList.filter((quote) => {
    const quoteCustomerId = String(
      quote.CustomerId ??
      quote.customerId ??
      ''
    );

    // 尚未選客戶時顯示所有報價；
    // 選定客戶後只顯示相同客戶的報價單。
    return !normalizedCustomerId || quoteCustomerId === normalizedCustomerId;
  });

  return (
    <div className="md:col-span-full rounded-lg border border-blue-100 bg-blue-50 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="font-medium text-slate-800">關聯報價單</div>
          <div className="mt-1 text-xs text-slate-500">
            可複選；不選擇也可正常儲存案件或追蹤紀錄。
          </div>
        </div>

        <button
          type="button"
          onClick={loadQuotes}
          className="rounded border border-blue-600 bg-white px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50"
        >
          重新載入報價單
        </button>
      </div>

      {quoteListLoading ? (
        <div className="rounded border border-dashed bg-white p-3 text-sm text-slate-400">
          報價單載入中…
        </div>
      ) : availableQuotes.length === 0 ? (
        <div className="rounded border border-dashed bg-white p-3 text-sm text-slate-400">
          此客戶目前沒有可選擇的報價單。
        </div>
      ) : (
        <div className="max-h-52 space-y-2 overflow-y-auto rounded border bg-white p-3">
          {availableQuotes.map((quote) => {
            const quotationId = Number(
              quote.QuotationId ?? quote.quotationId
            );

            return (
              <label
                key={quotationId}
                className="flex cursor-pointer items-start gap-3 rounded p-2 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(quotationId)}
                  onChange={() =>
                    onChange(
                      toggleQuotationId(selectedIds, quotationId)
                    )
                  }
                  className="mt-1"
                />

                <span className="flex-1 text-sm text-slate-700">
                  {getQuoteDisplayName(quote)}
                  <span className="mt-1 block text-xs text-slate-400">
                    日期：
                    {formatDateForInput(
                      quote.QuoteDate ?? quote.quoteDate
                    )}
                    {'　'}
                    狀態：
                    {quoteStatusLabel(quote.Status ?? quote.status)}
                    {'　'}
                    系統：
                    {quote.QuoteSystemCodes ?? quote.quoteSystemCodes ?? '－'}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}

      <div className="mt-2 text-xs text-slate-500">
        已選擇 {selectedIds.length} 張報價單
      </div>
    </div>
  );
};

  const stageLabel = Object.fromEntries(stageOptions);
  const intentOptions = [['S','S-意願極高'], ['A','A-意願尚可'], ['B','B-未表明意願'], ['C','C-意願欠佳']];
  const intentLabel = Object.fromEntries(intentOptions);
  const contactLabel = { PHONE: '電話', MEETING: '會面', EMAIL: '電子郵件', LINE: 'LINE', OTHER: '其他', '電話':'電話', '會面':'會面', '電子郵件':'電子郵件', LINE:'LINE', '其他':'其他' };
  const selectedId = selectedOpportunity?.OpportunityId || selectedOpportunity?.opportunityId;
  const dateValue = (value) => value ? String(value).slice(0, 10) : '';
  const itemDate = (item) => dateValue(item.CreatedAt || item.createdAt || item.FillDate || item.fillDate);
  const lastFollowUpDate = (item) =>
  dateValue(
    item.LastFollowUpDate ||
    item.lastFollowUpDate ||
    item.LatestFollowUpDate ||
    item.latestFollowUpDate
  );

  const filteredOpportunities = [...opportunityList]
  .filter((item) => {
    const date = itemDate(item);

    const name = String(
      item.CustomerName ||
      item.customerName ||
      item.CustomerCode ||
      item.customerCode ||
      ''
    ).toLowerCase();

    const stage = item.Stage || item.stage;

    const ownerName = String(
      item.OwnerName ||
      item.ownerName ||
      ''
    ).trim();

    return (
      (!opportunityDateFrom || date >= opportunityDateFrom) &&
      (!opportunityDateTo || date <= opportunityDateTo) &&
      (!opportunitySearch.trim() ||
        name.includes(opportunitySearch.trim().toLowerCase())) &&
      (!opportunityOwnerName ||
        ownerName === opportunityOwnerName) &&
      (!hideNoFollowUp || stage !== 'LOST')
    );
  })

    .sort((a,b) => {
      const field = opportunitySort === 'CustomerName' ? (a.CustomerName || a.customerName || '') : opportunitySort === 'Stage' ? (stageLabel[a.Stage || a.stage] || '') : opportunitySort === 'CustomerGrade' ? (a.CustomerGrade || a.customerGrade || '') : itemDate(a);
      const other = opportunitySort === 'CustomerName' ? (b.CustomerName || b.customerName || '') : opportunitySort === 'Stage' ? (stageLabel[b.Stage || b.stage] || '') : opportunitySort === 'CustomerGrade' ? (b.CustomerGrade || b.customerGrade || '') : itemDate(b);
      return String(field).localeCompare(String(other), 'zh-Hant');
    });
  const pickerCustomers = customerList.filter(c => {
    const term = opportunityCustomerSearch.trim().toLowerCase();
    return !term || String(c.Code || '').toLowerCase().includes(term) || String(c.Name || '').toLowerCase().includes(term);
  });
  const selectedCustomer = customerList.find(c => String(c.CustomerId) === String(opportunityForm.customerId));
  const updateFollowUp = (field, value) => setFollowUpForm(prev => ({...prev, [field]: value}));
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div><h2 className="text-xl font-bold text-gray-800">3. 銷售案件追蹤</h2><p className="mt-1 text-sm text-gray-500">可依填單日期、客戶名稱篩選並管理業務案件。</p></div>
          <div className="flex gap-2"><button onClick={loadOpportunities} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">重新整理</button>  
  {can('SALES_TRACK', 'canCreate') && (
     <button
         onClick={openNewOpportunity}
         className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
     >
        ＋ 新增案件
     </button>
  )}
  </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="text-sm text-gray-600">填單日篩選<input type="date" value={opportunityDateFrom} onChange={e=>setOpportunityDateFrom(e.target.value)} className="mt-1 w-full rounded border p-2" /></label>
          <label className="text-sm text-gray-600">至<input type="date" value={opportunityDateTo} onChange={e=>setOpportunityDateTo(e.target.value)} className="mt-1 w-full rounded border p-2" /></label>
          <label className="text-sm text-gray-600">搜尋客戶<input value={opportunitySearch} onChange={e=>setOpportunitySearch(e.target.value)} placeholder="客戶名稱關鍵字" className="mt-1 w-full rounded border p-2" /></label>

<label className="text-sm text-gray-600">
  業務人員篩選
  <select
    value={opportunityOwnerName}
    onChange={(e) => setOpportunityOwnerName(e.target.value)}
    className="mt-1 w-full rounded border p-2"
  >
    <option value="">全部</option>

    {salesUserOptions.map((user) => (
      <option
        key={user.UserId}
        value={user.DisplayName}
      >
        {user.DisplayName}（{user.RoleCode}）
      </option>
    ))}
  </select>
</label>

<label className="text-sm text-gray-600">
  排序選擇

  <select
    value={opportunitySort}
    onChange={(e) =>
      setOpportunitySort(e.target.value)
    }
    className="mt-1 w-full rounded border p-2"
  >
    <option value="CreatedAt">
      依填單日
    </option>

    <option value="CustomerName">
      依客戶名稱
    </option>

    <option value="Stage">
      依銷售階段
    </option>

    <option value="CustomerGrade">
      依購買意願
    </option>
  </select>
</label>

<label className="flex items-center gap-2 pt-6 text-sm font-medium text-gray-700">
  <input
    type="checkbox"
    checked={hideNoFollowUp}
    onChange={(e) =>
      setHideNoFollowUp(e.target.checked)
    }
  />

  不需再追者略
</label>
        </div>
      </div>

{opportunityError && (
  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
    {opportunityError}
  </div>
)}

<div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
  {/* 左側：案件清單 */}
  <div className="overflow-hidden rounded-lg border bg-white shadow-sm xl:col-span-2">
    <div className="border-b bg-gray-50 px-4 py-3">
      <h3 className="font-bold text-gray-700">
        案件清單
      </h3>
    </div>

    <div className="max-h-[45vh] overflow-y-auto xl:max-h-[680px]">
      {opportunityLoading ? (
        <div className="p-8 text-center text-gray-400">
          案件讀取中...
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          尚無符合條件的案件
        </div>
      ) : (
        filteredOpportunities.map((item) => {
          const id =
            item.OpportunityId ||
            item.opportunityId;

          const stage =
            item.Stage ||
            item.stage;

          const grade =
            item.CustomerGrade ||
            item.customerGrade ||
            'B';

          const isSelected =
            Number(id) === Number(selectedId);

          const gradeClassName =
            grade === 'S'
              ? 'bg-orange-100 text-orange-700'
              : grade === 'A'
                ? 'bg-lime-100 text-lime-700'
                : grade === 'B'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-sky-100 text-sky-700';

          return (
            <button
              key={id}
              type="button"
              onClick={() => loadOpportunityDetail(id)}
              className={[
                'w-full border-b p-4 text-left',
                isSelected
                  ? 'border-l-4 border-l-blue-600 bg-blue-50'
                  : 'hover:bg-gray-50',
              ].join(' ')}
            >
              <div className="flex justify-between gap-2">
                <b>
                  {item.OpportunityName ||
                    item.opportunityName ||
                    '未命名案件'}
                </b>

                <span
                  className={[
                    'rounded-full px-2 py-1 text-xs font-bold',
                    gradeClassName,
                  ].join(' ')}
                >
                  {grade}
                </span>
              </div>

              <div className="mt-1 text-sm text-gray-600">
                {item.CustomerName ||
                  item.customerName ||
                  item.CustomerCode ||
                  item.customerCode ||
                  '－'}
              </div>

              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>
                  填單日：{itemDate(item) || '－'}
                </span>

                <span>
                  {stageLabel[stage] || stage || '－'}
                </span>
              </div>

              <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-500">
                <span>
                  負責人：
                  {item.OwnerName ||
                    item.ownerName ||
                    '－'}
                </span>

                <span>
                  預估：$
                  {Number(
                    item.EstimatedAmount ||
                    item.estimatedAmount ||
                    0
                  ).toLocaleString()}
                </span>
              </div>

              <div className="mt-1 text-xs text-gray-500">
                最近追蹤：
                {lastFollowUpDate(item) || '尚未追蹤'}
              </div>
            </button>
          );
        })
      )}
    </div>
  </div>

<div className="rounded-lg border bg-white p-6 shadow-sm xl:col-span-3">
  {!selectedOpportunity ? (
    <div className="flex min-h-[450px] items-center justify-center text-gray-400">
      請從左側選擇案件
    </div>
  ) : (
    <div className="space-y-6">
      {/* 案件標題與編輯按鈕 */}
      <div className="flex justify-between border-b pb-4">
        <div>
          <h3 className="text-xl font-bold">
            {selectedOpportunity.OpportunityName ||
              selectedOpportunity.opportunityName ||
              '未命名案件'}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            客戶：
            {selectedOpportunity.CustomerName ||
              selectedOpportunity.customerName ||
              '－'}
          </p>
        </div>

        {can('SALES_TRACK', 'canUpdate') && (
          <button
            type="button"
            onClick={openEditOpportunity}
            className="rounded-lg border border-blue-600 px-4 py-2 text-sm text-blue-600"
          >
            編輯案件
          </button>
        )}

        {can('SALES_TRACK', 'canDelete') && (
          <button
            type="button"
            onClick={deleteOpportunity}
            className="rounded-lg border border-red-600 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            刪除案件
          </button>
        )}
     </div>

      {/* 案件摘要 */}
      <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
        <div className="rounded bg-gray-50 p-3">
          <small>目前階段</small>

          <b className="mt-1 block">
            {stageLabel[
              selectedOpportunity.Stage ||
              selectedOpportunity.stage
            ] || '－'}
          </b>
        </div>

        <div className="rounded bg-gray-50 p-3">
          <small>購買意願</small>

          <b className="mt-1 block">
            {intentLabel[
              selectedOpportunity.CustomerGrade ||
              selectedOpportunity.customerGrade
            ] || '－'}
          </b>
        </div>

        <div className="rounded bg-gray-50 p-3">
          <small>預估金額</small>

          <b className="mt-1 block">
            $
            {Number(
              selectedOpportunity.EstimatedAmount ||
              selectedOpportunity.estimatedAmount ||
              0
            ).toLocaleString()}
          </b>
        </div>

        <div className="rounded bg-gray-50 p-3">
          <small>下次追蹤日</small>

          <b className="mt-1 block">
            {dateValue(
              selectedOpportunity.NextFollowUpDate ||
              selectedOpportunity.nextFollowUpDate
            ) || '－'}
          </b>
        </div>
      </div>

<div className="border-t pt-5">
  <h4 className="mb-3 font-semibold">關聯報價單</h4>

  {opportunityQuotationList.length === 0 ? (
    <div className="rounded bg-gray-50 p-4 text-sm text-gray-400">
      尚未對應報價單
    </div>
  ) : (
    <div className="overflow-x-auto rounded border">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="p-3">報價單號</th>
            <th className="p-3">報價日期</th>
            <th className="p-3">系統</th>
            <th className="p-3 text-right">報價金額</th>
            <th className="p-3">狀態</th>
          </tr>
        </thead>

        <tbody>
          {opportunityQuotationList.map((quote) => (
            <tr
              key={quote.QuotationId || quote.quotationId}
              className="border-t hover:bg-blue-50"
            >
              <td className="p-3 font-medium">
                {quote.QuotationNo || quote.quotationNo || '－'}

                {(
                  quote.IsPrimary === true ||
                  quote.IsPrimary === 1 ||
                  quote.IsPrimary === '1'
                ) && (
                  <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs font-normal text-blue-700">
                    主要
                  </span>
                )}
              </td>

              <td className="p-3">
                {formatDateForInput(
                  quote.QuoteDate || quote.quoteDate
                ) || '－'}
              </td>

              <td className="p-3">
                {quote.QuoteSystemCodes ||
                  quote.quoteSystemCodes ||
                  '－'}
              </td>

              <td className="p-3 text-right">
                {Number(
                  quote.FinalAmount ??
                  quote.finalAmount ??
                  quote.TaxIncludedAmount ??
                  quote.taxIncludedAmount ??
                  quote.TotalAmount ??
                  quote.totalAmount ??
                  0
                ).toLocaleString()}
              </td>

              <td className="p-3">
                {quoteStatusLabel(quote.Status || quote.status)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>

<div className="border-t pt-5">
  <h4 className="mb-3 font-semibold">新增追蹤紀錄</h4>

  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
    <label className="text-sm">
      聯絡方式

      <select
        value={followUpForm.contactMethod}
        onChange={(e) =>
          updateFollowUp('contactMethod', e.target.value)
        }
        className="mt-1 w-full rounded border p-2"
      >
        <option>電話</option>
        <option>會面</option>
        <option>電子郵件</option>
        <option>LINE</option>
        <option>其他</option>
      </select>
    </label>

    <label className="text-sm">
      接洽人員

      <input
        value={followUpForm.contactName}
        onChange={(e) =>
          updateFollowUp('contactName', e.target.value)
        }
        className="mt-1 w-full rounded border p-2"
      />
    </label>

    <label className="text-sm">
      追蹤日期

      <input
        type="text"
        inputMode="numeric"
        placeholder="YYYY-MM-DD"
        value={followUpForm.followUpDate}
        onChange={(e) =>
          updateFollowUp('followUpDate', e.target.value)
        }
        onBlur={(e) =>
          updateFollowUp(
            'followUpDate',
            toIsoDate(e.target.value) || e.target.value
          )
        }
        className="mt-1 w-full rounded border p-2"
      />
    </label>

    <label className="text-sm">
      銷售階段

      <select
        value={
          followUpForm.stage ||
          selectedOpportunity.Stage ||
          selectedOpportunity.stage ||
          ''
        }
        onChange={(e) =>
          updateFollowUp('stage', e.target.value)
        }
        className="mt-1 w-full rounded border p-2"
      >
        {stageOptions.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>

    <label className="text-sm">
      購買意願

      <select
        value={
          followUpForm.customerGrade ||
          selectedOpportunity.CustomerGrade ||
          selectedOpportunity.customerGrade ||
          'B'
        }
        onChange={(e) =>
          updateFollowUp('customerGrade', e.target.value)
        }
        className="mt-1 w-full rounded border p-2"
      >
        {intentOptions.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>

    <label className="text-sm">
      下次追蹤日

      <input
        type="text"
        inputMode="numeric"
        placeholder="YYYY-MM-DD"
        value={followUpForm.nextFollowUpDate}
        onChange={(e) =>
          updateFollowUp('nextFollowUpDate', e.target.value)
        }
        onBlur={(e) =>
          updateFollowUp(
            'nextFollowUpDate',
            toIsoDate(e.target.value) || e.target.value
          )
        }
        className="mt-1 w-full rounded border p-2"
      />
    </label>

    {renderQuotationSelector({
      selectedIds: followUpForm.quotationIds || [],
      customerId:
        selectedOpportunity?.CustomerId ||
        selectedOpportunity?.customerId ||
        '',
      onChange: (quotationIds) =>
        setFollowUpForm((prev) => ({
          ...prev,
          quotationIds,
        })),
    })}

    <label className="text-sm md:col-span-3">
      洽談內容

      <textarea
        value={followUpForm.content}
        onChange={(e) =>
          updateFollowUp('content', e.target.value)
        }
        rows={3}
        className="mt-1 w-full rounded border p-2"
        placeholder="請輸入本次追蹤內容"
      />
    </label>
  </div>

  <div className="mt-3 text-right">
    {can('SALES_TRACK', 'canUpdate') && (
      <button
        type="button"
        onClick={saveFollowUp}
        disabled={followUpSaving}
        className="rounded bg-green-600 px-5 py-2 text-sm text-white disabled:bg-gray-400"
      >
        {followUpSaving ? '儲存中...' : '新增追蹤紀錄'}
      </button>
    )}
  </div>
</div>

<div className="border-t pt-5">
  <h4 className="mb-3 font-semibold">追蹤紀錄歷程</h4>

  {followUpList.length === 0 ? (
    <div className="rounded bg-gray-50 p-4 text-sm text-gray-400">
      尚無追蹤紀錄
    </div>
  ) : (
    <div className="space-y-3">
      {followUpList.map((item, index) => {
        const followUpQuotations =
          item.FollowUpQuotations ||
          item.followUpQuotations ||
          [];

        return (
          <div
            key={item.FollowUpId || item.followUpId || index}
            className="rounded border p-4"
          >
            <div className="flex items-start justify-between gap-3">
               <div>
                <b>
                  {contactLabel[
                    item.ContactMethod || item.contactMethod
                  ] || '其他'}
                  {' '}
                  {item.ContactName || item.contactName || ''}
                </b>

                <div className="mt-1 text-xs text-gray-500">
                  {stageLabel[item.Stage || item.stage] || ''}
                  {'　'}
                  {intentLabel[
                    item.CustomerGrade || item.customerGrade
                  ] || ''}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {dateValue(item.FollowUpDate || item.followUpDate)}
                </span>

                {can('SALES_TRACK', 'canDelete') && (
                  <button
                    type="button"
                    onClick={() => deleteFollowUp(item)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    刪除
                  </button>
                )}
              </div>
            </div>

            <p className="mt-2 text-sm">
              {item.Content || item.content}
            </p>

            {Array.isArray(followUpQuotations) &&
              followUpQuotations.length > 0 && (
                <div className="mt-3 rounded bg-blue-50 p-3 text-xs text-blue-800">
                  <div className="mb-1 font-medium">
                    本次追蹤關聯報價單
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {followUpQuotations.map((quote) => (
                      <span
                        key={quote.QuotationId || quote.quotationId}
                        className="rounded border border-blue-200 bg-white px-2 py-1"
                      >
                        {quote.QuotationNo || quote.quotationNo || '－'}
                        {'｜'}NT$
                        {Number(
                          quote.FinalAmount ??
                          quote.finalAmount ??
                          quote.TaxIncludedAmount ??
                          quote.taxIncludedAmount ??
                          quote.TotalAmount ??
                          quote.totalAmount ??
                          0
                        ).toLocaleString()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {(item.NextFollowUpDate || item.nextFollowUpDate) && (
              <div className="mt-2 text-xs text-blue-600">
                下次追蹤：
                {dateValue(
                  item.NextFollowUpDate || item.nextFollowUpDate
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  )}
</div>

      </div>
    )}
  </div>
</div>

{showOpportunityForm && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    onMouseDown={() => setShowOpportunityForm(false)}
  >
    <div
      className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* 彈窗標題列 */}
      <div className="mb-5 flex justify-between">
        <h3 className="text-xl font-bold">
          {opportunityForm.opportunityId
            ? '編輯案件'
            : '新增案件'}
        </h3>

        <button
          type="button"
          onClick={() => setShowOpportunityForm(false)}
          className="text-xl leading-none text-gray-500 hover:text-gray-800"
          aria-label="關閉新增案件視窗"
        >
          ×
        </button>
      </div>

      {/* 案件表單 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

<label className="md:col-span-2 text-sm">
  客戶 <span className="text-red-500">*</span>

  <div className="mt-1 flex gap-2">
    <input
      readOnly
      value={
        selectedCustomer
          ? `${selectedCustomer.Code}－${selectedCustomer.Name}`
          : ''
      }
      placeholder="請點選選擇客戶"
      className="w-full rounded border bg-gray-50 p-2"
    />

    <button
      type="button"
      onClick={() => setShowOpportunityCustomerPicker(true)}
      className="rounded border border-blue-600 px-4 text-blue-600"
    >
      選擇客戶
    </button>
  </div>
</label>

{renderQuotationSelector({
  selectedIds: opportunityForm.quotationIds || [],
  customerId: opportunityForm.customerId,
  onChange: (quotationIds) =>
    setOpportunityForm((prev) => ({
      ...prev,
      quotationIds,
      quotationId: quotationIds[0] || '',
    })),
})}

<label className="md:col-span-2 text-sm">
  案件名稱

  <input
    value={opportunityForm.opportunityName}
    onChange={(e) =>
      setOpportunityForm((p) => ({
        ...p,
        opportunityName: e.target.value,
      }))
    }
    className="mt-1 w-full rounded border p-2"
  />
</label>

     <label className="text-sm">
       填單日
       <input
         type="text"
         inputMode="numeric"
         placeholder="YYYY-MM-DD"
         value={opportunityForm.createdAt}
         onChange={(e) =>
           setOpportunityForm((p) => ({
             ...p,
             createdAt: e.target.value,
           }))
         }
         onBlur={(e) =>
           setOpportunityForm((p) => ({
             ...p,
             createdAt: toIsoDate(e.target.value) || e.target.value,
           }))
         }
         className="mt-1 w-full rounded border p-2"
       />
      </label>

      <label className="text-sm">
        銷售階段
        <select
          value={opportunityForm.stage}
          onChange={(e) =>
            setOpportunityForm((p) => ({
              ...p,
              stage: e.target.value,
            }))
          }
          className="mt-1 w-full rounded border p-2"
        >
          {stageOptions.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        購買意願
        <select
          value={opportunityForm.customerGrade}
          onChange={(e) =>
            setOpportunityForm((p) => ({
              ...p,
              customerGrade: e.target.value,
            }))
          }
          className="mt-1 w-full rounded border p-2"
        >
          {intentOptions.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        預估金額
        <input
           type="text"
            inputMode="numeric"
            placeholder="0"
            value={formatAmountInput(opportunityForm.estimatedAmount)}
            onChange={(e) =>
              setOpportunityForm((p) => ({
                ...p,
                estimatedAmount: e.target.value.replace(/[^\d]/g, ''),
              }))
            }
            className="mt-1 w-full rounded border p-2 text-right"
          />
      </label>

      <label className="text-sm">
        預計成交日
        <input
          type="text"
          inputMode="numeric"
          placeholder="YYYY-MM-DD"
          value={opportunityForm.expectedCloseDate}
          onChange={(e) =>
            setOpportunityForm((p) => ({
              ...p,
              expectedCloseDate: e.target.value,
            }))
          }
          onBlur={(e) =>
            setOpportunityForm((p) => ({
              ...p,
              expectedCloseDate: toIsoDate(e.target.value) || e.target.value,
            }))
          }
          className="mt-1 w-full rounded border p-2"
        />
      </label>

<label className="text-sm">
  下次追蹤日

  <input
    type="text"
    inputMode="numeric"
    placeholder="YYYY-MM-DD"
    value={opportunityForm.nextFollowUpDate}
    onChange={(e) =>
      setOpportunityForm((prev) => ({
        ...prev,
        nextFollowUpDate: e.target.value,
      }))
    }
    onBlur={(e) =>
      setOpportunityForm((prev) => ({
        ...prev,
        nextFollowUpDate:
          toIsoDate(e.target.value) || e.target.value,
      }))
    }
    className="mt-1 w-full rounded border p-2"
  />
</label>

<label className="text-sm md:col-span-2">
  案件說明

  <textarea
    value={opportunityForm.description}
    onChange={(e) =>
      setOpportunityForm((prev) => ({
        ...prev,
        description: e.target.value,
      }))
    }
    rows={4}
    className="mt-1 w-full rounded border p-2"
  />
</label>

<div className="mt-6 flex justify-end gap-3">
  <button
    type="button"
    onClick={() => setShowOpportunityForm(false)}
    className="rounded border px-5 py-2"
  >
    取消
  </button>

  <button
    type="button"
    onClick={saveOpportunity}
    disabled={opportunitySaving}
    className="rounded bg-blue-600 px-5 py-2 text-white disabled:bg-gray-400"
  >
    {opportunitySaving ? '儲存中...' : '儲存案件'}
  </button>
</div>
      </div>
    </div>
  </div>
)}

      {showOpportunityCustomerPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6">
            <div className="flex justify-between">
              <h3 className="text-lg font-bold">
                搜尋並選擇客戶
              </h3>

              <button
                type="button"
                onClick={() => setShowOpportunityCustomerPicker(false)}
                className="text-xl leading-none text-gray-500 hover:text-gray-800"
                aria-label="關閉客戶選擇視窗"
              >
                ×
              </button>
            </div>

            <input
              autoFocus
              value={opportunityCustomerSearch}
              onChange={(e) =>
                setOpportunityCustomerSearch(e.target.value)
              }
              placeholder="輸入客戶代號或名稱"
              className="mt-4 w-full rounded border p-2"
            />

            <div className="mt-3 max-h-80 overflow-y-auto rounded border">
              {pickerCustomers.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-400">
                  查無符合條件的客戶
                </div>
              ) : (
                pickerCustomers.map((customer) => (
  <button
    key={
      customer.CustomerId ||
      customer.customerId ||
      customer.Code ||
      customer.code
    }
    type="button"
    onClick={() => {
      setOpportunityForm((prev) => ({
        ...prev,
        customerId: String(
          customer.CustomerId ||
          customer.customerId
        ),
        quotationId: '',
        quotationIds: [],
      }));

      setShowOpportunityCustomerPicker(false);
      setOpportunityCustomerSearch('');
    }}
    className="block w-full border-b p-3 text-left hover:bg-blue-50"
  >
    <b>
      {customer.Code || customer.code}
    </b>

    {'　'}
    {customer.Name || customer.name}
  </button>
))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const renderUserManagement = () => {
  const updateUserForm = (field, value) => {
    setUserForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openEditUser = async (user) => {
    const roleCode = user.RoleCode || user.roleCode || 'SALES';
    const normalizedRole = String(roleCode).toUpperCase();

    const permissionRows =
      normalizedRole === 'ROOT'
        ? createDefaultPermissionRows()
        : await loadUserPermissionRows(user.UserId);

    setSelectedManagedUserId(user.UserId);

    setUserForm({
      userId: user.UserId,
      loginAccount: user.LoginAccount || '',
      displayName: user.DisplayName || '',
      password: '',
      roleCode,
      isActive: toBoolean(user.IsActive),
      mustChangePassword: toBoolean(user.MustChangePassword),
      canViewCustomer: toBoolean(user.CanViewCustomer),
      canViewQuote: toBoolean(user.CanViewQuote),
      canViewSalesTrack: toBoolean(user.CanViewSalesTrack),
      canViewContracts: toBoolean(user.CanViewContracts),
      canViewSystemSettings: toBoolean(user.CanViewSystemSettings),
      canManageUsers: toBoolean(user.CanManageUsers),
      permissions: permissionRows,
    });
  };

  const applyRolePreset = (roleCode) => {
    const presets = {
      ROOT: {
        canViewCustomer: true,
        canViewQuote: true,
        canViewSalesTrack: true,
        canViewContracts: true,
        canViewSystemSettings: true,
        canManageUsers: true,
      },
      ADMIN: {
        canViewCustomer: true,
        canViewQuote: true,
        canViewSalesTrack: true,
        canViewContracts: true,
        canViewSystemSettings: true,
        canManageUsers: false,
      },
      MANAGER: {
        canViewCustomer: true,
        canViewQuote: true,
        canViewSalesTrack: true,
        canViewContracts: true,
        canViewSystemSettings: false,
        canManageUsers: false,
      },
      SALES: {
        canViewCustomer: true,
        canViewQuote: false,
        canViewSalesTrack: true,
        canViewContracts: false,
        canViewSystemSettings: false,
        canManageUsers: false,
      },
    };

    setUserForm((prev) => ({
      ...prev,
      roleCode,
      ...presets[roleCode],
    }));
  };

  const permissions = [
    ['canViewCustomer', '客戶資料'],
    ['canViewQuote', '報價建檔'],
    ['canViewSalesTrack', '銷售案件追蹤'],
    ['canViewContracts', '客戶合約'],
    ['canViewSystemSettings', '系統設定'],
    ['canManageUsers', '使用者／權限設定'],
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-red-200 bg-red-50 p-5">
        <h2 className="text-xl font-bold text-red-800">
          🔐 權限設定
        </h2>

        <p className="mt-1 text-sm text-red-700">
          僅 ROOT 可新增、編輯、停用使用者及設定功能權限。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="rounded-lg border bg-white p-5 shadow-sm xl:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">
              {userForm.userId ? '編輯使用者' : '新增使用者'}
            </h3>

            {userForm.userId && (
              <button
                type="button"
                onClick={() => {
                  setUserForm(initialUserForm);
                  setSelectedManagedUserId(null);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                新增使用者
              </button>
            )}
          </div>

          <div className="space-y-4">
            <label className="block text-sm">
              登入帳號 <span className="text-red-500">*</span>
              <input
                value={userForm.loginAccount}
                disabled={Boolean(userForm.userId)}
                onChange={(e) =>
                  updateUserForm('loginAccount', e.target.value)
                }
                className="mt-1 w-full rounded border p-2 disabled:bg-gray-100"
                placeholder="例如：wang.sales"
              />
            </label>

            <label className="block text-sm">
              顯示名稱 <span className="text-red-500">*</span>
              <input
                value={userForm.displayName}
                onChange={(e) =>
                  updateUserForm('displayName', e.target.value)
                }
                className="mt-1 w-full rounded border p-2"
                placeholder="例如：王小明"
              />
            </label>

            {!userForm.userId && (
              <label className="block text-sm">
                初始密碼 <span className="text-red-500">*</span>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) =>
                    updateUserForm('password', e.target.value)
                  }
                  className="mt-1 w-full rounded border p-2"
                  placeholder="首次登入密碼"
                />
              </label>
            )}

            <label className="block text-sm">
              角色
              <select
                value={userForm.roleCode}
                disabled={userForm.roleCode === 'ROOT'}
                onChange={(e) => applyRolePreset(e.target.value)}
                className="mt-1 w-full rounded border p-2 disabled:bg-gray-100"
              >
                <option value="SERVICE">SERVICE－客服</option>
                <option value="SALES">SALES－業務</option>
                <option value="MANAGER">MANAGER－主管</option>
                <option value="PRESIDENT">PRESIDENT－高層主管</option>
                <option value="ROOT">ADMIN－系統管理員</option>
              </select>
            </label>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={userForm.isActive}
                  disabled={userForm.roleCode === 'ROOT'}
                  onChange={(e) =>
                    updateUserForm('isActive', e.target.checked)
                  }
                />
                帳號啟用
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={userForm.mustChangePassword}
                  onChange={(e) =>
                    updateUserForm(
                      'mustChangePassword',
                      e.target.checked
                    )
                  }
                />
                下次登入強制改密碼
              </label>
            </div>

            {String(userForm.roleCode).toUpperCase() === 'ROOT' ? (
  <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
    ROOT 為系統管理員，永遠擁有全部功能及查詢、新增、修改、刪除權限，
    不需要設定個別權限。
  </div>
) : (
  <div className="border-t pt-4">
    <div className="mb-3 text-sm font-semibold text-gray-700">
      功能權限
    </div>

    <div className="overflow-x-auto rounded border">
      <table className="w-full min-w-[680px] text-sm">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-3 py-2 text-left">功能名稱</th>
            <th className="px-3 py-2 text-center">查詢</th>
            <th className="px-3 py-2 text-center">新增</th>
            <th className="px-3 py-2 text-center">修改</th>
            <th className="px-3 py-2 text-center">刪除</th>
          </tr>
        </thead>

        <tbody>
          {permissionFunctions.map((item) => {
            const row =
              userForm.permissions?.find(
                (permission) =>
                  permission.functionCode === item.code
              ) || {
                functionCode: item.code,
                canQuery: false,
                canCreate: false,
                canUpdate: false,
                canDelete: false,
              };

            const updatePermission = (field, checked) => {
              setUserForm((previous) => {
                const permissions = [
                  ...(previous.permissions || []),
                ];

                const index = permissions.findIndex(
                  (permission) =>
                    permission.functionCode === item.code
                );

                const nextRow = {
                  ...row,
                  [field]: checked,
                };

                // 勾選「新增、修改、刪除」時，自動勾選「查詢」
                if (field !== 'canQuery' && checked) {
                  nextRow.canQuery = true;
                }

                // 取消「查詢」時，其他三個操作權限也一併取消
                if (field === 'canQuery' && !checked) {
                  nextRow.canCreate = false;
                  nextRow.canUpdate = false;
                  nextRow.canDelete = false;
                }

                if (index >= 0) {
                  permissions[index] = nextRow;
                } else {
                  permissions.push(nextRow);
                }

                return {
                  ...previous,
                  permissions,
                };
              });
            };

            return (
              <tr key={item.code} className="border-t">
                <td className="px-3 py-2 font-medium">
                  {item.label}
                </td>

                {[
                  'canQuery',
                  'canCreate',
                  'canUpdate',
                  'canDelete',
                ].map((field) => (
                  <td
                    key={field}
                    className="px-3 py-2 text-center"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(row[field])}
                      onChange={(event) =>
                        updatePermission(
                          field,
                          event.target.checked
                        )
                      }
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
)}

            <button
              type="button"
              disabled={userSaving}
              onClick={saveAppUser}
              className="w-full rounded bg-red-600 px-4 py-2.5 font-medium text-white hover:bg-red-700 disabled:bg-gray-400"
            >
              {userSaving ? '儲存中...' : '儲存使用者'}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-white shadow-sm xl:col-span-3">
          <div className="flex items-center justify-between border-b bg-gray-50 px-5 py-4">
            <div>
              <h3 className="font-bold text-gray-800">使用者清單</h3>
              <p className="mt-1 text-xs text-gray-500">
                點選使用者可編輯權限；ROOT 不可停用或降權。
              </p>
            </div>

            <button
              type="button"
              onClick={loadAppUsers}
              className="rounded border px-3 py-2 text-sm hover:bg-white"
            >
              重新整理
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="px-4 py-3">帳號</th>
                  <th className="px-4 py-3">姓名</th>
                  <th className="px-4 py-3">角色</th>
                  <th className="px-4 py-3">狀態</th>
                  <th className="px-4 py-3">功能</th>
                  <th className="px-4 py-3 text-center">操作</th>
                </tr>
              </thead>

              <tbody>
                {appUsersLoading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-4 py-10 text-center text-gray-400"
                    >
                      使用者資料讀取中...
                    </td>
                  </tr>
                ) : appUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-4 py-10 text-center text-gray-400"
                    >
                      尚無使用者資料
                    </td>
                  </tr>
                ) : (
                  appUsers.map((user) => {
                    const isRoot =
                      String(user.RoleCode || user.roleCode).toUpperCase() ===
                      'ROOT';

                    const featureCount = Number(user.QueryFeatureCount || 0);

                    return (
                      <tr
                        key={user.UserId}
                        className={`border-b hover:bg-red-50 ${
                          selectedManagedUserId === user.UserId
                            ? 'bg-red-50'
                            : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-medium">
                          {user.LoginAccount}
                        </td>
                        <td className="px-4 py-3">
                          {user.DisplayName}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-1 text-xs font-medium ${
                              isRoot
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {user.RoleCode || user.roleCode}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {user.IsActive ? (
                            <span className="text-green-700">啟用</span>
                          ) : (
                            <span className="text-gray-400">停用</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                           {isRoot ? '全部權限' : `${featureCount} 項`}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => openEditUser(user)}
                            className="text-blue-600 hover:underline"
                          >
                            編輯
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

  const renderContracts = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">4. 客戶合約資料專區</h2>
      <p className="text-gray-500 mb-4">此區塊顯示已成交的報價轉換成的正式合約記錄，包含授權範圍與維護到期日。</p>
      <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">開發建置中...</div>
    </div>
  );

  if (!salesAuthReady) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        系統載入中...
      </div>
    );
  }

  if (!salesUser) {
    return (
      <SalesLoginPage
        onLoginSuccess={(user) => {
        console.log('Login success user:', user);
        console.log('Switching activeTab to: salestrack');
          setSalesUser(user);
          setActiveTab('salestrack');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen md:h-screen bg-gray-100 flex flex-col md:flex-row font-sans md:overflow-hidden">
      
      {/* 左側 Sidebar 導覽列 */}
      <div className="w-full md:w-64 bg-gray-900 text-white shadow-lg flex-shrink-0 z-20">
        <div className="p-6 bg-gray-950 border-b border-gray-800"><h1 className="text-xl font-bold text-blue-400 cursor-pointer">高益營建軟體</h1><div className="text-xs text-gray-400 mt-1">業務整合系統 v2</div></div>
<div className="border-b border-gray-800 px-6 py-4">
  <div className="text-sm font-medium text-white">
    {salesUser?.displayName || salesUser?.DisplayName}
  </div>

  <div className="mt-1 text-xs text-blue-300">
  {(() => {
    const roleCode = String(
      salesUser?.role ||
        salesUser?.Role ||
        salesUser?.RoleCode ||
        salesUser?.UserRole ||
        ''
    ).toUpperCase();

    const roleLabelMap = {
      ROOT: '系統管理員',
      ADMIN: '系統管理員',
      PRESIDENT: '高層主管',
      MANAGER: '業務主管',
      SALES: '業務人員',
      SERVICE: '客服人員',
    };

    return roleLabelMap[roleCode] || '一般使用者';
  })()}
</div>

  <button
    onClick={handleSalesLogout}
    className="mt-3 text-xs text-gray-400 hover:text-white"
  >
    登出目前帳號
  </button>
</div>
        <nav className="flex gap-2 overflow-x-auto p-3 md:block md:space-y-2 md:overflow-y-auto md:p-4">
  {(() => {
    const currentRole = String(
      salesUser?.role ||
        salesUser?.Role ||
        salesUser?.RoleCode ||
        salesUser?.UserRole ||
        ''
    ).toUpperCase();

    const sidebarIsRoot = currentRole === 'ROOT';

    return (
      <>
        {can('CUSTOMER', 'canQuery') && (
          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`shrink-0 w-auto rounded px-4 py-3 text-left transition md:w-full ${
              activeTab === 'customer'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            1. (潛在)客戶資料建檔
          </button>
        )}

        {can('QUOTE', 'canQuery') && (
          <button
            type="button"
            onClick={() => {
              setActiveTab('quotenew');
              setQuoteItems([]);
              setCustomerCode('');
            }}
            className={`shrink-0 w-auto rounded px-4 py-3 text-left transition md:w-full ${
              activeTab === 'quotenew'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            2. 營建系統報價作業
          </button>
        )}

        {can('SALES_TRACK', 'canQuery') && (
          <button
            type="button"
            onClick={() => setActiveTab('salestrack')}
            className={`shrink-0 w-auto rounded px-4 py-3 text-left transition md:w-full ${
              activeTab === 'salestrack'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            3. 業務銷售追蹤專區
          </button>
        )}

        {can('CONTRACT', 'canQuery') && (
          <button
            type="button"
            onClick={() => setActiveTab('contracts')}
            className={`shrink-0 w-auto rounded px-4 py-3 text-left transition md:w-full ${
              activeTab === 'contracts'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            4. 客戶合約資料專區
          </button>
        )}

        {can('ADD_USER_QUOTE', 'canQuery') && (
          <button
            type="button"
            onClick={() => {
              setActiveTab('quoteadd');
              setQuoteItems([]);
              setCustomerCode('');
            }}
            className={`shrink-0 w-auto rounded px-4 py-3 text-left transition md:w-full ${
              activeTab === 'quoteadd'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            5. 增設授權報價建檔
          </button>
        )}

        {can('MAINTENANCE_QUOTE', 'canQuery') && (
          <button
            type="button"
            onClick={() => {
              setActiveTab('quotemaint');
              setQuoteItems([]);
              setCustomerCode('');
            }}
            className={`shrink-0 w-auto rounded px-4 py-3 text-left transition md:w-full ${
              activeTab === 'quotemaint'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            6. 維護合約報價建檔
          </button>
        )}

        {sidebarIsRoot && (
          <>
            <div className="my-3 border-t border-amber-700" />

            <button
              type="button"
              onClick={() => setActiveTab('systemsettings')}
              className={`shrink-0 w-auto rounded px-4 py-3 text-left transition md:w-full ${
                activeTab === 'systemsettings'
                  ? 'bg-amber-500 text-white'
                  : 'text-amber-300 hover:bg-gray-800'
              }`}
            >
              ⚙ 系統設定：軟體與價格
            </button>
          </>
        )}

        {sidebarIsRoot && (
          <>
            <div className="my-3 border-t border-red-700" />

            <button
              type="button"
              onClick={() => setActiveTab('usermanagement')}
              className={`shrink-0 w-auto rounded px-4 py-3 text-left transition md:w-full ${
                activeTab === 'usermanagement'
                  ? 'bg-red-600 text-white'
                  : 'text-red-300 hover:bg-gray-800'
              }`}
            >
              🔐 權限設定
            </button>
          </>
        )}
      </>
    );
  })()}
</nav>
      </div>

      {/* 右側主內容區 */}
      <div className="flex-1 overflow-y-auto bg-gray-100 p-3 sm:p-4 md:p-6">
        <div className="mx-auto min-h-full max-w-7xl">
          {activeTab === 'customer' && renderCustomerForm()}
          {activeTab === 'quotenew' && renderQuotationForm( '2. 建置系統報價單', 'NEW_LICENSE', 'CreateNewSystemQuote')}
          {activeTab === 'salestrack' && renderSalesTracking()}
          {activeTab === 'systemsettings' && isRoot && renderSystemSettings()}
          {activeTab === 'usermanagement' && isRoot && renderUserManagement()}
          {activeTab === 'contracts' && renderContracts()}
          {activeTab === 'quoteadd' && renderQuotationForm( '5. 增設授權報價單', 'ADD_USER', 'CreateAddUserQuote')}
          {activeTab === 'quotemaint' && renderQuotationForm('6. 維護合約報價單', 'MAINTENANCE', 'CreateMaintenanceQuote')}
         </div>
      </div>
      
      {showQuotePreview && previewQuote && (
  <div
    className="quote-preview-modal fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3"
    onMouseDown={() => setShowQuotePreview(false)}
  >
    
<style>{`
      /* 報價單本體：固定 A4 的可用最小高度 */
      .quote-sheet {
        width: 200mm;
        min-height: 287mm;
        margin: 0 auto;
        padding: 5mm;
        box-sizing: border-box;
        border: 1px solid #111;
        background: #fff;
        color: #000;
        font-family: Arial, "Microsoft JhengHei", sans-serif;
        font-size: 11px;
        line-height: 1.3;
        overflow: visible;

        /*
         * 關鍵：使報價單垂直排列。
         * quote-spacer 會自動吃掉剩餘高度，
         * 並把 quote-footer 推到 A4 最下方。
         */
        display: flex;
        flex-direction: column;
      }

      /* 上方內容：抬頭、客戶資訊、明細、系統說明 */
      .quote-main-content {
        display: block !important;
        flex: 0 0 auto !important;
        min-height: 0 !important;
      }

      /* 中間自動空白區：上方系統說明越少，空白越大 */
      .quote-spacer {
        flex: 1 1 auto;
        min-height: 0;
      }

      /* 下方固定區：維護說明、簽章、付款條件 */
      .quote-footer {
        display: block !important;
        flex: 0 0 auto !important;
        min-height: 0 !important;

        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      /* 表格格線：保留你原本漂亮的版面 */
      .quote-sheet table {
        width: 100%;
        border-collapse: collapse;
        border-spacing: 0;
      }

      .quote-sheet table:not(.noborder) {
        border: 1px solid #111;
      }

      .quote-sheet table:not(.noborder) th,
      .quote-sheet table:not(.noborder) td {
        border: 1px solid #111;
        padding: 4px;
        vertical-align: middle;
      }

      .quote-sheet .noborder,
      .quote-sheet .noborder th,
      .quote-sheet .noborder td {
        border: 0;
      }

      .quote-sheet .noborder td {
        padding: 1px;
      }

      .quote-sheet .compact {
        font-size: 10px;
        line-height: 1.25;
      }

      .quote-sheet img {
        max-width: 100%;
      }

      @media print {
        @page {
          size: A4 portrait;
          margin: 4mm 5mm;
        }

        html,
        body {
          width: 210mm !important;
          height: 297mm !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          background: #fff !important;
        }

        /*
         * 先隱藏整個 React 後台，
         * 再只放行報價單列印範圍。
         */
        body * {
          visibility: hidden !important;
        }

        #quote-print-area,
        #quote-print-area * {
          visibility: visible !important;
        }

        /*
         * 關鍵修正：
         * 取消預覽彈窗中間區的 overflow-auto、flex 高度與捲軸。
         */
        .quote-preview-scroll {
          display: block !important;
          flex: none !important;
          width: auto !important;
          min-width: 0 !important;
          min-height: 0 !important;
          height: auto !important;
          max-height: none !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          overflow-x: visible !important;
          overflow-y: visible !important;
          background: #fff !important;
        }

        /*
         * 關閉白色預覽外框的 Flex 高度與 overflow-hidden，
         * 否則它仍可能生成隱性多頁。
         */
        .quote-preview-modal,
        .quote-preview-modal > div {
          display: block !important;
          width: auto !important;
          min-width: 0 !important;
          min-height: 0 !important;
          height: auto !important;
          max-height: none !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          background: #fff !important;
          box-shadow: none !important;
        }

        /*
         * 報價單列印範圍：
         * 不使用 position:absolute 或 transform。
         */
        #quote-print-area {
          display: block !important;
          position: static !important;
          width: auto !important;
          min-width: 0 !important;
          min-height: 0 !important;
          height: auto !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          background: #fff !important;
          box-shadow: none !important;
          transform: none !important;
        }

        /*
         * 列印時不使用預覽的 Flex 留白高度。
         * 防止 quote-spacer 和 min-height 產生空白分頁。
         */
        .quote-sheet {
          display: flex !important;
          flex-direction: column !important;

          width: 200mm !important;
          min-width: 0 !important;

          /*
           * 不強制撐滿整張 A4：
           * 報價單高度依實際內容決定，
           * 不會在底部留下大片空白。
           */
          min-height: 0 !important;
          height: auto !important;

          margin: 0 auto !important;
          padding: 5mm !important;
          box-sizing: border-box !important;

          border: 1px solid #111 !important;
          overflow: visible !important;
          transform: none !important;

          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }

        .quote-main-content,
        .quote-footer {
          display: block !important;
          min-height: 0 !important;
          height: auto !important;
        }

        .quote-spacer {
          display: block !important;

          /*
           * 列印時只保留適量間距，
           * 不用 flex 撐到整張紙的底端。
           */
          flex: 0 0 8mm !important;
          min-height: 8mm !important;
          height: 8mm !important;
        }

        .quote-footer {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }

        /*
         * 列印時不要顯示按鈕、標題列或彈窗操作區。
         */
        .no-print,
        .quote-actions,
        .quote-sheet button {
          display: none !important;
        }
                /*
         * 三套以上系統時，底部說明可能差少量高度被裁切。
         * 列印版微調簽章區，回收約 5mm 高度，
         * 預覽畫面完全不受影響。
         */
        .quote-signature-table {
          margin-top: 2mm !important;
        }

        .quote-signature-table > tbody > tr:last-child {
          height: 27mm !important;
        }

        .quote-signature-table img {
          max-height: 24mm !important;
          width: auto !important;
          object-fit: contain !important;
        }

        .quote-signature-table td,
        .quote-signature-table th {
          padding-top: 2px !important;
          padding-bottom: 2px !important;
        }

        .quote-bottom-note {
          margin-top: 1mm !important;
          padding-top: 0.5mm !important;
          font-size: 9px !important;
          line-height: 1.15 !important;

          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
      }    
`}</style>

    <div
      className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-[1450px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      onMouseDown={(event) => event.stopPropagation()}
    >
      {/* 上方標題列：只在螢幕預覽顯示 */}
      <div className="no-print flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-3">
        <div>
          <h3 className="text-lg font-bold text-gray-800">報價單預覽</h3>

          <p className="mt-0.5 text-xs text-gray-500">
            {previewQuote.quote?.QuotationNo || ""}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowQuotePreview(false)}
          className="text-2xl leading-none text-gray-400 hover:text-gray-700"
          title="關閉"
          aria-label="關閉預覽"
        >
          ×
        </button>
      </div>

      {/* 中間內容區：只有此區塊可捲動 */}
      <div className="quote-preview-scroll flex-1 overflow-auto bg-gray-200 p-4 sm:p-6">
        <div
          id="quote-print-area"
          className="mx-auto w-fit min-w-[210mm] bg-white shadow-sm"
        >
          <div className="quote-sheet">
        <div className="quote-main-content">
            {/* 原報價單內的關閉按鈕：螢幕顯示，列印隱藏 */}
            <button
              type="button"
              onClick={() => setShowQuotePreview(false)}
              className="no-print float-right text-2xl leading-none text-gray-400 hover:text-gray-700"
              title="關閉"
              aria-label="關閉預覽"
            >
              ×
            </button>

            {/* 公司抬頭 */}
            <header className="mb-2 border-b-2 border-black pb-2">
              <div className="flex items-center gap-3">
                <img
                  src="/goinfo.jpg"
                  alt="Goinfo"
                  className="h-10 object-contain"
                />

                <div className="text-xl font-bold">
                  高益電腦股份有限公司 Goinfo Auto Co., Ltd.
                </div>
              </div>

              <table className="noborder compact mt-1">
                <tbody>
                  <tr>
                    <td className="w-16">總公司台北</td>
                    <td>地址：台北市松山區復興北路333號9樓之3</td>
                    <td>電話：02-2713-7188</td>
                    <td>傳真：02-2713-4563</td>
                  </tr>

                  <tr>
                    <td>總公司台中</td>
                    <td>地址：台中市西屯區文心路三段241號16樓之9</td>
                    <td>電話：04-2298-1378</td>
                    <td>傳真：04-2298-1328</td>
                  </tr>

                  <tr>
                    <td>總公司高雄</td>
                    <td>地址：高雄市左營區大順一路93號5樓之5</td>
                    <td>電話：07-5580096</td>
                    <td>傳真：07-5580128</td>
                  </tr>
                </tbody>
              </table>

              <h1 className="mt-1 text-center text-xl font-bold">
                軟體買賣報價單
              </h1>

              <div className="text-center font-semibold">QUOTATION</div>
            </header>

            {/* 報價與客戶資料 */}
            <table className="mb-1">
              <tbody>
                <tr>
                  <td>
                    報價單號：{previewQuote.quote?.QuotationNo || "－"}
                    （類型：
                    {quoteStatusLabel(previewQuote.quote?.Status)}）
                  </td>

                  <td>
                    報價日期：
                    {formatDateForInput(previewQuote.quote?.QuoteDate)}
                  </td>
                </tr>

                <tr>
                  <td>
                    客戶代號：
                    {previewQuote.quote?.CustomerCode || "－"}
                  </td>

                  <td>
                    客戶電話：
                    {previewQuote.quote?.Tel ||
                      previewQuote.quote?.CustomerTel ||
                      "－"}
                  </td>
                </tr>

                <tr>
                  <td>
                    客戶名稱：
                    {previewQuote.quote?.CustomerName || "－"}　
                    {previewQuote.quote?.ContactName ||
                      previewQuote.quote?.Contacter ||
                      ""}
                  </td>

                  <td>
                    客戶傳真：
                    {previewQuote.quote?.Fax ||
                      previewQuote.quote?.CustomerFax ||
                      "－"}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 報價明細 */}
            <table className="w-full">
              <colgroup>
                <col className="w-[47%]" />
                <col className="w-[16%]" />
                <col className="w-[7%]" />
                <col className="w-[13%]" />
                <col className="w-[17%]" />
              </colgroup>

              <thead>
                <tr className="bg-gray-100 text-center">
                  <th>品名</th>
                  <th className="whitespace-nowrap">定價（未稅）</th>
                  <th>數量</th>
                  <th className="whitespace-nowrap">小計（未稅）</th>
                  <th>備註</th>
                </tr>
              </thead>

              <tbody>
                {(previewQuote.items || []).map((item, index) => {
                  const systemCode = formatQuoteSystemCode(
                    item.SystemCode ?? item.systemCode
                  );

                  const systemName = String(
                    item.SystemName ?? item.systemName ?? ""
                  ).trim();

                  const itemType = String(
                    item.ItemType ?? item.itemType ?? ""
                  ).toUpperCase();

                  const isMaintenance = itemType === "MAINTENANCE";
                  const isPtsSystem = /^PTS-/i.test(systemCode);
                  const isStandalone =
                    systemName.includes("單機版") ||
                    systemName.includes("單機");

                  const productName =
                    systemCode && systemName
                      ? `${systemCode}－${systemName}`
                      : systemName || systemCode || "－";

                  let displayName = productName;

                  if (isMaintenance) {
                    const maintenanceIndex = (previewQuote.items || [])
                      .slice(0, index + 1)
                      .filter((row) => {
                        const rowType = String(
                          row.ItemType ?? row.itemType ?? ""
                        ).toUpperCase();

                        const rowSystemCode = formatQuoteSystemCode(
                          row.SystemCode ?? row.systemCode
                        );

                        return (
                          rowType === "MAINTENANCE" &&
                          rowSystemCode === systemCode
                        );
                      }).length;

                    const maintenanceLabel =
                      maintenanceIndex === 1
                        ? "維護費-本期"
                        : "維護費-未簽約各期";

                    displayName = `${productName}（${maintenanceLabel}）`;
                  } else if (!isPtsSystem && !isStandalone) {
                    displayName = `${productName}（網路 ${
                      item.UserCount ?? item.userCount ?? 1
                    } 人版）`;
                  }

                  const lineAmount = Number(
                    item.LineAmount ?? item.lineAmount ?? 0
                  );

                  const discountAmount = Number(
                    item.DiscountAmount ?? item.discountAmount ?? 0
                  );

                  const specialPrice =
                    item.SpecialPrice ?? item.specialPrice ?? null;

                  const finalAmount =
                    item.FinalAmount ?? item.finalAmount ?? null;

                  const displayFinalAmount =
                    specialPrice !== null &&
                    specialPrice !== undefined &&
                    specialPrice !== ""
                      ? Number(specialPrice)
                      : finalAmount !== null &&
                          finalAmount !== undefined &&
                          finalAmount !== ""
                        ? Number(finalAmount)
                        : null;

                  const hasDisplayFinalAmount =
                    displayFinalAmount !== null &&
                    Number.isFinite(displayFinalAmount) &&
                    displayFinalAmount > 0 &&
                    displayFinalAmount !== discountAmount;

                  return (
                    <tr
                      key={
                        item.QuotationItemId ??
                        item.quotationItemId ??
                        `${item.SystemId ?? item.systemId}-${
                          item.ItemType ?? item.itemType ?? "item"
                        }-${index}`
                      }
                    >
                      <td>{displayName}</td>

                      <td className="whitespace-nowrap text-right">
                        NT${lineAmount.toLocaleString()}
                      </td>

                      <td className="text-center">1</td>

                      <td className="whitespace-nowrap text-right">
                        NT${lineAmount.toLocaleString()}
                      </td>

                      <td className="text-xs leading-tight">
                        折數 {item.Discount ?? item.discount ?? 100}%
                        <br />

                        <span
                          className={
                            hasDisplayFinalAmount
                              ? "whitespace-nowrap text-red-600 line-through"
                              : "whitespace-nowrap"
                          }
                        >
                          優惠含稅 NT${discountAmount.toLocaleString()}
                        </span>

                        {hasDisplayFinalAmount && (
                          <>
                            <br />

                            <span className="whitespace-nowrap font-semibold text-red-600">
                              → NT${displayFinalAmount.toLocaleString()}
                            </span>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {(() => {
                  const items = previewQuote.items || [];

                  const discountSubtotal = items.reduce(
                    (sum, item) =>
                      sum +
                      Number(
                        item.DiscountAmount ??
                          item.discountAmount ??
                          0
                      ),
                    0
                  );

                  const beforeCreditFinalAmount = items.reduce(
                    (sum, item) => {
                      const specialPrice =
                        item.SpecialPrice ?? item.specialPrice ?? null;

                      const finalAmount =
                        item.FinalAmount ?? item.finalAmount ?? null;

                      const upgradeCreditAmount = Number(
                        item.UpgradeCreditAmount ??
                          item.upgradeCreditAmount ??
                          0
                      );

                      const itemBeforeCreditAmount =
                        specialPrice !== null &&
                        specialPrice !== undefined &&
                        specialPrice !== ""
                          ? Number(specialPrice)
                          : finalAmount !== null &&
                              finalAmount !== undefined &&
                              finalAmount !== ""
                            ? Number(finalAmount) + upgradeCreditAmount
                            : Number(
                                item.DiscountAmount ??
                                  item.discountAmount ??
                                  0
                              );

                      return sum + itemBeforeCreditAmount;
                    },
                    0
                  );

                  const upgradeCreditItems = items.filter(
                    (item) =>
                      Number(
                        item.UpgradeCreditAmount ??
                          item.upgradeCreditAmount ??
                          0
                      ) > 0
                  );

                  const totalUpgradeCreditAmount = upgradeCreditItems.reduce(
                    (sum, item) =>
                      sum +
                      Number(
                        item.UpgradeCreditAmount ??
                          item.upgradeCreditAmount ??
                          0
                      ),
                    0
                  );

                  const finalOfferAmount =
                    beforeCreditFinalAmount - totalUpgradeCreditAmount;

                  const hasManualFinalAmount =
                    beforeCreditFinalAmount > 0 &&
                    beforeCreditFinalAmount !== discountSubtotal;

                  return (
                    <>
                      <tr>
                        <td></td>
                        <td></td>

                        <td className="whitespace-nowrap text-right font-bold">
                          優惠小計
                        </td>

                        <td className="whitespace-nowrap text-right">
                          <span
                            className={
                              hasManualFinalAmount
                                ? "text-red-600 line-through"
                                : "font-bold"
                            }
                          >
                            NT${discountSubtotal.toLocaleString()}
                          </span>
                        </td>

                        <td className="whitespace-nowrap text-left">
                          {hasManualFinalAmount && (
                            <span className="font-bold text-red-600">
                              → NT${beforeCreditFinalAmount.toLocaleString()}
                            </span>
                          )}
                        </td>
                      </tr>

                      {upgradeCreditItems.map((item, index) => {
                        const description =
                          item.UpgradeCreditDescription ??
                          item.upgradeCreditDescription ??
                          "升級折抵";

                        const amount = Number(
                          item.UpgradeCreditAmount ??
                            item.upgradeCreditAmount ??
                            0
                        );

                        return (
                          <tr
                            key={`upgrade-credit-${
                              item.QuotationItemId ??
                              item.quotationItemId ??
                              item.SystemId ??
                              item.systemId ??
                              index
                            }`}
                          >
                            <td></td>
                            <td></td>

                            <td className="whitespace-nowrap text-right">
                              扣：{description}
                            </td>

                            <td className="whitespace-nowrap text-right text-red-600">
                              −(NT${amount.toLocaleString()})
                            </td>

                            <td></td>
                          </tr>
                        );
                      })}

                      <tr>
                        <td></td>
                        <td></td>

                        <td className="whitespace-nowrap text-right font-bold">
                          最終優惠
                        </td>

                        <td className="whitespace-nowrap text-right">
                          <span
                            className={
                              totalUpgradeCreditAmount > 0
                                ? "text-red-600 line-through"
                                : "font-bold"
                            }
                          >
                            NT${beforeCreditFinalAmount.toLocaleString()}
                          </span>
                        </td>

                        <td className="whitespace-nowrap text-left">
                          {totalUpgradeCreditAmount > 0 && (
                            <span className="font-bold text-red-600">
                              → NT${finalOfferAmount.toLocaleString()}
                            </span>
                          )}
                        </td>
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>

            {/* 系統說明：只有新購且有非維護項目時顯示 */}
            {previewQuote.isNewPurchase &&
              (previewQuote.items || []).some(
                (item) =>
                  String(
                    item.ItemType ?? item.itemType ?? ""
                  ).toUpperCase() !== "MAINTENANCE"
              ) && (
                <section className="compact mt-3">
                  <h2 className="border-b-2 border-black text-sm font-bold">
                    系統說明
                  </h2>

                  {(previewQuote.items || [])
                    .filter(
                      (item) =>
                        String(
                          item.ItemType ?? item.itemType ?? ""
                        ).toUpperCase() !== "MAINTENANCE"
                    )
                    .map((item, index) => (
                      <div
                        key={`note-${
                          item.QuotationItemId ??
                          item.quotationItemId ??
                          item.SystemId ??
                          item.systemId ??
                          index
                        }`}
                        className="mt-1"
                      >
                        <b className="block">
                          {formatQuoteSystemCode(
                            item.SystemCode ?? item.systemCode
                          )}
                          －
                          {item.SystemName ?? item.systemName ?? ""}：
                        </b>

                        <span className="block whitespace-pre-wrap">
                          {item.Note ?? item.note ?? "尚未設定系統內容說明"}
                        </span>
                      </div>
                    ))}
                </section>
              )}

           {/* 主內容到此結束 */}
          </div>

          {/* 自動填滿系統說明與維護說明之間的空白 */}
          <div className="quote-spacer" />

          {/* 維護、簽章、付款資訊固定靠近 A4 底部 */}
          <div className="quote-footer">
            <section className="compact">
                <h2 className="border-b-2 border-black text-sm font-bold">
                  維護說明
                </h2>

                <ol className="list-decimal pl-5">
                  <li>
                    軟體系統自簽約日起{" "}
                    {Number(previewQuote.warrantyMonths ?? 0) % 12 === 0
                      ? `${Number(previewQuote.warrantyMonths ?? 0) / 12} 年`
                      : `${Number(
                          previewQuote.warrantyMonths ?? 0
                        )} 個月`}
                    免費提供教育訓練及維護修復。保固期滿後年度維護費為 NT$
                    {Number(
                      previewQuote.maintenanceTotal ?? 0
                    ).toLocaleString()}
                    （含稅）
                    {previewQuote.maintenanceDiscountAmount !== null &&
                    previewQuote.maintenanceDiscountAmount !== undefined &&
                    previewQuote.maintenanceDiscountAmount !== ""
                      ? `，優惠金額為 NT$${Number(
                          previewQuote.maintenanceDiscountAmount
                        ).toLocaleString()}（含稅）`
                      : ""}
                    。

                    {(() => {
                      const maintenanceItems = (
                        previewQuote.items || []
                      ).filter((item) => {
                        const itemType = String(
                          item.ItemType ?? item.itemType ?? ""
                        ).toUpperCase();

                        return (
                          itemType !== "MAINTENANCE" &&
                          Number(
                            item.addUserMaintenanceTaxIncluded ?? 0
                          ) > 0
                        );
                      });

                      if (maintenanceItems.length === 0) {
                        return null;
                      }

                      return (
                        <>
                          日後若新增授權人數，各系統每增加一使用者維護費：{" "}
                          {maintenanceItems.map((item, index) => (
                            <span
                              key={`maintenance-${
                                item.SystemId ??
                                item.systemId ??
                                index
                              }`}
                            >
                              {index > 0 ? "；" : ""}
                              {formatQuoteSystemCode(
                                item.SystemCode ?? item.systemCode
                              ) || item.SystemName}
                              {" "}NT$
                              {Number(
                                item.addUserMaintenanceTaxIncluded ?? 0
                              ).toLocaleString()}
                              （含稅）
                            </span>
                          ))}
                          。
                        </>
                      );
                    })()}
                  </li>

                  {(() => {
                    const licenseAddUserItems = (
                      previewQuote.items || []
                    ).filter((item) => {
                      const itemType = String(
                        item.ItemType ?? item.itemType ?? ""
                      ).toUpperCase();

                      const systemCode = formatQuoteSystemCode(
                        item.SystemCode ?? item.systemCode
                      );

                      return (
                        itemType !== "MAINTENANCE" &&
                        !/^PTS-/i.test(systemCode) &&
                        Number(item.licenseAddUserTaxIncluded ?? 0) > 0
                      );
                    });

                    if (licenseAddUserItems.length === 0) {
                      return null;
                    }

                    return (
                      <li>
                        網路版同時作業人數，各系統每增加一人優惠金額如下（含稅）：
                        {" "}
                        {licenseAddUserItems.map((item, index) => (
                          <span
                            key={`license-${
                              item.SystemId ??
                              item.systemId ??
                              index
                            }`}
                          >
                            {index > 0 ? "；" : ""}
                            {formatQuoteSystemCode(
                              item.SystemCode ?? item.systemCode
                            ) || item.SystemName}
                            {" "}NT$
                            {Number(
                              item.licenseAddUserTaxIncluded ?? 0
                            ).toLocaleString()}
                          </span>
                        ))}
                        。
                      </li>
                    );
                  })()}
                </ol>
              </section>

              {/* 客戶確認、公司用印、承辦人資料 */}
              <table className="quote-signature-table mt-3 w-full">
                <tbody>
                  <tr>
                    <th className="w-[34%] text-center">客戶確認簽章</th>
                    <th className="w-[30%] text-center">報價專用章</th>
                    <th className="w-[36%] text-center">承辦人資料</th>
                  </tr>

                  <tr className="h-32">
                    <td></td>

                    <td className="text-center">
                      <img
                        src="/seal.JPG"
                        alt="報價專用章"
                        className="mx-auto h-28 object-contain"
                      />
                    </td>

                    <td className="p-0">
                      <table className="h-full w-full">
                        <tbody>
                          <tr style={{ height: "25px" }}>
                            <td className="w-16">承辦人</td>
                            <td>產品規劃部副理　鐘廷睿</td>
                          </tr>

                          <tr style={{ height: "25px" }}>
                            <td>電話</td>
                            <td>(04)2298-1378#20</td>
                          </tr>

                          <tr style={{ height: "25px" }}>
                            <td>傳真</td>
                            <td>(04)2298-1328</td>
                          </tr>

                          <tr style={{ height: "30px" }}>
                            <td>承辦人簽名</td>

                            <td>
                              <img
                                src="/sign.jpg"
                                alt="承辦人簽名"
                                style={{
                                  display: "block",
                                  width: "72px",
                                  height: "24px",
                                  maxWidth: "72px",
                                  maxHeight: "24px",
                                  objectFit: "contain",
                                }}
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 最下方原始說明 */}
              <div className="quote-bottom-note mt-2 border-t border-black pt-1 compact">
                說明：1. 本報價單以上金額含稅，有效期至{" "}
                {quoteValidDate(previewQuote.quote)}。　2.
                安裝完成後30日內，100%（30日到期票）。
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 下方固定操作列：列印時隱藏 */}
      <div className="quote-actions no-print flex shrink-0 flex-wrap justify-end gap-3 border-t border-gray-200 bg-white px-5 py-4">
        <button
          type="button"
          onClick={printQuoteSheet}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-blue-700"
        >
          列印
        </button>

        <button
          type="button"
          onClick={() => editQuote(previewQuote.quote)}
          className="rounded-lg border border-amber-500 px-5 py-2.5 text-sm font-medium text-amber-600 hover:bg-amber-50"
        >
          帶入修改
        </button>

        <button
          type="button"
          onClick={() => setShowQuotePreview(false)}
          className="rounded-lg border border-gray-400 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          關閉
        </button>
      </div>
    </div>
  </div>
)}

      {showCustomerPicker && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onMouseDown={() => setShowCustomerPicker(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[80vh] bg-white rounded-xl shadow-2xl flex flex-col"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                選擇客戶
              </h2>

              <button
                type="button"
                onClick={() => setShowCustomerPicker(false)}
                className="text-2xl text-gray-400 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="p-4 border-b">
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  value={customerPickerTerm}
                  onChange={(event) =>
                    setCustomerPickerTerm(event.target.value)
                  }
                  placeholder="搜尋客戶代號或名稱關鍵字..."
                  className="w-full border border-blue-400 rounded-lg py-2.5 pl-10 pr-3 outline-none focus:ring-2 focus:ring-blue-300"
                />

                <span className="absolute left-3 top-2.5 text-gray-400">
                  ⌕
                </span>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {pickerCustomers.length > 0 ? (
                pickerCustomers.map((customer) => (
                  <button
                    type="button"
                    key={customer.CustomerId || customer.Code}
                    onClick={() => selectQuoteCustomer(customer)}
                    className="w-full grid grid-cols-[140px_1fr] gap-4 text-left px-5 py-4 border-b hover:bg-blue-50 transition"
                  >
                    <span className="font-medium text-blue-700">
                      {customer.Code}
                    </span>

                    <span className="text-gray-800">
                      {customer.Name}
                    </span>
                  </button>
                ))
              ) : (
                <div className="py-10 text-center text-gray-400">
                  找不到符合的客戶
                </div>
              )}
            </div>

            <div className="p-4 border-t text-right">
              <button
                type="button"
                onClick={() => setShowCustomerPicker(false)}
                className="px-4 py-2 border rounded-lg"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

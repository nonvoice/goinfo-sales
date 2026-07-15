import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    Camera, Save, Printer, FileText, CheckCircle, AlertCircle, PenTool, 
    RefreshCw, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, ArrowLeft, 
    FileCheck, Home, Search, Filter, List, Loader, Info, X, CheckSquare, 
    Eye, Edit, Trash2, PlusCircle, Lock, UploadCloud, PieChart, ImageOff, 
    Maximize2, ExternalLink, LogIn, User, RotateCcw, Palette, Square, Circle, 
    MousePointer, Settings
} from 'lucide-react';

// ★ BUILD MARKER (for cache verification)
console.log('BUILD: 20260221-final-16-with-admin');

// ==========================================
// ★★★ 設定檔區塊 ★★★
// ==========================================

// 1. 廠商屬性定義 (標準/透天)
const CONTRACTORS = {
    1: '齊家', 2: '建基', 3: '洪正泰', 4: '隆盛', 5: '一信',
    6: '明新', 7: '英通', 8: '名將', 9: '育京', 10: '詠縉',
    11: '益通', 12: '東鐿', 13: '御寶', 14: '彩宏', 15: '伊利潔',
    99: '其他' 
};

// 1-2. 大樓專用廠商屬性定義
const BUILDING_CONTRACTORS = {
    1: '瑞隆', 2: '建和', 3: '勝群', 4: '正邦', 5: '康福',
    6: '兆辰', 7: '世均', 8: '誠欣', 9: '欣中', 10: '鴻慶',
    11: '和成', 12: '漢樺', 13: '祐生', 14: '昇虹', 99: '其他'
};

// 1-3. 土水專用屬性定義 (新增)
const CIVIL_CONTRACTORS = {
    '土建': '土建',
    '水電': '水電'
};

// 輔助函式：取得廠商名稱
const normalizeItemName = (name) => {
    if (!name) return name;
    const parts = String(name).split('-');
    if (parts.length >= 4) {
        const seg2 = (parts[1] || '').trim();
        const CATEGORY_WORDS = ['水電', '土建', '消防', '弱電', '空調', '機電', '泥作', '木作'];
        if (CATEGORY_WORDS.includes(seg2)) {
            parts.splice(1, 1);
            return parts.join('-');
        }
    }
    return name;
};

const VENDOR_PARSE_CAT = ['水電', '土建', '消防', '弱電', '空調', '機電', '泥作', '木作'];
const parseVendorItemName = (itemName) => {
    const parts = (itemName || '').split('-');
    const room = parts[0] || '';
    let offset = 1;
    if (parts.length > offset && VENDOR_PARSE_CAT.includes((parts[offset] || '').trim())) {
        offset++;
    }
    return {
        room,
        vendor: parts[offset] || '',
        detail: parts.slice(offset + 1).join('-')
    };
};

const getContractorName = (attr, mode = 'CIVIL') => {
    if (attr === '土建' || attr === '水電') return attr;

    if (attr === undefined || attr === null) return '未指定';
    const str = String(attr).trim();
    if (!str) return '未指定';

    if (!/^\d+$/.test(str)) return str;

    const key = parseInt(str, 10);
    if (Number.isNaN(key)) return '未指定';

    if (mode === 'BUILDING_VENDOR') return BUILDING_CONTRACTORS[key] || CONTRACTORS[key] || '未指定';
    if (mode === 'TOWNHOUSE_VENDOR') return CONTRACTORS[key] || '未指定';
    return CONTRACTORS[key] || '未指定';
};

const getCivilType = (sno, itemName) => {
    if (String(itemName).includes('水電')) return '水電';
    if (String(itemName).includes('土建')) return '土建';
    const s = String(sno);
    if (s.startsWith('4') || s.startsWith('5')) return '水電';
    if (s.startsWith('11') || s.startsWith('21')) return '水電'; 
    return '土建';
};

const getItemSegment2 = (itemName) => {
    if (!itemName) return '';
    const parts = String(itemName).split('-');
    return parts.length >= 2 ? (parts[1] || '').trim() : '';
};

// ==========================================
// ★★★ 標籤顏色產生器 ★★★
// ==========================================
const getTagColorStyle = (name) => {
    const fixedColors = {
        '土建': 'bg-amber-100 text-amber-800 border-amber-300',
        '水電': 'bg-cyan-100 text-cyan-800 border-cyan-300',
        '一般': 'bg-gray-100 text-gray-700 border-gray-300',
        '未知': 'bg-gray-100 text-gray-700 border-gray-300',
        '其他': 'bg-slate-100 text-slate-700 border-slate-300',
    };
    if (name && fixedColors[name]) return fixedColors[name];

    const colors = [
        'bg-red-100 text-red-700 border-red-300', 'bg-orange-100 text-orange-700 border-orange-300',
        'bg-lime-100 text-lime-700 border-lime-300', 'bg-green-100 text-green-700 border-green-300',
        'bg-emerald-100 text-emerald-700 border-emerald-300', 'bg-teal-100 text-teal-700 border-teal-300',
        'bg-sky-100 text-sky-700 border-sky-300', 'bg-blue-100 text-blue-700 border-blue-300',
        'bg-indigo-100 text-indigo-700 border-indigo-300', 'bg-violet-100 text-violet-700 border-violet-300',
        'bg-purple-100 text-purple-700 border-purple-300', 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300',
        'bg-pink-100 text-pink-700 border-pink-300', 'bg-rose-100 text-rose-700 border-rose-300',
        'bg-yellow-100 text-yellow-800 border-yellow-300'
    ];

    let hash = 0;
    const str = name || "";
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);
    return colors[hash % colors.length];
};

// ==========================================
// API 設定
// ==========================================
const API_BASE_URL = "https://goinfohi-n8n.zeabur.app/webhook"; 
const API_GET_DATA = `${API_BASE_URL}/get-inspection-data`;
const API_SUBMIT_DATA = `${API_BASE_URL}/submit-inspection`;
const API_SEARCH_HISTORY = `${API_BASE_URL}/search-history`;
const API_GET_RECORD_DETAIL = `${API_BASE_URL}/get-record-detail`;
const API_GET_REPORT = `${API_BASE_URL}/get-defect-report`;
const API_LOGIN = `${API_BASE_URL}/login`;
const API_SAVE_ADMIN_DATA = `${API_BASE_URL}/save-admin-data`; // 新增：後台儲存 API 端點 (預留)
const API_VERIFY_ADMIN_PASSWORD = `${API_BASE_URL}/verify-admin-password`; // ★ 後台管理員驗證 API
const ADMIN_WEBHOOK_SECRET = 'AHMS_ADMIN_2026'; // ★ n8n webhook 驗證密鑰

// ==========================================
// ★ 公司伺服器設定 (圖片上傳) ★
// ==========================================
const COMPANY_SERVER_URL = "https://favorable-ruby-logically.ngrok-free.dev"; 
const API_IMAGE_UPLOAD = `${COMPANY_SERVER_URL}/upload`;
const UPLOAD_PATH_PREFIX = "/public/data/uploads";

const STORAGE_KEY = "AHMS_APP_STATE_V2";

const getFloor = (hcode) => {
    if (!hcode) return '';
    const parts = hcode.split('-');
    return parts.length > 1 ? parts[parts.length - 1] : hcode;
};

const getFloorKeyFromItemName = (itemName) => {
  const s = String(itemName || '').toUpperCase().trim();
  if (!s) return '';
  if (s.startsWith('1F-') || s.includes('1F')) return '1F';
  if (s.startsWith('2F-') || s.includes('2F')) return '2F';
  if (s.startsWith('3F-') || s.includes('3F')) return '3F';
  if (s.startsWith('4F-') || s.includes('4F')) return '4F';
  if (s.startsWith('RF-') || s.includes('RF')) return 'RF';
  return '';
};


const formatCustomerName = (name) => {
    if (!name) return '';
    const parts = name.split(/[．、,，/\s]+/);
    if (parts.length <= 1) return name;
    
    return parts.map((part, index) => (
        <React.Fragment key={index}>
            {part}
            {index < parts.length - 1 && <br />}
        </React.Fragment>
    ));
};

const formatCustomerNameInline = (name) => {
    if (!name) return '';
    return String(name).replace(/[．、,，\/\s]+/g, ' ').trim();
};

const formatVendorNameVertical = (name) => {
    if (!name) return '';
    const chars = String(name).split('');
    if (chars.length <= 1) return name;
    return chars.map((char, i) => (
        <React.Fragment key={i}>
            {char}
            {i < chars.length - 1 && <br />}
        </React.Fragment>
    ));
};

const formatCustomerNameReport = (name) => {
    if (!name) return '';
    const str = String(name).trim();
    if (str.length <= 3) return str;
    const lines = [];
    for (let i = 0; i < str.length; i += 3) {
        const chunk = str.substring(i, i + 3);
        const isLast = i + 3 >= str.length;
        lines.push(isLast ? chunk : chunk + '.');
    }
    return lines.map((line, i) => (
        <React.Fragment key={i}>
            {line}
            {i < lines.length - 1 && <br />}
        </React.Fragment>
    ));
};

const MOCK_SEARCH_RESULTS = [
    { id: 'MOCK-001', serialNo: 'C27141210001', wname: 'LALA捷運匯', hcode: 'A1-01F', customerName: '王小明', inspectDate: '2025-12-10T00:00:00.000Z', inspectType: '客驗', inspectCount: 1 },
    { id: 'MOCK-002', serialNo: 'C27141209001', wname: 'LALA捷運匯', hcode: 'B2-03F', customerName: '陳大文', inspectDate: '2025-12-09T00:00:00.000Z', inspectType: '客驗', inspectCount: 2 }
];

const NgrokSignatureImage = ({ path, baseUrl, alt, className }) => {
    const [imageUrl, setImageUrl] = useState(null);
    const [status, setStatus] = useState('loading'); 
    const [debugUrl, setDebugUrl] = useState('');
    const [retryKey, setRetryKey] = useState(0); 

    useEffect(() => {
        if (!path || path === 'NULL' || path === 'null' || path === '') {
            setStatus('empty');
            return;
        }
        if (path.startsWith('data:') || path.startsWith('blob:')) {
            setImageUrl(path);
            setStatus('success');
            return;
        }

        let isMounted = true;
        let finalUrl = path;
        let cleanPath = path.replace(/\\/g, '/');
        const publicDataIndex = cleanPath.indexOf('/public/data');
        
        if (publicDataIndex !== -1) {
            let relativePath = cleanPath.substring(publicDataIndex);
            try { relativePath = decodeURI(relativePath); } catch (e) {}
            finalUrl = `${baseUrl}${encodeURI(relativePath)}`;
        } else if (!cleanPath.startsWith('http')) {
            cleanPath = cleanPath.replace(/^\.?\//, '');
            if (cleanPath.includes(':')) {
                const splitPath = cleanPath.split('uploads');
                if (splitPath.length > 1) {
                     cleanPath = 'public/data/uploads' + splitPath[1];
                }
            }
            finalUrl = `${baseUrl}/${encodeURI(cleanPath)}`;
            finalUrl = finalUrl.replace(/([^:]\/)\/+/g, "$1");
        }
        
        setDebugUrl(finalUrl);

        const fetchImage = async () => {
            try {
                setStatus('loading');
                if (finalUrl.includes('ngrok')) {
                    const response = await fetch(finalUrl, {
                        method: 'GET',
                        mode: 'cors', 
                        headers: { 'ngrok-skip-browser-warning': 'true' }
                    });
                    if (!response.ok) throw new Error(`Status: ${response.status}`);
                    const blob = await response.blob();
                    if (blob.type.includes('text/html')) {
                        throw new Error("Received HTML instead of image");
                    }
                    if (isMounted) {
                        const objectUrl = URL.createObjectURL(blob);
                        setImageUrl(objectUrl);
                        setStatus('success');
                    }
                } else {
                    setImageUrl(finalUrl);
                    setStatus('success');
                }
            } catch (err) {
                console.warn("Signature fetch failed, fallback to direct src:", err);
                if (isMounted) {
                    setImageUrl(finalUrl); 
                    setStatus('success'); 
                }
            }
        };

        fetchImage();
        return () => {
            isMounted = false;
        };
    }, [path, baseUrl, retryKey]);

    if (status === 'empty') return <div className={`h-full flex items-center justify-center text-[10px] text-gray-300 ${className}`}>[無簽名]</div>;
    if (status === 'loading') return <div className={`flex items-center justify-center ${className}`}><Loader className="animate-spin text-gray-400" size={16} /></div>;
    if (status === 'error') {
        return (
             <div className={`flex flex-col items-center justify-center bg-gray-50 border border-dashed border-red-300 p-2 rounded text-center ${className}`} style={{minHeight: '100px'}}>
                <AlertCircle size={24} className="text-red-400 mb-2" />
                <span className="text-xs text-gray-600 font-bold mb-1">簽名讀取受阻</span>
                <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); window.open(debugUrl, '_blank'); }} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded shadow hover:bg-blue-700 transition-colors font-bold">點此驗證</button>
                    <button onClick={(e) => { e.stopPropagation(); setStatus('loading'); setRetryKey(k => k + 1); }} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition-colors font-bold">重試</button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center">
            <img src={imageUrl} alt={alt} className={className} onError={(e) => { if (imageUrl !== debugUrl) { e.target.src = debugUrl; } else { setStatus('error'); } }} />
        </div>
    );
};

const SecureImage = ({ src, alt, className, onClick, ...props }) => {
    const [objectUrl, setObjectUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const generatedUrlRef = useRef(null);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(false);

        if (!src) { setLoading(false); return; }
        if (src.startsWith('blob:') || src.startsWith('data:')) { setObjectUrl(src); setLoading(false); return; }

        const processUrl = (rawUrl) => {
             if (!rawUrl.startsWith('http')) {
                 let normalized = rawUrl.replace(/\\/g, '/');
                 return resolvePhotoUrl(normalized);
             }
             return rawUrl;
        }

        const targetUrl = processUrl(src);
        if (!targetUrl) { setLoading(false); return; }

        if (targetUrl.includes('ngrok')) {
            fetch(targetUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            .then(res => { if (!res.ok) throw new Error('Network response was not ok'); return res.blob(); })
            .then(blob => {
                if (isMounted) {
                    const url = URL.createObjectURL(blob);
                    if (generatedUrlRef.current) URL.revokeObjectURL(generatedUrlRef.current);
                    generatedUrlRef.current = url; 
                    setObjectUrl(url);
                    setLoading(false);
                }
            })
            .catch(err => {
                console.warn("Secure fetch failed, fallback to src", err);
                if (isMounted) { setObjectUrl(targetUrl); setLoading(false); }
            });
        } else {
            setObjectUrl(targetUrl);
            setLoading(false);
        }

        return () => {
            isMounted = false;
            if (generatedUrlRef.current) { URL.revokeObjectURL(generatedUrlRef.current); generatedUrlRef.current = null; }
        };
    }, [src]);

    const handleWrapperClick = (e) => { if (onClick) onClick(objectUrl || src); };

    if (loading) return <div className={`flex flex-col items-center justify-center bg-gray-100 text-gray-400 cursor-pointer ${className}`} onClick={handleWrapperClick}><Loader className="w-6 h-6 animate-spin mb-1"/><span className="text-[10px]">載入中...</span></div>;
    if (error) return <div className={`flex flex-col items-center justify-center bg-gray-200 text-red-400 cursor-pointer ${className}`} onClick={handleWrapperClick} title="圖片載入失敗"><ImageOff className="w-8 h-8 mb-1"/></div>;

    return (
        <img src={objectUrl || src} alt={alt} className={className} onClick={handleWrapperClick} onError={(e) => { if (objectUrl && objectUrl !== src) { e.target.src = src; setObjectUrl(null); } else { setError(true); } }} {...props} />
    );
};

const getProp = (obj, keys) => {
    if (!obj || typeof obj !== 'object') return undefined;
    const objKeys = Object.keys(obj);
    for (const key of keys) {
        if (obj[key] !== undefined) return obj[key];
        const foundKey = objKeys.find(k => k.toLowerCase() === key.toLowerCase());
        if (foundKey && obj[foundKey] !== undefined) return obj[foundKey];
    }
    return undefined;
};

const getValue = (obj, keyList) => {
    return getProp(obj, Array.isArray(keyList) ? keyList : [keyList]);
};

const findTableSmart = (data, preferredNames, requiredColumns) => {
    if (!data || typeof data !== 'object') return [];
    for (const name of preferredNames) {
        const foundKey = Object.keys(data).find(k => k.toLowerCase() === name.toLowerCase());
        if (foundKey && Array.isArray(data[foundKey]) && data[foundKey].length > 0) {
            return data[foundKey];
        }
    }
    for (const key in data) {
        const arr = data[key];
        if (Array.isArray(arr) && arr.length > 0) {
            const firstItem = arr[0];
            const hasAllCols = requiredColumns.every(col => getProp(firstItem, [col]) !== undefined);
            if (hasAllCols) return arr;
        }
    }
    return [];
};

const determineSmartAttr = (name, originalAttr, itemSno, mode = 'CIVIL') => {
    if (itemSno && Number(itemSno) >= 9000) return 99;

    const seg2 = getItemSegment2(name);
    if (seg2) {
        if (mode === 'CIVIL') {
            return seg2 === '水電' ? '水電' : '土建';
        }
        if (mode === 'BUILDING_VENDOR') {
            for (const [key, vendorName] of Object.entries(BUILDING_CONTRACTORS)) {
                if (vendorName === seg2) return parseInt(key);
            }
            return seg2;
        }
        if (mode === 'TOWNHOUSE_VENDOR') {
            for (const [key, vendorName] of Object.entries(CONTRACTORS)) {
                if (vendorName === seg2) return parseInt(key);
            }
            return seg2;
        }
    }

    if (originalAttr !== undefined && originalAttr !== null && originalAttr !== '') {
        if (originalAttr === '土建' || originalAttr === '水電') return originalAttr;
        const attrInt = parseInt(originalAttr, 10);
        if (!isNaN(attrInt) && attrInt > 0) {
            if (mode === 'BUILDING_VENDOR' && BUILDING_CONTRACTORS[attrInt]) return attrInt;
            if (mode === 'TOWNHOUSE_VENDOR' && CONTRACTORS[attrInt]) return attrInt;
        }
    }

    if (mode === 'CIVIL') return '土建';
    return 99;
};

const resolvePhotoUrl = (url) => {
    if (!url) return null;
    if (typeof url !== 'string') return null;
    if (url === 'NULL' || url === 'null') return null;
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;

    let normalizedPath = url.replace(/\\/g, '/');
    normalizedPath = normalizedPath.replace(/^(\.\/|\.\.\/)+/, '');
    
    if (normalizedPath.startsWith('/public') || normalizedPath.startsWith('public/')) {
        const pathWithSlash = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
        return `${COMPANY_SERVER_URL}${encodeURI(pathWithSlash)}`;
    }
    const uploadsIndex = normalizedPath.toLowerCase().indexOf('uploads/');
    if (uploadsIndex !== -1) {
        const relativePart = normalizedPath.substring(uploadsIndex + 8); 
        return `${COMPANY_SERVER_URL}${UPLOAD_PATH_PREFIX}/${encodeURI(relativePart)}`;
    }
    if (normalizedPath.includes('/') && !normalizedPath.startsWith('/')) {
        return `${COMPANY_SERVER_URL}${UPLOAD_PATH_PREFIX}/${encodeURI(normalizedPath)}`;
    }
    let filename = normalizedPath.split('/').pop();
    if (filename) {
        return `${COMPANY_SERVER_URL}${UPLOAD_PATH_PREFIX}/Temp/${encodeURIComponent(filename)}`;
    }
    return null;
};

const preloadSignature = async (path) => {
    if (!path || path === 'NULL' || path === 'null' || path === '') return null;
    if (path.startsWith('data:') || path.startsWith('blob:')) return path;

    let fullUrl = path;
    let cleanPath = path.replace(/\\/g, '/');
    const publicDataIndex = cleanPath.indexOf('/public/data');
    
    if (path.startsWith('http')) {
        fullUrl = path;
    } else if (publicDataIndex !== -1) {
        let relativePath = cleanPath.substring(publicDataIndex);
        try { relativePath = decodeURI(relativePath); } catch (e) {}
        fullUrl = `${COMPANY_SERVER_URL}${encodeURI(relativePath)}`;
    } else {
        cleanPath = cleanPath.replace(/^\.?\//, '');
        fullUrl = `${COMPANY_SERVER_URL}/${encodeURI(cleanPath)}`;
        fullUrl = fullUrl.replace(/([^:]\/)\/+/g, "$1");
    }

    if (fullUrl.includes('ngrok')) {
        try {
            const response = await fetch(fullUrl, {
                method: 'GET',
                mode: 'cors', 
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            if (response.ok) {
                const blob = await response.blob();
                if (!blob.type.includes('text/html')) return URL.createObjectURL(blob);
            }
        } catch (e) {
            console.warn("Preload signature failed:", e);
        }
    }
    return fullUrl;
};

const getSortScore = (name) => {
    const ROOM_ORDER = {
        '1F': -10, '2F': -9, '3F': -8,
        '客、餐廳': 1, '客餐廳': 1, '客廳': 1, '餐廳': 1,
        '廚房': 2, '廚 房': 2, '廚具': 2,
        '主臥室': 3, '主 臥 室': 3, '主臥': 3,
        '主臥廁所': 4, '主臥衛浴': 4, '主衛': 4,
        '次臥室': 5, '次 臥 室': 5, '次臥': 5,
        '共用廁所': 6, '客浴': 6, '公共衛浴': 6, '公浴': 6,
        '前陽台': 7, '前 陽 台': 7, '景觀陽台': 7,
        '工作陽台': 8, '後陽台': 8, '陽台': 8
    };
    if (!name) return 99;
    const cleanName = name.trim();
    if (ROOM_ORDER[cleanName] !== undefined) return ROOM_ORDER[cleanName];
    if (cleanName.includes('1F')) return -10;
    if (cleanName.includes('2F')) return -9;
    if (cleanName.includes('3F')) return -8;

    const noSpaceName = cleanName.replace(/[\s\u3000]/g, '');
    if (ROOM_ORDER[noSpaceName] !== undefined) return ROOM_ORDER[noSpaceName];
    const sortedKeys = Object.keys(ROOM_ORDER).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
        if (cleanName.includes(key) || noSpaceName.includes(key)) {
            return ROOM_ORDER[key];
        }
    }
    return 99;
};

const dedupeSearchHistoryBySerialNo = (rows) => {
  const seen = new Set();
  const out = [];
  (rows || []).forEach((r) => {
    const key = String(r?.serialNo || r?.serno || r?.id || "").trim();
    if (!key) {
      out.push(r);
      return;
    }
    if (seen.has(key)) return;
    seen.add(key);
    out.push(r);
  });
  return out;
};

const dedupeChecklistItems = (items) => {
  const seen = new Set();
  return (items || []).filter((it) => {
    const sno = String(it?.sno ?? "");
    const name = String(it?.itemName ?? "").trim();
    const room = String(it?.room ?? it?.roomName ?? "").trim();
    const key = `${sno}__${room}__${name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const ImageEditorModal = ({ isOpen, onClose, imageSrc, onSave }) => {
    const canvasRef = useRef(null);
    const [color, setColor] = useState('#FF0000');
    const [tool, setTool] = useState('pen'); 
    const [lineWidth, setLineWidth] = useState(3);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [snapshot, setSnapshot] = useState(null); 

    useEffect(() => {
        if (isOpen && imageSrc && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = imageSrc;
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
            };
        }
    }, [isOpen, imageSrc]);

    const getPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const startDraw = (e) => {
        if (!canvasRef.current) return;
        setIsDrawing(true);
        const pos = getPos(e);
        setStartPos(pos);
        
        const ctx = canvasRef.current.getContext('2d');
        setSnapshot(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
        
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    };

    const draw = (e) => {
        if (!isDrawing || !canvasRef.current) return;
        e.preventDefault(); 
        const pos = getPos(e);
        const ctx = canvasRef.current.getContext('2d');

        if (tool === 'pen') {
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        } else {
            if (snapshot) ctx.putImageData(snapshot, 0, 0);
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;

            if (tool === 'rect') {
                ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
            } else if (tool === 'circle') {
                const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
                ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
                ctx.stroke();
            } else if (tool === 'arrow') {
                ctx.moveTo(startPos.x, startPos.y);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
                const headLen = lineWidth * 5; 
                const angle = Math.atan2(pos.y - startPos.y, pos.x - startPos.x);
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.lineTo(pos.x - headLen * Math.cos(angle - Math.PI / 6), pos.y - headLen * Math.sin(angle - Math.PI / 6));
                ctx.lineTo(pos.x - headLen * Math.cos(angle + Math.PI / 6), pos.y - headLen * Math.sin(angle + Math.PI / 6));
                ctx.lineTo(pos.x, pos.y);
                ctx.fillStyle = color;
                ctx.fill();
            }
        }
    };

    const stopDraw = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        if (!canvasRef.current || !imageSrc) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageSrc;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    };

    const handleSave = () => {
        if (canvasRef.current) {
            const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
            onSave(dataUrl);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-[10001] flex flex-col items-center justify-center p-2">
             <div className="w-full max-w-4xl bg-gray-900 rounded-lg overflow-hidden flex flex-col h-[90vh]">
                 <div className="bg-gray-800 p-2 flex flex-wrap gap-3 items-center justify-between shrink-0">
                     <div className="flex gap-2">
                         <button onClick={() => setTool('pen')} className={`p-2 rounded ${tool === 'pen' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}><PenTool size={20} /></button>
                         <button onClick={() => setTool('rect')} className={`p-2 rounded ${tool === 'rect' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}><Square size={20} /></button>
                         <button onClick={() => setTool('circle')} className={`p-2 rounded ${tool === 'circle' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}><Circle size={20} /></button>
                         <button onClick={() => setTool('arrow')} className={`p-2 rounded ${tool === 'arrow' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}><MousePointer size={20} className="rotate-[-45deg]"/></button>
                     </div>
                     <div className="flex gap-2 items-center">
                         {['#FF0000', '#FFFF00', '#0000FF'].map(c => (
                             <button 
                                key={c} 
                                onClick={() => setColor(c)} 
                                className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-white scale-110' : 'border-transparent'}`} 
                                style={{ backgroundColor: c }} 
                             />
                         ))}
                     </div>
                     <div className="flex gap-2 items-center">
                          <input type="range" min="1" max="10" value={lineWidth} onChange={(e) => setLineWidth(parseInt(e.target.value))} className="w-20" />
                     </div>
                     <div className="flex gap-2">
                         <button onClick={clearCanvas} className="px-4 py-2 bg-yellow-600 text-white rounded font-bold hover:bg-yellow-700 flex items-center justify-center border border-yellow-500 shadow-md">清除</button>
                         <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded font-bold hover:bg-gray-700 border border-gray-500">取消</button>
                         <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 flex items-center gap-2 border border-green-500 shadow-md"><Save size={16}/> 儲存</button>
                     </div>
                 </div>
                 
                 <div className="flex-1 overflow-auto flex items-center justify-center bg-black relative touch-none">
                     <canvas 
                        ref={canvasRef}
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={stopDraw}
                        onMouseLeave={stopDraw}
                        onTouchStart={startDraw}
                        onTouchMove={draw}
                        onTouchEnd={stopDraw}
                        className="max-w-full max-h-full object-contain"
                     />
                 </div>
             </div>
        </div>
    );
};

const ProgressRing = ({ radius, stroke, progress, label, color }) => {
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    const strokeColor = color || (progress === 100 ? "#22c55e" : "#3b82f6"); 
    const bgColor = color ? "rgba(255,255,255,0.2)" : "#e2e8f0";
    const textColor = color ? "text-white" : "text-blue-600";

    return (
      <div className="flex flex-col items-center justify-center mx-1">
        <div className="relative flex items-center justify-center">
            <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
                <circle stroke={bgColor} strokeWidth={stroke} fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
                <circle 
                    stroke={strokeColor} 
                    strokeWidth={stroke} 
                    strokeDasharray={circumference + ' ' + circumference} 
                    style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-out' }} 
                    strokeLinecap="round" 
                    fill="transparent" 
                    r={normalizedRadius} 
                    cx={radius} 
                    cy={radius} 
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
                <span className={`text-xs md:text-sm font-black ${textColor}`}>{Math.round(progress)}%</span>
            </div>
        </div>
        <div className={`text-[10px] md:text-xs font-bold mt-1 ${color ? 'text-blue-100' : 'text-gray-600'}`}>{label}</div>
      </div>
    );
};

const ScrollToTop = () => {
    const scrollToTop = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); };
    return (
        <button onClick={scrollToTop} className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50 p-3 bg-white border-2 border-black rounded-full shadow-lg hover:bg-gray-100 transition-all active:scale-95 print:hidden group" title="回到頂部">
            <ChevronUp className="w-6 h-6 text-black group-hover:-translate-y-1 transition-transform" strokeWidth={3} />
        </button>
    );
};

const CustomItemModal = ({ isOpen, onClose, items, onUpdate, onAdd, onDelete, onSave, roomOptions, mode, categorySno }) => {
    if (!isOpen) return null;
    
    let contractorList = CONTRACTORS;
    if (String(categorySno) === '1' || mode === 'CIVIL') {
        contractorList = CIVIL_CONTRACTORS;
    } else if (mode === 'BUILDING_VENDOR') {
        contractorList = BUILDING_CONTRACTORS;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-2">
            <div className="bg-white w-full max-w-4xl h-[90vh] rounded-lg shadow-2xl flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><PlusCircle className="w-6 h-6 text-blue-600"/> 管理其他缺失項目</h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-gray-500"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
                    <div className="space-y-4">
                        {items.map((item) => {
                            const parts = item.itemName ? normalizeItemName(item.itemName).split('-') : ['',''];
                            const displayRoom = item.isNew ? (item.roomName || '') : (parts[0] || '');
                            const displayName = item.isNew ? (item.rawName || '') : (parts.length >= 2 ? parts.slice(1).join('-') : item.itemName);
                            const isEditable = !!item.isNew;
                            
                            return (
                                <div key={item.sno} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-gray-500 text-sm">#{item.sno}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${isEditable ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                            {isEditable ? <Edit className="w-3 h-3"/> : <Lock className="w-3 h-3"/>}
                                            {isEditable ? '新項目' : '歷史項目'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                                            <div className="md:col-span-2">
                                                <select 
                                                    className={`w-full border p-2 rounded text-sm ${isEditable ? 'bg-white' : 'bg-gray-100 text-gray-500'}`}
                                                    value={displayRoom}
                                                    disabled={!isEditable}
                                                    onChange={(e) => onUpdate(item.sno, 'roomName', e.target.value)}
                                                >
                                                    <option value="">選擇廳室</option>
                                                    {roomOptions.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                            <div className="md:col-span-3">
                                                <input 
                                                    type="text" 
                                                    className={`w-full border p-2 rounded text-sm ${isEditable ? 'bg-white' : 'bg-gray-100 text-gray-500'}`}
                                                    placeholder="輸入檢查項目..."
                                                    value={displayName}
                                                    disabled={!isEditable}
                                                    onChange={(e) => onUpdate(item.sno, 'rawName', e.target.value)}
                                                />
                                            </div>
                                            <div className="md:col-span-4">
                                                <select 
                                                    className={`w-full border p-2 rounded text-sm ${isEditable ? 'bg-white' : 'bg-gray-100 text-gray-500'}`}
                                                    value={item.attr}
                                                    disabled={!isEditable}
                                                    onChange={(e) => onUpdate(item.sno, 'attr', (String(categorySno) === '1' || mode === 'CIVIL') ? e.target.value : parseInt(e.target.value))}
                                                >
                                                    {Object.entries(contractorList).map(([key, name]) => (
                                                        <option key={key} value={key}>{name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="md:col-span-1 text-center">
                                                <button onClick={() => onDelete(item.sno)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 className="w-5 h-5"/></button>
                                            </div>
                                    </div>
                                </div>
                            )
                        })}
                        <button onClick={onAdd} className="w-full py-3 border-2 border-dashed border-blue-300 text-blue-600 font-bold rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2">
                            <PlusCircle className="w-5 h-5"/> 新增項目
                        </button>
                    </div>
                 </div>
                <div className="p-4 border-t bg-white rounded-b-lg flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 rounded text-gray-700 font-bold">取消</button>
                    <button onClick={onSave} className="px-6 py-2 bg-blue-600 text-white rounded font-bold shadow hover:bg-blue-700">儲存並返回</button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 主應用程式
// ==========================================
const HomeInspectionApp = () => {
  const [step, setStep] = useState(0); // 加入 step 6 作為後台管理
  const [loginAcc, setLoginAcc] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbData, setDbData] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('init');
  const [debugInfo, setDebugInfo] = useState('等待連線...');
  const [useMockData, setUseMockData] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  
  const [inspectionMode, setInspectionMode] = useState('CIVIL');
  const [currentConfigSno, setCurrentConfigSno] = useState(1); 
  const [currentLocation, setCurrentLocation] = useState("");

  const [user, setUser] = useState({ isLoggedIn: false, account: '', name: '', allowedProjects: [] });
  const [homeMode, setHomeMode] = useState('new');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [historyProject, setHistoryProject] = useState(''); 
  const [searchHistoryResults, setSearchHistoryResults] = useState([]);
  const [historyDetailItems, setHistoryDetailItems] = useState([]);
  const [showHistoryDefectsOnly, setShowHistoryDefectsOnly] = useState(false);
    
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [reportConfig, setReportConfig] = useState({ startDate: firstDay, endDate: lastDay, wcode: '', categorySno: '' });
  const [reportListId, setReportListId] = useState(''); 
  const [reportAttr, setReportAttr] = useState('0');
  const [splitByVendor, setSplitByVendor] = useState(false); 
  const [reportRows, setReportRows] = useState([]);
  const [showReportPreview, setShowReportPreview] = useState(false); 

  const [headerData, setHeaderData] = useState({
    wcode: '', wname: '', hcode: '', customerName: '', inspectDate: new Date().toISOString().split('T')[0], inspector: '', inspectType: '客驗', inspectCount: 1, serialNo: '', categorySno: '', skipDelivered: true 
  });
  
  const [checklistItems, setChecklistItems] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null); 
  const [isViewAll, setIsViewAll] = useState(true); 
  const [isFromInspection, setIsFromInspection] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [viewPhoto, setViewPhoto] = useState(null); 
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [signatures, setSignatures] = useState({ customer: null, worker: null, service: null });
  const [currentSignRole, setCurrentSignRole] = useState('customer');
  const [showPayloadModal, setShowPayloadModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState({ serialNo: '', message: '' });
  const [currentPayload, setCurrentPayload] = useState(null);
  const [subPageIndex, setSubPageIndex] = useState(0); 
  const [isTreeExpanded, setIsTreeExpanded] = useState(true);
  const [treeSelection, setTreeSelection] = useState(new Set()); 
  const [treeData, setTreeData] = useState({}); 
  const [hideReportSettings, setHideReportSettings] = useState(false);
  const [isDataLoadedFromStorage, setIsDataLoadedFromStorage] = useState(false);
  
  const [editingImage, setEditingImage] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // ★ 後台管理專用狀態
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [adminPwdInput, setAdminPwdInput] = useState('');
  const [adminCategories, setAdminCategories] = useState([]);
  const [adminItems, setAdminItems] = useState([]);
  const [selectedAdminCat, setSelectedAdminCat] = useState(null);
  const [adminTab, setAdminTab] = useState('inspection');
  const [adminPersons, setAdminPersons] = useState([]);

  const maxCustomSeqRef = useRef(9000);
  const fileInputRef = useRef(null);
  const currentUploadItemSno = useRef(null);
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null); 
  const isDrawingRef = useRef(false);

  const printStyles = `
    @media print {
        @page { margin: 5mm; }
        body { margin: 5mm; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        thead { display: table-header-group; } 
    }
  `;

useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const usernameFromUrl = urlParams.get('username');
    const nameFromUrl = urlParams.get('name') || usernameFromUrl; 
    const projectsFromUrl = urlParams.get('projects'); 

    if (tokenFromUrl) {
      localStorage.setItem('portalToken', tokenFromUrl); 
      if (usernameFromUrl) {
        localStorage.setItem('portalUser', JSON.stringify({ displayName: nameFromUrl, username: usernameFromUrl }));
      }
      
      const allowed = projectsFromUrl ? projectsFromUrl.split(',') : [];

      setUser({ 
        isLoggedIn: true, 
        account: usernameFromUrl, 
        name: nameFromUrl, 
        allowedProjects: allowed 
      });
      setStep(1); 

      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
    
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  useEffect(() => {
    try {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            const parsed = JSON.parse(savedState);
            const now = new Date().getTime();
            if (parsed.timestamp) {
                const passedTime = (now - parsed.timestamp) / 1000; 
                if (passedTime > 30) {
                     localStorage.removeItem(STORAGE_KEY);
                     return;
                }
            }

            if (parsed.user && parsed.user.isLoggedIn) {
                setUser(parsed.user);
                // 確保不會意外載入到不該去的頁面
                setStep(parsed.step && parsed.step !== 6 ? parsed.step : 1); 
                if (parsed.headerData) setHeaderData(prev => ({ ...prev, ...parsed.headerData, skipDelivered: parsed.headerData.skipDelivered ?? true }));
                if (parsed.homeMode) setHomeMode(parsed.homeMode);
                if (parsed.reportConfig) setReportConfig(parsed.reportConfig);
                if (parsed.signatures) setSignatures(parsed.signatures);
                if (parsed.isFromInspection) setIsFromInspection(parsed.isFromInspection);
                if (parsed.inspectionMode) setInspectionMode(parsed.inspectionMode);
                
                if (parsed.checklistItems && Array.isArray(parsed.checklistItems)) {
                     const safeItems = parsed.checklistItems.map(item => {
                         if (item.photo && !item.photos) item.photos = [item.photo]; 
                         if (!item.photos) item.photos = [];
                         const safePhotos = item.photos.map(p => (p && p.startsWith('blob:') ? '' : p)).filter(p => p);
                         return { ...item, photos: safePhotos, photo: safePhotos[0] || '', localPreview: null };
                     });
                     setChecklistItems(safeItems);
                }
                
                setDebugInfo('已從暫存還原狀態');
                setIsDataLoadedFromStorage(true);
            }
        }
    } catch (e) {
        console.error("狀態還原失敗", e);
        localStorage.removeItem(STORAGE_KEY); 
    }
  }, []);

  useEffect(() => {
      if (user.isLoggedIn && step !== 6) { // 後台作業不暫存
          const stateToSave = {
              user, step, headerData, checklistItems, homeMode, reportConfig, signatures, isFromInspection, inspectionMode,
              timestamp: new Date().getTime() 
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      }
  }, [user, step, headerData, checklistItems, homeMode, reportConfig, signatures, isFromInspection, inspectionMode]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
        if (step === 2 || step === 3 || step === 6) {
            e.preventDefault();
            e.returnValue = ''; 
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [step]);

  useEffect(() => {
    if (step === 3 && canvasRef.current && canvasContainerRef.current) {
        const timer = setTimeout(() => {
            const canvas = canvasRef.current;
            const container = canvasContainerRef.current;

            if (canvas.width !== container.clientWidth || canvas.height !== container.clientHeight) {
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight;
            }

            const ctx = canvas.getContext('2d');
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = '#000000'; 
            ctx.beginPath(); 

            if (signatures[currentSignRole]) {
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                };
                img.src = signatures[currentSignRole];
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }, 100); 

        return () => clearTimeout(timer);
    }
  }, [step, currentSignRole]);

  const fetchData = async (workSno = null, skipDelivered = null) => {
    if (user.isLoggedIn && !isDataLoadedFromStorage) setLoading(true);
    setDebugInfo('連線中...');
    try {
      let url = API_GET_DATA;
      if (workSno) {
        const params = new URLSearchParams();
        params.set('worksno', encodeURIComponent(workSno));
        if (skipDelivered !== null && skipDelivered !== undefined) {
          params.set('skipDelivered', skipDelivered ? '1' : '0');
        }
        url += `?${params.toString()}`;
      }
      const response = await fetch(url, { 
        mode: 'cors', 
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' } 
      });
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      const data = await response.json();
      
      let finalData = {};
      if (Array.isArray(data)) {
          data.forEach(item => { Object.assign(finalData, item.json ? item.json : item); });
      } else {
          finalData = data.json ? data.json : data;
      }
      
      setDbData(prev => {
          const merged = { ...prev, ...finalData };
          const staticTables = ['ghsitemd', 'GHSITEMD', 'ghsitemh', 'GHSITEMH', 'ghwork', 'GHWORK', 'ghsperson', 'GHSPERSON', 'ahmssitm', 'AHMSSITM'];
          staticTables.forEach(key => {
              const prevVal = prev[key];
              const newVal = finalData[key];
              if (prevVal && Array.isArray(prevVal) && prevVal.length > 0) {
                  if (!newVal || (Array.isArray(newVal) && newVal.length === 0)) merged[key] = prevVal;
              }
          });
          
          let maxDbSeq = 9000;
          ['ghsitemd', 'ahmssitm'].forEach(tableName => {
              const items = merged[tableName] || merged[tableName.toUpperCase()];
              if (Array.isArray(items)) {
                  items.forEach(i => {
                      const snoVal = Number(getValue(i, ['Ino', 'ino', 'ItemSno', 'item_sno', 'ITEM_SNO', 'Sno', 'sno']));
                      if (!isNaN(snoVal) && snoVal >= 9000 && snoVal > maxDbSeq) maxDbSeq = snoVal;
                  });
              }
          });
          if (maxDbSeq > maxCustomSeqRef.current) maxCustomSeqRef.current = maxDbSeq;
          return merged;
      });
      setConnectionStatus('success');
      setDebugInfo('載入成功');
    } catch (error) {
      console.warn("Fallback:", error);
      setConnectionStatus('error');
      setDebugInfo(`失敗: ${error.message}`);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); 
  }, []);

  useEffect(() => {
      if (headerData.wcode) fetchData(headerData.wcode, headerData.skipDelivered ?? true);
  }, [headerData.wcode, headerData.skipDelivered]);

  const allowedWorks = useMemo(() => {
    const ghwork = findTableSmart(dbData, ['ghwork', 'GHWORK', 'gh_work'], ['Wcode', 'Wname']);
    if (!user.isLoggedIn) return [];
    return ghwork.filter(w => {
         const wSno = String(getValue(w, ['Sno', 'id', 'sno', 'SNO']));
         const wCode = String(getValue(w, ['Wcode', 'Workcode', 'wcode']));
         return user.allowedProjects.includes('ALL') || user.allowedProjects.includes(wSno) || user.allowedProjects.includes(wCode);
    });
  }, [dbData, user.isLoggedIn, user.allowedProjects]);


  const deliveredHcodeSet = useMemo(() => {
    const set = new Set();
    const target = String(headerData.wcode || '').trim();
    const ahmcontha = findTableSmart(dbData, ['ahmcontha', 'AHMCONTHA', 'ahm_contha'], ['Hcode']);

    ahmcontha.forEach(r => {
         const hWorkSno = String(getValue(r, ['WorkSno', 'worksno', 'WORKSNO', 'work_sno', 'Work_Sno']) || '').trim();
         const hWcode = String(getValue(r, ['Wcode', 'wcode', 'WCODE', 'Workcode']) || '').trim();
         if (target && hWorkSno !== target && hWcode !== target) return;

         const date3 = getValue(r, ['Date3', 'date3', 'DATE3', 'DeliverDate', 'deliverDate', 'DELIVERDATE']);
         if (!date3 || String(date3).trim() === '-' || String(date3).trim() === '') return;

         const h = String(getValue(r, ['Hcode', 'hcode', 'HCODE']) || '').trim().toUpperCase();
         if (h) set.add(h);
    });

    return set;
  }, [dbData, headerData.wcode]);

  const handleLogin = async (account, password) => {
      if (!account || !password) { alert("請輸入帳號與密碼"); return; }
      setLoading(true);
      try {
          const response = await fetch(API_LOGIN, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
              body: JSON.stringify({ account, password })
          });
          
          if (!response.ok) throw new Error("登入失敗，請檢查網路或伺服器");
          
          const userData = await response.json();
          const actualData = Array.isArray(userData) ? userData[0] : userData;
          
          if (actualData && actualData.user && actualData.user.allowedProjects) {
              setUser({
                  isLoggedIn: true,
                  account: account,
                  name: actualData.user.name || account,
                  allowedProjects: actualData.user.allowedProjects.map(String)
              });
              setStep(1); 
          } else {
              throw new Error("系統錯誤: 無法讀取使用者權限");
          }
      } catch (error) {
          alert(`登入失敗: ${error.message}`);
          if (account === 'admin' && password === '1234') {
             if(window.confirm("API 連線失敗，是否使用測試模式登入？(將開放所有權限)")) {
                 const allWorks = findTableSmart(dbData, ['ghwork', 'GHWORK'], ['Sno']).map(w => String(getValue(w, ['Sno', 'id', 'sno', 'SNO'])));
                 setUser({ isLoggedIn: true, account: 'admin', name: '測試管理員', allowedProjects: allWorks });
                 setStep(1);
             }
          }
      } finally { setLoading(false); }
  };

const handleLogout = () => {
      if(window.confirm("確定要返回系統選擇清單嗎？")) {
          localStorage.removeItem(STORAGE_KEY);
          window.location.href = 'https://goinfo-portal.zeabur.app'; 
      }
  };

  // ★ 處理右鍵點擊進入後台驗證
  const handleAdminContextMenu = (e) => {
      e.preventDefault();
      setAdminPwdInput('');
      setShowAdminAuth(true);
  };

const verifyAdminPassword = async () => {
    if (!adminPwdInput) {
        alert('請輸入管理員密碼！');
        return;
    }

    setLoading(true);
    try {
        const response = await fetch(API_VERIFY_ADMIN_PASSWORD, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                'X-Webhook-Secret': ADMIN_WEBHOOK_SECRET
            },
            body: JSON.stringify({
                password: adminPwdInput
            })
        });

        const rawText = await response.text();
        let result = null;

        try {
            result = rawText ? JSON.parse(rawText) : null;
        } catch (e) {
            result = { ok: false, message: rawText || '驗證回應格式錯誤' };
        }

        if (response.ok && result?.ok) {
            setShowAdminAuth(false);
            initAdminData();
            setStep(6); // 進入後台
        } else {
            alert(result?.message || '密碼錯誤！');
        }
    } catch (error) {
        console.error('verifyAdminPassword error:', error);
        alert('管理員驗證失敗，請稍後再試！');
    } finally {
        setAdminPwdInput('');
        setLoading(false);
    }
};

const normalizeAdminPerson = (person, index = 0) => ({
    originalObj: person || {},
    Name: String(getValue(person, ['Pname', 'Name', 'name', 'pname']) || '').trim(),
    Sno: String(getValue(person, ['Sno', 'sno', 'ID', 'id']) || '').trim() || String(index + 1)
});
  const getNextAdminPersonSno = (list = []) => {
      const nums = list
          .map(p => parseInt(String(p?.Sno ?? '').trim(), 10))
          .filter(n => !Number.isNaN(n));
      return String((nums.length ? Math.max(...nums) : 0) + 1);
  };

  const handleAdminPersonChange = (index, field, value) => {
      setAdminPersons(prev => prev.map((person, i) => i === index ? { ...person, [field]: value } : person));
  };

  const handleAddAdminPerson = () => {
      setAdminPersons(prev => ([
          ...prev,
          { originalObj: {}, Name: '', Sno: getNextAdminPersonSno(prev) }
      ]));
  };

  const handleDeleteAdminPerson = (index) => {
      setAdminPersons(prev => prev.filter((_, i) => i !== index));
  };

  // 初始化後台資料
const initAdminData = () => {
    const ghsitemh = findTableSmart(dbData, ['ghsitemh', 'GHSITEMH'], []);
    const ghsitemd = findTableSmart(dbData, ['ghsitemd', 'GHSITEMD'], ['Sno']);
    const ghsperson = findTableSmart(dbData, ['ghsperson', 'GHSPERSON'], ['Name', 'Pname']);

    setAdminCategories(JSON.parse(JSON.stringify(ghsitemh)));

    setAdminPersons(
        ghsperson.map((person, index) => normalizeAdminPerson(person, index))
    );

    const parsedItems = ghsitemd.map(item => {
        const sno = getValue(item, ['Sno', 'sno', 'SNO', 'CategorySno', 'MasterSno']);
        const ino = getValue(item, ['Ino', 'ino', 'ItemSno', 'itemsno', 'ITEMSNO']);
        const fullName = getValue(item, ['Name', 'name', 'ItemName', 'itemname']) || '';

        let room = '';
        let vendor = '';
        let detail = '';

        const parts = String(fullName).split('-');

        if (parts.length >= 3) {
            room = parts[0] || '';
            vendor = parts[1] || '';
            detail = parts.slice(2).join('-') || '';
        } else if (parts.length === 2) {
            room = parts[0] || '';
            vendor = '';
            detail = parts[1] || '';
        } else {
            room = '';
            vendor = '';
            detail = fullName;
        }

        return {
            originalObj: item,
            Sno: sno,
            Ino: ino,
            Room: room,
            Vendor: vendor,
            DetailName: detail
        };
    });

    setAdminItems(parsedItems);

    if (ghsitemh.length > 0) {
        const firstId = getValue(ghsitemh[0], ['Hcode', 'hcode', 'Sno', 'sno', 'SNO', 'ID', 'id']);
        setSelectedAdminCat(String(firstId));
    } else {
        setSelectedAdminCat(null);
    }

    setAdminTab('inspection');
};

  // 將編輯後的後台資料組合準備上傳
const handleSaveAdminData = async () => {
    if (!window.confirm("確定要儲存修改的清單設定至伺服器嗎？")) return;
    setLoading(true);

    try {
        const payloadD = adminItems.map(item => {
            const room = String(item.Room || '').trim();
            const vendor = String(item.Vendor || '').trim();
            const detail = String(item.DetailName || '').trim();
            const newName = `${room}-${vendor}-${detail}`;

            return {
                ...(item._originalObj || {}),
                Ino: Number(item.Ino || 0),
                Sno: Number(item.Sno || 0),
                Name: newName
            };
        });

        const payloadPersons = adminPersons
            .map((person, index) => {
                const finalName = String(person.Name || '').trim();
                const finalSno = String(person.Sno || '').trim() || String(index + 1);

                return {
                    ...(person.originalObj || {}),
                    Sno: Number(finalSno),
                    Name: finalName,
                    Pname: finalName
                };
            })
            .filter(person => person.Name);

        const payloadH = adminCategories.map((cat, index) => {
            const sno = Number(getValue(cat, ['Hcode', 'hcode', 'Sno', 'sno', 'SNO', 'ID', 'id']) ?? (index + 1));
            const name = String(getValue(cat, ['Name', 'name', 'NAME', 'CName']) || '').trim();
            const list = getValue(cat, ['List', 'list']) ?? null;
            const sel = Number(getValue(cat, ['Sel', 'sel']) ?? 3);

            return {
                ...cat,
                Sno: sno,
                Hcode: sno,
                Name: name,
                List: list,
                Sel: sel
            };
        });

        const payload = {
            ghsitemh: payloadH,
            ghsitemd: payloadD,
            ghsperson: payloadPersons
        };

        const res = await fetch(API_SAVE_ADMIN_DATA, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify(payload)
        });

        const rawText = await res.text();
        let result = null;

        try {
            result = rawText ? JSON.parse(rawText) : null;
        } catch (e) {
            result = { raw: rawText };
        }

        if (!res.ok) {
            throw new Error(result?.message || rawText || `儲存失敗 (${res.status})`);
        }

        setDbData(prev => ({
            ...prev,
            GHSITEMH: payloadH,
            ghsitemh: payloadH,
            GHSITEMD: payloadD,
            ghsitemd: payloadD,
            GHSPERSON: payloadPersons,
            ghsperson: payloadPersons
        }));

        alert(result?.message || "清單設定已成功儲存並寫入資料庫！");
    } catch (error) {
        console.error("handleSaveAdminData error:", error);
        alert(`儲存失敗：${error.message}`);
    } finally {
        setLoading(false);
    }
};

  useEffect(() => {
    if (step === 5 || step === 1) { 
        const itemsD = findTableSmart(dbData, ['ghsitemd', 'GHSITEMD'], ['Sno']);
        const itemsProject = findTableSmart(dbData, ['ahmssitm', 'AHMSSITM'], ['Ino']);
        
        const targetCatStr = String(reportConfig.categorySno);
        const ghsitemh = findTableSmart(dbData, ['ghsitemh', 'GHSITEMH'], []);
        const targetCat = ghsitemh.find(c => String(getValue(c, ['Hcode', 'hcode', 'Sno', 'sno', 'SNO', 'ID', 'id'])) === targetCatStr);
        const catName = targetCat ? getValue(targetCat, ['Name', 'name', 'NAME', 'CName']) || '' : '';
        
        const isCivilReport = targetCatStr === '1' || (catName && (catName.includes('土.水') || catName.includes('土水')));
        const effectiveMode = isCivilReport ? 'CIVIL' : inspectionMode;

        if (itemsD && itemsD.length > 0) {
             const filteredItemsD = itemsD.filter(item => {
                 if (!targetCatStr || targetCatStr === 'undefined' || targetCatStr === 'null' || targetCatStr === '') return true;
                 return String(getValue(item, ['Sno', 'sno', 'SNO', 'CategorySno', 'MasterSno'])) === targetCatStr;
             });

             const grouped = filteredItemsD.reduce((acc, item) => {
                 const name = getValue(item, ['Name', 'name', 'ItemName', 'item_name']);
                 if (!name) return acc;
                 
                 const sno = String(getValue(item, ['Ino', 'ino', 'ItemSno', 'item_sno', 'ITEM_SNO']));
                 const pItem = itemsProject.find(pi => String(getValue(pi, ['Ino', 'ino', 'ItemSno', 'item_sno', 'ITEM_SNO'])) === sno);
                 
                 const seg2 = getItemSegment2(name);
                 const finalAttr = seg2 || determineSmartAttr(name, null, sno, effectiveMode);

                 const _nameParts = name.split('-');
                 const cleanItemName = _nameParts.length >= 2 ? _nameParts.slice(1).join('-') : name;
                 const roomName = _nameParts[0] ? _nameParts[0].trim() : '其他'; 
                 
                 if (!acc[roomName]) acc[roomName] = [];
                 acc[roomName].push({
                     sno: sno, 
                     itemName: cleanItemName, 
                     fullName: name, 
                     attr: String(finalAttr), 
                     status: '0' 
                 });
                 return acc;
             }, {});
            
             if (reportRows.length > 0) {
                 const customItems = reportRows.filter(r => r.sno >= 9000);
                 if (customItems.length > 0) {
                      if (!grouped['自行新增']) grouped['自行新增'] = [];
                      customItems.forEach(item => {
                           let cAttr = String(item.attr);
                           if (isCivilReport && (cAttr !== '土建' && cAttr !== '水電')) {
                               cAttr = getCivilType(item.sno, item.itemName);
                           }
                           
                           grouped['自行新增'].push({ 
                               sno: String(item.sno), 
                               itemName: item.itemName, 
                               fullName: item.itemName, 
                               attr: cAttr, 
                               status: '0' 
                           });
                      });
                 }
             }
             setTreeData(grouped);
        }
    }
  }, [step, dbData, reportRows, inspectionMode, reportConfig.categorySno]);

  const prepareChecklist = (categoryInput) => {
      let targetSno = categoryInput;
      const ghsitemh = findTableSmart(dbData, ['ghsitemh', 'GHSITEMH'], []); 
      const ghsitemd = findTableSmart(dbData, ['ghsitemd', 'GHSITEMD'], ['Sno']);
      const ahmssitm = findTableSmart(dbData, ['ahmssitm', 'AHMSSITM'], ['Ino']); 
      
      let categoryName = "";
      if (isNaN(Number(targetSno)) && ghsitemh.length > 0) {
          const foundCat = ghsitemh.find(cat => {
              const name = getValue(cat, ['Name', 'name', 'NAME', 'CName']);
              return name && name.trim() === String(targetSno).trim();
          });
          if (foundCat) {
              const realId = getValue(foundCat, ['Hcode', 'hcode', 'Sno', 'sno', 'SNO', 'ID', 'id']);
              categoryName = getValue(foundCat, ['Name', 'name', 'NAME', 'CName']) || targetSno;
              if (realId !== undefined && realId !== null) targetSno = realId;
          }
      } else {
          const foundCat = ghsitemh.find(cat => String(getValue(cat, ['Hcode', 'hcode', 'Sno', 'sno', 'SNO', 'ID', 'id'])) === String(targetSno));
          if (foundCat) categoryName = getValue(foundCat, ['Name', 'name', 'NAME', 'CName']);
      }

      let currentMode = 'CIVIL';
      if (categoryName.includes('土.水') || categoryName.includes('土水')) {
          currentMode = 'CIVIL';
      } else if (categoryName.includes('透天') && categoryName.includes('廠商')) {
          currentMode = 'TOWNHOUSE_VENDOR';
      } else if (categoryName.includes('大樓') && categoryName.includes('廠商')) {
          currentMode = 'BUILDING_VENDOR';
      }
      setInspectionMode(currentMode);

      const works = findTableSmart(dbData, ['ghwork', 'GHWORK', 'gh_work'], ['Wcode', 'Wname']);
      const selectedWork = works.find(w => String(getValue(w, ['Sno', 'id', 'sno', 'SNO'])) === String(headerData.wcode));
      const realWcode = selectedWork ? getValue(selectedWork, ['Wcode', 'Workcode', 'wcode']) : ''; 
      
      const projectItems = ahmssitm.filter(i => getValue(i, ['Wcode', 'Workcode']) === realWcode);
      const filteredItems = ghsitemd.filter(item => {
          const itemCatSno = getValue(item, ['Sno', 'sno', 'SNO', 'CategorySno', 'MasterSno']);
          return String(itemCatSno).trim() === String(targetSno).trim();
      });
      const initialItems = filteredItems.map(item => {
          const ino = getValue(item, ['Ino', 'ino', 'ItemSno', 'item_sno', 'ITEM_SNO']);
          const itemName = getValue(item, ['Name', 'name', 'ItemName', 'item_name']);
          const finalAttr = determineSmartAttr(itemName, null, ino, currentMode);

          return {
            sno: ino, 
            itemName: itemName || "未命名項目", 
            status: 0, 
            note: '', 
            photos: [], 
            photo: '', 
            attr: finalAttr, 
            isSystem: true, 
            localPreview: null, 
            uid: `sys-${ino}`
          };
      });
      setChecklistItems(initialItems);
      
      const existing9Ids = initialItems.map(i => Number(i.sno)).filter(id => id >= 9000);
      const currentMax = existing9Ids.length > 0 ? Math.max(...existing9Ids) : 9000;
      if (currentMax > maxCustomSeqRef.current) maxCustomSeqRef.current = currentMax;

      setCurrentCategory('全部');
      setSubPageIndex(0); 
  };

  const handleStartInspection = () => {
      const missing = [];
      if (!headerData.wcode) missing.push("建案");
      if (!headerData.hcode) missing.push("戶別");
      if (!headerData.categorySno) missing.push("驗屋分類");
      if (!headerData.inspector) missing.push("陪驗人員");
      if (missing.length > 0) { 
          window.alert(`尚未選擇以下必填項目：\n\n${missing.join('\n')}`); 
          return; 
      }

      if (headerData.categorySno) {
          prepareChecklist(headerData.categorySno);
          setIsViewAll(true);
          setStep(2); 
      } else {
          setCurrentCategory('全部'); 
          setIsViewAll(true);
          setStep(2);
      }
  };
  
  const handleCompleteInspection = () => {
      const totalItems = checklistItems.length;
      const completedItems = checklistItems.filter(i => i.status !== 0).length;
      if (totalItems > 0 && completedItems < totalItems) {
          if (!window.confirm("目前全案完成度未達 100%，尚有檢查項目未填寫。\n\n是否仍要立即完成驗收？")) return;
      }
      setStep(3);
  };

  const handlePreviewSummaryFromSig = () => {
      saveCurrentSignature(true);
      const currentDefects = checklistItems.filter(i => i.status === 2).map(i => ({
             hcode: headerData.hcode, 
             customerName: headerData.customerName, 
             date: headerData.inspectDate, 
             itemName: i.itemName, 
             note: i.note, 
             status: '2', 
             sno: i.sno, 
             Sno: i.sno, 
             attr: i.attr
      }));
      setReportRows(currentDefects);

      setReportConfig(prev => ({ 
          ...prev, 
          wcode: headerData.wcode, 
          categorySno: headerData.categorySno, 
          startDate: headerData.inspectDate, 
          endDate: headerData.inspectDate   
      }));
      setIsFromInspection(true); 
      setHideReportSettings(false); 
      setStep(5);
  };
  
  const handlePreviewChecklistFromHistory = () => {
        if (!historyDetailItems || historyDetailItems.length === 0) { 
            window.alert("無項目資料可預覽"); 
            return; 
        }
        
const base = dedupeChecklistItems(historyDetailItems);

const convertedItems = base.map((item, idx) => {
  let photos = item.photos;
  if (item.photo && (!photos || photos.length === 0)) photos = [item.photo];
  if (!Array.isArray(photos)) photos = photos ? [photos] : [];

  return {
    ...item,
    photos: photos.filter(Boolean),
    photo: photos.filter(Boolean)[0],
    uid: item.uid || `hist-${String(item.sno ?? "")}-${String(item.room ?? item.roomName ?? "")}-${idx}`
  };
});

setChecklistItems(convertedItems)
;
        setShowHistoryDefectsOnly(false);
        setHomeMode('history'); 
        setStep(4);
  };
  
  const visibleHistoryChecklistItems = useMemo(() => {
      const base = Array.isArray(checklistItems) ? checklistItems : [];
      if (!(homeMode === 'history' && (isFromInspection || homeMode === 'history'))) return base;
      if (!showHistoryDefectsOnly) return base;
      return base.filter(item => Number(item?.status) === 2);
  }, [checklistItems, showHistoryDefectsOnly, homeMode, isFromInspection]);

  const generateUniqueSerialNo = async (workSno, dateStr) => {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const rocYear = (year - 1911) % 100; 
      const rocYearStr = String(rocYear).padStart(2, '0');
      const prefix = `C${workSno}${rocYearStr}${month}${day}`;
      try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          const res = await fetch(`${API_SEARCH_HISTORY}?wcode=${workSno}`, { 
              mode: 'cors', 
              headers: { 'Accept': 'application/json' }, 
              signal: controller.signal 
          });
          clearTimeout(timeoutId);
          
          if (!res.ok) throw new Error('History Fetch failed');
          const data = await res.json();
          const existingSernos = Array.isArray(data) ? data.map(r => r.serialNo || r.serno || r.id || '').filter(s => s && s.startsWith(prefix)) : [];
          let maxSeq = 0;
          existingSernos.forEach(s => {
              const suffix = parseInt(s.substring(prefix.length), 10);
              if (!isNaN(suffix) && suffix > maxSeq) maxSeq = suffix;
          });
          return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
      } catch (e) { 
          return `${prefix}001`; 
      }
  };

  const getInspectionCountDisplay = (t, c) => t === '自驗' ? `第${c}次` : (c===1?'初驗':'複驗');
  
  const getHeaderNote = (type, count) => {
      if (type !== '客驗') return type;
      if (count === 1) return '客戶初驗';
      if (count === 2) return '客戶複驗';
      return `客戶複驗${count - 1}`;
  };

  const updateItem = (sno, field, value) => {
      setChecklistItems(prev => prev.map(item => 
          item.sno === sno ? { ...item, [field]: value } : item
      ));
  };

  const handleToggleItemStatus = (sno, nextStatus) => {
      setChecklistItems(prev => prev.map(item =>
          item.sno === sno
              ? { ...item, status: item.status === nextStatus ? 0 : nextStatus }
              : item
      ));
  };

  const getSelectedWorkCode = (workSno) => {
      if (!workSno) return '';
      const works = findTableSmart(dbData, ['ghwork', 'GHWORK', 'gh_work'], ['Wcode', 'Wname']);
      const selectedWork = works.find(w => String(getValue(w, ['Sno', 'id', 'sno', 'SNO'])) === String(workSno));
      return selectedWork ? (getValue(selectedWork, ['Wcode', 'Workcode', 'wcode']) || workSno) : workSno;
  };

  const isDeliveredUnit = (workSno, hcode) => {
      if (!workSno || !hcode) return false;

      const ahmcontha = findTableSmart(
          dbData,
          ['ahmcontha', 'AHMCONTHA', 'ahm_contha'],
          ['Hcode']
      );

      const realWcode = getSelectedWorkCode(workSno);

      return ahmcontha.some(row => {
          const rowWcode = getValue(row, ['Wcode', 'wcode', 'WCODE', 'Workcode']);
          const rowWorkSno = getValue(row, ['WorkSno', 'worksno', 'WORKSNO', 'work_sno', 'Work_Sno']);
          const rowHcode = getValue(row, ['Hcode', 'hcode', 'HCODE']);
          const deliveredDate = getValue(row, [
              'Date3', 'date3', 'DATE3',
              'DeliverDate', 'deliverDate', 'DELIVERDATE'
          ]);

          const sameProject =
              String(rowWcode || '').trim() === String(realWcode || '').trim() ||
              String(rowWorkSno || '').trim() === String(workSno || '').trim();

          const sameUnit =
              String(rowHcode || '').trim() === String(hcode || '').trim();

          return sameProject && sameUnit && String(deliveredDate || '').trim() !== '';
      });
  };

  const handleRemove9Item = (sno) => {
      if (window.confirm("確定要從本次驗屋中移除此項目嗎？(無法復原)")) {
          setChecklistItems(prev => prev.filter(item => item.sno !== sno));
      }
  };
  
  const prepareSave = async () => {
      saveCurrentSignature(true);
      if (!headerData.wcode || !headerData.hcode) { 
          window.alert("錯誤：建案代號或戶別代號遺失，無法存檔。"); 
          return; 
      }
      setLoading(true);

      try {
        const works = findTableSmart(dbData, ['ghwork', 'GHWORK', 'gh_work'], ['Wcode', 'Wname']);
        const selectedWork = works.find(w => String(getValue(w, ['Sno', 'id', 'sno', 'SNO'])) === String(headerData.wcode));
        const realWcode = selectedWork ? (getValue(selectedWork, ['Wcode', 'Workcode', 'wcode']) || headerData.wcode) : headerData.wcode;
        const workShortSno = selectedWork ? getValue(selectedWork, ['Sno', 'id', 'sno', 'SNO']) : headerData.wcode;

        let finalSerialNo = headerData.serialNo;
        if (!finalSerialNo) {
             finalSerialNo = await generateUniqueSerialNo(workShortSno, headerData.inspectDate);
             setHeaderData(prev => ({...prev, serialNo: finalSerialNo}));
        }

        const uploadSignature = async (base64Str, role) => {
            if (!base64Str || !base64Str.startsWith('data:image')) return null;
            try {
                const res = await fetch(base64Str);
                const blob = await res.blob();
                const file = new File([blob], `signature_${role}_${finalSerialNo}.png`, { type: "image/png" });
                const formData = new FormData();
                formData.append('file', file);
                formData.append('project', headerData.wname);
                formData.append('unit', headerData.hcode);
                formData.append('pathPrefix', 'public/data/uploads');
                
                const uploadRes = await fetch(API_IMAGE_UPLOAD, { 
                    method: 'POST', 
                    body: formData, 
                    headers: { 'ngrok-skip-browser-warning': 'true' } 
                });
                
                if (uploadRes.ok) {
                    const result = await uploadRes.json();
                    if (result.filename || result.url) {
                        return `/public/data/uploads/${headerData.wname}/${(result.filename || result.url).split('/').pop()}`;
                    }
                }
                return null;
            } catch (e) { 
                return null; 
            }
        };

        const processedSignatures = {
            customer: signatures.customer ? (signatures.customer.startsWith('data:') ? await uploadSignature(signatures.customer, 'customer') : signatures.customer) : null,
            worker: signatures.worker ? (signatures.worker.startsWith('data:') ? await uploadSignature(signatures.worker, 'worker') : signatures.worker) : null,
            service: signatures.service ? (signatures.service.startsWith('data:') ? await uploadSignature(signatures.service, 'service') : signatures.service) : null
        };

        let currentItems = [...checklistItems];
        let uploadErrors = 0;
        
        await Promise.all(currentItems.map(async (item, index) => {
             const newPhotos = [];
             for (const photo of (item.photos || [])) {
                 if (photo && (photo.startsWith('blob:') || photo.startsWith('data:'))) {
                    try {
                        const blobRes = await fetch(photo);
                        const blob = await blobRes.blob();
                        const file = new File([blob], `photo_${item.sno}_${Math.random().toString(36).substr(2, 9)}.jpg`, { type: "image/jpeg" });
                        
                        const formData = new FormData();
                        formData.append('file', file); 
                        formData.append('project', headerData.wname); 
                        formData.append('unit', headerData.hcode); 
                        formData.append('pathPrefix', 'public/data/uploads');
                        
                        const uploadRes = await fetch(API_IMAGE_UPLOAD, { 
                            method: 'POST', 
                            body: formData, 
                            headers: { 'ngrok-skip-browser-warning': 'true' } 
                        });
                        
                        if (uploadRes.ok) {
                            const result = await uploadRes.json();
                            if (result.filename || result.url) {
                                newPhotos.push(`/public/data/uploads/${headerData.wname}/${(result.filename || result.url).split('/').pop()}`);
                            } else { 
                                newPhotos.push(photo); 
                                uploadErrors++; 
                            }
                        } else { 
                            newPhotos.push(photo); 
                            uploadErrors++; 
                        }
                    } catch (err) { 
                        newPhotos.push(photo); 
                        uploadErrors++; 
                    }
                 } else { 
                     newPhotos.push(photo); 
                 }
             }
             currentItems[index] = { ...item, photos: newPhotos, photo: newPhotos[0] || '' };
        }));

        setChecklistItems(currentItems);
        
        if (uploadErrors > 0) {
            if (!window.confirm(`警告：有 ${uploadErrors} 張照片上傳失敗！\n可能是因為您的 ngrok 伺服器連線有誤。\n\n是否仍要強制存檔？(失敗的照片將無法顯示)`)) { 
                setLoading(false); 
                return; 
            }
        }

        const cleanItems = currentItems.filter(i => i.status !== 0 || i.note !== '').map(item => ({
            Wcode: realWcode, 
            Hcode: headerData.hcode || '', 
            SpaceHcode: String(item.hcode || "0"), 
            InspectCount: headerData.inspectCount || 1, 
            Sno: Number(item.sno || 0), 
            Status: Number(item.status || 0), 
            Attr: Number(item.attr || 0), 
            categorySno: Number(headerData.categorySno) || 0,        
            Note: item.note || '', 
            Photo: item.photos && item.photos.length > 0 ? JSON.stringify(item.photos) : '', 
            Name: item.itemName || ''
        }));

        const newMasterItems = currentItems.filter(i => i.sno >= 9000).map(i => {
            const contractor = getContractorName(i.attr, inspectionMode);
            let finalName = i.itemName;
            
            if (i.roomName && i.rawName) {
                finalName = `${i.roomName}-${contractor}-${i.rawName}`;
            } else if (finalName && finalName.includes('-')) {
                const parts = finalName.split('-');
                if (parts.length === 2) finalName = `${parts[0]}-${contractor}-${parts[1]}`;
            }
            
            return { 
                Ino: i.sno, 
                Name: finalName, 
                Attr: i.attr, 
                CategorySno: headerData.categorySno 
            };
        });

        const ghsahms6Data = {
            Wcode: realWcode, 
            Hcode: headerData.hcode || '', 
            Sno: headerData.inspectCount || 1, 
            Serno: finalSerialNo,
            Sdate: headerData.inspectDate ? `${headerData.inspectDate} 00:00:00.000` : '', 
            Per: headerData.inspector || '', 
            Note: getHeaderNote(headerData.inspectType, headerData.inspectCount),
            Flg: '1', 
            SignCust: processedSignatures.customer, 
            SignWork: processedSignatures.worker, 
            SignServ: processedSignatures.service
        };
        
        const payload = { 
            header: { ...headerData, serialNo: finalSerialNo }, 
            GHSAHMS6: ghsahms6Data, 
            items: cleanItems, 
            newMasterItems: newMasterItems, 
            signatures: processedSignatures 
        };
        
        setLoading(false); 
        setCurrentPayload(payload); 
        setShowPayloadModal(true);
      } catch (error) { 
          setLoading(false); 
          window.alert(`存檔準備過程中發生錯誤: ${error.message}`); 
      }
  };
  
  const handleTemporarySave = () => {
      if (user.isLoggedIn) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
              user, step, headerData, checklistItems, homeMode, 
              reportConfig, signatures, isFromInspection, inspectionMode, 
              timestamp: new Date().getTime() 
          }));
          window.alert("✅ 資料已成功暫存！\n(若重新整理網頁，文字資料將會自動還原)");
      }
  };
  
  const confirmSaveToDB = async () => {
      setShowPayloadModal(false); 
      setLoading(true);
      try {
          const response = await fetch(API_SUBMIT_DATA, { 
              method: 'POST', 
              mode: 'cors', 
              headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify(currentPayload) 
          });
          
          if (!response.ok) {
              throw new Error(`Server Error (${response.status}): ${await response.text()}`);
          }
          
          localStorage.removeItem(STORAGE_KEY);
          setSuccessInfo({ serialNo: currentPayload.header.serialNo, message: '資料已成功回寫至資料庫！' });
          setShowSuccessModal(true);
      } catch (error) { 
          window.alert(`存檔失敗: ${error.message}`); 
      } finally { 
          setLoading(false); 
      }
  };

  const PayloadModal = () => {
      if (!showPayloadModal) return null;
      return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
              <div className="bg-white p-6 rounded-lg w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="text-xl font-bold text-blue-800">確認傳送資料</h3>
                      <button onClick={() => setShowPayloadModal(false)}><X className="w-6 h-6 text-gray-500"/></button>
                  </div>
                  <div className="flex-1 overflow-auto bg-gray-50 p-4 border rounded font-mono text-sm">
                      <pre>{JSON.stringify(currentPayload, null, 2)}</pre>
                  </div>
                  <div className="mt-4 flex justify-end gap-4 border-t pt-4">
                      <button onClick={() => setShowPayloadModal(false)} className="px-4 py-2 bg-gray-200 rounded font-bold">取消</button>
                      <button onClick={confirmSaveToDB} className="px-6 py-2 bg-blue-600 text-white font-bold rounded shadow-lg">確認上傳</button>
                  </div>
              </div>
          </div>
      );
  };
  
  const SaveSuccessModal = () => {
      if (!showSuccessModal) return null;
      return (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md flex flex-col items-center text-center relative overflow-hidden">
                  <div className="bg-green-100 p-4 rounded-full mb-4">
                      <CheckCircle className="w-12 h-12 text-green-600"/>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">{successInfo.message}</h3>
                  <div className="bg-gray-100 px-6 py-3 rounded-lg border border-gray-200 mb-6">
                      <p className="text-gray-500 text-sm mb-1">單號</p>
                      <p className="text-2xl font-mono font-bold text-blue-700">{successInfo.serialNo}</p>
                  </div>
                  <div className="flex gap-3 w-full">
                        <button 
                            onClick={() => { 
                                localStorage.removeItem(STORAGE_KEY); 
                                setHeaderData({ 
                                    wcode: '', wname: '', hcode: '', customerName: '', 
                                    inspectDate: new Date().toISOString().split('T')[0], 
                                    inspector: headerData.inspector, 
                                    inspectType: '客驗', inspectCount: 1, serialNo: '', categorySno: '', skipDelivered: true 
                                }); 
                                setChecklistItems([]); 
                                setSignatures({ customer: null, worker: null, service: null }); 
                                setShowSuccessModal(false); 
                                setStep(1); 
                                setHomeMode('new'); 
                            }} 
                            className="flex-1 border border-pink-500 text-pink-600 py-3 rounded-lg font-bold hover:bg-pink-50 transition-colors"
                        >
                            返回首頁
                        </button>
                        <button 
                            onClick={() => { 
                                localStorage.removeItem(STORAGE_KEY); 
                                setShowSuccessModal(false); 
                            }} 
                            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                        >
                            關閉
                        </button>
                  </div>
              </div>
          </div>
      );
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    const targetSno = currentUploadItemSno.current;
    if (!file || !targetSno) return;
    
    const localBlobUrl = URL.createObjectURL(file);
    setChecklistItems(prev => prev.map(item => {
        if (item.sno === targetSno) {
            const currentPhotos = item.photos || [];
            if (currentPhotos.length >= 3) { 
                alert("最多只能上傳 3 張照片"); 
                return item; 
            }
            return { ...item, photos: [...currentPhotos, localBlobUrl], photo: localBlobUrl }; 
        }
        return item;
    }));
    event.target.value = '';
  };
  
  const handleEditImage = (sno, photoSrc, photoIndex) => { 
      setEditingImage({ sno, src: photoSrc, index: photoIndex }); 
      setEditorOpen(true); 
  };
  
  const handleSaveEditedImage = (newSrc) => {
      if (editingImage) {
          setChecklistItems(prev => prev.map(item => {
              if (item.sno === editingImage.sno) {
                  const newPhotos = [...(item.photos || [])];
                  newPhotos[editingImage.index] = newSrc;
                  return { ...item, photos: newPhotos, photo: newPhotos[0] || '' };
              }
              return item;
          }));
      }
      setEditorOpen(false); 
      setEditingImage(null);
  };

  const triggerFileSelect = (sno) => { 
      currentUploadItemSno.current = sno; 
      if (fileInputRef.current) fileInputRef.current.click(); 
  };
  
  const handleDeletePhoto = (sno, index) => { 
      if(window.confirm('確定刪除照片？')) {
          setChecklistItems(prev => prev.map(item => {
              if (item.sno === sno) {
                  const newPhotos = [...(item.photos || [])];
                  newPhotos.splice(index, 1);
                  return { ...item, photos: newPhotos, photo: newPhotos[0] || '' };
              }
              return item;
          }));
      }
  };
  
  const getSignPos = (e) => {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY
      };
  };

  const startSign = (e) => {
      if (!canvasRef.current) return;
      if (e.type.includes('touch')) e.preventDefault(); 
      isDrawingRef.current = true;
      const pos = getSignPos(e);
      const ctx = canvasRef.current.getContext('2d');
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
  };

  const drawSign = (e) => {
      if (!isDrawingRef.current || !canvasRef.current) return;
      if (e.type.includes('touch')) e.preventDefault();
      const pos = getSignPos(e);
      const ctx = canvasRef.current.getContext('2d');
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
  };

  const stopSign = () => {
      isDrawingRef.current = false;
  };

  const clearSignature = () => { 
      const ctx = canvasRef.current?.getContext('2d'); 
      if (ctx && canvasRef.current) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          setSignatures(prev => ({ ...prev, [currentSignRole]: null }));
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = '#000000'; 
      }
  };
  
  const saveCurrentSignature = (silent = false) => { 
      const dataUrl = canvasRef.current?.toDataURL('image/png');
      if (dataUrl) {
        setSignatures(prev => ({ ...prev, [currentSignRole]: dataUrl }));
        if (!silent) window.alert(`${currentSignRole === 'customer' ? '客戶' : '人員'}簽名已暫存`);
      }
  };

  const getGroupedPages = () => {
      const shouldUseFloorTabs =
        String(headerData?.categorySno || '') === '3' ||
        checklistItems.some(it => /^(1F|2F|3F|4F|RF)-/i.test(String(it?.itemName || ''))) ||
        checklistItems.some(it => !!getFloorKeyFromItemName(it?.itemName));

      const grouped = checklistItems.reduce((acc, item) => {
          let key = "";

          if (shouldUseFloorTabs) {
              if (item?.isNew) {
                  key = (item?.roomName || '').trim() || getFloorKeyFromItemName(item?.itemName) || '其他';
              } else {
                  key = getFloorKeyFromItemName(item?.itemName) || '其他';
              }
          } else if (inspectionMode === 'CIVIL') {
              if (item.isNew) {
                  key = item.roomName || "未分類";
              } else {
                  const parts = item.itemName ? normalizeItemName(item.itemName).split('-') : [];
                  key = parts[0] || "其他";
              }
          } else if (inspectionMode === 'BUILDING_VENDOR') {
              if (item.isNew) {
                  key = item.roomName || "未分類";
              } else {
                  const parts = item.itemName ? normalizeItemName(item.itemName).split('-') : [];
                  const knownRooms = ['客.餐廳', '客餐廳', '客廳', '餐廳', '廚房', '主臥室', '主臥廁所', '次臥室', '共用廁所', '前陽台', '工作陽台', '儲藏室', '更衣室', '1F', '2F', '3F', '4F'];
                  let foundRoom = knownRooms.find(r => parts[0] === r || String(item.itemName || '').startsWith(r));
                  key = foundRoom || parts[0] || '其他';
              }
          } else {
              const parts = item.itemName ? normalizeItemName(item.itemName).split('-') : [];
              key = parts[0] || '其他';
          }

          key = (key || '').trim();
          if (!key) key = '其他';
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);
          return acc;
      }, {});

      let keys = Object.keys(grouped);

      if (shouldUseFloorTabs) {
          const floorOrder = ['1F', '2F', '3F', '4F', 'RF'];
          keys.sort((a, b) => {
              const ia = floorOrder.indexOf(a);
              const ib = floorOrder.indexOf(b);
              if (ia !== -1 && ib !== -1) return ia - ib;
              if (ia !== -1) return -1;
              if (ib !== -1) return 1;
              return a.localeCompare(b, 'zh-Hant');
          });
      } else if (inspectionMode === 'CIVIL' || inspectionMode === 'BUILDING_VENDOR') {
          keys = keys.sort((a, b) => getSortScore(a) - getSortScore(b));
      } else if (inspectionMode === 'TOWNHOUSE_VENDOR') {
          const floorOrder = ['1F', '2F', '3F', '4F', 'RF'];
          keys = keys.sort((a, b) => {
              const ia = floorOrder.indexOf(a);
              const ib = floorOrder.indexOf(b);
              if (ia !== -1 && ib !== -1) return ia - ib;
              if (ia !== -1) return -1;
              if (ib !== -1) return 1;
              return a.localeCompare(b, 'zh-Hant');
          });
      }

      return { keys, grouped };
  };

  const handleUpdateCustomItem = (sno, field, value) => {
        setChecklistItems(prev => prev.map(item => {
            if (item.sno !== sno) return item;
            let updatedItem = { ...item, [field]: value };
            if (field === 'roomName' || field === 'rawName') {
                const r = field === 'roomName' ? value : (item.roomName || '');
                const n = field === 'rawName' ? value : (item.rawName || '');
                updatedItem.itemName = `${r}-${n}`;
            }
            return updatedItem;
        }));
  };

  const handleAddCustomItem = () => {
        maxCustomSeqRef.current += 1;
        const newId = maxCustomSeqRef.current;
        const newItem = { 
            sno: newId, 
            itemName: '請選擇廳室-請輸入名稱', 
            roomName: '', 
            rawName: '', 
            status: 0, 
            attr: inspectionMode === 'BUILDING_VENDOR' ? 1 : 6, 
            isSystem: false, 
            isNew: true, 
            note: '', 
            photos: [], 
            photo: '', 
            uid: `cust-${newId}`
        };
        setChecklistItems(prev => [...prev, newItem]);
  };

  const handleDeleteCustomItem = (sno) => {
        if(window.confirm('確定刪除此項目?')) {
            setChecklistItems(prev => prev.filter(item => item.sno !== sno));
        }
  };

  const handleViewHistory = async (record) => {
      setLoading(true);
      try {
          const queryId = record.serialNo || record.id || record.sno;
          const response = await fetch(`${API_GET_RECORD_DETAIL}?id=${queryId}`, { 
              mode: 'cors', 
              headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' } 
          });
          
          let rawItems = []; 
          let headerInfo = {};
          
          if (response.ok) {
              const data = await response.json();
              if (Array.isArray(data)) {
                  const first = data[0]; 
                  headerInfo = first.json ? first.json : first;
                  if (headerInfo.items) {
                      rawItems = headerInfo.items; 
                  } else {
                      rawItems = data.map(r => r.json ? r.json : r);
                  }
              } else {
                  headerInfo = data.json ? data.json : data; 
                  rawItems = headerInfo.items ? headerInfo.items : [headerInfo];
              }
              
              const sigSource = headerInfo.GHSAHMS6 || headerInfo;
              const getValCI = (obj, key) => {
                  if (!obj) return null; 
                  if (obj[key] !== undefined) return obj[key];
                  const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase()); 
                  return found ? obj[found] : null;
              };
              
              const rawCust = getValCI(sigSource, 'SignCust') || headerInfo.signatures?.customer;
              const rawWork = getValCI(sigSource, 'SignWork') || headerInfo.signatures?.worker;
              const rawServ = getValCI(sigSource, 'SignServ') || headerInfo.signatures?.service;

              const [custBlob, workBlob, servBlob] = await Promise.all([ 
                  preloadSignature(rawCust), 
                  preloadSignature(rawWork), 
                  preloadSignature(rawServ) 
              ]);
              setSignatures({ customer: custBlob, worker: workBlob, service: servBlob });
          } else { 
              setSignatures({ customer: null, worker: null, service: null }); 
          }
          
          let detectedMode = 'CIVIL';
          const catSnoRaw = headerInfo.categorySno || headerInfo.CategorySno || headerInfo.Sno || headerInfo.sno || record.categorySno || record.CategorySno || record.Sno || record.sno;
          const catStr = catSnoRaw ? String(catSnoRaw) : '';
          
          if (catSnoRaw) {
              const ghsitemh = findTableSmart(dbData, ['ghsitemh', 'GHSITEMH'], []);
              const targetCat = ghsitemh.find(c => String(getValue(c, ['Sno', 'sno', 'SNO', 'ID', 'id', 'Hcode', 'hcode'])) === catStr);
              const catName = targetCat ? getValue(targetCat, ['Name', 'name', 'NAME', 'CName']) || '' : '';
              
              if (catStr === '2' || (catName && catName.includes('大樓') && catName.includes('廠商'))) {
                  detectedMode = 'BUILDING_VENDOR';
              } else if (catStr === '1' || (catName && (catName.includes('土.水') || catName.includes('土水')))) {
                  detectedMode = 'CIVIL';
              } else if (catStr === '3' || (catName && catName.includes('透天') && catName.includes('廠商'))) {
                  detectedMode = 'TOWNHOUSE_VENDOR';
              }
          }
          
          const ghsitemd = findTableSmart(dbData, ['ghsitemd', 'GHSITEMD'], ['Sno']);
          const normalizedItems = rawItems.map(i => {
              let _sno = i.ItemSno || i.itemSno || i.Ino || i.ino || 0;
              let _name = i.ItemName || i.itemName || i.name || i.Name || i.CheckItem || '';

              if (!_name && _sno && Number(_sno) < 9000) {
                  const _catKey = i.CategorySno || i.categorySno || catStr || '';
              }

              _name = normalizeItemName(_name);
              _name = _name || '未命名項目';

              const _status = Number(i.Status || i.status || i.Sel || i.sel || 0);
              const _note = i.ItemNote || i.itemNote || i.note || i.Note || '';
              const _photo = i.photo || i.Photo || '';
              let _photos = [];
              try { 
                  if (_photo.startsWith('[')) {
                      _photos = JSON.parse(_photo); 
                  } else if (_photo) {
                      _photos = [_photo]; 
                  }
              } catch (e) { 
                  _photos = [_photo]; 
              }
              
              const finalAttr = determineSmartAttr(_name, null, _sno, detectedMode);

              let _room = i.room || i.Room || '';
              if (!_room && _name.includes('-')) {
                  _room = _name.split('-')[0].trim();
              } else if (!_room) {
                   if (_name.includes('客') || _name.includes('餐')) _room = "客餐廳"; 
                   else if (_name.includes('廚')) _room = "廚房"; 
                   else if (_name.includes('臥')) _room = "臥室"; 
                   else if (_name.includes('浴') || _name.includes('廁')) _room = "衛浴"; 
                   else if (_name.includes('陽')) _room = "陽台"; 
                   else _room = "其他";
              }

              const _catSnoItem = Number(i.CategorySno || i.categorySno || catStr || 0);
              if ((_catSnoItem === 2 || _catSnoItem === 3) && _name && _name !== '未命名項目') {
                  _name = normalizeItemName(_name);
              }
              return { 
                  sno: _sno, 
                  itemName: _name, 
                  status: _status, 
                  note: _note, 
                  photos: _photos, 
                  photo: _photos[0] || '', 
                  room: _room, 
                  attr: finalAttr,
                  categorySno: _catSnoItem
              };
          });

          
const validItems = normalizedItems
  .filter((i) => i.itemName && i.itemName.trim() && i.itemName !== "undefined" && i.itemName !== "CheckItem")
  .map((i, idx) => {
    const photosArr = Array.isArray(i.photos) ? i.photos : (i.photos ? [i.photos] : []);
    const stableId = record?.serialNo || record?.id || record?.sno || "hist";
    return {
      ...i,
      photos: photosArr.filter(Boolean),
      photo: photosArr.filter(Boolean)[0],
      uid: `hist-${stableId}-${String(i.sno ?? "")}-${String(i.room ?? "")}-${String(i.itemName ?? "")}-${idx}`
    };
  });

const deduped = dedupeChecklistItems(validItems);

setChecklistItems(deduped);
setHistoryDetailItems(deduped);
;
          
          let finalDate = headerInfo.inspectDate || record.inspectDate || headerData.inspectDate || '';
          if (finalDate && finalDate.includes('T')) {
              finalDate = finalDate.split('T')[0];
          }

          setHeaderData(prev => ({
              ...prev, 
              wname: headerInfo.wname || record.wname || record.project || prev.wname, 
              hcode: headerInfo.hcode || record.hcode || prev.hcode, 
              customerName: headerInfo.customerName || record.customerName || prev.customerName,
              inspectDate: finalDate, 
              inspectType: headerInfo.inspectType || record.inspectType || '歷史紀錄', 
              serialNo: headerInfo.serialNo || record.serialNo, 
              inspector: headerInfo.inspector || record.inspector || prev.inspector,
              categorySno: catSnoRaw || prev.categorySno 
          }));
          
          setInspectionMode(detectedMode); 
          setHomeMode('history'); 
          setIsViewAll(true); 
          setIsFromInspection(false); 
          setStep(2); 

      } catch (e) { 
          alert("無法載入詳細資料: " + e.message); 
      } finally { 
          setLoading(false); 
      }
  };
  
  const handleSearchHistory = async (e) => {
      if (e && e.preventDefault) e.preventDefault();
      setLoading(true);
      try {
          let url = `${API_SEARCH_HISTORY}`;
          const params = new URLSearchParams();
          if (historyProject) params.append('project', historyProject);
          if (searchKeyword) params.append('keyword', searchKeyword);
          if (params.toString()) url += `?${params.toString()}`;
          
          const response = await fetch(url, { 
              mode: 'cors', 
              headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' } 
          });
          
          if (response.ok) {
              const data = await response.json();
              let results = Array.isArray(data) ? data : (data.results || []);

              results = results.filter(r => {
                const rWcode = String(r.wcode || r.Wcode || r.projectCode || r.wname || r.project || '').trim();
                return allowedWorks.some(allowed => {
                    const aSno = String(getValue(allowed, ['Sno', 'id', 'sno', 'SNO']));
                    const aCode = String(getValue(allowed, ['Wcode', 'Workcode', 'wcode']));
                    const aName = String(getValue(allowed, ['Wname', 'Name', 'wname']));
                    return rWcode === aSno || rWcode === aCode || rWcode === aName || (r.wname && r.wname.includes(aName));
                });
              });

              if (historyProject) {
                  const selectedWorkObj = allowedWorks.find(w => String(getValue(w, ['Sno', 'id', 'sno', 'SNO'])) === String(historyProject));
                  if (selectedWorkObj) {
                      const targetSno = String(getValue(selectedWorkObj, ['Sno', 'id', 'sno', 'SNO']));
                      const targetCode = String(getValue(selectedWorkObj, ['Wcode', 'Workcode', 'wcode']));
                      const targetName = String(getValue(selectedWorkObj, ['Wname', 'Name', 'wname']));
                      results = results.filter(r => {
                          const rId = String(r.wcode || r.Wcode || r.projectCode || r.worksno || '').trim();
                          const rName = String(r.wname || r.project || r.ProjectName || '').trim();
                          return rId === targetSno || rId === targetCode || (targetName && rName.includes(targetName)) || (targetName && rName === targetName);
                      });
                  }
              }

              if (searchKeyword) {
                  const lowerKey = searchKeyword.toLowerCase();
                  results = results.filter(r => (r.customerName && r.customerName.includes(lowerKey)) || (r.hcode && r.hcode.toLowerCase().includes(lowerKey)));
              }
              
              results = results.map(r => r.inspectDate && r.inspectDate.includes('T') ? { ...r, inspectDate: r.inspectDate.split('T')[0] } : r);
              results = dedupeSearchHistoryBySerialNo(results);
      setSearchHistoryResults(results); 
              setLoading(false); 
              return; 
          }
      } catch (error) { 
          console.warn("Search API failed, fallback mock"); 
      }

      setTimeout(() => {
          let results = MOCK_SEARCH_RESULTS;
          if (historyProject) {
              const targetWork = findTableSmart(dbData, ['ghwork', 'GHWORK', 'gh_work'], ['Wcode']).find(w => String(getValue(w, ['Sno', 'id'])) === String(historyProject));
              const targetName = targetWork ? getValue(targetWork, ['Wname', 'Name']) : '';
              results = results.filter(r => (r.wname && targetName && r.wname.includes(targetName)));
          }
          if (searchKeyword) {
              const lowerKey = searchKeyword.toLowerCase();
              results = results.filter(r => (r.customerName && r.customerName.includes(lowerKey)) || (r.hcode && r.hcode.toLowerCase().includes(lowerKey)));
          }
          results = results.map(r => r.inspectDate && r.inspectDate.includes('T') ? { ...r, inspectDate: r.inspectDate.split('T')[0] } : r);
          results = dedupeSearchHistoryBySerialNo(results);
      setSearchHistoryResults(results); 
          setLoading(false);
      }, 500);
  };

  const handleGenerateReport = async (e) => {
      if (e && e.preventDefault) e.preventDefault();
      if (!reportConfig.wcode || !reportConfig.categorySno) { 
          window.alert("請選擇推案工地及驗屋清單分類！"); 
          return; 
      }

      setLoading(true);
      try {
          const payload = { 
              wcode: reportConfig.wcode || '', 
              categorySno: reportConfig.categorySno || '', 
              startDate: reportConfig.startDate || '', 
              endDate: reportConfig.endDate || '', 
              attr: '0' 
          };
          
          const response = await fetch(API_GET_REPORT, { 
              method: 'POST', 
              mode: 'cors', 
              headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }, 
              body: JSON.stringify(payload) 
          });
          
          const responseText = await response.text();
          if (!response.ok) throw new Error(`伺服器回應錯誤 (${response.status}): ${responseText}`);
          if (!responseText) { 
              window.alert("查詢失敗：伺服器回應空白。"); 
              setReportRows([]); 
              setLoading(false); 
              return; 
          }

          let rawData; 
          try { 
              rawData = JSON.parse(responseText); 
          } catch (e) { 
              throw new Error(`JSON 解析失敗: ${e.message}`); 
          }
          
          let rawList = [];
          if (Array.isArray(rawData)) {
              rawList = rawData; 
          } else if (rawData.data && Array.isArray(rawData.data)) {
              rawList = rawData.data; 
          } else if (rawData.results && Array.isArray(rawData.results)) {
              rawList = rawData.results; 
          } else if (typeof rawData === 'object' && rawData !== null) {
              rawList = [rawData];
          }

          const formattedRows = rawList.map(item => item && item.json ? item.json : item).map(item => {
              const hcode = getValue(item, ['Hcode', 'hcode', 'SpaceCode']);
              const customerName = getValue(item, ['CustomerName', 'customer_name', 'CusName', 'Name']);
              const itemName = getValue(item, ['ItemName', 'item_name', 'Name', 'CheckItem']); 
              const note = getValue(item, ['Note', 'note', 'Memo']);
              const status = getValue(item, ['Status', 'status', 'STATUS', 'check_status', 'checkStatus', 'is_defect', 'Result', 'result']);
              const dateVal = getValue(item, ['Sdate', 'date', 'Date', 'inspectDate']);
              
              return {
                  hcode: hcode || '', 
                  customerName: customerName || '', 
                  itemName: itemName || '未命名缺失', 
                  note: note || '', 
                  status: String(status), 
                  date: dateVal ? dateVal.split('T')[0] : '', 
                  categorySno: getValue(item, ['CategorySno', 'categorySno', 'CatId', 'cat_id', 'Category_Sno', 'category_id']), 
                  attr: getValue(item, ['Attr', 'attr', 'attribute', 'ATTR']), 
                  sno: getValue(item, ['Sno', 'sno', 'SNO', 'Ino', 'itemSno']), 
                  wcode: getValue(item, ['Wcode', 'wcode', 'WCODE', 'WorkCode', 'CaseID', 'ProjectCode', 'WorkSno', 'worksno']) 
              };
          });

          const finalRows = formattedRows.filter(row => {
              const rowId = String(row.wcode || '').trim();
              if (!rowId) return true; 
              return allowedWorks.some(w => {
                  const wSno = String(getValue(w, ['Sno', 'id', 'sno', 'SNO']));
                  const wCode = String(getValue(w, ['Wcode', 'Workcode', 'wcode']));
                  return rowId === wSno || rowId === wCode;
              });
          });
          
          if (finalRows.length === 0 && !showReportPreview) {
              window.alert(`查詢完成，但目前顯示 0 筆資料。\n\n可能原因：\n1. 此日期區間無缺失資料。\n2. 權限設定過濾掉了資料。`);
          }
          
          const ghsitemh = findTableSmart(dbData, ['ghsitemh', 'GHSITEMH'], []);
          const targetCat = ghsitemh.find(c => String(getValue(c, ['Hcode', 'hcode', 'Sno', 'sno', 'SNO', 'ID', 'id'])) === String(reportConfig.categorySno));
          const catName = targetCat ? getValue(targetCat, ['Name', 'name', 'NAME', 'CName']) || '' : '';
          
          let mode = 'CIVIL';
          if (catName.includes('大樓') && catName.includes('廠商')) {
              mode = 'BUILDING_VENDOR';
          } else if (String(reportConfig.categorySno) === '2') {
              mode = 'BUILDING_VENDOR';
          }
          if (String(reportConfig.categorySno) === '1' || catName.includes('土.水') || catName.includes('土水')) {
              mode = 'CIVIL';
          }

          setInspectionMode(mode);
          setReportRows(finalRows);
          setShowReportPreview(true); 
          
      } catch (error) { 
          window.alert(`查詢失敗！\n\n錯誤訊息: ${error.message}`); 
          setReportRows([]); 
      } finally { 
          setLoading(false); 
      }
  };

  const renderPreviewTableRows = () => {
       if (!reportRows || reportRows.length === 0) {
           return (
               <tr>
                   <td colSpan="9" className="p-8 text-center text-gray-500 bg-white border border-gray-200">
                       無符合條件的缺失項目，請確認日期區間或勾選項目。
                   </td>
               </tr>
           );
       }

       const ghsitemh = findTableSmart(dbData, ['ghsitemh', 'GHSITEMH'], []);
       const targetCat = ghsitemh.find(c => String(getValue(c, ['Hcode', 'hcode', 'Sno', 'sno', 'SNO', 'ID', 'id'])) === String(reportConfig.categorySno));
       const catName = targetCat ? getValue(targetCat, ['Name', 'name', 'NAME', 'CName']) || '' : '';
       
       const isCivilCategory = catName ? (catName.includes('土.水') || catName.includes('土水')) : String(reportConfig.categorySno) === '1';
       const isBuildingVendor = catName ? (catName.includes('大樓') && catName.includes('廠商')) : String(reportConfig.categorySno) === '2';
       
       const isForceCivil = reportAttr === '土建' || reportAttr === '水電';

       const uniqueRows = reportRows.filter((row, index, self) => 
            index === self.findIndex((t) => (
                String(t.sno) === String(row.sno) && String(t.hcode).trim() === String(row.hcode).trim() && 
                String(t.itemName).trim() === String(row.itemName).trim() && String(t.date).split('T')[0] === String(row.date).split('T')[0] && 
                String(t.note).trim() === String(row.note).trim()
            ))
       );

       const dateFilteredRows = uniqueRows.filter(row => {
           if (!reportConfig.startDate && !reportConfig.endDate) return true;
           const rowDate = row.date ? row.date.split('T')[0] : '';
           if (reportConfig.startDate && rowDate < reportConfig.startDate) return false;
           if (reportConfig.endDate && rowDate > reportConfig.endDate) return false;
           return true;
       });

       let finalRows = [];
       dateFilteredRows.forEach(row => {
           const parts = row.itemName ? row.itemName.split('-') : [];
           const seg2_attr = getItemSegment2(row.itemName);
           let attr = seg2_attr || (isCivilCategory || isForceCivil ? '土建' : '99');
           
           if (reportAttr !== '0' && String(attr) !== String(reportAttr)) {
                return;
           }

           let vendorName = seg2_attr || attr || '未知';
           let cleanName = row.itemName || '未命名項目';
           
           cleanName = cleanName.replace(/^[0-9]+F[-－]/, ''); 
           cleanName = cleanName.replace(new RegExp(`^${vendorName}[-－]`), '');
           
           if (attr === '土建' || attr === '水電') {
                if (parts.length >= 2 && (parts[1] === '土建' || parts[1] === '水電')) {
                    cleanName = parts.slice(2).join('-'); 
                } else if (parts.length >= 2) {
                    cleanName = parts.slice(1).join('-');
                }
           } else if (isBuildingVendor) {
                const knownRooms = ['客.餐廳', '客餐廳', '客廳', '餐廳', '廚房', '主臥室', '主臥廁所', '次臥室', '共用廁所', '前陽台', '工作陽台', '陽台', '後陽台', '1F', '2F', '3F', '4F'];
                if (knownRooms.includes(parts[0])) {
                    if (parts.length >= 3 && parts[1] === vendorName) {
                        cleanName = parts.slice(2).join('-'); 
                    } else if (parts.length >= 2) {
                        cleanName = parts.slice(1).join('-');
                    }
                } else if (parts[0] === vendorName) {
                    cleanName = parts.slice(1).join('-');
                }
           }

           let floor = getFloor(row.hcode); 
           if (isCivilCategory || isBuildingVendor || isForceCivil) {
               if (parts.length > 0) {
                   floor = parts[0]; 
               }
           } else {
               if (row.itemName.includes('1F')) floor = '1F'; 
               else if (row.itemName.includes('2F')) floor = '2F'; 
               else if (row.itemName.includes('3F')) floor = '3F'; 
               else if (String(row.sno).startsWith('4')) floor = '4F'; 
               else { 
                   const s = String(row.sno); 
                   if (s.startsWith('1')) floor = '1F'; 
                   else if (s.startsWith('2')) floor = '2F'; 
                   else if (s.startsWith('3')) floor = '3F'; 
               }
           }

           finalRows.push(
               <tr key={`${row.sno}-${row.hcode}-${row.itemName}`} className="bg-white hover:bg-gray-50 text-gray-800 border-b border-gray-200">
                   <td className="p-2 border-r border-gray-200 text-center whitespace-nowrap">{vendorName}</td>
                   <td className="p-2 border-r border-gray-200 text-center">{row.sno}</td>
                   <td className="p-2 border-r border-gray-200 text-center whitespace-nowrap">{floor}</td>
                   <td className="p-2 border-r border-gray-200 text-left min-w-[120px]">{cleanName}</td>
                   <td className="p-2 border-r border-gray-200 text-center whitespace-nowrap">{row.hcode}</td>
                   <td className="p-2 border-r border-gray-200 text-center whitespace-nowrap">{formatCustomerName(row.customerName)}</td>
                   <td className="p-2 border-r border-gray-200 text-center whitespace-nowrap">{row.date}</td>
                   <td className="p-2 border-r border-gray-200 text-center text-red-600 font-bold">{(row.status === '2' || row.status === 2) ? 'V' : ''}</td>
                   <td className="p-2 text-left text-red-600 font-medium">{row.note}</td>
               </tr>
           );
       });

       if (finalRows.length === 0) {
           return (
               <tr>
                   <td colSpan="9" className="p-8 text-center text-gray-500 bg-white border border-gray-200">
                       無符合條件的缺失項目，請確認日期區間或勾選項目。
                   </td>
               </tr>
           );
       }
       return finalRows;
  };

  const PhotoPreviewModal = () => {
    if (!viewPhoto) return null;
    const { url, name, note, status } = typeof viewPhoto === 'string' ? { url: viewPhoto, name: '預覽圖片', note: '', status: 0 } : viewPhoto;
    const isBlob = url && url.startsWith('blob:');

    return (
        <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setViewPhoto(null)} >
            <div className="absolute top-4 right-4 flex gap-4 z-20">
                {!isBlob && ( 
                    <button 
                        className="p-2 bg-blue-600/80 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2 font-bold text-sm shadow-lg border border-blue-400" 
                        onClick={(e) => { e.stopPropagation(); window.open(url, '_blank'); }} 
                    >
                        <ExternalLink className="w-4 h-4"/> 
                        <span className="hidden md:inline">無法顯示？開啟原圖</span>
                        <span className="md:hidden">開啟原圖</span>
                    </button> 
                )}
                <button 
                    className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors" 
                    onClick={(e) => { e.stopPropagation(); setViewPhoto(null); }} 
                >
                    <X className="w-8 h-8"/>
                </button>
            </div>
            
            <div className="w-full max-w-5xl flex flex-col items-center" onClick={(e) => e.stopPropagation()} >
                <div className="relative w-full flex justify-center mb-4">
                    <SecureImage 
                        src={url} 
                        alt={name} 
                        className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl bg-black" 
                    />
                </div>
                
                <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-700 backdrop-blur text-center min-w-[300px] max-w-2xl">
                    <h3 className="text-xl font-bold text-white mb-1 flex items-center justify-center gap-2">
                        {name}
                        {status === 2 && <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded border border-red-500">異常</span>}
                        {status === 1 && <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded border border-green-500">正常</span>}
                    </h3>
                    <p className="text-gray-300 text-sm">{note || "無備註描述"}</p>
                    <div className="mt-3 flex gap-4 justify-center text-[11px] text-gray-200 font-mono bg-black/50 p-2 rounded border border-gray-700">
                        <span className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${isBlob ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                            {isBlob ? "本地預覽 (Blob)" : "伺服器存檔 (Remote)"}
                        </span>
                        <span className="opacity-70 max-w-[250px] truncate">{url}</span>
                    </div>
                </div>
            </div>
        </div>
    )
  };
  
  const DebugPanel = () => {
      if (!showDebug) return null;
      return (
          <div className="fixed bottom-2 left-2 md:bottom-4 md:left-4 bg-gray-900/90 text-white text-[10px] md:text-xs px-2 py-1 md:px-3 md:py-2 rounded-full shadow-lg z-[9999] print:hidden backdrop-blur-sm flex items-center gap-2 border border-gray-700">
              <div className="flex items-center gap-1 md:gap-2">
                  <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${connectionStatus === 'success' ? 'bg-green-400 animate-pulse' : 'bg-red-50'}`}></div>
                  <span className="max-w-[150px] truncate">{debugInfo}</span>
              </div>
              {useMockData && <span className="bg-yellow-600 px-1 py-0.5 rounded text-[9px] font-bold">MOCK</span>}
              <button onClick={() => setDebugInfo('')} className="ml-1 hover:text-gray-300">✕</button>
          </div>
      );
  };

  const syncTreeSelection = (targetAttr, currentTreeData = treeData) => {
    if (Object.keys(currentTreeData).length === 0) return;
    setTimeout(() => {
        const newSelection = new Set();
        Object.values(currentTreeData).flat().forEach(i => {
            if (String(targetAttr) === '0' || String(targetAttr) === String(i.attr || '0')) {
                newSelection.add(String(i.sno || i.itemName));
                if (i.itemName) newSelection.add(i.itemName);
            }
        });
        setTreeSelection(newSelection);
    }, 0);
  };

  useEffect(() => { 
      if (Object.keys(treeData).length > 0) syncTreeSelection(String(reportAttr), treeData); 
  }, [reportAttr, treeData]);

  const getSummaryPrintColumns = ({ splitByVendor, isCivilCategory, isBuildingVendor }) => {
        const firstTitle = isCivilCategory ? '屬性' : '廠商';
        const roomTitle = (isCivilCategory || isBuildingVendor) ? '廳室' : '樓別';

        if (splitByVendor) {
            return [
                { key: 'sno', title: '項次', width: '7%' },
                { key: 'room', title: roomTitle, width: '10%' },
                { key: 'detail', title: '缺失項目細項', width: '22%' },
                { key: 'hcode', title: '戶號', width: '11%' },
                { key: 'customer', title: '客戶', width: '10%' },
                { key: 'date', title: '日期', width: '12%' },
                { key: 'status', title: '異常', width: '6%' },
                { key: 'note', title: '備註(缺失原因)', width: '22%' },
            ];
        }

        return [
            { key: 'vendor', title: firstTitle, width: '7%' },
            { key: 'sno', title: '項次', width: '7%' },
            { key: 'room', title: roomTitle, width: '10%' },
            { key: 'detail', title: '缺失項目細項', width: '19%' },
            { key: 'hcode', title: '戶號', width: '11%' },
            { key: 'customer', title: '客戶', width: '10%' },
            { key: 'date', title: '日期', width: '12%' },
            { key: 'status', title: '異常', width: '6%' },
            { key: 'note', title: '備註(缺失原因)', width: '18%' },
        ];
    };

    const getVendorPageList = () => {
        const ghsitemh = findTableSmart(dbData, ['ghsitemh', 'GHSITEMH'], []);
        const targetCat = ghsitemh.find(c => String(getValue(c, ['Hcode', 'hcode', 'Sno', 'sno', 'SNO', 'ID', 'id'])) === String(reportConfig.categorySno));
        const catName = targetCat ? getValue(targetCat, ['Name', 'name', 'NAME', 'CName']) || '' : '';

        const isCivilCategory = catName ? (catName.includes('土.水') || catName.includes('土水')) : String(reportConfig.categorySno) === '1';
        const isBuildingVendor = catName ? (catName.includes('大樓') && catName.includes('廠商')) : String(reportConfig.categorySno) === '2';
        const isForceCivil = reportAttr === '土建' || reportAttr === '水電';

        const uniqueRows = reportRows.filter((row, index, self) =>
            index === self.findIndex((t) => (
                String(t.sno) === String(row.sno) &&
                String(t.hcode).trim() === String(row.hcode).trim() &&
                String(t.itemName).trim() === String(row.itemName).trim() &&
                String(t.date).split('T')[0] === String(row.date).split('T')[0] &&
                String(t.note).trim() === String(row.note).trim()
            ))
        );

        const dateFilteredRows = uniqueRows.filter(row => {
            if (!reportConfig.startDate && !reportConfig.endDate) return true;
            const rowDate = row.date ? row.date.split('T')[0] : '';
            if (reportConfig.startDate && rowDate < reportConfig.startDate) return false;
            if (reportConfig.endDate && rowDate > reportConfig.endDate) return false;
            return true;
        });

        const groupedByVendor = dateFilteredRows.reduce((acc, row) => {
            const attr = getItemSegment2(row.itemName) || (isCivilCategory || isForceCivil ? '土建' : '99');
            if (!acc[attr]) acc[attr] = [];
            acc[attr].push(row);
            return acc;
        }, {});

        const sortedVendorIds = Object.keys(groupedByVendor).sort((a, b) => {
            const special = { '土建': -2, '水電': -1 };
            if (special[a] !== undefined || special[b] !== undefined) {
                return (special[a] ?? 999) - (special[b] ?? 999);
            }

            const aIsNum = /^\d+$/.test(String(a));
            const bIsNum = /^\d+$/.test(String(b));

            if (aIsNum && bIsNum) return Number(a) - Number(b);
            if (aIsNum && !bIsNum) return -1;
            if (!aIsNum && bIsNum) return 1;

            return String(a).localeCompare(String(b), 'zh-Hant');
        });

        const out = [];

        sortedVendorIds.forEach(vendorId => {
            if (reportAttr !== '0' && String(vendorId) !== String(reportAttr)) return;

            const vendorItems = groupedByVendor[vendorId] || [];
            const vendorName = (vendorId === '土建' || vendorId === '水電')
                ? vendorId
                : getContractorName(vendorId, isBuildingVendor ? 'BUILDING_VENDOR' : 'TOWNHOUSE_VENDOR');

            const visibleItems = vendorItems.filter(item => {
                if (!treeSelection || treeSelection.size === 0) return true;

                let cleanName = item.itemName;

                if (cleanName.startsWith(vendorName + '-')) {
                    cleanName = cleanName.substring(vendorName.length + 1);
                } else if (cleanName.startsWith(vendorName + '－')) {
                    cleanName = cleanName.substring(vendorName.length + 1);
                }

                return treeSelection.has(String(item.sno)) || treeSelection.has(cleanName);
            });

            if (visibleItems.length === 0) return;

            out.push({ vendorId, vendorName });
        });

        return out;
    };

    const renderGroupedTableRows = (onlyVendorId = null) => {
        const ghsitemh = findTableSmart(dbData, ['ghsitemh', 'GHSITEMH'], []);
        const targetCat = ghsitemh.find(c => String(getValue(c, ['Hcode', 'hcode', 'Sno', 'sno', 'SNO', 'ID', 'id'])) === String(reportConfig.categorySno));
        const catName = targetCat ? getValue(targetCat, ['Name', 'name', 'NAME', 'CName']) || '' : '';

        const isCivilCategory = catName ? (catName.includes('土.水') || catName.includes('土水')) : String(reportConfig.categorySno) === '1';
        const isBuildingVendor = catName ? (catName.includes('大樓') && catName.includes('廠商')) : String(reportConfig.categorySno) === '2';
        const isForceCivil = reportAttr === '土建' || reportAttr === '水電';

        const hideVendorColumn = splitByVendor && onlyVendorId !== null;

        const totalCols = getSummaryPrintColumns({ splitByVendor: hideVendorColumn, isCivilCategory, isBuildingVendor }).length;
        const rowEffectiveCols = totalCols - (hideVendorColumn ? 0 : 1);
        const subtotalLabelColSpan = rowEffectiveCols - 2;

        const uniqueRows = reportRows.filter((row, index, self) =>
            index === self.findIndex((t) => (
                String(t.sno) === String(row.sno) &&
                String(t.hcode).trim() === String(row.hcode).trim() &&
                String(t.itemName).trim() === String(row.itemName).trim() &&
                String(t.date).split('T')[0] === String(row.date).split('T')[0] &&
                String(t.note).trim() === String(row.note).trim()
            ))
        );

        const dateFilteredRows = uniqueRows.filter(row => {
            if (!reportConfig.startDate && !reportConfig.endDate) return true;
            const rowDate = row.date ? row.date.split('T')[0] : '';
            if (reportConfig.startDate && rowDate < reportConfig.startDate) return false;
            if (reportConfig.endDate && rowDate > reportConfig.endDate) return false;
            return true;
        });

        const groupedByVendor = dateFilteredRows.reduce((acc, row) => {
            const attr = getItemSegment2(row.itemName) || (isCivilCategory || isForceCivil ? '土建' : '99');
            if (!acc[attr]) acc[attr] = [];
            acc[attr].push(row);
            return acc;
        }, {});

        let rows = [];

        const sortedVendorIds = Object.keys(groupedByVendor).sort((a, b) => {
            const special = { '土建': -2, '水電': -1 };
            if (special[a] !== undefined || special[b] !== undefined) {
                return (special[a] ?? 999) - (special[b] ?? 999);
            }

            const aIsNum = /^\d+$/.test(String(a));
            const bIsNum = /^\d+$/.test(String(b));

            if (aIsNum && bIsNum) return Number(a) - Number(b);
            if (aIsNum && !bIsNum) return -1;
            if (!aIsNum && bIsNum) return 1;

            return String(a).localeCompare(String(b), 'zh-Hant');
        });

        sortedVendorIds.forEach(vendorId => {
            if (reportAttr !== '0' && String(vendorId) !== String(reportAttr)) return;
            if (onlyVendorId !== null && String(vendorId) !== String(onlyVendorId)) return;

            const vendorItems = groupedByVendor[vendorId] || [];
            const vendorName = (vendorId === '土建' || vendorId === '水電') ? vendorId : getContractorName(vendorId, isBuildingVendor ? 'BUILDING_VENDOR' : 'TOWNHOUSE_VENDOR');

            const visibleItems = vendorItems.filter(item => {
                if (!treeSelection || treeSelection.size === 0) return true;
                let cleanName = item.itemName;

                if (cleanName.startsWith(vendorName + '-')) {
                    cleanName = cleanName.substring(vendorName.length + 1);
                } else if (cleanName.startsWith(vendorName + '－')) {
                    cleanName = cleanName.substring(vendorName.length + 1);
                }

                return treeSelection.has(String(item.sno)) || treeSelection.has(cleanName);
            });

            if (visibleItems.length === 0) return;

            const groupedByItem = visibleItems.reduce((acc, row) => {
                const raw = row.itemName || '未命名項目';

                let displayName = raw;
                let displayRoom = '';

                if (isCivilCategory || isForceCivil) {
                    const parts = String(raw).split('-');
                    displayRoom = parts[0] || '';
                    if (parts.length >= 3) displayName = parts.slice(2).join('-');
                } else if (isBuildingVendor) {
                    const parsed = parseVendorItemName(String(raw));
                    displayRoom = parsed.room || '';
                    displayName = parsed.detail || raw;
                } else {
                    const parts = String(raw).split('-');
                    displayRoom = parts[0] || '';
                    displayName = parts.length >= 2 ? parts.slice(1).join('-') : raw;
                }

                const key = String(row.sno) + '|' + displayName;
                if (!acc[key]) acc[key] = [];
                acc[key].push({ ...row, displayName, displayRoom });
                return acc;
            }, {});

            const vendorTotalRows = Object.values(groupedByItem).reduce((sum, list) => sum + list.length + 1, 0);
            let isVendorFirstRow = true;

            Object.entries(groupedByItem).forEach(([key, items]) => {
                if (!items || items.length === 0) return;

                items.sort((a, b) => String(a.hcode || '').localeCompare(String(b.hcode || ''), 'zh-Hant'));

                const firstItem = items[0];
                const sno = firstItem.sno || firstItem.Sno || '';
                const itemName = firstItem.displayName || firstItem.itemName || '';

                let floor = '';
                if (isCivilCategory || isBuildingVendor || isForceCivil) {
                    floor = firstItem.displayRoom || String(firstItem.itemName || '').split('-')[0] || '';
                } else {
                    if (String(firstItem.itemName || '').includes('1F')) floor = '1F';
                    else if (String(firstItem.itemName || '').includes('2F')) floor = '2F';
                    else if (String(firstItem.itemName || '').includes('3F')) floor = '3F';
                    else if (String(sno).startsWith('4')) floor = '4F';
                    else {
                        const s = String(sno);
                        if (s.startsWith('1')) floor = '1F';
                        else if (s.startsWith('2')) floor = '2F';
                        else if (s.startsWith('3')) floor = '3F';
                        else floor = getFloor(firstItem.hcode) || '';
                    }
                }

                const itemRowSpan = items.length;

                items.forEach((item, index) => {
                    const isItemFirstRow = index === 0;

                    rows.push(
                        <tr key={`${vendorId}-${key}-${index}`} className="h-10 break-inside-avoid">
                            {(!hideVendorColumn && isVendorFirstRow) && (
                                <td className="p-1 md:p-2 text-center align-middle border border-black font-bold text-[20px] bg-white" rowSpan={vendorTotalRows}>
                                  {formatVendorNameVertical(vendorName)}
                                </td>
                            )}

                            {isItemFirstRow && (
                                <>
                                    <td className="p-1 md:p-2 px-2 text-center align-middle border border-black text-base md:text-sm whitespace-nowrap" rowSpan={itemRowSpan}>{sno}</td>
                                    <td className="p-1 md:p-2 text-center align-middle border border-black whitespace-nowrap text-sm md:text-base" rowSpan={itemRowSpan}>{floor}</td>
                                    <td className="p-1 md:p-2 text-left align-middle border border-black font-bold whitespace-normal break-all text-base md:text-base" rowSpan={itemRowSpan}>{itemName}</td>
                                </>
                            )}

                            <td className="p-1 md:p-2 text-center border border-black text-sm md:text-base whitespace-nowrap">{item.hcode}</td>
                            <td className="p-1 md:p-2 text-center border border-black text-base md:text-base">{formatCustomerNameReport(item.customerName)}</td>
                            <td className="p-1 md:p-2 text-center border border-black text-sm md:text-sm whitespace-nowrap">{item.date}</td>
                            <td className="p-1 md:p-2 text-center border border-black text-red-600 font-bold whitespace-nowrap">V</td>
                            <td className="p-1 md:p-2 text-left border border-black text-red-600 font-bold whitespace-normal break-words text-xs md:text-base">{item.note}</td>
                        </tr>
                    );

                    isVendorFirstRow = false;
                });

                rows.push(
                    <tr key={`${vendorId}-${key}-subtotal`} className="h-8 break-inside-avoid">
                        <td colSpan={subtotalLabelColSpan} className="p-1 text-right font-bold text-blue-800 text-base pr-4 align-middle border border-black bg-white">小計 (戶)</td>
                        <td className="p-1 text-center font-bold text-blue-600 text-lg align-middle border border-black bg-white">{items.length}</td>
                        <td className="p-1 border border-black bg-white"></td>
                    </tr>
                );
            });
        });

        if (rows.length === 0) {
            return (
                <tr>
                    <td colSpan={totalCols} className="p-8 text-center text-gray-400">
                        無符合條件的缺失項目，請確認日期區間或勾選項目。
                    </td>
                </tr>
            );
        }

        return rows;
  };

  // ==========================================
  // Render Steps
  // ==========================================
  if (step === 0) {
      return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col">
                  <div className="bg-blue-600 p-8 text-white text-center flex flex-col items-center justify-center relative">
                      <div className="bg-white/10 p-4 rounded-full mb-4">
                          <Home className="w-12 h-12 text-white" />
                      </div>
                      <h1 className="text-2xl font-bold tracking-widest whitespace-nowrap">AHMShi房屋驗收管理系統</h1>
                      <span className="tracking-widest">簡單 • 標準 • 專業</span>
                      <p className="text-blue-200 text-sm mt-1">請登入以存取系統</p>
                      <button onClick={() => setShowDebug(!showDebug)} className="absolute top-4 right-4 p-2 bg-blue-700/50 rounded-full hover:bg-blue-700 text-xs text-white">
                          <Info className="w-4 h-4"/>
                      </button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div>
                          <label className="block text-gray-700 text-sm font-bold mb-2 flex items-center gap-2">
                              <User className="w-4 h-4 text-blue-600"/> 帳號 (Account)
                          </label>
                          <input 
                              type="text" 
                              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" 
                              placeholder="請輸入使用者帳號" 
                              value={loginAcc} 
                              onChange={e => setLoginAcc(e.target.value)} 
                          />
                      </div>
                      <div>
                          <label className="block text-gray-700 text-sm font-bold mb-2 flex items-center gap-2">
                              <Lock className="w-4 h-4 text-blue-600"/> 密碼 (Password)
                          </label>
                          <input 
                              type="password" 
                              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" 
                              placeholder="請輸入密碼" 
                              value={loginPwd} 
                              onChange={e => setLoginPwd(e.target.value)} 
                              onKeyDown={e => e.key === 'Enter' && handleLogin(loginAcc, loginPwd)} 
                          />
                      </div>
                      <button 
                          onClick={() => handleLogin(loginAcc, loginPwd)} 
                          disabled={loading} 
                          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                      >
                          {loading ? <Loader className="w-5 h-5 animate-spin"/> : <LogIn className="w-5 h-5"/>} 
                          登入系統
                      </button>
                  </div>
              </div>
              <DebugPanel />
              <ScrollToTop />
          </div>
      );
  }

  if (step === 1) {
      const ahmconth = findTableSmart(dbData, ['ahmconth', 'AHMCONTH', 'ahm_conth'], ['Hcode']);
      const ghsperson = findTableSmart(dbData, ['ghsperson', 'GHSPERSON'], ['Pcode']);
      let ghsitemh = findTableSmart(dbData, ['ghsitemh', 'GHSITEMH'], []); 
      
      if (ghsitemh.length === 0) {
          ghsitemh = findTableSmart(dbData, [], ['Name']);
      }
      const filteredAhmconth = ahmconth.filter(h => {
          const hWorkSno = String(getValue(h, ['WorkSno', 'worksno', 'WORKSNO', 'work_sno', 'Work_Sno']) || '').trim();
          const hWcode = String(getValue(h, ['Wcode', 'wcode', 'WCODE']) || '').trim();
          const target = String(headerData.wcode || '').trim();
          if (!target) return true;
          return hWcode === target || hWorkSno === target;
      });

      const finalAhmconth = (headerData.skipDelivered ?? true)
          ? filteredAhmconth.filter(h => {
              const hcode = String(getValue(h, ['Hcode', 'hcode', 'HCODE']) || '').trim().toUpperCase();
              return !deliveredHcodeSet.has(hcode);
          })
          : filteredAhmconth;

      let unitPlaceholder = "請先選擇建案";
      if (headerData.wcode) {
          if (loading) {
              unitPlaceholder = "查詢戶別資料中，請稍候!!"; 
          } else if (finalAhmconth.length > 0) {
              unitPlaceholder = `請選擇戶別 (共 ${finalAhmconth.length} 戶)`; 
          } else {
              unitPlaceholder = "查無該建案戶別資料，請確認!!";
          }
      }

      const countOptions = headerData.inspectType === '客驗' 
          ? [{ val: 1, label: '初驗' }, { val: 2, label: '複驗' }] 
          : [{ val: 1, label: '第1次' }, { val: 2, label: '第2次' }, { val: 3, label: '第3次' }];

      const selectedCat = ghsitemh.find(c => String(getValue(c, ['Hcode', 'hcode', 'Sno', 'sno', 'SNO', 'ID', 'id'])) === String(reportConfig.categorySno));
      const activeCatName = selectedCat ? getValue(selectedCat, ['Name', 'name', 'NAME', 'CName']) || '' : '';
      const isCivilCategory = activeCatName ? (activeCatName.includes('土.水') || activeCatName.includes('土水')) : String(reportConfig.categorySno) === '1';
      const isBuildingVendor = activeCatName ? (activeCatName.includes('大樓') && activeCatName.includes('廠商')) : String(reportConfig.categorySno) === '2';

      return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
              {/* 後台登入框 */}
              {showAdminAuth && (
                  <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 animate-in fade-in">
                      <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-2xl flex flex-col items-center">
                          <Settings className="w-12 h-12 text-slate-700 mb-3"/>
                          <h3 className="text-xl font-bold text-slate-800 mb-4">系統管理員身分驗證</h3>
                          <input 
                              type="password"
                              className="w-full border-2 border-slate-300 p-3 rounded mb-4 text-center text-lg tracking-widest focus:border-blue-500 focus:outline-none"
                              placeholder="請輸入 ROOT 密碼"
                              value={adminPwdInput}
                              onChange={(e) => setAdminPwdInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && verifyAdminPassword()}
                              autoFocus
                          />
                          <div className="flex gap-3 w-full">
                              <button onClick={() => setShowAdminAuth(false)} className="flex-1 py-2 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300 transition">取消</button>
                              <button onClick={verifyAdminPassword} className="flex-1 py-2 bg-slate-800 text-white font-bold rounded hover:bg-slate-900 transition shadow-lg">確認登入</button>
                          </div>
                      </div>
                  </div>
              )}

              <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden flex flex-col h-[90vh]">
                  {/* ★ 在這塊 Header 加上右鍵觸發事件 */}
                  <div 
                      className="bg-blue-600 p-6 text-white text-center flex-shrink-0 relative cursor-context-menu"
                      onContextMenu={handleAdminContextMenu}
                      title="右鍵點擊進入後台設定"
                  >
                      <div className="flex items-center justify-center gap-4">
                          <Home className="w-12 h-12 text-white/90 flex-shrink-0" />
                          <div className="flex flex-col items-start text-left">
                              <div className="text-2xl md:text-3xl font-extrabold tracking-widest leading-none mb-1">AHMShi</div>
                              <div className="text-lg md:text-xl font-bold tracking-wide leading-none">房屋驗收管理系統</div>
                          </div>
                      </div>
                      <div className="mt-3 w-full text-center text-blue-100 text-sm font-medium tracking-widest">
                          簡單 • 標準 • 專業
                      </div>
                      <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-blue-700/50 px-2 py-1 rounded text-blue-50 text-xs shadow-sm border border-blue-500/30">
                          <User className="w-3 h-3"/>
                          <span className="font-bold">{user.name}</span>
                          <div className="h-3 w-[1px] bg-blue-400 mx-1"></div>
                          <button onClick={handleLogout} className="underline hover:text-white font-bold z-10 relative">返回系統清單</button>
                      </div>
                  </div>
                  
                  <div className="flex border-b flex-shrink-0">
                      {['new', 'history', 'report'].map(mode => (
                          <button 
                              key={mode} 
                              onClick={() => { setHomeMode(mode); setShowReportPreview(false); }} 
                              className={`flex-1 py-3 font-bold text-sm capitalize ${homeMode===mode ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-500'}`}
                          >
                              {mode === 'new' ? '新增查驗' : mode === 'history' ? '驗屋紀錄查詢' : '缺失彙總查詢'}
                          </button>
                      ))}
                  </div>

                  <div className="p-6 overflow-y-auto flex-1">
                      {homeMode === 'new' && (
                          <div className="space-y-4">
                              {isDataLoadedFromStorage && ( 
                                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative mb-4 flex items-center gap-2 animate-pulse">
                                      <RotateCcw className="w-5 h-5" />
                                      <span className="block sm:inline font-bold">已自動還原您上次的作業階段。</span>
                                  </div> 
                              )}
                              
                              <div>
                                  <label className="block text-gray-700 text-sm font-bold mb-2">選擇建案</label>
                                  <div className="relative">
                                      <select 
                                          className="w-full p-3 border rounded-lg appearance-none bg-gray-50" 
                                          value={headerData.wcode} 
                                          onChange={(e) => { 
                                              const wSno = e.target.value; 
                                              const w = allowedWorks.find(i => String(getValue(i, ['Sno', 'id', 'sno'])) === String(wSno)); 
                                              if (wSno) fetchData(wSno, headerData.skipDelivered ?? true); 
                                              setReportConfig(prev => ({ ...prev, wcode: wSno })); 
                                              setHeaderData(prev => ({ 
                                                  ...prev, wcode: wSno, wname: w ? getValue(w, ['Wname', 'Name', 'wname']) : '', 
                                                  hcode: '', customerName: '' 
                                              })); 
                                          }}
                                      >
                                          <option value="">請選擇建案...</option>
                                          {allowedWorks.map(w => { 
                                              const sno = getValue(w, ['Sno', 'id', 'sno', 'SNO']);
                                              const code = getValue(w, ['Wcode', 'Workcode', 'wcode']);
                                              const name = getValue(w, ['Wname', 'Name', 'wname']); 
                                              return <option key={sno} value={sno}>{name} ({code})</option>; 
                                          })}
                                      </select>
                                      <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none"/>
                                  </div>
                              </div>
                              
                              <div>
                                  <div className="flex items-center justify-between mb-2">
                                      <label className="block text-gray-700 text-sm font-bold">選擇戶別</label>
                                      <label className="flex items-center gap-2 text-sm font-bold text-gray-600 select-none">
                                          <input
                                              type="checkbox"
                                              className="accent-blue-600"
                                              checked={headerData.skipDelivered ?? true}
                                              onChange={(e) => {
                                                  setHeaderData(prev => ({
                                                      ...prev,
                                                      skipDelivered: e.target.checked,
                                                      hcode: '',
                                                      customerName: ''
                                                  }));
                                              }}
                                          />
                                          已交屋者略
                                      </label>
                                  </div>
                                  <div className="relative">
                                      <select 
                                          className="w-full p-3 border rounded-lg appearance-none bg-gray-50" 
                                          value={headerData.hcode} 
                                          disabled={!headerData.wcode} 
                                          onChange={(e) => { 
                                              const h = finalAhmconth.find(i => getValue(i, ['Hcode', 'hcode']) === e.target.value); 
                                              const cusName = h ? (getValue(h, ['CustomerName', 'customer_name', 'Name', 'name']) || '') : ''; 
                                              setHeaderData(prev => ({ ...prev, hcode: e.target.value, customerName: cusName })); 
                                          }}
                                      >
                                          <option value="">{unitPlaceholder}</option>
                                          {finalAhmconth.map(h => { 
                                              const hcode = getValue(h, ['Hcode', 'hcode']);
                                              const cusName = getValue(h, ['CustomerName', 'customer_name']) || getValue(h, ['Name', 'name']); 
                                              return <option key={hcode} value={hcode}>{hcode} ({cusName})</option>; 
                                          })}
                                      </select>
                                      <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none"/>
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="block text-gray-700 text-sm font-bold mb-2">驗屋分類</label>
                                  <div className="relative">
                                      <select 
                                          className="w-full p-3 border rounded-lg appearance-none bg-gray-50" 
                                          value={String(headerData.categorySno)} 
                                          onChange={(e) => setHeaderData(prev => ({ ...prev, categorySno: e.target.value }))}
                                      >
                                          <option value="">請選擇驗屋分類...</option>
                                          {ghsitemh.map((cat, idx) => { 
                                              const catSno = getValue(cat, ['Hcode', 'hcode', 'Sno', 'sno', 'SNO', 'ID', 'id']);
                                              const catName = getValue(cat, ['Name', 'name', 'NAME', 'CName']);
                                              const optionValue = (catSno !== undefined && catSno !== null) ? String(catSno) : (catName || ""); 
                                              return <option key={idx} value={optionValue}>{catName}</option>; 
                                          })}
                                      </select>
                                      <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none"/>
                                  </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-gray-700 text-sm font-bold mb-2">陪驗人員</label>
                                      <select 
                                          className="w-full p-3 border rounded-lg bg-gray-50" 
                                          value={headerData.inspector} 
                                          onChange={(e) => setHeaderData(prev => ({ ...prev, inspector: e.target.value }))}
                                      >
                                          <option value="">選擇人員...</option>
                                          {ghsperson.map(p => { 
                                              const pname = getValue(p, ['Pname', 'Name']); 
                                              return <option key={pname} value={pname}>{pname}</option>; 
                                          })}
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-gray-700 text-sm font-bold mb-2">驗屋日期</label>
                                      <input 
                                          type="date" 
                                          className="w-full p-3 border rounded-lg bg-gray-50" 
                                          value={headerData.inspectDate} 
                                          onChange={(e) => setHeaderData(prev => ({ ...prev, inspectDate: e.target.value }))} 
                                      />
                                  </div>
                              </div>
                              
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                  <label className="block text-gray-700 text-sm font-bold mb-2">驗屋設定</label>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div>
                                          <select 
                                              className="w-full p-3 border rounded-lg bg-white" 
                                              value={headerData.inspectType} 
                                              onChange={(e) => setHeaderData(prev => ({ ...prev, inspectType: e.target.value, inspectCount: 1 }))}
                                          >
                                              <option value="客驗">客驗</option>
                                              <option value="自驗">自驗</option>
                                          </select>
                                      </div>
                                      <div>
                                          <select 
                                              className="w-full p-3 border rounded-lg bg-white" 
                                              value={headerData.inspectCount} 
                                              onChange={(e) => setHeaderData(prev => ({ ...prev, inspectCount: parseInt(e.target.value) }))}
                                          >
                                              {countOptions.map(opt => ( 
                                                  <option key={opt.val} value={opt.val}>{opt.label}</option> 
                                              ))}
                                          </select>
                                      </div>
                                  </div>
                              </div>
                              
                              <button 
                                  onClick={handleStartInspection} 
                                  disabled={loading} 
                                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 mt-4 flex items-center justify-center gap-2"
                              >
                                  {loading ? <Loader className="animate-spin"/> : <FileText className="w-5 h-5"/>} 
                                  開始進行驗屋作業
                              </button>
                          </div>
                      )}
                      
                       {homeMode === 'history' && (
                          <div className="space-y-4">
                              <form className="space-y-2" onSubmit={handleSearchHistory}>
                                  <select 
                                      className="w-full p-3 border rounded-lg bg-gray-50" 
                                      value={historyProject} 
                                      onChange={(e) => setHistoryProject(e.target.value)}
                                  >
                                      <option value="">全部建案 (依權限)</option>
                                      {allowedWorks.map(w => { 
                                          const sno = getValue(w, ['Sno', 'id', 'sno']);
                                          const name = getValue(w, ['Wname', 'Name']); 
                                          return <option key={sno} value={sno}>{name}</option>; 
                                      })}
                                  </select>
                                  <div className="flex gap-2">
                                      <input 
                                          type="text" 
                                          placeholder="輸入戶號或姓名..." 
                                          className="flex-1 p-3 border rounded-lg" 
                                          value={searchKeyword} 
                                          onChange={(e) => setSearchKeyword(e.target.value)}
                                      />
                                      <button 
                                          type="submit" 
                                          className="bg-gray-800 text-white p-3 rounded-lg"
                                      >
                                          {loading ? <Loader className="w-5 h-5 animate-spin"/> : <Search className="w-5 h-5"/>}
                                      </button>
                                  </div>
                              </form>
                              
                              <div className="space-y-3">
                                  {searchHistoryResults.length === 0 ? ( 
                                      <div className="text-center text-gray-400 py-8">無搜尋結果</div> 
                                  ) : (
                                      searchHistoryResults.map(res => (
                                        <div 
                                            key={res.id} 
                                            onClick={() => handleViewHistory(res)} 
                                            className="bg-white p-4 rounded-lg shadow-sm border border-gray-300 border-l-4 border-l-blue-600 hover:bg-blue-50 transition-colors cursor-pointer group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-gray-800 text-lg group-hover:text-blue-700">{res.wname}</h3>
                                                <span className="text-sm text-gray-500">{res.inspectDate}</span>
                                            </div>
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl font-black text-blue-800">{res.hcode}</span>
                                                    <span className="text-base font-bold text-gray-700">{res.customerName}</span>
                                                </div>
                                                <span className={`px-2 py-0.5 text-xs rounded border ${res.inspectType==='客驗'?'bg-blue-100 text-blue-700 border-blue-200':'bg-purple-100 text-purple-700 border-purple-200'}`}>
                                                    {res.inspectType}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-2">
                                                <span className="text-xs text-gray-400">單號: {res.serialNo || res.id}</span>
                                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500"/>
                                            </div>
                                        </div>
                                      ))
                                  )}
                              </div>
                          </div>
                      )}

                      {/* ★★★ 缺失彙總查詢介面 ★★★ */}
                      {homeMode === 'report' && (
                          <div className="space-y-4">
                              <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm border border-blue-100">
                                  <span className="font-bold block mb-1">【操作說明】</span>
                                  請選擇欲查詢之建案與驗屋分類，設定日期區間後，即可直接產生工程缺失彙總表。
                              </div>
                              
                              <div>
                                  <label className="block text-gray-700 text-sm font-bold mb-2">選擇建案 (必選)</label>
                                  <div className="relative">
                                      <select 
                                          className="w-full p-3 border rounded-lg appearance-none bg-gray-50" 
                                          value={reportConfig.wcode} 
                                          onChange={(e) => { 
                                              setReportConfig(prev => ({ ...prev, wcode: e.target.value })); 
                                              setShowReportPreview(false);
                                          }}
                                      >
                                          <option value="">請選擇建案...</option>
                                          {allowedWorks.map(w => { 
                                              const sno = getValue(w, ['Sno', 'id', 'sno', 'SNO']);
                                              const code = getValue(w, ['Wcode', 'Workcode', 'wcode']);
                                              const name = getValue(w, ['Wname', 'Name', 'wname']); 
                                              return <option key={sno} value={sno}>{name} ({code})</option>; 
                                          })}
                                      </select>
                                      <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none"/>
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="block text-gray-700 text-sm font-bold mb-2">驗屋分類 (必選)</label>
                                  <div className="relative">
                                      <select 
                                          className="w-full p-3 border rounded-lg appearance-none bg-gray-50" 
                                          value={String(reportConfig.categorySno)} 
                                          onChange={(e) => {
                                              setReportConfig(prev => ({ ...prev, categorySno: e.target.value }));
                                              setReportAttr('0'); 
                                              setShowReportPreview(false);
                                          }}
                                      >
                                          <option value="">請選擇驗屋分類...</option>
                                          {ghsitemh.map((cat, idx) => { 
                                              const catSno = getValue(cat, ['Hcode', 'hcode', 'Sno', 'sno', 'SNO', 'ID', 'id']);
                                              const catName = getValue(cat, ['Name', 'name', 'NAME', 'CName']);
                                              const optionValue = (catSno !== undefined && catSno !== null) ? String(catSno) : (catName || ""); 
                                              return <option key={idx} value={optionValue}>{catName}</option>; 
                                          })}
                                      </select>
                                      <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none"/>
                                  </div>
                              </div>

                              <div>
                                  <label className="block text-gray-700 text-sm font-bold mb-2">屬性/廠商選取</label>
                                  <div className="relative">
                                      <select 
                                          className="w-full p-3 border rounded-lg appearance-none bg-gray-50 disabled:bg-gray-200" 
                                          value={reportAttr} 
                                          onChange={(e) => setReportAttr(e.target.value)}
                                          disabled={!reportConfig.categorySno}
                                      >
                                          <option value="0">全部顯示</option>
                                          {isCivilCategory ? (
                                              <>
                                                  <option value="土建">土建</option>
                                                  <option value="水電">水電</option>
                                              </>
                                          ) : isBuildingVendor ? (
                                              Object.entries(BUILDING_CONTRACTORS).map(([key, name]) => ( 
                                                  <option key={key} value={key}>{name}</option> 
                                              ))
                                          ) : (
                                              Object.entries(CONTRACTORS).map(([key, name]) => ( 
                                                  <option key={key} value={key}>{name}</option> 
                                              ))
                                          )}
                                      </select>
                                      <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none"/>
                                  </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-gray-700 text-sm font-bold mb-2">起始日期</label>
                                      <input 
                                          type="date" 
                                          className="w-full p-3 border rounded-lg bg-gray-50" 
                                          value={reportConfig.startDate} 
                                          onChange={(e) => {
                                              setReportConfig(prev => ({ ...prev, startDate: e.target.value }));
                                              setShowReportPreview(false);
                                          }} 
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-gray-700 text-sm font-bold mb-2">結束日期</label>
                                      <input 
                                          type="date" 
                                          className="w-full p-3 border rounded-lg bg-gray-50" 
                                          value={reportConfig.endDate} 
                                          onChange={(e) => {
                                              setReportConfig(prev => ({ ...prev, endDate: e.target.value }));
                                              setShowReportPreview(false);
                                          }} 
                                      />
                                  </div>
                              </div>
                              
                              <button 
                                  onClick={(e) => {
                                      if (!reportConfig.wcode || !reportConfig.categorySno) {
                                          window.alert("請先選擇建案與驗屋分類！");
                                          return;
                                      }
                                      const w = allowedWorks.find(i => String(getValue(i, ['Sno', 'id', 'sno'])) === String(reportConfig.wcode));
                                      setHeaderData(prev => ({
                                          ...prev,
                                          wcode: reportConfig.wcode,
                                          wname: w ? getValue(w, ['Wname', 'Name', 'wname']) : '',
                                          categorySno: reportConfig.categorySno
                                      }));
                                      setIsFromInspection(false);
                                      handleGenerateReport(e);
                                  }} 
                                  disabled={loading} 
                                  className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 mt-4 flex items-center justify-center gap-2 transition-colors"
                              >
                                  {loading ? <Loader className="animate-spin w-5 h-5"/> : <Search className="w-5 h-5"/>} 
                                  立即查詢
                              </button>

                              {showReportPreview && (
                                  <div className="mt-6 border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm animate-in fade-in duration-300">
                                      <div className="bg-slate-800 text-white p-3 flex justify-between items-center">
                                          <span className="font-bold flex items-center gap-2">
                                              <List className="w-4 h-4" /> 查詢結果
                                          </span>
                                          <button
                                              onClick={() => setStep(5)}
                                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-bold transition-colors shadow-sm"
                                              disabled={loading || reportRows.length === 0}
                                          >
                                              開啟詳細報表頁
                                          </button>
                                      </div>
                                      <div className="overflow-x-auto max-h-[400px]">
                                          {loading ? (
                                              <div className="py-12 text-center text-gray-500 flex flex-col items-center">
                                                  <Loader className="w-8 h-8 animate-spin mb-2 text-blue-500" />
                                                  查詢中，請稍候...
                                              </div>
                                          ) : (
                                              <table className="w-full min-w-[700px] border-collapse text-sm text-center">
                                                  <thead className="sticky top-0 bg-gray-100 z-10 shadow-sm">
                                                      <tr>
                                                          <th className="border border-gray-200 p-2 font-bold text-gray-700 whitespace-nowrap">{isCivilCategory ? '屬性' : '廠商'}</th>
                                                          <th className="border border-gray-200 p-2 font-bold text-gray-700 whitespace-nowrap">序號</th>
                                                          <th className="border border-gray-200 p-2 font-bold text-gray-700 whitespace-nowrap">{(isCivilCategory || isBuildingVendor) ? '廳室' : '樓別'}</th>
                                                          <th className="border border-gray-200 p-2 font-bold text-gray-700 whitespace-nowrap">細項名稱</th>
                                                          <th className="border border-gray-200 p-2 font-bold text-gray-700 whitespace-nowrap">戶號</th>
                                                          <th className="border border-gray-200 p-2 font-bold text-gray-700 whitespace-nowrap">客戶</th>
                                                          <th className="border border-gray-200 p-2 font-bold text-gray-700 whitespace-nowrap">日期</th>
                                                          <th className="border border-gray-200 p-2 font-bold text-gray-700 whitespace-nowrap">異常</th>
                                                          <th className="border border-gray-200 p-2 font-bold text-gray-700 text-left">缺失原因</th>
                                                      </tr>
                                                  </thead>
                                                  <tbody>
                                                      {renderPreviewTableRows()}
                                                  </tbody>
                                              </table>
                                          )}
                                      </div>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
              <ScrollToTop />
          </div>
      );
  }

  // ★★★ Step 6: 後台管理介面 ★★★
if (step === 6) {
    const activeCatItems = adminItems
        .filter(item => String(item.Sno) === String(selectedAdminCat))
        .sort((a, b) => Number(a.Ino) - Number(b.Ino));

    return (
        <>
            <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
                <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0 shadow-md">
                    <div className="flex items-center gap-3">
                        <Settings className="w-6 h-6 text-blue-400" />
                        <h1 className="text-xl font-bold tracking-wider">AHMShi 參數設定</h1>
                        <span className="bg-blue-900 text-blue-200 text-xs px-2 py-0.5 rounded font-mono border border-blue-700">
                            ROOT ADMIN
                        </span>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleSaveAdminData}
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-bold shadow transition flex items-center gap-2 disabled:opacity-60"
                        >
                            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            儲存設定
                        </button>

                        <button
                            onClick={() => {
                                if (window.confirm("確定要離開後台設定嗎？")) setStep(1);
                            }}
                            className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded font-bold transition flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            返回首頁
                        </button>
                    </div>
                </div>

                <div className="p-4 md:p-6 border-b border-slate-200 bg-white shadow-sm">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setAdminTab('inspection')}
                                className={`px-4 py-2 rounded-lg font-bold transition ${
                                    adminTab === 'inspection'
                                        ? 'bg-blue-600 text-white shadow'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                驗屋資料設定
                            </button>

                            <button
                                onClick={() => setAdminTab('persons')}
                                className={`px-4 py-2 rounded-lg font-bold transition ${
                                    adminTab === 'persons'
                                        ? 'bg-blue-600 text-white shadow'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                陪驗人員設定
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden p-4 md:p-6">
                    <div className="max-w-7xl mx-auto h-full">

                        {adminTab === 'inspection' && (
                            <div className="h-full flex flex-col xl:flex-row overflow-hidden gap-4">

                                <div className="xl:w-1/3 max-w-sm bg-white border border-slate-300 rounded-lg shadow-sm flex flex-col overflow-hidden">
                                    <div className="bg-slate-200 p-3 font-bold text-slate-800 border-b border-slate-300 flex justify-between items-center">
                                        <span>驗屋類型</span>

                                        <button
                                            onClick={() => {
                                                let maxSno = 0;
                                                adminCategories.forEach(cat => {
                                                    const snoVal = Number(getValue(cat, ['Hcode', 'hcode', 'Sno', 'sno', 'SNO', 'ID', 'id']));
                                                    if (!isNaN(snoVal) && snoVal > maxSno) maxSno = snoVal;
                                                });
                                                const nextSno = maxSno + 1;
                                                const newCat = { Sno: nextSno, Hcode: nextSno, Name: String(nextSno) };
                                                setAdminCategories([...adminCategories, newCat]);
                                                setSelectedAdminCat(String(nextSno));
                                            }}
                                            className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1 shadow-sm transition"
                                        >
                                            <PlusCircle className="w-3 h-3" />
                                            新增
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                                                <tr>
                                                    <th className="p-2 border-b text-center text-slate-500 w-12">編號</th>
                                                    <th className="p-2 border-b text-left text-slate-500">類型名稱</th>
                                                    <th className="p-2 border-b text-center text-slate-500 w-10">刪</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {adminCategories.map((cat, idx) => {
                                                    const sno = getValue(cat, ['Hcode', 'hcode', 'Sno', 'sno', 'SNO', 'ID', 'id']);
                                                    const name = getValue(cat, ['Name', 'name', 'NAME', 'CName']);
                                                    const isSelected = String(sno) === String(selectedAdminCat);

                                                    return (
                                                        <tr
                                                            key={idx}
                                                            onClick={() => setSelectedAdminCat(String(sno))}
                                                            className={`cursor-pointer hover:bg-blue-50 transition-colors ${
                                                                isSelected
                                                                    ? 'bg-blue-100 border-l-4 border-l-blue-500'
                                                                    : 'border-l-4 border-l-transparent'
                                                            } border-b border-slate-100`}
                                                        >
                                                            <td className="p-2 text-center text-slate-500 align-middle">
                                                                {sno}
                                                            </td>

                                                            <td className="p-2 font-bold align-middle">
                                                                <input
                                                                    type="text"
                                                                    value={name || ''}
                                                                    onChange={(e) => {
                                                                        const newCats = [...adminCategories];
                                                                        if (newCats[idx].Name !== undefined) newCats[idx].Name = e.target.value;
                                                                        else if (newCats[idx].name !== undefined) newCats[idx].name = e.target.value;
                                                                        else if (newCats[idx].NAME !== undefined) newCats[idx].NAME = e.target.value;
                                                                        else if (newCats[idx].CName !== undefined) newCats[idx].CName = e.target.value;
                                                                        else newCats[idx].Name = e.target.value;
                                                                        setAdminCategories(newCats);
                                                                    }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className={`w-full bg-transparent focus:bg-white border border-transparent focus:border-blue-300 rounded focus:outline-none px-1 py-1 ${
                                                                        isSelected ? 'text-blue-800' : 'text-slate-700'
                                                                    }`}
                                                                />
                                                            </td>

                                                            <td className="p-2 text-center align-middle">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (!window.confirm('確定要刪除此類型嗎？對應細項也會一併刪除。')) return;

                                                                        const deletingSno = String(sno);
                                                                        const remainCats = adminCategories.filter((_, i) => i !== idx);
                                                                        const remainItems = adminItems.filter(item => String(item.Sno) !== deletingSno);

                                                                        setAdminCategories(remainCats);
                                                                        setAdminItems(remainItems);

                                                                        if (String(selectedAdminCat) === deletingSno) {
                                                                            if (remainCats.length > 0) {
                                                                                const firstRemain = getValue(remainCats[0], ['Hcode', 'hcode', 'Sno', 'sno', 'SNO', 'ID', 'id']);
                                                                                setSelectedAdminCat(String(firstRemain));
                                                                            } else {
                                                                                setSelectedAdminCat(null);
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="text-red-400 hover:text-red-600 p-1"
                                                                    title="刪除類型"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="flex-1 bg-white border border-slate-300 rounded-lg shadow-sm flex flex-col overflow-hidden">
                                    <div className="bg-slate-200 p-3 font-bold text-slate-800 border-b border-slate-300 flex justify-between items-center">
                                        <span>驗屋細項</span>

                                        <button
                                            onClick={() => {
                                                if (!selectedAdminCat) return alert('請先選擇左側類型');

                                                const globalMaxIno = adminItems.length > 0
                                                    ? Math.max(...adminItems.map(i => Number(i.Ino) || 0))
                                                    : 1000;

                                                const newIno = Math.max(globalMaxIno + 1, 1001);

                                                const newItem = {
                                                    originalObj: {},
                                                    Sno: selectedAdminCat,
                                                    Ino: newIno,
                                                    Sel: 1,
                                                    Room: '',
                                                    Vendor: '',
                                                    DetailName: ''
                                                };

                                                setAdminItems([...adminItems, newItem]);
                                            }}
                                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm flex items-center gap-1 shadow-sm"
                                        >
                                            <PlusCircle className="w-4 h-4" />
                                            新增細項
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-auto">
                                        <table className="w-full text-sm border-collapse">
                                            <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                                                <tr>
                                                    <th className="p-3 border-b border-r border-slate-200 text-center text-slate-700 w-16">序</th>
                                                    <th className="p-3 border-b border-r border-slate-200 text-left text-slate-700 w-40">廳室/樓別</th>
                                                    <th className="p-3 border-b border-r border-slate-200 text-left text-slate-700 w-40">廠商/土電</th>
                                                    <th className="p-3 border-b border-r border-slate-200 text-left text-slate-700">細項名稱</th>
                                                    <th className="p-3 border-b border-slate-200 text-center text-slate-700 w-16">刪除</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {activeCatItems.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" className="p-8 text-center text-slate-400">
                                                            請先新增或選擇驗屋類型
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    activeCatItems.map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50 border-b border-slate-100">
                                                            <td className="p-2 border-r border-slate-200 text-center align-top">
                                                                <input
                                                                    type="text"
                                                                    value={item.Ino}
                                                                    onChange={(e) => {
                                                                        const newItems = [...adminItems];
                                                                        const targetIdx = newItems.findIndex(i => i === item);
                                                                        if (targetIdx !== -1) {
                                                                            newItems[targetIdx].Ino = e.target.value;
                                                                            setAdminItems(newItems);
                                                                        }
                                                                    }}
                                                                    className="w-full p-1 border border-slate-300 rounded text-center focus:border-blue-500 focus:outline-none bg-white"
                                                                />
                                                            </td>

                                                            <td className="p-2 border-r border-slate-200 align-top">
                                                                <input
                                                                    type="text"
                                                                    value={item.Room}
                                                                    placeholder="請輸入廳室或樓別"
                                                                    onChange={(e) => {
                                                                        const newItems = [...adminItems];
                                                                        const targetIdx = newItems.findIndex(i => i === item);
                                                                        if (targetIdx !== -1) {
                                                                            newItems[targetIdx].Room = e.target.value;
                                                                            setAdminItems(newItems);
                                                                        }
                                                                    }}
                                                                    className="w-full p-1.5 border border-slate-300 rounded focus:border-blue-500 focus:outline-none bg-white"
                                                                />
                                                            </td>

                                                            <td className="p-2 border-r border-slate-200 align-top">
                                                                <input
                                                                    type="text"
                                                                    value={item.Vendor}
                                                                    placeholder="請輸入廠商或土電分類"
                                                                    onChange={(e) => {
                                                                        const newItems = [...adminItems];
                                                                        const targetIdx = newItems.findIndex(i => i === item);
                                                                        if (targetIdx !== -1) {
                                                                            newItems[targetIdx].Vendor = e.target.value;
                                                                            setAdminItems(newItems);
                                                                        }
                                                                    }}
                                                                    className="w-full p-1.5 border border-slate-300 rounded focus:border-blue-500 focus:outline-none bg-white"
                                                                />
                                                            </td>

                                                            <td className="p-2 border-r border-slate-200 align-top">
                                                                <input
                                                                    type="text"
                                                                    value={item.DetailName}
                                                                    placeholder="請輸入細項名稱"
                                                                    onChange={(e) => {
                                                                        const newItems = [...adminItems];
                                                                        const targetIdx = newItems.findIndex(i => i === item);
                                                                        if (targetIdx !== -1) {
                                                                            newItems[targetIdx].DetailName = e.target.value;
                                                                            setAdminItems(newItems);
                                                                        }
                                                                    }}
                                                                    className="w-full p-1.5 border border-slate-300 rounded focus:border-blue-500 focus:outline-none bg-white"
                                                                />
                                                            </td>

                                                            <td className="p-2 text-center align-top">
                                                                <button
                                                                    onClick={() => {
                                                                        if (!window.confirm('確定要刪除此細項嗎？')) return;
                                                                        setAdminItems(adminItems.filter(i => i !== item));
                                                                    }}
                                                                    className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
                                                                    title="刪除細項"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {adminTab === 'persons' && (
                            <div className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden h-full flex flex-col">
                                <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div>
                                        <h2 className="font-black text-slate-800 flex items-center gap-2">
                                            <User className="w-5 h-5" />
                                            陪驗人員設定
                                        </h2>
                                    </div>

                                    <button
                                        onClick={handleAddAdminPerson}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow"
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                        新增人員
                                    </button>
                                </div>

                                <div className="overflow-x-auto flex-1">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-slate-50 sticky top-0 z-10">
                                            <tr className="text-slate-600">
                                                <th className="px-4 py-3 border-b border-slate-200 text-center w-[120px]">編號</th>
                                                <th className="px-4 py-3 border-b border-slate-200 text-left">人員名稱</th>
                                                <th className="px-4 py-3 border-b border-slate-200 text-center w-[120px]">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {adminPersons.length === 0 ? (
                                                <tr>
                                                    <td colSpan="3" className="px-4 py-8 text-center text-slate-400">
                                                        尚無陪驗人員資料
                                                    </td>
                                                </tr>
                                            ) : (
                                                adminPersons.map((person, index) => (
                                                    <tr key={`person-${index}`} className="hover:bg-blue-50/60 transition">
                                                        <td className="px-4 py-2 border-b border-slate-100">
                                                            <input
                                                                type="text"
                                                                value={person.Sno || ''}
                                                                onChange={(e) => handleAdminPersonChange(index, 'Sno', e.target.value)}
                                                                className="w-full border border-slate-300 rounded px-3 py-2 bg-white text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                                placeholder="編號"
                                                            />
                                                        </td>

                                                        <td className="px-4 py-2 border-b border-slate-100">
                                                            <input
                                                                type="text"
                                                                value={person.Name || ''}
                                                                onChange={(e) => handleAdminPersonChange(index, 'Name', e.target.value)}
                                                                className="w-full border border-slate-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                                placeholder="請輸入陪驗人員名稱"
                                                            />
                                                        </td>

                                                        <td className="px-4 py-2 border-b border-slate-100 text-center">
                                                            <button
                                                                onClick={() => handleDeleteAdminPerson(index)}
                                                                className="inline-flex items-center justify-center p-2 rounded-lg text-red-600 hover:bg-red-50 transition"
                                                                title="刪除人員"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ScrollToTop />
        </>
    );
}

  if (step === 2) {
    const { keys: pageKeys, grouped } = getGroupedPages();
    const safePageIndex = Math.min(Math.max(0, subPageIndex), pageKeys.length - 1);
    
    let currentItems = [];
    let currentKey = "全部項目";
    if (isViewAll) {
        currentItems = pageKeys.flatMap(key => grouped[key]);
    } else { 
        currentKey = pageKeys[safePageIndex] || ""; 
        currentItems = grouped[currentKey] || []; 
    }

    const isLastPage = (isViewAll) || (safePageIndex === pageKeys.length - 1);
    const totalItems = checklistItems.length;
    const progress = totalItems === 0 ? 0 : Math.round((checklistItems.filter(i => i.status !== 0).length / totalItems) * 100);
    const defectCount = checklistItems.filter(i => i.status === 2).length;
    const pageTotal = currentItems.length;
    const pageDone = currentItems.filter(i => i.status !== 0).length;
    const pagePercent = pageTotal > 0 ? (pageDone / pageTotal) * 100 : 0;
    const isReadOnly = isFromInspection || homeMode === 'history';

    if (homeMode === 'history' && isReadOnly) {
        return (
            <div className="min-h-screen bg-gray-50 pb-20">
                <div className="bg-blue-600 text-white p-6 shadow-md relative overflow-hidden">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
                        <div>
                            <h1 className="text-3xl font-bold tracking-wider mb-2">{headerData.wname}</h1>
                            <div className="flex items-center gap-4 text-blue-100 text-sm">
                                <span className="bg-white/20 px-2 py-1 rounded text-white font-mono">{headerData.hcode}</span>
                                <span className="flex items-center gap-1"><User className="w-4 h-4"/> {headerData.customerName}</span>
                                <span>{headerData.inspectDate}</span>
                                <span className="border-l border-blue-400 pl-4">{headerData.inspectType}</span>
                            </div>
                        </div>
                        <div className="mt-4 md:mt-0 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 flex flex-col items-center justify-center min-w-[120px]">
                            <div className="text-xs text-blue-200 uppercase tracking-widest mb-1">缺失項目</div>
                            <div className="text-4xl font-black text-white">{defectCount}</div>
                        </div>
                    </div>
                    <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                </div>

                <div className="bg-white border-b shadow-sm sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center text-sm text-gray-500">
                        <div className="flex gap-6">
                            <span>單號: <span className="font-mono text-gray-700 font-bold">{headerData.serialNo}</span></span>
                            <span>陪驗人員: <span className="text-gray-700 font-bold">{headerData.inspector}</span></span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { setShowHistoryDefectsOnly(false); setStep(1); }} className="hover:text-blue-600 flex items-center gap-1">
                                <ArrowLeft className="w-4 h-4"/> 返回查詢
                            </button>
                            <button onClick={() => setStep(4)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded flex items-center gap-1 transition-colors">
                                <Printer className="w-3 h-3"/> 產生驗收單
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2 text-gray-500 font-bold">
                            <List className="w-5 h-5"/> 檢查項目明細 ({visibleHistoryChecklistItems.length})
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-700 font-medium select-none">
                            <input
                                type="checkbox"
                                checked={showHistoryDefectsOnly}
                                onChange={(e) => setShowHistoryDefectsOnly(e.target.checked)}
                            />
                            <span>僅顯示異常項目</span>
                        </label>
                    </div>
                    {visibleHistoryChecklistItems.length === 0 ? (
                        <div className="bg-white rounded-lg border border-gray-200 text-gray-500 text-center py-12 px-6">
                            無符合條件的項目。
                        </div>
                    ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                        {visibleHistoryChecklistItems.map(item => {
                            const hasImage = item.photos && item.photos.length > 0;
                            const isDefect = item.status === 2;
                            const isNormal = item.status === 1;
                            const contractorName = getContractorName(item.attr, inspectionMode);
                            
                            let itemFloor = "樓別";
                            let realItemName = item.itemName;
                            
                            if (item.itemName.includes('-')) {
                                itemFloor = item.itemName.split('-')[0];
                            }
                            
                            if (item.itemName.includes('-')) {
                                let suffix = item.itemName.substring(item.itemName.indexOf('-') + 1);
                                if (suffix.startsWith(contractorName + '-')) {
                                    suffix = suffix.substring(contractorName.length + 1); 
                                } else if (suffix.startsWith(contractorName + '－')) {
                                    suffix = suffix.substring(contractorName.length + 1);
                                }
                                realItemName = suffix;
                            } else if (item.itemName.startsWith(contractorName + '-')) {
                                realItemName = item.itemName.substring(contractorName.length + 1);
                            }

                            return (
                                <div key={item.uid} className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row ${isDefect ? 'ring-1 ring-red-200' : ''}`}>
                                    <div className={`w-2 md:w-2 h-full ${isDefect ? 'bg-red-500' : isNormal ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                    <div className="p-4 flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="text-gray-400 text-xs mb-1">{itemFloor} <span className="text-gray-600 font-mono ml-2">#{item.sno}</span></div>
                                                {isDefect ? (
                                                    <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded font-bold border border-red-200">異常</span>
                                                ) : isNormal ? (
                                                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded font-bold border border-green-200">正常</span>
                                                ) : (
                                                    <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded font-bold">未檢</span>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-lg text-gray-800 mb-1">
                                                {itemFloor}-{contractorName}-{realItemName}
                                            </h3>
                                        </div>
                                        {(item.note || isDefect) && (
                                            <div className="mt-3 bg-gray-50 p-2 rounded text-sm text-gray-600 border border-gray-100">
                                                <span className="text-gray-400 text-xs mr-1">備註:</span>
                                                {item.note || (isDefect ? "無詳細描述" : "")}
                                            </div>
                                        )}
                                    </div>
                                    {hasImage && (
                                        <div className="md:w-32 flex flex-col gap-1 p-1 bg-gray-50">
                                            {item.photos.map((src, idx) => (
                                                <div key={idx} className="w-full h-20 bg-gray-200 relative group overflow-hidden rounded">
                                                    <SecureImage 
                                                        src={resolvePhotoUrl(src)} 
                                                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                                                        onClick={(loadedSrc) => setViewPhoto({ url: loadedSrc, name: item.itemName, note: item.note, status: item.status })} 
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    )}
                </div>
                <PhotoPreviewModal />
                <ScrollToTop />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handlePhotoUpload}/>

            <div className="bg-blue-600 text-white p-6 shadow-md relative overflow-hidden flex-shrink-0">
                <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
                    <div className="flex-1">
                         <div className="flex items-center gap-3 mb-2">
                            <button 
                                onClick={() => {
                                    if (checklistItems.some(i => i.status !== 0 || i.note)) {
                                        if(window.confirm("警告：返回首頁將會清空目前已填寫的驗收資料！\n\n確定要放棄編輯並返回首頁嗎？")) {
                                            setStep(1);
                                        }
                                    } else {
                                        setStep(1);
                                    }
                                }} 
                                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <ArrowLeft className="w-6 h-6 text-white"/>
                            </button>
                            <h1 className="text-3xl font-bold tracking-wider">{headerData.wname}</h1>
                         </div>
                         <div className="flex items-center gap-4 text-blue-100 text-sm ml-9">
                            <span className="bg-white/20 px-2 py-1 rounded text-white font-mono">{headerData.hcode}</span>
                            <span className="flex items-center gap-1"><User className="w-4 h-4"/> {headerData.customerName}</span>
                            <span>{headerData.inspectDate}</span>
                            <span className="border-l border-blue-400 pl-4">{headerData.inspectType} - {headerData.inspectType === '客驗' ? (headerData.inspectCount === 1 ? '初驗' : '複驗') : `第${headerData.inspectCount}次`}</span>
                        </div>
                    </div>
                    <div className="mt-4 md:mt-0 flex gap-3 ml-9 md:ml-0">
                         <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 flex flex-col items-center justify-center min-w-[100px]">
                             <div className="text-xs text-blue-200 uppercase tracking-widest mb-1">本戶缺失</div>
                             <div className="text-3xl font-black text-white">{defectCount}</div>
                         </div>
                         <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-2 flex items-center gap-2">
                             <ProgressRing radius={24} stroke={4} progress={pagePercent} label="本頁" color="#fff" />
                             <ProgressRing radius={24} stroke={4} progress={progress} label="全案" color="#fff" />
                         </div>
                    </div>
                </div>
            </div>
            
            <div className="sticky top-0 z-30 bg-white shadow-md">
                <div className="overflow-x-auto">
                    <div className="flex p-2 gap-2 min-w-max">
                        <button 
                            onClick={() => setIsViewAll(true)} 
                            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${isViewAll ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            全部
                        </button>
                        {pageKeys.map((k, i) => (
                            <button 
                                key={k} 
                                onClick={() => { setIsViewAll(false); setSubPageIndex(i); }} 
                                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${!isViewAll && i===safePageIndex ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {k}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto p-4 space-y-4">
                {currentItems.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-lg shadow">
                        <div className="text-gray-400 text-lg">查無檢查項目</div>
                    </div>
                ) : (
                    currentItems.map(item => {
                        const is9Item = item.sno >= 9000;
                        const currentPhotos = item.photos || [];
                        const canAddPhoto = currentPhotos.length < 3;
                        
                        let displayRoom = "未知";
                        let displayCategory = ""; 
                        let displayItemName = item.itemName || "";
                        const _catSnoRender = Number(item.categorySno || 0);
                        let isBuildingMode = inspectionMode === 'BUILDING_VENDOR' || _catSnoRender === 2 || _catSnoRender === 3;

                        if (isBuildingMode) {
                             if (item.isNew) {
                                 displayRoom = item.roomName || "未分類";
                                 displayCategory = getContractorName(item.attr, inspectionMode);
                                 displayItemName = item.rawName || item.itemName;
                             } else {
                                 const _parsed = parseVendorItemName(item.itemName);
                                 displayRoom     = _parsed.room   || item.roomName || "未分類";
                                 displayCategory = _parsed.vendor || getContractorName(item.attr, inspectionMode);
                                 displayItemName = _parsed.detail || item.itemName;
                             }
                        } else {
                             const contractorName = getContractorName(item.attr, inspectionMode);
                             displayCategory = inspectionMode === 'CIVIL' ? ((item.itemName && item.itemName.split('-').length >= 3) ? item.itemName.split('-')[1] : "一般") : contractorName;
                             const parts = item.itemName ? normalizeItemName(item.itemName).split('-') : [];
                             
                             if (inspectionMode === 'CIVIL') {
                                 displayRoom = parts[0] || item.roomName || "未分類";
                                 displayItemName = (parts.length >= 3) ? parts.slice(2).join('-') : ((parts.length === 2) ? parts[1] : item.itemName);
                             } else {
                                 displayRoom = item.roomName || parts[0] || "未分類";
                                 if (displayItemName.startsWith(displayRoom + '-')) {
                                     displayItemName = displayItemName.substring(displayRoom.length + 1); 
                                 } else if (displayItemName.startsWith(displayRoom + '－')) {
                                     displayItemName = displayItemName.substring(displayRoom.length + 1);
                                 }
                                 if (displayItemName.startsWith(contractorName + '-')) {
                                     displayItemName = displayItemName.substring(contractorName.length + 1); 
                                 } else if (displayItemName.startsWith(contractorName + '－')) {
                                     displayItemName = displayItemName.substring(contractorName.length + 1);
                                 }
                             }
                        }

                        const tagStyle = getTagColorStyle(displayCategory);

                        return (
                            <div key={item.uid} className={`bg-white rounded-lg shadow-sm border-l-4 p-4 transition-all ${item.status===2 ? 'border-l-red-500 bg-red-50' : item.status===1 ? 'border-l-green-500' : 'border-l-gray-300'}`}>
                                <div className="flex flex-col gap-4">
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-lg text-gray-800 flex flex-wrap items-center gap-2">
                                                {isViewAll && (
                                                    <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-mono border border-gray-300">
                                                        {displayRoom}
                                                    </span>
                                                )}
                                                <span className={`text-xs px-1.5 py-0.5 rounded font-mono border ${tagStyle}`}>
                                                    {displayCategory}
                                                </span>
                                                <span>{displayItemName}</span>
                                                
                                                {is9Item && !isReadOnly && ( 
                                                    <button onClick={() => handleRemove9Item(item.sno)} className="ml-2 text-gray-400 hover:text-red-500 p-1">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button> 
                                                )}
                                            </h3>
                                            <span className="text-xs text-gray-400 font-mono">#{item.sno}</span>
                                        </div>

                                        <div className="flex gap-2 mb-3">
                                            <button 
                                                disabled={isReadOnly} 
                                                onClick={() => handleToggleItemStatus(item.sno, 1)} 
                                                className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 text-sm font-bold ${item.status===1 ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <CheckCircle className="w-4 h-4"/> 正常
                                            </button>
                                            <button 
                                                disabled={isReadOnly} 
                                                onClick={() => handleToggleItemStatus(item.sno, 2)} 
                                                className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 text-sm font-bold ${item.status===2 ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                <AlertCircle className="w-4 h-4"/> 缺失
                                            </button>
                                        </div>

                                        <div className="relative">
                                            <input 
                                                disabled={isReadOnly} 
                                                type="text" 
                                                className={`w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${item.status===2 ? 'bg-white border-red-200' : 'bg-gray-50 border-gray-200'}`} 
                                                placeholder={item.status===2 ? "請輸入缺失詳情..." : "備註 (選填)"} 
                                                value={item.note} 
                                                onChange={(e) => updateItem(item.sno, 'note', e.target.value)}
                                            />
                                            <Edit className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"/>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2">
                                        {currentPhotos.map((src, idx) => {
                                            const displaySrc = resolvePhotoUrl(src) || src;
                                            return (
                                                <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                                                    <SecureImage 
                                                        src={displaySrc} 
                                                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                                                        onClick={() => setViewPhoto({ url: displaySrc, name: item.itemName, note: item.note, status: item.status })} 
                                                    />
                                                    {!isReadOnly && (
                                                        <>
                                                            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleEditImage(item.sno, displaySrc, idx); }} 
                                                                    className="p-1 bg-blue-600/80 text-white rounded hover:bg-blue-700" 
                                                                    title="編輯/標示"
                                                                >
                                                                    <Palette size={12}/>
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleDeletePhoto(item.sno, idx); }} 
                                                                    className="p-1 bg-red-600/80 text-white rounded hover:bg-red-700" 
                                                                    title="刪除"
                                                                >
                                                                    <Trash2 size={12}/>
                                                                </button>
                                                            </div>
                                                            <div className={`absolute bottom-0 left-0 right-0 px-1 py-0.5 text-[8px] text-white truncate text-center ${src.startsWith('blob:') ? 'bg-orange-500' : 'bg-green-600'}`}>
                                                                {src.startsWith('blob:') ? '未存檔' : '已存檔'}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {!isReadOnly && canAddPhoto && (
                                            <button 
                                                onClick={() => triggerFileSelect(item.sno)} 
                                                className={`aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${item.status===2 ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100' : 'border-gray-300 text-gray-500 hover:bg-gray-100'}`}
                                            >
                                                <Camera className="w-5 h-5"/>
                                                <span className="text-[10px] font-bold">拍照 ({currentPhotos.length}/3)</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div className="h-10"></div>
            </main>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 px-4 shadow-lg z-30 flex items-center justify-between">
                <div className="flex items-center gap-4"></div>
                <div className="flex gap-3 w-full">
                    {!isReadOnly && (
                        <>
                            <button 
                                onClick={() => setShowCustomItemModal(true)} 
                                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-200"
                            >
                                <PlusCircle className="w-4 h-4"/> 新增項目
                            </button>
                            <button 
                                onClick={handleTemporarySave} 
                                className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg font-bold text-sm shadow hover:bg-gray-900"
                            >
                                暫存
                            </button>
                        </>
                    )}
                    {isFromInspection ? (
                        <button 
                            onClick={() => setStep(4)} 
                            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-bold text-sm shadow hover:bg-blue-700 flex items-center justify-center gap-2"
                        >
                            預覽列印頁 <Printer className="w-4 h-4"/>
                        </button>
                    ) : (
                        isLastPage ? (
                            <button 
                                onClick={handleCompleteInspection} 
                                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-bold text-sm shadow hover:bg-green-700 flex items-center justify-center gap-2"
                            >
                                <FileCheck className="w-4 h-4"/> 完成驗收
                            </button>
                        ) : (
                            <button 
                                onClick={() => setSubPageIndex(prev => Math.min(pageKeys.length - 1, prev + 1))} 
                                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-bold text-sm shadow hover:bg-blue-700 flex items-center justify-center gap-2"
                            >
                                下一頁 <ChevronRight className="w-4 h-4"/>
                            </button>
                        )
                    )}
                </div>
            </div>

            <CustomItemModal 
                isOpen={showCustomItemModal} 
                onClose={() => setShowCustomItemModal(false)} 
                items={checklistItems.filter(i => !i.isSystem)} 
                roomOptions={pageKeys} 
                onUpdate={handleUpdateCustomItem} 
                onAdd={handleAddCustomItem} 
                onDelete={handleDeleteCustomItem} 
                onSave={() => setShowCustomItemModal(false)} 
                mode={inspectionMode}
                categorySno={headerData.categorySno}
            />
            <PhotoPreviewModal />
            <ImageEditorModal 
                isOpen={editorOpen} 
                onClose={() => { setEditorOpen(false); setEditingImage(null); }} 
                imageSrc={editingImage?.src} 
                onSave={handleSaveEditedImage} 
            />
            <PayloadModal />
            <DebugPanel />
            <ScrollToTop />
        </div>
    );
  }

  if (step === 3) {
      const roleLabels = { customer: '客戶確認', worker: '工務陪驗', service: '客服承辦' };
      return (
          <div className="min-h-screen bg-gray-50 p-4 pb-20">
              <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden" style={{fontFamily: '"Noto Sans TC", sans-serif'}}>
                  <div className="bg-gray-800 text-white p-4 text-center relative">
                      <h2 className="text-xl font-bold">電子簽名確認</h2>
                      <div className="text-xs text-gray-300 mt-1">請於下方方框內簽名</div>
                  </div>
                  <div className="p-4 md:p-6">
                      <div className="flex gap-2 mb-4 justify-center">
                          {['customer', 'worker', 'service'].map(role => (
                              <button 
                                  key={role} 
                                  onClick={() => { 
                                      saveCurrentSignature(true); 
                                      setCurrentSignRole(role); 
                                  }} 
                                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm font-bold border transition-all ${currentSignRole === role ? 'bg-blue-600 text-white shadow-md transform scale-105' : 'bg-white text-gray-600 border-gray-200'}`}
                              >
                                  {roleLabels[role]}
                              </button>
                          ))}
                      </div>
                      <div ref={canvasContainerRef} className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 relative aspect-[2/1] touch-none overflow-hidden w-full">
                          <canvas 
                              ref={canvasRef} 
                              className="absolute inset-0 w-full h-full cursor-crosshair block touch-none" 
                              onMouseDown={startSign}
                              onMouseMove={drawSign}
                              onMouseUp={stopSign}
                              onMouseLeave={stopSign}
                              onTouchStart={startSign}
                              onTouchMove={drawSign}
                              onTouchEnd={stopSign}
                          />
                          <div className="absolute top-2 left-2 text-xs text-gray-400 pointer-events-none select-none font-bold opacity-50">
                              {roleLabels[currentSignRole]}簽名區
                          </div>
                          <button 
                              onClick={clearSignature} 
                              className="absolute bottom-2 right-2 bg-gray-200 hover:bg-gray-300 text-gray-600 px-3 py-1 rounded text-xs font-bold transition-colors z-10"
                          >
                              清除重簽
                          </button>
                      </div>
                      <button 
                          onClick={() => saveCurrentSignature(false)} 
                          className="w-full mt-4 bg-gray-800 text-white py-3 rounded-lg font-bold hover:bg-gray-700 active:bg-gray-900 transition-colors shadow-lg"
                      >
                          確認儲存此簽名
                      </button>
                  </div>

                  <div className="bg-gray-50 p-4 border-t space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                              onClick={prepareSave} 
                              disabled={loading} 
                              className="bg-green-600 text-white py-3 rounded-lg font-bold disabled:bg-green-400 flex items-center justify-center gap-2 shadow hover:bg-green-700 active:scale-[0.98] transition-all"
                          >
                              {loading ? <><Loader className="w-5 h-5 animate-spin"/> 存檔中</> : <><Save className="w-5 h-5"/> 立即存檔</>}
                          </button>
                          <button 
                              onClick={() => { saveCurrentSignature(true); setStep(4); }} 
                              className="bg-blue-600 text-white py-3 rounded-lg font-bold shadow hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                          >
                              <FileText className="w-5 h-5"/> 預覽驗屋檢查清單
                          </button>
                          <button 
                              onClick={handlePreviewSummaryFromSig} 
                              className="bg-teal-600 text-white py-3 rounded-lg font-bold shadow hover:bg-teal-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                          >
                              <List className="w-5 h-5"/> 預覽工程缺失彙總表
                          </button>
                          <button 
                              onClick={() => { setIsFromInspection(false); setStep(2); }} 
                              className="bg-white text-gray-600 py-3 rounded-lg font-bold border border-gray-300 hover:bg-gray-100 flex items-center justify-center gap-1"
                          >
                              <ArrowLeft className="w-4 h-4"/> 返回清單修改
                          </button>
                      </div>
                  </div>
              </div>
              <PayloadModal />
              <SaveSuccessModal />
              <DebugPanel />
              <ScrollToTop />
          </div>
      )
  }
  
  if (step === 4) {
      const printableChecklistItems = (homeMode === 'history' && showHistoryDefectsOnly)
          ? checklistItems.filter(item => Number(item?.status) === 2)
          : checklistItems;

      const sortedChecklistItems = [...printableChecklistItems].sort((a, b) => {
          const getRoom = (item) => { 
              if (item.roomName) return item.roomName; 
              if (!item.itemName) return ''; 
              const parts = item.itemName.split('-'); 
              return parts[0].trim(); 
          };
          const roomA = getRoom(a);
          const roomB = getRoom(b);
          const scoreA = getSortScore(roomA);
          const scoreB = getSortScore(roomB);
          
          if (scoreA !== scoreB) return scoreA - scoreB;
          return (a.sno || 0) - (b.sno || 0);
      });

      return (
        <div className="bg-gray-100 min-h-screen p-4 md:p-8 font-sans" style={{fontFamily: '"Noto Serif TC", serif'}}>
            <style>{printStyles}</style>
            <div className="max-w-[210mm] mx-auto mb-6 flex flex-col md:flex-row justify-between gap-4 print:hidden">
                <button 
                    onClick={() => homeMode === 'history' ? setStep(2) : setStep(3)} 
                    className="px-4 py-2 bg-gray-200 rounded flex items-center justify-center gap-1 hover:bg-gray-300 text-gray-800 font-bold"
                >
                    <ArrowLeft className="w-4 h-4"/> {homeMode === 'history' ? '返回清單' : '返回簽名'}
                </button>
                 <div className="flex flex-col md:flex-row gap-2">
                     <button 
                         onClick={() => window.print()} 
                         className="bg-blue-600 text-white px-6 py-2 rounded flex items-center justify-center gap-1 hover:bg-blue-700 font-bold shadow-lg animate-pulse"
                     >
                         <Printer className="w-4 h-4"/> 列印報表
                     </button>
                 </div>
            </div>

            <div className="overflow-x-auto md:overflow-visible pb-10 md:pb-0">
                <div className="w-[210mm] min-h-[297mm] bg-white shadow-2xl mx-auto p-[15mm] flex flex-col relative print:shadow-none print:w-full print:p-0 print:m-0 box-border">
                    <h1 className="text-3xl font-bold text-center mb-6 border-b-2 border-black pb-4 text-black">驗屋檢查清單</h1>
                    
                    <div className="border border-black mb-4 text-sm bg-white text-black">
                        <div className="grid grid-cols-2 border-b border-black">
                            <div className="p-2 border-r border-black flex items-center">
                                <span className="font-bold w-20 text-base">推案名稱：</span>
                                <span className="text-lg font-bold">{headerData.wname}</span>
                            </div>
                            <div className="p-2 flex items-center">
                                <span className="font-bold w-20 text-base">驗屋日期：</span>
                                <span className="text-lg font-bold">{headerData.inspectDate}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 border-b border-black">
                            <div className="p-2 border-r border-black flex items-center">
                                <span className="font-bold w-20 text-base">驗屋戶別：</span>
                                <span className="text-lg font-bold">{headerData.hcode} ({headerData.customerName})</span>
                            </div>
                            <div className="p-2 flex items-center">
                                <span className="font-bold w-20 text-base">驗屋類型：</span>
                                <span className="text-lg font-bold">{headerData.inspectType}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2">
                            <div className="p-2 border-r border-black flex items-center">
                                <span className="font-bold w-20 text-base">陪驗人員：</span>
                                <span className="text-lg font-bold">{headerData.inspector}</span>
                            </div>
                            <div className="p-2 flex items-center">
                                <span className="font-bold w-20 text-base">驗屋次數：</span>
                                <span className="text-lg font-bold">{getInspectionCountDisplay(headerData.inspectType, headerData.inspectCount)}</span>
                            </div>
                        </div>
                    </div>

                    <table className="w-full border-collapse border border-black text-base mb-8 text-black">
                          <thead>
                              <tr className="bg-gray-100 font-bold print:bg-gray-200">
                                  <th className="border border-black p-1 w-12 text-center">項次</th>
                                  <th className="border border-black p-1 w-14 text-center whitespace-nowrap">{(String(headerData.categorySno) === '1' || String(headerData.categorySno) === '2') ? '廳室' : '樓別'}</th>
                                  <th className="border border-black p-1 w-20 text-center whitespace-nowrap">{String(headerData.categorySno) === '1' ? '屬性' : '廠商'}</th>
                                  <th className="border border-black p-1 text-center">檢查項目</th>
                                  <th className="border border-black p-1 w-14 text-center">狀態</th>
                                  <th className="border border-black p-1 w-1/3 text-center">異常/缺失原因</th>
                              </tr>
                          </thead>
                        <tbody>
                            {sortedChecklistItems.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="border border-black p-4 text-center text-gray-500">
                                        無符合條件的檢查項目。
                                    </td>
                                </tr>
                            ) : sortedChecklistItems.map(i => {
                                 let item; 
                                 let contractorName = "";
                                 
                                 if (inspectionMode === 'CIVIL') {
                                      const parts = i.itemName ? i.itemName.split('-') : [];
                                      if (parts.length >= 3) { 
                                          contractorName = parts[1]; 
                                          item = parts.slice(2).join('-'); 
                                      } else if (parts.length === 2) { 
                                          contractorName = "一般"; 
                                          item = parts[1]; 
                                      } else { 
                                          contractorName = "一般"; 
                                          item = i.itemName; 
                                      }
                                 } else if (inspectionMode === 'BUILDING_VENDOR') {
                                      const parts = i.itemName ? i.itemName.split('-') : [];
                                      const knownRooms = ['客.餐廳', '客餐廳', '客廳', '餐廳', '廚房', '主臥室', '主臥廁所', '次臥室', '共用廁所', '前陽台', '工作陽台', '陽台', '後陽台', '1F', '2F', '3F', '4F'];
                                      let parsedVendor = "未知";
                                      let parsedDetail = i.itemName;
                                      
                                      if (i.isNew) { 
                                          parsedVendor = BUILDING_CONTRACTORS[i.attr] || "未知"; 
                                          parsedDetail = i.rawName; 
                                      } else {
                                          if (parts.length > 0 && knownRooms.includes(parts[0])) {
                                              if (parts.length >= 3) { 
                                                  parsedVendor = parts[1]; 
                                                  parsedDetail = parts.slice(2).join('-'); 
                                              } else if (parts.length === 2) {
                                                  parsedDetail = parts[1];
                                              }
                                          } else {
                                              if (parts.length >= 2) { 
                                                  parsedVendor = parts[0]; 
                                                  parsedDetail = parts.slice(1).join('-'); 
                                              }
                                          }
                                      }
                                      contractorName = parsedVendor; 
                                      item = parsedDetail;
                                 } else {
                                      const fullItemName = i.itemName || ''; 
                                      contractorName = getContractorName(i.attr, inspectionMode);
                                      let displayItem = fullItemName;
                                      
                                      if (displayItem.includes('-')) {
                                          displayItem = displayItem.substring(displayItem.indexOf('-') + 1);
                                      }
                                      if (displayItem.startsWith(contractorName + '-')) {
                                          displayItem = displayItem.substring(contractorName.length + 1); 
                                      } else if (displayItem.startsWith(contractorName + '－')) {
                                          displayItem = displayItem.substring(contractorName.length + 1);
                                      }
                                      item = displayItem;
                                 }

                                let itemFloor = '';
                                if (String(headerData.categorySno) === '1' || String(headerData.categorySno) === '2') {
                                if (i.itemName && i.itemName.includes('-')) itemFloor = i.itemName.split('-')[0];
                               } else if (String(headerData.categorySno) === '3') {
                                if (i.itemName && String(i.itemName).includes('-')) itemFloor = String(i.itemName).split('-')[0];
                                else itemFloor = '';
                              } else {
                                itemFloor = getFloor(headerData.hcode);
                                }

                                return (
                                    <tr key={i.uid}>
                                        <td className="border border-black p-2 text-center">{i.sno}</td>
                                        <td className="border border-black p-2 text-center whitespace-nowrap">{itemFloor}</td>
                                        <td className="border border-black p-2 text-center whitespace-nowrap">{contractorName}</td>
                                        <td className="border border-black p-2 text-left">{item}</td>
                                        <td className={`border border-black p-2 text-center ${i.status === 2 ? 'text-red-600 font-black' : ''}`}>
                                            {i.status === 1 ? '正常' : i.status === 2 ? '異常' : '-'}
                                        </td>
                                        <td className="border border-black p-2 text-red-600 font-bold text-left">{i.note}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <table className="w-full border-collapse border border-black mt-auto break-inside-avoid text-sm table-fixed text-black">
                        <colgroup>
                            <col className="w-10"/>
                            <col/>
                            <col className="w-10"/>
                            <col/>
                        </colgroup>
                        <thead>
                            <tr>
                                <th colSpan={2} className="border border-black p-1 text-center text-lg bg-white">修 繕 前</th>
                                <th colSpan={2} className="border border-black p-1 text-center text-lg bg-white">修 繕 後</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="h-28">
                                <td className="border border-black text-center align-middle font-bold bg-white leading-tight px-1 text-base">客<br/>戶<br/>確<br/>認</td>
                                <td className="border border-black p-1 align-middle relative">
                                    {signatures.customer ? ( 
                                        (signatures.customer.startsWith('data:') || signatures.customer.startsWith('blob:')) 
                                            ? <img src={signatures.customer} alt="Customer" className="h-20 object-contain mx-auto"/> 
                                            : <NgrokSignatureImage path={signatures.customer} baseUrl={COMPANY_SERVER_URL} alt="Customer" className="h-20 object-contain mx-auto" /> 
                                    ) : null}
                                </td>
                                <td className="border border-black text-center align-middle font-bold bg-white leading-tight px-1 text-base">客<br/>戶<br/>確<br/>認</td>
                                <td className="border border-black align-top relative p-2">
                                    <div className="text-sm font-bold mb-2 leading-tight">
                                        <label className="flex items-start gap-1 cursor-pointer">
                                            <span className="text-base">□</span>
                                            <span>本人確已完成交屋驗收，俟產權移轉完成時，同意銀行撥付銀行貸款(含交屋保留款)。</span>
                                        </label>
                                    </div>
                                </td>
                            </tr>
                            <tr className="h-20">
                                <td className="border border-black text-center align-middle font-bold bg-white leading-tight px-1 text-base">工<br/>務<br/>陪<br/>驗</td>
                                <td className="border border-black p-1 align-middle relative">
                                    {signatures.worker ? ( 
                                        (signatures.worker.startsWith('data:') || signatures.worker.startsWith('blob:')) 
                                            ? <img src={signatures.worker} alt="Worker" className="h-16 object-contain mx-auto"/> 
                                            : <NgrokSignatureImage path={signatures.worker} baseUrl={COMPANY_SERVER_URL} alt="Worker" className="h-16 object-contain mx-auto" /> 
                                    ) : null}
                                </td>
                                <td className="border border-black text-center align-middle font-bold bg-white leading-tight px-1 text-base">工<br/>務<br/>陪<br/>驗</td>
                                <td className="border border-black align-middle relative p-1"></td>
                            </tr>
                            <tr className="h-20">
                                <td className="border border-black text-center align-middle font-bold bg-white leading-tight px-1 text-base">客<br/>服<br/>承<br/>辦</td>
                                <td className="border border-black p-1 align-middle relative">
                                    {signatures.service ? ( 
                                        (signatures.service.startsWith('data:') || signatures.service.startsWith('blob:')) 
                                            ? <img src={signatures.service} alt="Service" className="h-16 object-contain mx-auto"/> 
                                            : <NgrokSignatureImage path={signatures.service} baseUrl={COMPANY_SERVER_URL} alt="Service" className="h-16 object-contain mx-auto" /> 
                                    ) : null}
                                </td>
                                <td className="border border-black text-center align-middle font-bold bg-white leading-tight px-1 text-base">客<br/>服<br/>承<br/>辦</td>
                                <td className="border border-black align-middle relative p-1"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <PayloadModal />
            <ScrollToTop />
        </div>
      )
  }

  if (step === 5) {
      let displayProjectName = headerData.wname;
      if (!displayProjectName && reportConfig.wcode) {
           const found = allowedWorks.find(w => String(getValue(w, ['Sno', 'id', 'sno', 'SNO'])) === String(reportConfig.wcode));
           if (found) displayProjectName = getValue(found, ['Wname', 'Name', 'wname']);
      }

      const ghsitemh = findTableSmart(dbData, ['ghsitemh', 'GHSITEMH'], []);
      const targetCat = ghsitemh.find(c => String(getValue(c, ['Hcode', 'hcode', 'Sno', 'sno', 'SNO', 'ID', 'id'])) === String(reportConfig.categorySno));
      const catName = targetCat ? getValue(targetCat, ['Name', 'name', 'NAME', 'CName']) || '' : '';

      let isCivilCategory = false;
      let isBuildingVendor = false;
      
      if (catName) {
          isCivilCategory = catName.includes('土.水') || catName.includes('土水');
          isBuildingVendor = catName.includes('大樓') && catName.includes('廠商');
      } else {
          isCivilCategory = String(reportConfig.categorySno) === '1';
          isBuildingVendor = String(reportConfig.categorySno) === '2'; 
      }

      return (
        <div className="min-h-screen bg-gray-100 font-sans">
             <style>{printStyles}</style>
             <div className="bg-gray-200 p-2 flex gap-2 print:hidden">
                 <button 
                     onClick={() => { 
                         if(isFromInspection) setStep(3); 
                         else { setStep(1); setHomeMode('report'); } 
                     }} 
                     className="px-3 py-1 bg-white border border-gray-400 rounded text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-1 font-bold"
                 >
                     <ArrowLeft className="w-4 h-4"/> {isFromInspection ? '返回簽名' : '返回查詢'}
                 </button>
                 
                 {isFromInspection && (
                     <button 
                         onClick={() => {
                             if(window.confirm("警告：您尚未存檔，確定要返回首頁嗎？\n(目前已填寫的資料將會清空)")) {
                                 localStorage.removeItem(STORAGE_KEY);
                                 setHeaderData({ 
                                     wcode: '', wname: '', hcode: '', customerName: '', 
                                     inspectDate: new Date().toISOString().split('T')[0], 
                                     inspector: headerData.inspector, 
                                     inspectType: '客驗', inspectCount: 1, serialNo: '', categorySno: '' 
                                 });
                                 setChecklistItems([]); 
                                 setSignatures({ customer: null, worker: null, service: null }); 
                                 setStep(1); 
                                 setHomeMode('new');
                             }
                         }} 
                         className="px-3 py-1 bg-gray-600 border border-gray-600 rounded text-sm text-white hover:bg-gray-700 flex items-center gap-1 font-bold"
                     >
                         <Home className="w-4 h-4"/> 返回首頁
                     </button>
                 )}
                 <div className="flex-1"></div>

                 <label className="flex items-center gap-2 font-bold text-gray-800 select-none">
                     <input
                         type="checkbox"
                         checked={splitByVendor}
                         onChange={(e) => setSplitByVendor(e.target.checked)}
                         className="w-4 h-4 cursor-pointer"
                     />
                     <span>依廠商分列</span>
                 </label>

                 <button
                     onClick={() => window.print()}
                     className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 flex items-center gap-1"
                 >
                     <Printer className="w-4 h-4"/> 列印報表
                 </button>
             </div>

             <div className="bg-white border-b p-3 flex flex-wrap items-center gap-4 text-sm print:hidden">
                 <div className="flex items-center gap-2">
                     <span className="font-bold text-gray-700">{isCivilCategory ? '屬性:' : '廠商:'}</span>
                     <select 
                         className="border border-gray-300 rounded px-2 py-1" 
                         value={reportAttr} 
                         onChange={(e) => { 
                             const newAttr = e.target.value; 
                             setReportAttr(newAttr); 
                             syncTreeSelection(newAttr, treeData); 
                         }}
                     >
                        <option value="0">全部顯示</option>
                        {isCivilCategory ? (
                            <>
                                <option value="土建">土建</option>
                                <option value="水電">水電</option>
                            </>
                        ) : isBuildingVendor ? (
                            Object.entries(BUILDING_CONTRACTORS).map(([key, name]) => ( 
                                <option key={key} value={name}>{name}</option> 
                            ))
                        ) : (
                            Object.entries(CONTRACTORS).map(([key, name]) => ( 
                                <option key={key} value={name}>{name}</option> 
                            ))
                        )}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-700">日期區間:</span>
                    <input
                        type="date"
                        className="border border-gray-300 rounded px-2 py-1"
                        value={reportConfig.startDate || ''}
                        onChange={(e) => setReportConfig(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                    <span className="text-gray-500">~</span>
                    <input
                        type="date"
                        className="border border-gray-300 rounded px-2 py-1"
                        value={reportConfig.endDate || ''}
                        onChange={(e) => setReportConfig(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                    <button
                        onClick={(e) => handleGenerateReport(e)}
                        disabled={loading}
                        className="px-4 py-1.5 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:bg-green-400 flex items-center gap-1"
                        title="立即依日期區間重新查詢"
                    >
                        <Search className="w-4 h-4" /> 立即查詢
                    </button>
                </div>
                <div className="flex gap-2 ml-auto">
                    <button
                        onClick={() => setHideReportSettings(!hideReportSettings)}
                        className="px-3 py-1 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-1 font-bold"
                    >
                        <Filter className="w-4 h-4"/> {hideReportSettings ? '顯示選單' : '隱藏選單'}
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] print:h-auto overflow-hidden print:overflow-visible">
                {!hideReportSettings && (
                    <div className="w-full md:w-64 bg-white border-r border-gray-300 shadow-sm flex flex-col print:hidden overflow-y-auto shrink-0 z-10">
                        <div className="p-3 bg-slate-100 font-bold text-slate-800 border-b flex justify-between items-center sticky top-0 z-10 shadow-sm">
                            <span>顯示項目篩選</span>
                            <button onClick={() => setIsTreeExpanded(!isTreeExpanded)} className="text-xs text-blue-600 hover:text-blue-800">
                                {isTreeExpanded ? '全部收合' : '全部展開'}
                            </button>
                        </div>
                        <div className="p-2 text-xs text-gray-500 bg-white border-b flex gap-2">
                             <button onClick={() => {
                                 const allKeys = Object.values(treeData).flat().map(i => String(i.sno || i.itemName));
                                 const newSet = new Set(treeSelection);
                                 allKeys.forEach(k => newSet.add(k));
                                 setTreeSelection(newSet);
                             }} className="flex-1 py-1 bg-gray-100 hover:bg-gray-200 rounded">全選</button>
                             <button onClick={() => setTreeSelection(new Set())} className="flex-1 py-1 bg-gray-100 hover:bg-gray-200 rounded">全不選</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {Object.entries(treeData).map(([room, items]) => {
                                const roomItems = items.filter(i => String(reportAttr) === '0' || String(i.attr) === String(reportAttr));
                                if (roomItems.length === 0) return null;
                                const allSelected = roomItems.every(i => treeSelection.has(String(i.sno || i.itemName)) || treeSelection.has(i.itemName));
                                
                                return (
                                    <div key={room} className="mb-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <input 
                                                type="checkbox" 
                                                checked={allSelected}
                                                onChange={(e) => {
                                                    const newSet = new Set(treeSelection);
                                                    if (e.target.checked) {
                                                        roomItems.forEach(i => {
                                                            newSet.add(String(i.sno || i.itemName));
                                                            if (i.itemName) newSet.add(i.itemName);
                                                        });
                                                    } else {
                                                        roomItems.forEach(i => {
                                                            newSet.delete(String(i.sno || i.itemName));
                                                            if (i.itemName) newSet.delete(i.itemName);
                                                        });
                                                    }
                                                    setTreeSelection(newSet);
                                                }}
                                            />
                                            <span className="font-bold text-gray-700 text-sm">{room}</span>
                                        </div>
                                        <div className="pl-5 space-y-1">
                                            {roomItems.map(item => {
                                                const isChecked = treeSelection.has(String(item.sno || item.itemName)) || treeSelection.has(item.itemName);
                                                return (
                                                    <label key={item.sno || item.itemName} className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                        <input 
                                                            type="checkbox" 
                                                            className="mt-1"
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                const newSet = new Set(treeSelection);
                                                                if (e.target.checked) {
                                                                    newSet.add(String(item.sno || item.itemName));
                                                                    if (item.itemName) newSet.add(item.itemName);
                                                                } else {
                                                                    newSet.delete(String(item.sno || item.itemName));
                                                                    if (item.itemName) newSet.delete(item.itemName);
                                                                }
                                                                setTreeSelection(newSet);
                                                            }}
                                                        />
                                                        <span className="flex-1 break-all">{item.itemName}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                <div className={`flex-1 overflow-y-auto bg-gray-100 p-2 md:p-6 ${hideReportSettings ? 'w-full' : ''}`}>
                    {getVendorPageList().length === 0 ? (
                         <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
                             無符合條件的缺失項目。
                         </div>
                    ) : getVendorPageList().map(vp => {
                        const cols = getSummaryPrintColumns({ 
                            splitByVendor: splitByVendor, 
                            isCivilCategory: isCivilCategory, 
                            isBuildingVendor: isBuildingVendor 
                        });
                        
                        return (
                            <div key={vp.vendorId} className="bg-white shadow-xl mx-auto mb-8 p-4 md:p-8 print:p-0 print:shadow-none print:m-0 break-inside-avoid">
                                <div className="text-center mb-6 border-b-2 border-black pb-4 print:mb-4">
                                    <h2 className="text-2xl md:text-3xl font-bold text-black tracking-widest">{displayProjectName}</h2>
                                    <h3 className="text-xl md:text-2xl font-bold text-black mt-2">工程缺失彙總表</h3>
                                    {splitByVendor && (
                                        <h4 className="text-lg md:text-xl font-bold text-blue-800 mt-2 bg-blue-50 inline-block px-4 py-1 border border-blue-200 print:border-black print:bg-transparent print:text-black">
                                            廠商：{vp.vendorName}
                                        </h4>
                                    )}
                                </div>
                                <div className="flex justify-between items-end mb-2 text-sm md:text-base text-black font-bold">
                                    <div>表單編號：{reportListId}</div>
                                    <div className="text-right">
                                        <div>列印日期：{new Date().toLocaleDateString('zh-TW')}</div>
                                        <div>頁數：1 / 1</div>
                                    </div>
                                </div>
                                
                                <table className="w-full border-collapse border border-black text-sm mb-6 table-fixed break-inside-avoid">
                                    <colgroup>
                                        {cols.map(c => (
                                            <col key={c.key} style={{ width: c.width }} />
                                        ))}
                                    </colgroup>
                                    <thead>
                                        <tr className="bg-gray-100 text-black print:bg-gray-200">
                                            {cols.map(c => (
                                                <th key={c.key} className="border border-black p-1 md:p-2 text-center font-bold text-base md:text-lg whitespace-nowrap">
                                                    {c.title}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {splitByVendor ? renderGroupedTableRows(vp.vendorId) : renderGroupedTableRows()}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
  }

  // ★★★ Step 6: 後台管理介面 ★★★
  if (step === 6) {
      const activeCatItems = adminItems.filter(item => String(item.Sno) === String(selectedAdminCat)).sort((a,b) => Number(a.Ino) - Number(b.Ino));

      return (
          <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
              <div className="bg-slate-800 text-white p-4 flex justify-between items-center shrink-0 shadow-md">
                  <div className="flex items-center gap-3">
                      <Settings className="w-6 h-6 text-blue-400" />
                      <h1 className="text-xl font-bold tracking-wider">AHMShi 系統清單後台設定</h1>
                      <span className="bg-blue-900 text-blue-200 text-xs px-2 py-0.5 rounded font-mono border border-blue-700">ROOT ADMIN</span>
                  </div>
                  <div className="flex gap-3">
                      <button 
                          onClick={handleSaveAdminData}
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-bold shadow transition flex items-center gap-2"
                      >
                          {loading ? <Loader className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} 儲存設定
                      </button>
                      <button 
                          onClick={() => {
                              if(window.confirm("確定要離開後台嗎？未儲存的變更將會遺失。")) {
                                  setStep(1); // 返回主頁
                              }
                          }}
                          className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded font-bold transition flex items-center gap-2"
                      >
                          <ArrowLeft className="w-4 h-4"/> 返回前台
                      </button>
                  </div>
              </div>

              <div className="flex-1 flex overflow-hidden p-4 gap-4">
                  {/* 左側：GHSITEMH 分類選單 */}
                  <div className="w-1/3 max-w-sm bg-white border border-slate-300 rounded-lg shadow-sm flex flex-col overflow-hidden">
                      <div className="bg-slate-200 p-3 font-bold text-slate-800 border-b border-slate-300 flex justify-between items-center">
                          <span>驗屋分類 (GHSITEMH)</span>
                          <button 
                              onClick={() => {
                                  let maxSno = 0;
                                  adminCategories.forEach(cat => {
                                      const snoVal = Number(getValue(cat, ['Hcode', 'hcode', 'Sno', 'sno', 'SNO', 'ID', 'id']));
                                      if (!isNaN(snoVal) && snoVal > maxSno) maxSno = snoVal;
                                  });
                                  const nextSno = maxSno + 1;
                                  const newCat = { Sno: nextSno, Hcode: nextSno, Name: `新分類 ${nextSno}` };
                                  setAdminCategories([...adminCategories, newCat]);
                                  setSelectedAdminCat(String(nextSno));
                              }}
                              className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1 shadow-sm transition"
                          >
                              <PlusCircle className="w-3 h-3"/> 新增
                          </button>
                      </div>
                      <div className="flex-1 overflow-auto">
                          <table className="w-full text-sm">
                              <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                                  <tr>
                                      <th className="p-2 border-b text-center text-slate-500 w-12">序</th>
                                      <th className="p-2 border-b text-left text-slate-500">分類名稱</th>
                                      <th className="p-2 border-b text-center text-slate-500 w-10"></th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {adminCategories.map((cat, idx) => {
                                      const sno = getValue(cat, ['Hcode', 'hcode', 'Sno', 'sno', 'SNO', 'ID', 'id']);
                                      const name = getValue(cat, ['Name', 'name', 'NAME', 'CName']);
                                      const isSelected = String(sno) === String(selectedAdminCat);
                                      return (
                                          <tr 
                                              key={idx} 
                                              onClick={() => setSelectedAdminCat(String(sno))}
                                              className={`cursor-pointer hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-100 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent border-b border-slate-100'}`}
                                          >
                                              <td className="p-2 text-center text-slate-500 align-middle">{sno}</td>
                                              <td className={`p-2 font-bold align-middle`}>
                                                  <input 
                                                      type="text"
                                                      value={name || ''}
                                                      onChange={(e) => {
                                                          const newCats = [...adminCategories];
                                                          if (newCats[idx].Name !== undefined) newCats[idx].Name = e.target.value;
                                                          else if (newCats[idx].name !== undefined) newCats[idx].name = e.target.value;
                                                          else if (newCats[idx].NAME !== undefined) newCats[idx].NAME = e.target.value;
                                                          else if (newCats[idx].CName !== undefined) newCats[idx].CName = e.target.value;
                                                          else newCats[idx].Name = e.target.value; // Fallback
                                                          setAdminCategories(newCats);
                                                      }}
                                                      onClick={(e) => e.stopPropagation()}
                                                      className={`w-full bg-transparent focus:bg-white border border-transparent focus:border-blue-300 rounded focus:outline-none px-1 py-1 ${isSelected ? 'text-blue-800' : 'text-slate-700'}`}
                                                  />
                                              </td>
                                              <td className="p-2 text-center align-middle">
                                                  <button 
                                                      onClick={(e) => {
                                                          e.stopPropagation();
                                                          if (window.confirm("確定刪除此分類？(此操作僅於畫面移除，需點擊儲存設定才會生效)")) {
                                                              setAdminCategories(adminCategories.filter((_, i) => i !== idx));
                                                              if (isSelected) setSelectedAdminCat(null);
                                                          }
                                                      }}
                                                      className="text-red-400 hover:text-red-600 p-1"
                                                      title="刪除分類"
                                                  >
                                                      <Trash2 className="w-4 h-4"/>
                                                  </button>
                                              </td>
                                          </tr>
                                      )
                                  })}
                              </tbody>
                          </table>
                      </div>
                  </div>

                  {/* 右側：GHSITEMD 細項編輯 */}
                  <div className="flex-1 bg-white border border-slate-300 rounded-lg shadow-sm flex flex-col overflow-hidden">
                      <div className="bg-slate-200 p-3 font-bold text-slate-800 border-b border-slate-300 flex justify-between items-center">
                          <span>細項名稱設定 (GHSITEMD)</span>
                          <button 
                              onClick={() => {
                                  if (!selectedAdminCat) return alert("請先選擇左側分類");
                                  const globalMaxIno = adminItems.length > 0 ? Math.max(...adminItems.map(i => Number(i.Ino) || 0)) : 1000;
                                  const newIno = Math.max(globalMaxIno + 1, 1001);
                                  const newItem = {
                                      _originalObj: { Sno: selectedAdminCat, Ino: newIno, Sel: 1 },
                                      Sno: selectedAdminCat,
                                      Ino: newIno,
                                      Room: '',
                                      Vendor: '',
                                      DetailName: ''
                                  };
                                  setAdminItems([...adminItems, newItem]);
                              }}
                              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm flex items-center gap-1 shadow-sm"
                          >
                              <PlusCircle className="w-4 h-4"/> 新增細項
                          </button>
                      </div>
                      <div className="flex-1 overflow-auto">
                          <table className="w-full text-sm border-collapse">
                              <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                                  <tr>
                                      <th className="p-3 border-b border-r border-slate-200 text-center text-slate-700 w-16">序</th>
                                      <th className="p-3 border-b border-r border-slate-200 text-left text-slate-700 w-1/4">廳室位置/樓別</th>
                                      <th className="p-3 border-b border-r border-slate-200 text-left text-slate-700 w-1/4">廠商/土水</th>
                                      <th className="p-3 border-b border-r border-slate-200 text-left text-slate-700">驗收項目</th>
                                      <th className="p-3 border-b border-slate-200 text-center text-slate-700 w-16">操作</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {activeCatItems.length === 0 ? (
                                      <tr><td colSpan="5" className="p-8 text-center text-slate-400">此分類尚無細項資料</td></tr>
                                  ) : activeCatItems.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50 border-b border-slate-100">
                                          <td className="p-2 border-r border-slate-200 text-center align-top">
                                              <input 
                                                  type="text" 
                                                  value={item.Ino} 
                                                  onChange={(e) => {
                                                      const newItems = [...adminItems];
                                                      const targetIdx = newItems.findIndex(i => i === item);
                                                      newItems[targetIdx].Ino = e.target.value;
                                                      setAdminItems(newItems);
                                                  }}
                                                  className="w-full p-1 border border-slate-300 rounded text-center focus:border-blue-500 focus:outline-none bg-white"
                                              />
                                          </td>
                                          <td className="p-2 border-r border-slate-200 align-top">
                                              <input 
                                                  type="text" 
                                                  value={item.Room} 
                                                  placeholder="如：客.餐廳"
                                                  onChange={(e) => {
                                                      const newItems = [...adminItems];
                                                      const targetIdx = newItems.findIndex(i => i === item);
                                                      newItems[targetIdx].Room = e.target.value;
                                                      setAdminItems(newItems);
                                                  }}
                                                  className="w-full p-1.5 border border-slate-300 rounded focus:border-blue-500 focus:outline-none bg-white"
                                              />
                                          </td>
                                          <td className="p-2 border-r border-slate-200 align-top">
                                              <input 
                                                  type="text" 
                                                  value={item.Vendor} 
                                                  placeholder="如：水電 或 廠商名"
                                                  onChange={(e) => {
                                                      const newItems = [...adminItems];
                                                      const targetIdx = newItems.findIndex(i => i === item);
                                                      newItems[targetIdx].Vendor = e.target.value;
                                                      setAdminItems(newItems);
                                                  }}
                                                  className="w-full p-1.5 border border-slate-300 rounded focus:border-blue-500 focus:outline-none bg-white"
                                              />
                                          </td>
                                          <td className="p-2 border-r border-slate-200 align-top">
                                              <input 
                                                  type="text" 
                                                  value={item.DetailName} 
                                                  placeholder="如：插座"
                                                  onChange={(e) => {
                                                      const newItems = [...adminItems];
                                                      const targetIdx = newItems.findIndex(i => i === item);
                                                      newItems[targetIdx].DetailName = e.target.value;
                                                      setAdminItems(newItems);
                                                  }}
                                                  className="w-full p-1.5 border border-slate-300 rounded focus:border-blue-500 focus:outline-none bg-white"
                                              />
                                          </td>
                                          <td className="p-2 text-center align-top">
                                              <button 
                                                  onClick={() => {
                                                      if(window.confirm("確定刪除此細項？")) {
                                                          setAdminItems(adminItems.filter(i => i !== item));
                                                      }
                                                  }}
                                                  className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
                                                  title="刪除"
                                              >
                                                  <Trash2 className="w-4 h-4"/>
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
  }

  return null;
};

export default HomeInspectionApp;

/**
 * ThaiShop Supabase Client
 * 電子商務平台 Supabase 整合核心
 */

// ============================================================
// 初始化 Supabase Client
// ============================================================
const SUPABASE_URL = window.SUPABASE_CONFIG?.URL || '';
const SUPABASE_ANON_KEY = window.SUPABASE_CONFIG?.ANON_KEY || '';

// 注意：CDN 的 @supabase/supabase-js 會在 window.supabase 掛載 createClient
// 這裡用 _sbClient 避免與 window.supabase (CDN 全域物件) 名稱衝突
let _sbClient = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
  _sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('[ThaiShop] Supabase Client 初始化成功');
} else {
  console.warn('[ThaiShop] Supabase Client 未初始化，請檢查 config.js 設定');
}

// ============================================================
// 錯誤訊息翻譯（支援三語：繁中、英文、泰文）
// ============================================================
const ERROR_MESSAGES = {
  'zh-TW': {
    network: '網路連線錯誤，請檢查您的網路',
    unauthorized: '請先登入才能使用此功能',
    forbidden: '您沒有權限執行此操作',
    notFound: '找不到請求的資料',
    server: '伺服器錯誤，請稍後再試',
    invalidInput: '輸入資料格式不正確',
    duplicate: '資料已存在',
    outOfStock: '庫存不足',
    cartEmpty: '購物車是空的',
    orderFailed: '訂單建立失敗',
    authFailed: '登入失敗，請檢查帳號密碼',
    emailExists: '此電子郵件已被註冊',
    weakPassword: '密碼強度不足，至少需要 6 個字元',
    invalidCredentials: '帳號或密碼錯誤',
    sessionExpired: '登入已過期，請重新登入',
    default: '發生錯誤，請稍後再試'
  },
  'en': {
    network: 'Network connection error, please check your internet',
    unauthorized: 'Please login first to use this feature',
    forbidden: 'You do not have permission to perform this action',
    notFound: 'Requested data not found',
    server: 'Server error, please try again later',
    invalidInput: 'Invalid input data format',
    duplicate: 'Data already exists',
    outOfStock: 'Insufficient stock',
    cartEmpty: 'Your cart is empty',
    orderFailed: 'Failed to create order',
    authFailed: 'Login failed, please check your credentials',
    emailExists: 'This email is already registered',
    weakPassword: 'Password is too weak, minimum 6 characters required',
    invalidCredentials: 'Invalid email or password',
    sessionExpired: 'Session expired, please login again',
    default: 'An error occurred, please try again later'
  },
  'th': {
    network: 'เกิดข้อผิดพลาดเครือข่าย กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
    unauthorized: 'กรุณาเข้าสู่ระบบก่อนใช้งาน',
    forbidden: 'คุณไม่มีสิทธิ์ดำเนินการนี้',
    notFound: 'ไม่พบข้อมูลที่ร้องขอ',
    server: 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์ กรุณาลองอีกครั้ง',
    invalidInput: 'รูปแบบข้อมูลไม่ถูกต้อง',
    duplicate: 'ข้อมูลมีอยู่แล้ว',
    outOfStock: 'สินค้าไม่เพียงพอ',
    cartEmpty: 'ตะกร้าสินค้าว่างเปล่า',
    orderFailed: 'ไม่สามารถสร้างคำสั่งซื้อ',
    authFailed: 'เข้าสู่ระบบล้มเหลว กรุณาตรวจสอบข้อมูล',
    emailExists: 'อีเมลนี้มีผู้ใช้แล้ว',
    weakPassword: 'รหัสผ่านไม่ปลอดภัย ต้องมีอย่างน้อย 6 ตัวอักษร',
    invalidCredentials: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    sessionExpired: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
    default: 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง'
  }
};

/**
 * 取得錯誤訊息
 * @param {string} errorKey - 錯誤關鍵字
 * @param {string} lang - 語言 (zh-TW, en, th)
 * @returns {string} 錯誤訊息
 */
function getErrorMessage(errorKey, lang = 'zh-TW') {
  const langErrors = ERROR_MESSAGES[lang] || ERROR_MESSAGES['zh-TW'];
  return langErrors[errorKey] || langErrors.default;
}

/**
 * 解析 Supabase 錯誤
 * @param {object} error - Supabase 錯誤物件
 * @param {string} lang - 語言
 * @returns {string} 翻譯後的錯誤訊息
 */
function parseSupabaseError(error, lang = 'zh-TW') {
  if (!error) return getErrorMessage('default', lang);

  const msg = error.message || error.error || '';
  const code = error.code || '';

  if (msg.includes('fetch') || msg.includes('network') || !navigator.onLine) {
    return getErrorMessage('network', lang);
  }
  if (code === 'PGRST301' || msg.includes('JWT')) {
    return getErrorMessage('sessionExpired', lang);
  }
  if (code === '23505' || msg.includes('duplicate')) {
    return getErrorMessage('duplicate', lang);
  }
  if (msg.includes('invalid')) {
    return getErrorMessage('invalidCredentials', lang);
  }
  if (msg.includes('not found') || code === 'PGRST116') {
    return getErrorMessage('notFound', lang);
  }

  return msg || getErrorMessage('default', lang);
}

/**
 * 建立統一回應格式
 * @param {boolean} success - 是否成功
 * @param {any} data - 回應資料
 * @param {string} error - 錯誤訊息
 * @returns {object} 統一格式
 */
function createResponse(success, data = null, error = null) {
  return { success, data, error };
}

// ============================================================
// 當前語言設定
// ============================================================
let currentLang = localStorage.getItem('thaishop-lang') || 'zh-TW';

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('thaishop-lang', lang);
}

function getLanguage() {
  return currentLang;
}

// ============================================================
// 工具函數
// ============================================================

/**
 * 檢查是否已初始化 Supabase
 */
function isSupabaseReady() {
  return _sbClient !== null;
}

/**
 * 取得目前登入的使用者
 */
async function getAuthUser() {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }
  const { data: { user } } = await _sbClient.auth.getUser();
  return user;
}

/**
 * 產生訂單編號
 */
function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TH${year}${month}${day}${random}`;
}

// ============================================================
// 商品相關功能
// ============================================================

/**
 * 取得商品列表（支援分類、搜尋、價格範圍、排序）
 * @param {object} options - 篩選選項
 * @param {string} options.category - 分類 ID 或 slug
 * @param {string} options.search - 搜尋關鍵字
 * @param {number} options.minPrice - 最低價格
 * @param {number} options.maxPrice - 最高價格
 * @param {string} options.sort - 排序方式 (newest, price_asc, price_desc, popular, featured)
 * @param {number} options.limit - 每頁數量
 * @param {number} options.page - 頁碼
 * @param {boolean} options.sale - 是否只查特價商品
 * @returns {object} { success, data: { products, total } } 或 { success: false, error }
 */
async function getProducts(options = {}) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  try {
    let query = supabase
      .from('products')
      .select(`
        id, name, slug, description, price, sale_price, compare_price,
        stock_quantity, category_id, images, is_active, is_featured,
        average_rating, review_count,
        name_th, name_en, name_zh,
        description_th, description_en, description_zh,
        sku, weight, created_at,
        product_categories (id, name, slug, name_th, name_en, name_zh)
      `, { count: 'exact' })
      .eq('is_active', true);

    // 分類篩選（支援 UUID 或 slug）
    if (options.category) {
      // 如果是 UUID 格式直接用，否則先查分類 ID
      if (/^[0-9a-f]{8}-/i.test(options.category)) {
        query = query.eq('category_id', options.category);
      } else if (options.category.includes('-')) {
        // slug 格式如 'health-beauty'
        const { data: cat } = await supabase
          .from('product_categories')
          .select('id')
          .eq('slug', options.category)
          .single();
        if (cat) {
          query = query.eq('category_id', cat.id);
        }
      } else {
        // 短名稱如 'beauty'，嘗試 slug 匹配
        const { data: cat } = await supabase
          .from('product_categories')
          .select('id')
          .or(`slug.ilike.%${options.category}%,name_en.ilike.%${options.category}%`)
          .limit(1);
        if (cat && cat.length > 0) {
          query = query.eq('category_id', cat[0].id);
        }
      }
    }

    // 搜尋關鍵字（支援三語搜尋）
    if (options.search) {
      query = query.or(`name.ilike.%${options.search}%,name_th.ilike.%${options.search}%,name_en.ilike.%${options.search}%,name_zh.ilike.%${options.search}%,description.ilike.%${options.search}%`);
    }

    // 價格範圍
    if (options.minPrice !== undefined) {
      query = query.gte('price', options.minPrice);
    }
    if (options.maxPrice !== undefined) {
      query = query.lte('price', options.maxPrice);
    }

    // 特價商品（sale_price 存在且小於 price）
    if (options.sale) {
      query = query.not('sale_price', 'is', null).lt('sale_price', _sbClient.rpc ? 999999 : 999999);
    }

    // 精選商品
    if (options.sort === 'featured') {
      query = query.eq('is_featured', true);
    }

    // 排序
    switch (options.sort) {
      case 'price_asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price', { ascending: false });
        break;
      case 'popular':
        query = query.order('average_rating', { ascending: false });
        break;
      case 'featured':
        query = query.order('created_at', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // 分頁
    const limit = options.limit || 20;
    const page = options.page || 1;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    // 返回前端友好的格式
    return createResponse(true, { products: data || [], total: count || 0 });
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

/**
 * 取得單一商品
 * @param {string} id - 商品 ID (UUID)
 * @returns {object} { success, data: product } 或 { success: false, error }
 */
async function getProductById(id) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, name, slug, description, price, sale_price, compare_price,
        stock_quantity, category_id, images, is_active, is_featured,
        average_rating, review_count,
        name_th, name_en, name_zh,
        description_th, description_en, description_zh,
        sku, weight, created_at,
        product_categories (id, name, slug, name_th, name_en, name_zh, description)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, data);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

/**
 * 取得所有分類
 * @returns {object} { success, data: categories } 或 { success: false, error }
 */
async function getCategories() {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, data);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

// ============================================================
// 購物車功能
// ============================================================

/**
 * 取得購物車商品
 * @param {string} userId - 使用者 ID
 * @returns {object} 統一回應格式
 */
async function getCartItems(userId) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  if (!userId) {
    return createResponse(false, null, getErrorMessage('unauthorized', currentLang));
  }

  try {
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        products (
          id, name, price, images, stock_quantity, is_active
        )
      `)
      .eq('user_id', userId);

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    // 過濾掉無效或停用的商品
    const validItems = data.filter(item => item.products && item.products.is_active);

    return createResponse(true, validItems);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

/**
 * 加入購物車
 * @param {string} userId - 使用者 ID
 * @param {string} productId - 商品 ID
 * @param {number} quantity - 數量
 * @returns {object} 統一回應格式
 */
async function addToCart(userId, productId, quantity = 1) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  if (!userId) {
    return createResponse(false, null, getErrorMessage('unauthorized', currentLang));
  }

  try {
    // 檢查商品庫存
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('stock_quantity, is_active')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return createResponse(false, null, getErrorMessage('notFound', currentLang));
    }

    if (!product.is_active) {
      return createResponse(false, null, getErrorMessage('notFound', currentLang));
    }

    // 檢查現有購物車項目
    const { data: existing } = await supabase
      .from('cart_items')
      .select('quantity')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    const newQuantity = (existing?.quantity || 0) + quantity;

    if (newQuantity > product.stock_quantity) {
      return createResponse(false, null, getErrorMessage('outOfStock', currentLang));
    }

    // 如果已存在，更新數量；否則新增
    if (existing) {
      const { data, error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        return createResponse(false, null, parseSupabaseError(error, currentLang));
      }
      return createResponse(true, data);
    } else {
      const { data, error } = await supabase
        .from('cart_items')
        .insert({ user_id: userId, product_id: productId, quantity })
        .select()
        .single();

      if (error) {
        return createResponse(false, null, parseSupabaseError(error, currentLang));
      }
      return createResponse(true, data);
    }
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

/**
 * 更新購物車項目數量
 * @param {string} itemId - 購物車項目 ID
 * @param {number} quantity - 新數量
 * @returns {object} 統一回應格式
 */
async function updateCartItem(itemId, quantity) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  try {
    // 檢查商品庫存
    const { data: cartItem } = await supabase
      .from('cart_items')
      .select('product_id')
      .eq('id', itemId)
      .single();

    if (!cartItem) {
      return createResponse(false, null, getErrorMessage('notFound', currentLang));
    }

    const { data: product } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', cartItem.product_id)
      .single();

    if (quantity > (product?.stock_quantity || 0)) {
      return createResponse(false, null, getErrorMessage('outOfStock', currentLang));
    }

    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, data);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

/**
 * 移除購物車項目
 * @param {string} itemId - 購物車項目 ID
 * @returns {object} 統一回應格式
 */
async function removeCartItem(itemId) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, true);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

/**
 * 清空購物車
 * @param {string} userId - 使用者 ID
 * @returns {object} 統一回應格式
 */
async function clearCart(userId) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  if (!userId) {
    return createResponse(false, null, getErrorMessage('unauthorized', currentLang));
  }

  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId);

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, true);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

// ============================================================
// 訂單功能
// ============================================================

/**
 * 建立訂單
 * @param {object} orderData - 訂單資料
 * @param {array} items - 訂單項目
 * @returns {object} 統一回應格式
 */
async function createOrder(orderData, items) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  const user = await getAuthUser();
  if (!user) {
    return createResponse(false, null, getErrorMessage('unauthorized', currentLang));
  }

  try {
    // 計算總金額
    const totalAmount = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

    // 建立訂單
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        order_number: generateOrderNumber(),
        total_amount: totalAmount,
        status: 'pending',
        shipping_address_id: orderData.shipping_address_id,
        payment_method: orderData.payment_method,
        notes: orderData.notes
      })
      .select()
      .single();

    if (orderError) {
      return createResponse(false, null, parseSupabaseError(orderError, currentLang));
    }

    // 建立訂單項目
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.unit_price * item.quantity
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      // 如果建立訂單項目失敗，刪除已建立的訂單
      await _sbClient.from('orders').delete().eq('id', order.id);
      return createResponse(false, null, parseSupabaseError(itemsError, currentLang));
    }

    // 更新商品庫存
    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', item.product_id)
        .single();

      if (product) {
        await supabase
          .from('products')
          .update({ stock_quantity: product.stock_quantity - item.quantity })
          .eq('id', item.product_id);
      }
    }

    // 清空購物車
    await clearCart(user.id);

    return createResponse(true, order);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

/**
 * 取得使用者訂單
 * @param {string} userId - 使用者 ID
 * @returns {object} 統一回應格式
 */
async function getOrders(userId) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  if (!userId) {
    return createResponse(false, null, getErrorMessage('unauthorized', currentLang));
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (id, name, images)
        ),
        addresses (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, data);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

/**
 * 取得單一訂單
 * @param {string} orderId - 訂單 ID
 * @returns {object} 統一回應格式
 */
async function getOrderById(orderId) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (id, name, images)
        ),
        addresses (*)
      `)
      .eq('id', orderId)
      .single();

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, data);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

// ============================================================
// 用戶功能
// ============================================================

/**
 * 註冊新用戶
 * @param {string} email - 電子郵件
 * @param {string} password - 密碼
 * @param {string} name - 姓名
 * @param {string} phone - 電話
 * @returns {object} 統一回應格式
 */
async function register(email, password, name, phone) {
  console.log('[ThaiShop] register() 開始, isSupabaseReady:', isSupabaseReady());

  if (!isSupabaseReady()) {
    console.error('[ThaiShop] register() Supabase 未初始化');
    return createResponse(false, null, 'Supabase 未初始化，請確認 config.js 設定正確');
  }

  if (!email || !password || !name) {
    return createResponse(false, null, getErrorMessage('invalidInput', currentLang));
  }

  if (password.length < 6) {
    return createResponse(false, null, getErrorMessage('weakPassword', currentLang));
  }

  try {
    console.log('[ThaiShop] 呼叫 _sbClient.auth.signUp...');

    // 為 signUp 添加超時保護
    const signUpResult = await Promise.race([
      _sbClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone: phone || ''
          }
        }
      }),
      new Promise(function(_, reject) {
        setTimeout(function() { reject(new Error('Supabase API 連線逾時，專案可能已暫停')); }, 12000);
      })
    ]);

    const { data, error } = signUpResult;
    console.log('[ThaiShop] signUp 結果, error:', error, 'data:', data ? '有資料' : '無資料');

    if (error) {
      if (error.message.includes('already')) {
        return createResponse(false, null, getErrorMessage('emailExists', currentLang));
      }
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    // 建立使用者資料（由資料庫 trigger handle_new_user 自動建立，這裡只做備援）
    if (data.user) {
      console.log('[ThaiShop] 註冊成功, userId:', data.user.id, '（profile 由 DB trigger 建立）');
      // 備援：如果 trigger 沒建立 profile，前端嘗試建立
      try {
        const { data: existingProfile } = await _sbClient
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (!existingProfile) {
          console.log('[ThaiShop] Trigger 未建立 profile，前端備援建立');
          const { error: profileError } = await _sbClient
            .from('users')
            .insert({
              id: data.user.id,
              email: email,
              full_name: name,
              phone: phone || ''
            });
          if (profileError) {
            console.warn('[ThaiShop] 備援建立 profile 失敗（可能由 RLS 或 trigger 衝突）:', profileError.message);
          }
        }
      } catch (e) {
        console.warn('[ThaiShop] profile 檢查異常:', e.message);
      }
    }

    return createResponse(true, data);
  } catch (err) {
    console.error('[ThaiShop] register() 例外:', err);
    return createResponse(false, null, err.message || 'Registration failed');
  }
}

/**
 * 用戶登入
 * @param {string} email - 電子郵件
 * @param {string} password - 密碼
 * @returns {object} 統一回應格式
 */
async function login(email, password) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  if (!email || !password) {
    return createResponse(false, null, getErrorMessage('invalidInput', currentLang));
  }

  try {
    const { data, error } = await _sbClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      if (error.message.includes('Invalid')) {
        return createResponse(false, null, getErrorMessage('invalidCredentials', currentLang));
      }
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, data);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

/**
 * 用戶登出
 * @returns {object} 統一回應格式
 */
async function logout() {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  try {
    const { error } = await _sbClient.auth.signOut();

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, true);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

/**
 * 取得目前登入用戶
 * @returns {object} 統一回應格式
 */
async function getCurrentUser() {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  try {
    const { data: { user }, error } = await _sbClient.auth.getUser();

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    if (!user) {
      return createResponse(true, null);
    }

    // 取得使用者資料
    const { data: profile } = await _sbClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    return createResponse(true, { ...user, profile });
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

/**
 * 更新用戶資料
 * @param {object} data - 更新資料
 * @returns {object} 統一回應格式
 */
async function updateProfile(data) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  const user = await getAuthUser();
  if (!user) {
    return createResponse(false, null, getErrorMessage('unauthorized', currentLang));
  }

  try {
    const { data: result, error } = await supabase
      .from('users')
      .update({
        full_name: data.full_name,
        phone: data.phone,
        username: data.username
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, result);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

// ============================================================
// 地址功能
// ============================================================

/**
 * 取得使用者地址
 * @param {string} userId - 使用者 ID
 * @returns {object} 統一回應格式
 */
async function getAddresses(userId) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  if (!userId) {
    return createResponse(false, null, getErrorMessage('unauthorized', currentLang));
  }

  try {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, data);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

/**
 * 新增地址
 * @param {string} userId - 使用者 ID
 * @param {object} address - 地址資料
 * @returns {object} 統一回應格式
 */
async function addAddress(userId, address) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  if (!userId) {
    return createResponse(false, null, getErrorMessage('unauthorized', currentLang));
  }

  try {
    // 如果設為預設，先取消其他預設
    if (address.is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    const { data, error } = await supabase
      .from('addresses')
      .insert({
        user_id: userId,
        recipient_name: address.recipient_name,
        phone: address.phone,
        province: address.province,
        city: address.city,
        district: address.district,
        detail_address: address.detail_address,
        is_default: address.is_default || false
      })
      .select()
      .single();

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, data);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

/**
 * 更新地址
 * @param {string} id - 地址 ID
 * @param {object} address - 地址資料
 * @returns {object} 統一回應格式
 */
async function updateAddress(id, address) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  try {
    // 取得地址確認擁有者
    const { data: existing } = await supabase
      .from('addresses')
      .select('user_id, is_default')
      .eq('id', id)
      .single();

    if (!existing) {
      return createResponse(false, null, getErrorMessage('notFound', currentLang));
    }

    // 如果設為預設，先取消其他預設
    if (address.is_default && !existing.is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', existing.user_id);
    }

    const { data, error } = await supabase
      .from('addresses')
      .update({
        recipient_name: address.recipient_name,
        phone: address.phone,
        province: address.province,
        city: address.city,
        district: address.district,
        detail_address: address.detail_address,
        is_default: address.is_default
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, data);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

/**
 * 刪除地址
 * @param {string} id - 地址 ID
 * @returns {object} 統一回應格式
 */
async function deleteAddress(id) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  try {
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', id);

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, true);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

// ============================================================
// 促銷功能（預留，未來可擴充）
// ============================================================

/**
 * 取得有效促銷活動
 * @returns {object} 統一回應格式
 */
async function getActivePromotions() {
  // 目前資料庫沒有促銷表，回傳空陣列
  // 未來可擴充
  return createResponse(true, []);
}

/**
 * 取得限時搶購商品（有特價的商品）
 * @param {number} limit - 最多回傳幾個商品
 * @returns {object} { success, data: products[] } 或 { success: false, error }
 */
async function getFlashSaleProducts(limit = 6) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, name, slug, price, sale_price, compare_price,
        stock_quantity, category_id, images,
        name_th, name_en, name_zh,
        average_rating,
        product_categories (id, name, slug, name_th, name_en, name_zh)
      `)
      .eq('is_active', true)
      .not('sale_price', 'is', null)
      .lt('sale_price', 999999)
      .order('sale_price', { ascending: true })
      .limit(limit);

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, data || []);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

// ============================================================
// 管理員功能
// ============================================================

/**
 * 檢查是否為管理員
 */
async function isAdmin() {
  const userResponse = await getCurrentUser();
  if (!userResponse.success || !userResponse.data?.profile) {
    return false;
  }
  return userResponse.data.profile.role === 'admin';
}

/**
 * 取得所有訂單（管理員）
 * @param {object} filter - 篩選條件
 * @returns {object} 統一回應格式
 */
async function adminGetOrders(filter = {}) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  const admin = await isAdmin();
  if (!admin) {
    return createResponse(false, null, getErrorMessage('forbidden', currentLang));
  }

  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (id, name)
        ),
        addresses (*),
        users (id, email, full_name)
      `)
      .order('created_at', { ascending: false });

    if (filter.status) {
      query = query.eq('status', filter.status);
    }

    if (filter.date_from) {
      query = query.gte('created_at', filter.date_from);
    }

    if (filter.date_to) {
      query = query.lte('created_at', filter.date_to);
    }

    const { data, error } = await query;

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, data);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

/**
 * 更新訂單狀態（管理員）
 * @param {string} orderId - 訂單 ID
 * @param {string} status - 新狀態
 * @returns {object} 統一回應格式
 */
async function adminUpdateOrderStatus(orderId, status) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  const admin = await isAdmin();
  if (!admin) {
    return createResponse(false, null, getErrorMessage('forbidden', currentLang));
  }

  const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'];
  if (!validStatuses.includes(status)) {
    return createResponse(false, null, getErrorMessage('invalidInput', currentLang));
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .update({
        status,
        payment_status: status === 'paid' ? 'paid' : status === 'refunded' ? 'refunded' : undefined
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, data);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

/**
 * 取得所有商品（管理員，含未啟用）
 * @returns {object} 統一回應格式
 */
async function adminGetProducts() {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  const admin = await isAdmin();
  if (!admin) {
    return createResponse(false, null, getErrorMessage('forbidden', currentLang));
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_categories (id, name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, data);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

/**
 * 建立商品（管理員）
 * @param {object} data - 商品資料
 * @returns {object} 統一回應格式
 */
async function adminCreateProduct(data) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  const admin = await isAdmin();
  if (!admin) {
    return createResponse(false, null, getErrorMessage('forbidden', currentLang));
  }

  try {
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name: data.name,
        slug: `${slug}-${Date.now()}`,
        description: data.description,
        price: data.price,
        stock_quantity: data.stock_quantity || 0,
        category_id: data.category_id,
        images: data.images || [],
        sku: data.sku,
        weight: data.weight,
        is_active: data.is_active !== false
      })
      .select()
      .single();

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, product);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

/**
 * 更新商品（管理員）
 * @param {string} id - 商品 ID
 * @param {object} data - 更新資料
 * @returns {object} 統一回應格式
 */
async function adminUpdateProduct(id, data) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  const admin = await isAdmin();
  if (!admin) {
    return createResponse(false, null, getErrorMessage('forbidden', currentLang));
  }

  try {
    const updateData = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.stock_quantity !== undefined) updateData.stock_quantity = data.stock_quantity;
    if (data.category_id !== undefined) updateData.category_id = data.category_id;
    if (data.images !== undefined) updateData.images = data.images;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, product);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

/**
 * 刪除商品（管理員）
 * @param {string} id - 商品 ID
 * @returns {object} 統一回應格式
 */
async function adminDeleteProduct(id) {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  const admin = await isAdmin();
  if (!admin) {
    return createResponse(false, null, getErrorMessage('forbidden', currentLang));
  }

  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, true);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

/**
 * 取得所有用戶（管理員）
 * @returns {object} 統一回應格式
 */
async function adminGetUsers() {
  if (!isSupabaseReady()) {
    return createResponse(false, null, getErrorMessage('server', currentLang));
  }

  const admin = await isAdmin();
  if (!admin) {
    return createResponse(false, null, getErrorMessage('forbidden', currentLang));
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return createResponse(false, null, parseSupabaseError(error, currentLang));
    }

    return createResponse(true, data);
  } catch (err) {
    return createResponse(false, null, parseSupabaseError(err, currentLang));
  }
}

// ============================================================
// 匯出所有函數
// ============================================================
if (typeof window !== 'undefined') {
  window.ThaiShop = {
    // 設定
    setLanguage,
    getLanguage,
    isSupabaseReady,

    // 商品
    getProducts,
    getProductById,
    getCategories,

    // 購物車
    getCartItems,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,

    // 訂單
    createOrder,
    getOrders,
    getOrderById,

    // 用戶
    register,
    login,
    logout,
    getCurrentUser,
    updateProfile,

    // 地址
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,

    // 促銷
    getActivePromotions,
    getFlashSaleProducts,

    // 管理員
    adminGetOrders,
    adminUpdateOrderStatus,
    adminGetProducts,
    adminCreateProduct,
    adminUpdateProduct,
    adminDeleteProduct,
    adminGetUsers,

    // 工具
    getAuthUser,
    isAdmin,
    getErrorMessage,
    parseSupabaseError
  };

  // 同時掛到全域，方便頁面 JS 直接呼叫
  window.getProducts = getProducts;
  window.getProductById = getProductById;
  window.getCategories = getCategories;
  window.getCartItems = getCartItems;
  window.addToCart = addToCart;
  window.updateCartItem = updateCartItem;
  window.removeCartItem = removeCartItem;
  window.clearCart = clearCart;
  window.createOrder = createOrder;
  window.getOrders = getOrders;
  window.getOrderById = getOrderById;
  window.register = register;
  window.login = login;
  window.logout = logout;
  window.getCurrentUser = getCurrentUser;
  window.updateProfile = updateProfile;
  window.getAddresses = getAddresses;
  window.addAddress = addAddress;
  window.updateAddress = updateAddress;
  window.deleteAddress = deleteAddress;
  window.getActivePromotions = getActivePromotions;
  window.getFlashSaleProducts = getFlashSaleProducts;
  window.isAdmin = isAdmin;
  window.getAuthUser = getAuthUser;
  window.getErrorMessage = getErrorMessage;
  window.parseSupabaseError = parseSupabaseError;
}

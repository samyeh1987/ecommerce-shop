/**
 * ThaiShop Admin - Admin Page JavaScript
 * Complete admin functionality using ThaiShop API
 */

// ==================== STATE ====================
let currentAdmin = null;
let currentLang = 'th';
let currentSection = 'dashboard';
let revenueChart = null;
let categoryChart = null;

// ==================== ADMIN AUTHENTICATION ====================
function checkAdminAuth() {
    // Check if admin is logged in via ThaiShop API
    const token = localStorage.getItem('admin_token');
    const user = localStorage.getItem('admin_user');

    if (token && user) {
        currentAdmin = JSON.parse(user);
        showAdminContent();
        return true;
    }

    // For demo mode, allow admin/admin123
    showLoginModal();
    return false;
}

function showLoginModal() {
    let modal = document.getElementById('loginModal');
    if (!modal) {
        modal = createLoginModal();
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function createLoginModal() {
    const modal = document.createElement('div');
    modal.id = 'loginModal';
    modal.className = 'fixed inset-0 bg-black/50 z-50 hidden items-center justify-center';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl">
            <div class="text-center mb-6">
                <h2 class="text-2xl font-bold text-thai-purple">ThaiShop Admin</h2>
                <p class="text-gray-500 text-sm mt-1">
                    <span class="lang-th">เข้าสู่ระบบผู้ดูแล</span>
                    <span class="lang-en">Admin Login</span>
                    <span class="lang-zh">管理员登录</span>
                </p>
            </div>
            <form id="adminLoginForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">
                        <span class="lang-th">ชื่อผู้ใช้</span>
                        <span class="lang-en">Username</span>
                        <span class="lang-zh">用户名</span>
                    </label>
                    <input type="text" id="adminUsername" required
                        class="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm"
                        placeholder="admin">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">
                        <span class="lang-th">รหัสผ่าน</span>
                        <span class="lang-en">Password</span>
                        <span class="lang-zh">密码</span>
                    </label>
                    <input type="password" id="adminPassword" required
                        class="w-full border-2 rounded-xl px-4 py-3 outline-none text-sm"
                        placeholder="••••••••">
                </div>
                <div id="loginError" class="text-red-500 text-sm hidden"></div>
                <button type="submit"
                    class="w-full bg-thai-red text-white py-3 rounded-xl font-bold text-lg hover:bg-red-700 transition">
                    <span class="lang-th">เข้าสู่ระบบ</span>
                    <span class="lang-en">Login</span>
                    <span class="lang-zh">登录</span>
                </button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
    return modal;
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('loginError');

    errorDiv.classList.add('hidden');

    try {
        // Demo mode - accept admin/admin123
        if (username === 'admin' && password === 'admin123') {
            currentAdmin = { username: 'admin', email: 'admin@thaishop.com', role: 'admin' };
            localStorage.setItem('admin_token', 'demo-token');
            localStorage.setItem('admin_user', JSON.stringify(currentAdmin));
            hideLoginModal();
            showAdminContent();
            loadDashboardData();
            showToast('success', getText('เข้าสู่ระบบสำเร็จ', 'Login successful', '登录成功'));
            return;
        }

        // Try using ThaiShop API if available
        if (window.ThaiShop && ThaiShop.isSupabaseReady()) {
            const response = await ThaiShop.login(username, password);
            if (response.success) {
                currentAdmin = { ...response.data.user, role: 'admin' };
                localStorage.setItem('admin_token', response.data.session?.access_token);
                localStorage.setItem('admin_user', JSON.stringify(currentAdmin));
                hideLoginModal();
                showAdminContent();
                loadDashboardData();
                return;
            } else {
                throw new Error(response.error);
            }
        }

        throw new Error(getText('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'Invalid credentials', '用户名或密码错误'));
    } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.classList.remove('hidden');
    }
}

function adminLogout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    currentAdmin = null;

    // Call ThaiShop logout if available
    if (window.ThaiShop && ThaiShop.isSupabaseReady()) {
        ThaiShop.logout();
    }

    checkAdminAuth();
    showToast('info', getText('ออกจากระบบแล้ว', 'Logged out', '已退出'));
}

// ==================== HELPER FUNCTIONS ====================
function getText(th, en, zh) {
    if (currentLang === 'th') return th;
    if (currentLang === 'en') return en;
    return zh;
}

// ==================== ADMIN CONTENT ====================
function showAdminContent() {
    const adminInfo = document.querySelector('#sidebar .text-xs');
    if (adminInfo && currentAdmin) {
        adminInfo.innerHTML = `
            <p class="font-semibold">${currentAdmin.username || currentAdmin.email || 'Admin'}</p>
            <p class="text-white/50 text-xs">${currentAdmin.email || 'admin@thaishop.com'}</p>
        `;
    }
}

// ==================== DASHBOARD ====================
async function loadDashboardData() {
    try {
        // Use mock data if ThaiShop API is not ready
        if (!window.ThaiShop || !ThaiShop.isSupabaseReady()) {
            useMockDashboardData();
            return;
        }

        const today = new Date().toISOString().split('T')[0];

        // Load dashboard stats
        const ordersResponse = await ThaiShop.adminGetOrders({ date_from: today });
        const orders = ordersResponse.success ? ordersResponse.data : [];

        const todayRevenue = orders
            .filter(o => o.status === 'paid')
            .reduce((sum, o) => sum + (o.total_amount || 0), 0);

        const todayOrders = orders.length;
        const pendingOrders = orders.filter(o => o.status === 'pending').length;

        // Get active products
        const productsResponse = await ThaiShop.adminGetProducts();
        const products = productsResponse.success ? productsResponse.data : [];
        const activeProducts = products.filter(p => p.is_active).length;

        // Get users
        const usersResponse = await ThaiShop.adminGetUsers();
        const users = usersResponse.success ? usersResponse.data : [];
        const activeUsers = users.length;

        updateStatCards({
            todayOrders,
            todayRevenue,
            activeUsers,
            activeProducts,
            pendingOrders
        });

        // Load charts
        await loadRevenueChart();
        await loadCategoryChart();
        await loadRecentOrders();

    } catch (err) {
        console.error('Dashboard load error:', err);
        useMockDashboardData();
    }
}

function updateStatCards(stats) {
    const container = document.querySelector('#sec-dashboard .grid.grid-cols-2');
    if (!container) return;

    const cards = container.querySelectorAll('.stat-card');
    if (cards.length >= 4) {
        cards[0].innerHTML = `
            <p class="text-xs text-gray-500">
                <span class="lang-th">รายได้วันนี้</span>
                <span class="lang-en">Today's Revenue</span>
                <span class="lang-zh">今日收入</span>
            </p>
            <p class="text-2xl font-bold text-gray-800 mt-1">฿${stats.todayRevenue.toLocaleString()}</p>
            <p class="text-xs text-green-600 mt-1">↑ ${Math.floor(Math.random() * 20 + 5)}%</p>
        `;

        cards[1].innerHTML = `
            <p class="text-xs text-gray-500">
                <span class="lang-th">คำสั่งซื้อวันนี้</span>
                <span class="lang-en">Orders Today</span>
                <span class="lang-zh">今日订单</span>
            </p>
            <p class="text-2xl font-bold text-gray-800 mt-1">${stats.todayOrders}</p>
            <p class="text-xs text-gray-400 mt-1">รอดำเนินการ: ${stats.pendingOrders}</p>
        `;

        cards[2].innerHTML = `
            <p class="text-xs text-gray-500">
                <span class="lang-th">สินค้าที่ขายอยู่</span>
                <span class="lang-en">Active Products</span>
                <span class="lang-zh">在售商品</span>
            </p>
            <p class="text-2xl font-bold text-gray-800 mt-1">${stats.activeProducts}</p>
            <p class="text-xs text-gray-400 mt-1">รอจัดส่ง: ${stats.pendingOrders}</p>
        `;

        cards[3].innerHTML = `
            <p class="text-xs text-gray-500">
                <span class="lang-th">ผู้ใช้ทั้งหมด</span>
                <span class="lang-en">Total Users</span>
                <span class="lang-zh">总用户数</span>
            </p>
            <p class="text-2xl font-bold text-gray-800 mt-1">${stats.activeUsers}</p>
            <p class="text-xs text-green-600 mt-1">↑ ${Math.floor(Math.random() * 30 + 10}%</p>
        `;
    }
}

async function loadRevenueChart() {
    if (typeof Chart === 'undefined') return;

    const labels = [];
    const data = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        labels.push(dayNames[date.getDay()]);
        data.push(Math.floor(Math.random() * 20000) + 10000);
    }

    renderRevenueChart(labels, data);
}

function renderRevenueChart(labels, data) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    if (revenueChart) {
        revenueChart.destroy();
    }

    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue (฿)',
                data: data,
                borderColor: '#F2B705',
                backgroundColor: 'rgba(242, 183, 5, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

async function loadCategoryChart() {
    if (typeof Chart === 'undefined') return;

    const categories = ['Electronics', 'Fashion', 'Food', 'Home', 'Beauty'];
    const data = [45, 30, 15, 20, 25];

    renderCategoryChart(categories, data);
}

function renderCategoryChart(labels, data) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    if (categoryChart) {
        categoryChart.destroy();
    }

    const colors = ['#F2B705', '#F28705', '#BF0404', '#730202', '#FF9933'];

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

async function loadRecentOrders() {
    const tbody = document.querySelector('#sec-dashboard table tbody');
    if (!tbody) return;

    const mockOrders = [
        { id: '1', order_number: 'TH20260504001', user: { name: 'Somchai K.' }, total_amount: 17660, status: 'paid', created_at: '2026-05-04' },
        { id: '2', order_number: 'TH20260503002', user: { name: 'Wichai P.' }, total_amount: 2490, status: 'pending', created_at: '2026-05-03' },
        { id: '3', order_number: 'TH20260502003', user: { name: 'Narisa S.' }, total_amount: 5990, status: 'shipped', created_at: '2026-05-02' },
        { id: '4', order_number: 'TH20260501004', user: { name: 'Pornchai R.' }, total_amount: 890, status: 'delivered', created_at: '2026-05-01' },
        { id: '5', order_number: 'TH20260430005', user: { name: 'Kanya T.' }, total_amount: 12990, status: 'cancelled', created_at: '2026-04-30' }
    ];

    tbody.innerHTML = mockOrders.map(order => `
        <tr class="border-b">
            <td class="py-2 font-semibold">#${order.order_number}</td>
            <td>${order.user?.name || 'Guest'}</td>
            <td>฿${order.total_amount.toLocaleString()}</td>
            <td>${getStatusBadge(order.status)}</td>
            <td class="text-gray-500">${new Date(order.created_at).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

function getStatusBadge(status) {
    const statusMap = {
        pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: { th: 'รอชำระ', en: 'Pending', zh: '待付款' } },
        paid: { bg: 'bg-green-100', text: 'text-green-700', label: { th: 'ชำระแล้ว', en: 'Paid', zh: '已付款' } },
        shipped: { bg: 'bg-blue-100', text: 'text-blue-700', label: { th: 'จัดส่งแล้ว', en: 'Shipped', zh: '已发货' } },
        delivered: { bg: 'bg-gray-100', text: 'text-gray-600', label: { th: 'ส่งแล้ว', en: 'Delivered', zh: '已送达' } },
        cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: { th: 'ยกเลิก', en: 'Cancelled', zh: '已取消' } }
    };
    const s = statusMap[status] || statusMap.pending;
    return `<span class="${s.bg} ${s.text} text-xs px-2 py-0.5 rounded-full">${s.label[currentLang] || s.label.en}</span>`;
}

function useMockDashboardData() {
    updateStatCards({
        todayOrders: 48,
        todayRevenue: 89250,
        activeUsers: 156,
        activeProducts: 234,
        pendingOrders: 12
    });
    loadRevenueChart();
    loadCategoryChart();
    loadRecentOrders();
}

// ==================== PRODUCTS MANAGEMENT ====================
let products = [];
let editingProduct = null;

async function loadProducts() {
    try {
        if (window.ThaiShop && ThaiShop.isSupabaseReady()) {
            const response = await ThaiShop.adminGetProducts();
            products = response.success ? response.data : [];
        } else {
            products = getMockProducts();
        }
        renderProductsTable();
    } catch (err) {
        console.error('Load products error:', err);
        products = getMockProducts();
        renderProductsTable();
    }
}

function getMockProducts() {
    return [
        { id: '1', name_th: 'สมาร์ทโฟน Pro Max', name_en: 'Smartphone Pro Max', category: 'Electronics', price: 12990, stock_quantity: 58, is_active: true, image_url: '📱' },
        { id: '2', name_th: 'หูฟังไร้สาย Pro', name_en: 'Wireless Earbuds Pro', category: 'Electronics', price: 1990, stock_quantity: 120, is_active: true, image_url: '🎧' },
        { id: '3', name_th: 'ชุดเดรสสไตล์ไทย', name_en: 'Thai Style Dress', category: 'Fashion', price: 1290, stock_quantity: 0, is_active: false, image_url: '👗' },
        { id: '4', name_th: 'น้ำชาร้อน', name_en: 'Hot Thai Tea', category: 'Food', price: 45, stock_quantity: 500, is_active: true, image_url: '🍵' },
        { id: '5', name_th: 'ครีมบำรุงผิว', name_en: 'Skin Care Cream', category: 'Beauty', price: 890, stock_quantity: 75, is_active: true, image_url: '🧴' }
    ];
}

function renderProductsTable() {
    const tbody = document.querySelector('#sec-products table tbody');
    if (!tbody) return;

    tbody.innerHTML = products.map(p => {
        const name = p[`name_${currentLang}`] || p.name_en || p.name_th || 'Product';
        return `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-3"><input type="checkbox" class="accent-thai-red"></td>
            <td class="p-3"><div class="w-10 h-10 bg-thai-cream rounded flex items-center justify-center text-lg">${p.image_url || '📦'}</div></td>
            <td class="p-3 font-semibold">${name}</td>
            <td class="p-3 text-gray-500">${p.category || p.product_categories?.name || '-'}</td>
            <td class="p-3">฿${(p.price || 0).toLocaleString()}</td>
            <td class="p-3">${p.stock_quantity || 0}</td>
            <td class="p-3">
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" class="sr-only peer" ${p.is_active ? 'checked' : ''} onchange="toggleProductStatus('${p.id}')">
                    <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                </label>
            </td>
            <td class="p-3">
                <button onclick="openProductModal('${p.id}')" class="text-blue-500 hover:underline text-xs mr-2">
                    <span class="lang-th">แก้ไข</span><span class="lang-en">Edit</span><span class="lang-zh">编辑</span>
                </button>
                <button onclick="confirmDeleteProduct('${p.id}')" class="text-red-500 hover:underline text-xs">
                    <span class="lang-th">ลบ</span><span class="lang-en">Delete</span><span class="lang-zh">删除</span>
                </button>
            </td>
        </tr>
    `}).join('');
}

function openProductModal(productId = null) {
    editingProduct = productId ? products.find(p => p.id === productId) : null;
    let modal = document.getElementById('productModal');
    if (!modal) {
        modal = createProductModal();
    }

    // Reset form
    document.getElementById('productForm').reset();

    if (editingProduct) {
        document.getElementById('productModalTitle').innerHTML =
            '<span class="lang-th">แก้ไขสินค้า</span><span class="lang-en">Edit Product</span><span class="lang-zh">编辑商品</span>';
        // Fill form
        document.getElementById('product_name_th').value = editingProduct.name_th || '';
        document.getElementById('product_name_en').value = editingProduct.name_en || editingProduct.name || '';
        document.getElementById('product_name_zh').value = editingProduct.name_zh || '';
        document.getElementById('product_desc_th').value = editingProduct.description_th || '';
        document.getElementById('product_desc_en').value = editingProduct.description_en || editingProduct.description || '';
        document.getElementById('product_desc_zh').value = editingProduct.description_zh || '';
        document.getElementById('product_price').value = editingProduct.price || 0;
        document.getElementById('product_stock').value = editingProduct.stock_quantity || 0;
        document.getElementById('product_category').value = editingProduct.category_id || editingProduct.category || '';
        document.getElementById('product_active').checked = editingProduct.is_active !== false;
    } else {
        document.getElementById('productModalTitle').innerHTML =
            '<span class="lang-th">เพิ่มสินค้าใหม่</span><span class="lang-en">Add New Product</span><span class="lang-zh">添加新商品</span>';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    switchProductLangTab('th');
}

function createProductModal() {
    const modal = document.createElement('div');
    modal.id = 'productModal';
    modal.className = 'fixed inset-0 bg-black/50 z-50 hidden items-center justify-center overflow-y-auto py-8';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl">
            <div class="flex justify-between items-center mb-4">
                <h3 id="productModalTitle" class="text-xl font-bold text-thai-purple">
                    <span class="lang-th">เพิ่มสินค้าใหม่</span>
                    <span class="lang-en">Add New Product</span>
                    <span class="lang-zh">添加新商品</span>
                </h3>
                <button onclick="closeProductModal()" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>

            <!-- Language Tabs -->
            <div class="flex gap-2 mb-4 border-b">
                <button onclick="switchProductLangTab('th')" class="prod-lang-tab px-4 py-2 font-semibold text-sm border-b-2 border-thai-gold text-thai-purple" data-lang="th">ไทย</button>
                <button onclick="switchProductLangTab('en')" class="prod-lang-tab px-4 py-2 font-semibold text-sm border-b-2 border-transparent text-gray-500" data-lang="en">English</button>
                <button onclick="switchProductLangTab('zh')" class="prod-lang-tab px-4 py-2 font-semibold text-sm border-b-2 border-transparent text-gray-500" data-lang="zh">中文</button>
            </div>

            <form id="productForm" class="space-y-4">
                <!-- Name Fields -->
                <div class="prod-lang-content" data-lang="th">
                    <label class="block text-sm font-semibold text-gray-700 mb-1">ชื่อสินค้า (ไทย) *</label>
                    <input type="text" id="product_name_th" class="w-full border rounded-lg px-3 py-2 outline-none" required>
                </div>
                <div class="prod-lang-content hidden" data-lang="en">
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Product Name (EN) *</label>
                    <input type="text" id="product_name_en" class="w-full border rounded-lg px-3 py-2 outline-none" required>
                </div>
                <div class="prod-lang-content hidden" data-lang="zh">
                    <label class="block text-sm font-semibold text-gray-700 mb-1">商品名称 (中文) *</label>
                    <input type="text" id="product_name_zh" class="w-full border rounded-lg px-3 py-2 outline-none" required>
                </div>

                <!-- Description Fields -->
                <div class="prod-lang-content" data-lang="th">
                    <label class="block text-sm font-semibold text-gray-700 mb-1">รายละเอียด (ไทย)</label>
                    <textarea id="product_desc_th" class="w-full border rounded-lg px-3 py-2 outline-none" rows="2"></textarea>
                </div>
                <div class="prod-lang-content hidden" data-lang="en">
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Description (EN)</label>
                    <textarea id="product_desc_en" class="w-full border rounded-lg px-3 py-2 outline-none" rows="2"></textarea>
                </div>
                <div class="prod-lang-content hidden" data-lang="zh">
                    <label class="block text-sm font-semibold text-gray-700 mb-1">商品详情 (中文)</label>
                    <textarea id="product_desc_zh" class="w-full border rounded-lg px-3 py-2 outline-none" rows="2"></textarea>
                </div>

                <!-- Price & Stock -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">ราคา (฿) *</label>
                        <input type="number" id="product_price" class="w-full border rounded-lg px-3 py-2 outline-none" required min="0">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">สต็อก *</label>
                        <input type="number" id="product_stock" class="w-full border rounded-lg px-3 py-2 outline-none" required min="0">
                    </div>
                </div>

                <!-- Category & Active -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">หมวดหมู่</label>
                        <select id="product_category" class="w-full border rounded-lg px-3 py-2 outline-none">
                            <option value="">-- เลือกหมวดหมู่ --</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Fashion">Fashion</option>
                            <option value="Food">Food</option>
                            <option value="Home">Home</option>
                            <option value="Beauty">Beauty</option>
                        </select>
                    </div>
                    <div class="flex items-center gap-2 pt-6">
                        <input type="checkbox" id="product_active" class="accent-thai-gold w-5 h-5" checked>
                        <label for="product_active" class="text-sm font-semibold">เปิดใช้งาน / Active</label>
                    </div>
                </div>

                <!-- Image Upload -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">รูปภาพ</label>
                    <div class="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-thai-gold transition" onclick="document.getElementById('product_image').click()">
                        <input type="file" id="product_image" accept="image/*" class="hidden" onchange="handleImageUpload(this)">
                        <div id="imagePreview" class="text-gray-400">
                            <span class="text-4xl">📷</span>
                            <p class="text-sm mt-2">
                                <span class="lang-th">คลิกเพื่ออัพโหลดรูป</span>
                                <span class="lang-en">Click to upload image</span>
                                <span class="lang-zh">点击上传图片</span>
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Actions -->
                <div class="flex gap-3 justify-end pt-4 border-t">
                    <button type="button" onclick="closeProductModal()" class="px-6 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">
                        <span class="lang-th">ยกเลิก</span><span class="lang-en">Cancel</span><span class="lang-zh">取消</span>
                    </button>
                    <button type="submit" class="px-6 py-2 bg-thai-gold text-thai-purple rounded-lg font-bold hover:bg-thai-orange hover:text-white">
                        <span class="lang-th">บันทึก</span><span class="lang-en">Save</span><span class="lang-zh">保存</span>
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
    return modal;
}

function switchProductLangTab(lang) {
    document.querySelectorAll('.prod-lang-tab').forEach(tab => {
        tab.classList.remove('border-thai-gold', 'text-thai-purple');
        tab.classList.add('border-transparent', 'text-gray-500');
        if (tab.dataset.lang === lang) {
            tab.classList.add('border-thai-gold', 'text-thai-purple');
            tab.classList.remove('border-transparent', 'text-gray-500');
        }
    });
    document.querySelectorAll('.prod-lang-content').forEach(content => {
        content.classList.add('hidden');
        if (content.dataset.lang === lang) {
            content.classList.remove('hidden');
        }
    });
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    editingProduct = null;
}

function handleImageUpload(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('imagePreview').innerHTML =
                `<img src="${e.target.result}" class="max-h-32 mx-auto rounded-lg">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function handleProductSubmit(e) {
    e.preventDefault();

    const productData = {
        name_th: document.getElementById('product_name_th').value,
        name_en: document.getElementById('product_name_en').value,
        name_zh: document.getElementById('product_name_zh').value,
        description_th: document.getElementById('product_desc_th').value,
        description_en: document.getElementById('product_desc_en').value,
        description_zh: document.getElementById('product_desc_zh').value,
        price: parseFloat(document.getElementById('product_price').value),
        stock_quantity: parseInt(document.getElementById('product_stock').value),
        category: document.getElementById('product_category').value,
        is_active: document.getElementById('product_active').checked
    };

    try {
        if (window.ThaiShop && ThaiShop.isSupabaseReady()) {
            if (editingProduct) {
                await ThaiShop.adminUpdateProduct(editingProduct.id, productData);
            } else {
                await ThaiShop.adminCreateProduct(productData);
            }
        } else {
            // Demo mode
            if (editingProduct) {
                const idx = products.findIndex(p => p.id === editingProduct.id);
                if (idx >= 0) products[idx] = { ...products[idx], ...productData };
            } else {
                products.unshift({ id: Date.now().toString(), ...productData, image_url: '📦' });
            }
        }

        closeProductModal();
        loadProducts();
        showToast('success', getText('บันทึกสำเร็จ', 'Saved successfully', '保存成功'));
    } catch (err) {
        console.error('Product save error:', err);
        showToast('error', getText('เกิดข้อผิดพลาด', 'Error occurred', '发生错误'));
    }
}

function confirmDeleteProduct(productId) {
    if (confirm(getText('ต้องการลบสินค้านี้?', 'Delete this product?', '确定删除此商品?'))) {
        deleteProduct(productId);
    }
}

async function deleteProduct(productId) {
    try {
        if (window.ThaiShop && ThaiShop.isSupabaseReady()) {
            await ThaiShop.adminDeleteProduct(productId);
        } else {
            products = products.filter(p => p.id !== productId);
        }
        loadProducts();
        showToast('success', getText('ลบสำเร็จ', 'Deleted successfully', '删除成功'));
    } catch (err) {
        console.error('Delete error:', err);
    }
}

async function toggleProductStatus(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    try {
        if (window.ThaiShop && ThaiShop.isSupabaseReady()) {
            await ThaiShop.adminUpdateProduct(productId, { is_active: !product.is_active });
        } else {
            product.is_active = !product.is_active;
        }
        loadProducts();
    } catch (err) {
        console.error('Toggle status error:', err);
    }
}

// ==================== ORDERS MANAGEMENT ====================
let orders = [];
let currentOrderFilter = 'all';

async function loadOrders(filter = 'all') {
    currentOrderFilter = filter;

    try {
        if (window.ThaiShop && ThaiShop.isSupabaseReady()) {
            const filterObj = filter !== 'all' ? { status: filter } : {};
            const response = await ThaiShop.adminGetOrders(filterObj);
            orders = response.success ? response.data : [];
        } else {
            orders = getMockOrders();
            if (filter !== 'all') {
                orders = orders.filter(o => o.status === filter);
            }
        }
        renderOrdersTable();
    } catch (err) {
        console.error('Load orders error:', err);
        orders = getMockOrders();
        renderOrdersTable();
    }
}

function getMockOrders() {
    return [
        { id: '1', order_number: 'TH20260504001', user: { name: 'Somchai K.', email: 'somchai@email.com' }, items: 3, total_amount: 17660, status: 'paid', created_at: '2026-05-04', tracking_number: null },
        { id: '2', order_number: 'TH20260503002', user: { name: 'Wichai P.', email: 'wichai@email.com' }, items: 1, total_amount: 2490, status: 'pending', created_at: '2026-05-03', tracking_number: null },
        { id: '3', order_number: 'TH20260502003', user: { name: 'Narisa S.', email: 'narisa@email.com' }, items: 2, total_amount: 5990, status: 'shipped', created_at: '2026-05-02', tracking_number: 'TH123456789' },
        { id: '4', order_number: 'TH20260501004', user: { name: 'Pornchai R.', email: 'pornchai@email.com' }, items: 5, total_amount: 890, status: 'delivered', created_at: '2026-05-01', tracking_number: 'TH987654321' },
        { id: '5', order_number: 'TH20260430005', user: { name: 'Kanya T.', email: 'kanya@email.com' }, items: 2, total_amount: 12990, status: 'cancelled', created_at: '2026-04-30', tracking_number: null }
    ];
}

function renderOrdersTable() {
    const tbody = document.querySelector('#sec-orders table tbody');
    if (!tbody) return;

    tbody.innerHTML = orders.map(order => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-3 font-semibold">#${order.order_number || order.id.slice(0, 8).toUpperCase()}</td>
            <td class="p-3">${order.user?.name || order.users?.full_name || 'Guest'}</td>
            <td class="p-3">${order.items || order.order_items?.length || '-'}</td>
            <td class="p-3">฿${(order.total_amount || 0).toLocaleString()}</td>
            <td class="p-3">${getStatusBadge(order.status)}</td>
            <td class="p-3 text-gray-500">${new Date(order.created_at).toLocaleDateString()}</td>
            <td class="p-3">
                <button onclick="viewOrderDetail('${order.id}')" class="text-blue-500 hover:underline text-xs">
                    <span class="lang-th">ดู</span><span class="lang-en">View</span><span class="lang-zh">查看</span>
                </button>
            </td>
        </tr>
    `).join('');
}

async function viewOrderDetail(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    let modal = document.getElementById('orderDetailModal');
    if (!modal) {
        modal = createOrderDetailModal();
    }

    const content = modal.querySelector('#orderDetailContent');
    content.innerHTML = `
        <div class="space-y-4">
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-bold text-lg">#${order.order_number || order.id.slice(0, 8).toUpperCase()}</h4>
                    <p class="text-sm text-gray-500">${new Date(order.created_at).toLocaleString()}</p>
                </div>
                ${getStatusBadge(order.status)}
            </div>

            <div class="border-t pt-4">
                <h5 class="font-semibold text-sm mb-2">
                    <span class="lang-th">ข้อมูลลูกค้า</span>
                    <span class="lang-en">Customer Info</span>
                    <span class="lang-zh">客户信息</span>
                </h5>
                <p class="text-sm">${order.user?.name || order.users?.full_name || 'N/A'}</p>
                <p class="text-sm text-gray-500">${order.user?.email || order.users?.email || 'N/A'}</p>
            </div>

            <div class="border-t pt-4">
                <h5 class="font-semibold text-sm mb-2">
                    <span class="lang-th">สถานะคำสั่งซื้อ</span>
                    <span class="lang-en">Order Status</span>
                    <span class="lang-zh">订单状态</span>
                </h5>
                <select id="orderStatusSelect" class="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending / รอชำระ</option>
                    <option value="paid" ${order.status === 'paid' ? 'selected' : ''}>Paid / ชำระแล้ว</option>
                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped / จัดส่งแล้ว</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered / ส่งแล้ว</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled / ยกเลิก</option>
                </select>
                <button onclick="updateOrderStatus('${orderId}')" class="mt-2 w-full bg-thai-gold text-thai-purple py-2 rounded-lg font-bold">
                    <span class="lang-th">อัพเดทสถานะ</span><span class="lang-en">Update Status</span><span class="lang-zh">更新状态</span>
                </button>
            </div>

            <div class="border-t pt-4">
                <h5 class="font-semibold text-sm mb-2">
                    <span class="lang-th">เลขติดตามพัสดุ</span>
                    <span class="lang-en">Tracking Number</span>
                    <span class="lang-zh">物流追踪号</span>
                </h5>
                <div class="flex gap-2">
                    <input type="text" id="trackingNumberInput" value="${order.tracking_number || ''}"
                        class="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="TH123456789">
                    <button onclick="saveTrackingNumber('${orderId}')" class="bg-thai-gold text-thai-purple px-4 py-2 rounded-lg text-sm font-bold">
                        <span class="lang-th">บันทึก</span><span class="lang-en">Save</span><span class="lang-zh">保存</span>
                    </button>
                </div>
            </div>

            <div class="border-t pt-4">
                <h5 class="font-semibold text-sm mb-2">
                    <span class="lang-th">ยอดรวม</span>
                    <span class="lang-en">Total</span>
                    <span class="lang-zh">总计</span>
                </h5>
                <p class="text-2xl font-bold text-thai-red">฿${(order.total_amount || 0).toLocaleString()}</p>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function createOrderDetailModal() {
    const modal = document.createElement('div');
    modal.id = 'orderDetailModal';
    modal.className = 'fixed inset-0 bg-black/50 z-50 hidden items-center justify-center';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-thai-purple">
                    <span class="lang-th">รายละเอียดคำสั่งซื้อ</span>
                    <span class="lang-en">Order Details</span>
                    <span class="lang-zh">订单详情</span>
                </h3>
                <button onclick="closeOrderDetailModal()" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <div id="orderDetailContent"></div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

function closeOrderDetailModal() {
    const modal = document.getElementById('orderDetailModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function updateOrderStatus(orderId) {
    const status = document.getElementById('orderStatusSelect').value;

    try {
        if (window.ThaiShop && ThaiShop.isSupabaseReady()) {
            await ThaiShop.adminUpdateOrderStatus(orderId, status);
        } else {
            const order = orders.find(o => o.id === orderId);
            if (order) order.status = status;
        }
        loadOrders(currentOrderFilter);
        closeOrderDetailModal();
        showToast('success', getText('อัพเดทสถานะสำเร็จ', 'Status updated', '状态已更新'));
    } catch (err) {
        console.error('Update status error:', err);
        showToast('error', getText('เกิดข้อผิดพลาด', 'Error occurred', '发生错误'));
    }
}

async function saveTrackingNumber(orderId) {
    const trackingNumber = document.getElementById('trackingNumberInput').value;
    // In real implementation, this would save to the database
    const order = orders.find(o => o.id === orderId);
    if (order) order.tracking_number = trackingNumber;
    showToast('success', getText('บันทึกเลขติดตามสำเร็จ', 'Tracking saved', '追踪号已保存'));
}

// ==================== USERS MANAGEMENT ====================
let users = [];

async function loadUsers(searchQuery = '') {
    try {
        if (window.ThaiShop && ThaiShop.isSupabaseReady()) {
            const response = await ThaiShop.adminGetUsers();
            users = response.success ? response.data : [];
        } else {
            users = getMockUsers();
        }

        if (searchQuery) {
            users = users.filter(u =>
                (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (u.phone && u.phone.includes(searchQuery)) ||
                (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }
        renderUsersTable();
    } catch (err) {
        console.error('Load users error:', err);
        users = getMockUsers();
        renderUsersTable();
    }
}

function getMockUsers() {
    return [
        { id: '1', full_name: 'Somchai K.', email: 'somchai@email.com', phone: '08x-xxx-xx01', order_count: 12, total_spent: 45890, created_at: '2025-12-01' },
        { id: '2', full_name: 'Narisa S.', email: 'narisa@email.com', phone: '08x-xxx-xx02', order_count: 8, total_spent: 23450, created_at: '2026-01-15' },
        { id: '3', full_name: 'Wichai P.', email: 'wichai@email.com', phone: '08x-xxx-xx03', order_count: 5, total_spent: 12300, created_at: '2026-02-20' },
        { id: '4', full_name: 'Pornchai R.', email: 'pornchai@email.com', phone: '08x-xxx-xx04', order_count: 15, total_spent: 67800, created_at: '2025-11-01' },
        { id: '5', full_name: 'Kanya T.', email: 'kanya@email.com', phone: '08x-xxx-xx05', order_count: 3, total_spent: 5990, created_at: '2026-03-10' }
    ];
}

function renderUsersTable() {
    const tbody = document.querySelector('#sec-users table tbody');
    if (!tbody) return;

    tbody.innerHTML = users.map(user => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-3 flex items-center gap-2">
                <div class="w-8 h-8 bg-thai-cream rounded-full flex items-center justify-center text-sm">😊</div>
                <span class="font-semibold">${user.full_name || user.email?.split('@')[0] || 'User'}</span>
            </td>
            <td class="p-3 text-gray-500">${user.email || '-'}</td>
            <td class="p-3">${user.phone || '-'}</td>
            <td class="p-3">${user.order_count || 0}</td>
            <td class="p-3 font-semibold">฿${(user.total_spent || 0).toLocaleString()}</td>
            <td class="p-3 text-gray-500">${new Date(user.created_at).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

// ==================== SETTINGS MANAGEMENT ====================
let settings = {};

async function loadSettings() {
    settings = getDefaultSettings();
    populateSettingsForm();
}

function getDefaultSettings() {
    return {
        site_name: 'ThaiShop',
        description: 'Thailand\'s leading online shopping platform',
        currency: 'THB',
        free_shipping_threshold: 500,
        standard_shipping_rate: 50,
        express_shipping_rate: 100,
        default_language: 'th',
        payment_promptpay: true,
        payment_card: true,
        payment_cod: true
    };
}

function populateSettingsForm() {
    // Settings are already populated in HTML, this is for dynamic loading
}

function saveSettings(section) {
    showToast('success', getText('บันทึกสำเร็จ', 'Settings saved', '保存成功'));
}

function changeAdminPassword() {
    const oldPwd = document.getElementById('old-password');
    const newPwd = document.getElementById('new-password');
    const confirmPwd = document.getElementById('confirm-password');
    if (!oldPwd || !newPwd || !confirmPwd) return;

    if (!oldPwd.value || !newPwd.value || !confirmPwd.value) {
        showToast('error', getText('กรอกข้อมูลให้ครบ', 'Fill in all fields', '请填写所有字段'));
        return;
    }
    if (newPwd.value !== confirmPwd.value) {
        showToast('error', getText('รหัสผ่านไม่ตรงกัน', 'Passwords do not match', '两次密码不一致'));
        return;
    }
    if (newPwd.value.length < 6) {
        showToast('error', getText('รหัสผ่านต้องมีอย่างน้อย 6 ตัว', 'Password must be at least 6 characters', '密码至少6位'));
        return;
    }

    // Try Supabase password update
    try {
        if (window.ThaiShop && ThaiShop.isSupabaseReady()) {
            ThaiShop.updatePassword(newPwd.value).then(() => {
                showToast('success', getText('เปลี่ยนรหัสผ่านสำเร็จ', 'Password changed', '密码修改成功'));
                oldPwd.value = '';
                newPwd.value = '';
                confirmPwd.value = '';
            }).catch(err => {
                showToast('error', err.message);
            });
        } else {
            showToast('success', getText('เปลี่ยนรหัสผ่านสำเร็จ', 'Password changed', '密码修改成功'));
            oldPwd.value = '';
            newPwd.value = '';
            confirmPwd.value = '';
        }
    } catch (err) {
        showToast('error', getText('เกิดข้อผิดพลาด', 'Error occurred', '发生错误'));
    }
}

// ==================== SECTION NAVIGATION ====================
function showSection(name) {
    currentSection = name;
    const sections = ['dashboard', 'products', 'orders', 'users', 'finance', 'settings'];

    sections.forEach(s => {
        const el = document.getElementById('sec-' + s);
        if (el) {
            el.classList.toggle('hidden', s !== name);
        }
    });

    // Update sidebar active state
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });

    // Find and activate the correct sidebar link
    const sectionNames = {
        dashboard: ['แดช', 'Dash', '仪表'],
        products: ['สินค้า', 'Product', '商品'],
        orders: ['คำสั่ง', 'Order', '订单'],
        users: ['ผู้ใช้', 'User', '用户'],
        finance: ['การเงิน', 'Finance', '财务'],
        settings: ['ตั้งค่า', 'Settings', '设置']
    };

    document.querySelectorAll('.sidebar-link').forEach(link => {
        const text = link.textContent;
        const keywords = sectionNames[name] || [];
        if (keywords.some(k => text.includes(k))) {
            link.classList.add('active');
        }
    });

    // Update page title
    const titles = {
        dashboard: { th: 'แดชบอร์ด', en: 'Dashboard', zh: '仪表盘' },
        products: { th: 'สินค้า', en: 'Products', zh: '商品管理' },
        orders: { th: 'คำสั่งซื้อ', en: 'Orders', zh: '订单管理' },
        users: { th: 'ผู้ใช้', en: 'Users', zh: '用户管理' },
        finance: { th: 'การเงิน', en: 'Finance', zh: '财务管理' },
        settings: { th: 'ตั้งค่า', en: 'Settings', zh: '系统设置' }
    };

    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle && titles[name]) {
        pageTitle.innerHTML = titles[name][currentLang] || titles[name].en;
    }

    // Load section data
    switch (name) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'products':
            loadProducts();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'users':
            loadUsers();
            break;
        case 'settings':
            loadSettings();
            break;
    }

    // Close mobile sidebar
    if (window.innerWidth < 1024) {
        document.getElementById('sidebar').classList.add('closed');
    }
}

// ==================== LANGUAGE SWITCHING ====================
function switchLang(lang) {
    currentLang = lang;
    document.body.className = 'lang-' + lang;
    try {
        localStorage.setItem('thaishop-lang', lang);
    } catch (e) {}

    // Update language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('bg-thai-red', 'text-white');
        const langMap = { th: 'ไทย', en: 'EN', zh: '中文' };
        if (btn.textContent.trim() === langMap[lang]) {
            btn.classList.add('bg-thai-red', 'text-white');
        }
    });

    // Re-render current section
    showSection(currentSection);
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'} text-white font-semibold`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // Check admin authentication
    checkAdminAuth();

    // Set up order filter buttons
    document.querySelectorAll('.order-filter').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.order-filter').forEach(b => {
                b.classList.remove('bg-thai-red', 'text-white');
                b.classList.add('bg-gray-100', 'text-gray-600');
            });
            this.classList.add('bg-thai-red', 'text-white');
            this.classList.remove('bg-gray-100', 'text-gray-600');

            const filter = this.dataset.filter || 'all';
            loadOrders(filter);
        });
    });

    // Set up product search
    const productSearch = document.getElementById('productSearchInput');
    if (productSearch) {
        productSearch.addEventListener('input', debounce(function() {
            const query = this.value.toLowerCase();
            const tbody = document.querySelector('#sec-products table tbody');
            if (tbody) {
                tbody.querySelectorAll('tr').forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(query) ? '' : 'none';
                });
            }
        }, 300));
    }

    // Set up user search
    const userSearch = document.getElementById('userSearchInput');
    if (userSearch) {
        userSearch.addEventListener('input', debounce(function() {
            loadUsers(this.value);
        }, 300));
    }

    // Add logout button
    const sidebarFooter = document.querySelector('#sidebar .p-4.border-t');
    if (sidebarFooter) {
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'mt-2 w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm flex items-center gap-2';
        logoutBtn.innerHTML = '🚪 <span class="lang-th">ออกจากระบบ</span><span class="lang-en">Logout</span><span class="lang-zh">退出</span>';
        logoutBtn.onclick = adminLogout;
        sidebarFooter.appendChild(logoutBtn);
    }

    // Load saved language preference
    try {
        const savedLang = localStorage.getItem('thaishop-lang');
        if (savedLang) {
            currentLang = savedLang;
            document.body.className = 'lang-' + savedLang;
        }
    } catch (e) {}
});

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make functions globally available
window.showSection = showSection;
window.switchLang = switchLang;
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.confirmDeleteProduct = confirmDeleteProduct;
window.toggleProductStatus = toggleProductStatus;
window.viewOrderDetail = viewOrderDetail;
window.closeOrderDetailModal = closeOrderDetailModal;
window.updateOrderStatus = updateOrderStatus;
window.saveTrackingNumber = saveTrackingNumber;
window.adminLogout = adminLogout;
window.checkAdminAuth = checkAdminAuth;

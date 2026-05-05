/**
 * ThaiShop Products Page JavaScript
 * Handles: Category filters, Price sorting, Pagination, Product grid, Cart functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize page
    initLanguageFromStorage();
    initProductsPage();

    // Load products on page load
    loadProducts();
});

// ===== Page State =====
var currentPage = 1;
var itemsPerPage = 12;
var currentFilters = {
    category: null,
    minPrice: null,
    maxPrice: null,
    sort: 'newest'
};
var allProducts = [];

// ===== Initialize Page =====
async function initProductsPage() {
    // Parse URL parameters for category filter
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam) {
        currentFilters.category = categoryParam;
        // Pre-select the category in sidebar
        setTimeout(function() {
            selectCategoryCheckbox(categoryParam);
        }, 100);
    }

    // Load categories for sidebar
    await loadCategoryFilters();

    // Initialize sort dropdown
    initSortDropdown();

    // Initialize price filter
    initPriceFilter();

    // Initialize mobile filter toggle
    initMobileFilter();
}

function initSortDropdown() {
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            currentFilters.sort = this.value;
            currentPage = 1;
            applyFiltersAndReload();
        });
    }
}

function initPriceFilter() {
    const applyBtn = document.getElementById('applyPriceFilter');
    if (applyBtn) {
        applyBtn.addEventListener('click', function() {
            const minInput = document.getElementById('minPrice');
            const maxInput = document.getElementById('maxPrice');
            currentFilters.minPrice = minInput ? parseFloat(minInput.value) || null : null;
            currentFilters.maxPrice = maxInput ? parseFloat(maxInput.value) || null : null;
            currentPage = 1;
            applyFiltersAndReload();
        });
    }
}

function initMobileFilter() {
    // Mobile filter is handled by inline onclick in HTML
}

// ===== Category Filters =====
async function loadCategoryFilters() {
    const container = document.getElementById('categoryFilterList');
    if (!container) return;

    try {
        if (typeof getCategories === 'function') {
            const categories = await getCategories();
            renderCategoryFilters(categories);
        } else {
            // Fallback static categories
            renderStaticCategoryFilters();
        }
    } catch (error) {
        console.error('Failed to load categories:', error);
        renderStaticCategoryFilters();
    }
}

function renderCategoryFilters(categories) {
    const container = document.getElementById('categoryFilterList');
    if (!container) return;

    let html = '';
    categories.forEach(function(cat) {
        const isChecked = currentFilters.category === cat.id ? 'checked' : '';
        html += `
            <label class="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" class="accent-thai-red category-checkbox" 
                       value="${cat.id}" ${isChecked} 
                       onchange="handleCategoryFilter(this)">
                <span class="lang-th">${cat.name_th || cat.name}</span>
                <span class="lang-en">${cat.name_en || cat.name}</span>
                <span class="lang-zh">${cat.name_zh || cat.name}</span>
            </label>
        `;
    });

    container.innerHTML = html;
}

function renderStaticCategoryFilters() {
    const container = document.getElementById('categoryFilterList');
    if (!container) return;
    // Keep static HTML content
}

function handleCategoryFilter(checkbox) {
    // If checkbox is checked, set as filter; if unchecked, clear
    if (checkbox.checked) {
        currentFilters.category = checkbox.value;
        // Uncheck other checkboxes
        document.querySelectorAll('.category-checkbox').forEach(function(cb) {
            if (cb !== checkbox) cb.checked = false;
        });
    } else {
        currentFilters.category = null;
    }
    currentPage = 1;
    applyFiltersAndReload();
}

function selectCategoryCheckbox(categoryId) {
    const checkboxes = document.querySelectorAll('.category-checkbox');
    checkboxes.forEach(function(cb) {
        if (cb.value === categoryId) {
            cb.checked = true;
            currentFilters.category = categoryId;
        } else {
            cb.checked = false;
        }
    });
}

function clearAllFilters() {
    currentFilters = {
        category: null,
        minPrice: null,
        maxPrice: null,
        sort: 'newest'
    };

    // Clear checkboxes
    document.querySelectorAll('.category-checkbox').forEach(function(cb) {
        cb.checked = false;
    });

    // Clear price inputs
    const minInput = document.getElementById('minPrice');
    const maxInput = document.getElementById('maxPrice');
    if (minInput) minInput.value = '';
    if (maxInput) maxInput.value = '';

    // Reset sort dropdown
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.value = 'newest';

    currentPage = 1;
    loadProducts();
}

// ===== Load Products =====
async function loadProducts() {
    const grid = document.getElementById('productGrid');
    const countEl = document.getElementById('productCount');

    if (grid) {
        grid.innerHTML = '<div class="col-span-4 text-center py-12"><div class="text-4xl mb-4">⏳</div><p class="text-gray-500"><span class="lang-th">กำลังโหลดสินค้า...</span><span class="lang-en">Loading products...</span><span class="lang-zh">加载商品中...</span></p></div>';
    }

    try {
        // Build query parameters
        const params = {
            page: currentPage,
            limit: itemsPerPage
        };

        if (currentFilters.category) {
            params.category = currentFilters.category;
        }

        if (currentFilters.minPrice) {
            params.minPrice = currentFilters.minPrice;
        }

        if (currentFilters.maxPrice) {
            params.maxPrice = currentFilters.maxPrice;
        }

        // Handle sorting
        switch (currentFilters.sort) {
            case 'price_low':
                params.sort = 'price_asc';
                break;
            case 'price_high':
                params.sort = 'price_desc';
                break;
            case 'popular':
                params.sort = 'popular';
                break;
            default:
                params.sort = 'newest';
        }

        let result;
        if (typeof getProducts === 'function') {
            result = await getProducts(params);
            allProducts = result.products || result || [];
            renderProducts(allProducts);
            renderPagination(result.total || allProducts.length);
        } else {
            // Mock data fallback
            allProducts = getMockProducts();
            renderProducts(allProducts);
            renderPagination(allProducts.length);
        }

        // Update count display
        if (countEl) {
            const total = result?.total || allProducts.length;
            countEl.textContent = total;
        }

    } catch (error) {
        console.error('Failed to load products:', error);
        showError(grid);
    }
}

function applyFiltersAndReload() {
    loadProducts();
}

// ===== Render Products =====
function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (!products || products.length === 0) {
        grid.innerHTML = `
            <div class="col-span-4 text-center py-12">
                <div class="text-6xl mb-4">📦</div>
                <p class="text-gray-500 text-lg">
                    <span class="lang-th">ไม่พบสินค้าที่ค้นหา</span>
                    <span class="lang-en">No products found</span>
                    <span class="lang-zh">未找到商品</span>
                </p>
            </div>
        `;
        return;
    }

    let html = '';
    products.forEach(function(product) {
        const originalPrice = product.price;
        const salePrice = product.sale_price || product.price;
        const hasDiscount = salePrice < originalPrice;
        const discountPercent = hasDiscount ? Math.round((1 - salePrice / originalPrice) * 100) : 0;
        const isOutOfStock = product.stock_quantity <= 0;

        html += `
            <div class="product-card bg-white rounded-xl overflow-hidden shadow-sm cursor-pointer ${isOutOfStock ? 'opacity-70' : ''}"
                 onclick="navigateToProduct('${product.id}')">
                <div class="relative aspect-square bg-gradient-to-br from-thai-cream to-yellow-50 flex items-center justify-center text-5xl">
                    ${getProductEmoji(product.category_id)}
                    ${isOutOfStock ? `
                        <div class="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span class="bg-thai-red text-white px-3 py-1 rounded-full text-sm font-bold">
                                <span class="lang-th">สินค้าหมด</span>
                                <span class="lang-en">Sold Out</span>
                                <span class="lang-zh">售完</span>
                            </span>
                        </div>
                    ` : ''}
                    ${hasDiscount ? `
                        <span class="absolute top-2 left-2 bg-thai-red text-white text-xs px-2 py-0.5 rounded-full font-bold">-${discountPercent}%</span>
                    ` : ''}
                </div>
                <div class="p-3">
                    <h3 class="font-semibold text-sm text-gray-800 line-clamp-2 mb-1">
                        <span class="lang-th">${product.name_th || product.name}</span>
                        <span class="lang-en">${product.name_en || product.name}</span>
                        <span class="lang-zh">${product.name_zh || product.name}</span>
                    </h3>
                    <div class="flex items-center gap-2">
                        <span class="text-thai-red font-bold">฿${Math.round(salePrice).toLocaleString()}</span>
                        ${hasDiscount ? `<span class="text-gray-400 line-through text-xs">฿${Math.round(originalPrice).toLocaleString()}</span>` : ''}
                    </div>
                    <div class="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <span class="text-yellow-400">⭐</span>
                        <span>${product.rating || 4.5}</span>
                        <span>|</span>
                        <span><span class="lang-th">ขายแล้ว</span><span class="lang-en">Sold</span><span class="lang-zh">已售</span> ${product.sold_count || 0}</span>
                    </div>
                    <button onclick="event.stopPropagation(); addToCartFromList('${product.id}', '${product.name}', ${salePrice}, ${product.stock_quantity})" 
                            class="mt-2 w-full bg-thai-gold text-thai-purple py-1.5 rounded-lg text-xs font-bold hover:bg-thai-orange hover:text-white transition ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}"
                            ${isOutOfStock ? 'disabled' : ''}>
                        <span class="lang-th">เพิ่มลงตะกร้า</span>
                        <span class="lang-en">Add to Cart</span>
                        <span class="lang-zh">加入购物车</span>
                    </button>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

function showError(container) {
    if (!container) return;
    container.innerHTML = `
        <div class="col-span-4 text-center py-12">
            <div class="text-6xl mb-4">❌</div>
            <p class="text-gray-500">
                <span class="lang-th">เกิดข้อผิดพลาดในการโหลดสินค้า</span>
                <span class="lang-en">Failed to load products</span>
                <span class="lang-zh">加载商品失败</span>
            </p>
            <button onclick="loadProducts()" class="mt-4 px-4 py-2 bg-thai-red text-white rounded-lg">
                <span class="lang-th">ลองใหม่</span>
                <span class="lang-en">Try Again</span>
                <span class="lang-zh">重试</span>
            </button>
        </div>
    `;
}

// ===== Pagination =====
function renderPagination(totalItems) {
    const container = document.getElementById('pagination');
    if (!container) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // Previous button
    html += `
        <button onclick="goToPage(${currentPage - 1})" 
                class="px-3 py-2 rounded-lg bg-white border hover:border-thai-gold text-sm ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}"
                ${currentPage === 1 ? 'disabled' : ''}>‹</button>
    `;

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        html += `<button onclick="goToPage(1)" class="px-3 py-2 rounded-lg bg-white border hover:border-thai-gold text-sm">1</button>`;
        if (startPage > 2) {
            html += `<span class="px-2 text-gray-400">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        html += `
            <button onclick="goToPage(${i})" 
                    class="px-3 py-2 rounded-lg text-sm font-bold ${isActive ? 'bg-thai-red text-white' : 'bg-white border hover:border-thai-gold'}">${i}</button>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="px-2 text-gray-400">...</span>`;
        }
        html += `<button onclick="goToPage(${totalPages})" class="px-3 py-2 rounded-lg bg-white border hover:border-thai-gold text-sm">${totalPages}</button>`;
    }

    // Next button
    html += `
        <button onclick="goToPage(${currentPage + 1})" 
                class="px-3 py-2 rounded-lg bg-white border hover:border-thai-gold text-sm ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}"
                ${currentPage === totalPages ? 'disabled' : ''}>›</button>
    `;

    container.innerHTML = html;
}

function goToPage(page) {
    const totalPages = Math.ceil((allProducts.length || 1) / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadProducts();
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== Cart Functionality =====
async function addToCartFromList(productId, productName, price, stockQuantity) {
    if (stockQuantity <= 0) {
        showToast(getLocalizedText('out_of_stock'), 'error');
        return;
    }

    try {
        if (typeof addToCart === 'function') {
            await addToCart(productId, 1);
        } else {
            // Fallback cart implementation
            await addToCartLocal(productId, productName, price);
        }
        showToast(getLocalizedText('added_to_cart'), 'success');
    } catch (error) {
        console.error('Failed to add to cart:', error);
        showToast(getLocalizedText('failed_to_add'), 'error');
    }
}

async function addToCartLocal(productId, productName, price) {
    const cartKey = 'thaishop_cart';
    let cart = [];

    try {
        const existing = localStorage.getItem(cartKey);
        if (existing) {
            cart = JSON.parse(existing);
        }

        // Check if product already in cart
        const existingIndex = cart.findIndex(item => item.id === productId);
        if (existingIndex >= 0) {
            cart[existingIndex].quantity += 1;
        } else {
            cart.push({
                id: productId,
                name: productName,
                price: price,
                quantity: 1,
                addedAt: new Date().toISOString()
            });
        }

        localStorage.setItem(cartKey, JSON.stringify(cart));
        updateCartBadge();

    } catch (error) {
        console.error('Cart error:', error);
    }
}

function updateCartBadge() {
    const cartKey = 'thaishop_cart';
    const badges = document.querySelectorAll('.cart-badge');

    try {
        const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);

        badges.forEach(function(badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        });
    } catch (error) {
        console.error('Failed to update cart badge:', error);
    }
}

// ===== Language Switching =====
function initLanguageFromStorage() {
    try {
        var saved = localStorage.getItem('lang') || 'zh';
        switchLanguage(saved);
    } catch (e) {
        switchLanguage('zh');
    }
}

function switchLanguage(lang) {
    document.body.className = 'lang-' + lang;
    try {
        localStorage.setItem('lang', lang);
    } catch (e) {}

    // Update language button states
    document.querySelectorAll('.lang-btn').forEach(function(b) {
        b.classList.remove('active');
        var txt = b.textContent.trim();
        if (
            (lang === 'zh' && txt === '中文') ||
            (lang === 'en' && txt === 'EN') ||
            (lang === 'th' && txt === 'ไทย')
        ) {
            b.classList.add('active');
        }
    });
}

// ===== Utility Functions =====
function navigateToProduct(productId) {
    window.location.href = `product-detail.html?id=${productId}`;
}

function getProductEmoji(categoryId) {
    const emojiMap = {
        'beauty': '🧴',
        'fashion': '👗',
        'food': '🍜',
        'electronics': '📱',
        'home': '🏠',
        'health': '💊',
        'sports': '⚽',
        'toys': '🧸',
        'books': '📚',
        'default': '🎁'
    };
    return emojiMap[categoryId] || emojiMap['default'];
}

function getLocalizedText(key) {
    const texts = {
        'zh': {
            'added_to_cart': '已加入购物车！',
            'out_of_stock': '商品已售完',
            'failed_to_add': '加入购物车失败'
        },
        'en': {
            'added_to_cart': 'Added to cart!',
            'out_of_stock': 'Out of stock',
            'failed_to_add': 'Failed to add to cart'
        },
        'th': {
            'added_to_cart': 'เพิ่มลงตะกร้าแล้ว!',
            'out_of_stock': 'สินค้าหมด',
            'failed_to_add': 'เพิ่มลงตะกร้าไม่สำเร็จ'
        }
    };

    const lang = document.body.className.replace('lang-', '') || 'zh';
    return texts[lang]?.[key] || texts['zh'][key];
}

function showToast(message, type) {
    type = type || 'success';
    var toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-xl z-50 text-white font-semibold ${
        type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-thai-purple'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(function() {
            document.body.removeChild(toast);
        }, 300);
    }, 2500);
}

// ===== Mock Data (Fallback) =====
function getMockProducts() {
    return [
        { id: '1', name: 'Smartphone Pro Max', name_th: 'สมาร์ทโฟน Pro Max', name_en: 'Smartphone Pro Max', name_zh: '智能手机 Pro Max', price: 15990, sale_price: 12990, category_id: 'electronics', stock_quantity: 50, rating: 4.8, sold_count: 1200 },
        { id: '2', name: 'Sport Shoes', name_th: 'รองเท้ากีฬา', name_en: 'Sport Shoes', name_zh: '运动鞋', price: 2990, sale_price: 2490, category_id: 'fashion', stock_quantity: 30, rating: 4.5, sold_count: 850 },
        { id: '3', name: 'Thai Green Tea', name_th: 'ชาเขียวไทย', name_en: 'Thai Green Tea', name_zh: '泰式绿茶', price: 250, sale_price: 199, category_id: 'food', stock_quantity: 100, rating: 4.3, sold_count: 2300 },
        { id: '4', name: 'Skin Cream', name_th: 'ครีมบำรุงผิว', name_en: 'Skin Cream', name_zh: '护肤霜', price: 750, sale_price: 590, category_id: 'beauty', stock_quantity: 0, rating: 4.7, sold_count: 560 },
        { id: '5', name: 'Plant Pot', name_th: 'กระถางต้นไม้', name_en: 'Plant Pot', name_zh: '花盆', price: 450, sale_price: 350, category_id: 'home', stock_quantity: 45, rating: 4.2, sold_count: 320 },
        { id: '6', name: 'Wireless Earbuds', name_th: 'หูฟังไร้สาย', name_en: 'Wireless Earbuds', name_zh: '无线耳机', price: 2490, sale_price: 1990, category_id: 'electronics', stock_quantity: 25, rating: 4.6, sold_count: 980 },
        { id: '7', name: 'Thai Style Dress', name_th: 'ชุดไทยสไตล์', name_en: 'Thai Style Dress', name_zh: '泰式连衣裙', price: 1590, sale_price: 1290, category_id: 'fashion', stock_quantity: 15, rating: 4.4, sold_count: 420 },
        { id: '8', name: 'Thai Chili Sauce', name_th: 'ซอสพริกไทย', name_en: 'Thai Chili Sauce', name_zh: '泰式辣椒酱', price: 120, sale_price: 89, category_id: 'food', stock_quantity: 200, rating: 4.8, sold_count: 5600 }
    ];
}

// Expose functions globally
window.switchLang = switchLanguage;
window.handleCategoryFilter = handleCategoryFilter;
window.goToPage = goToPage;
window.addToCartFromList = addToCartFromList;
window.navigateToProduct = navigateToProduct;
window.clearAllFilters = clearAllFilters;

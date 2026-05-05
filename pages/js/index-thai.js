/**
 * ThaiShop Homepage JavaScript
 * Handles: Banner carousel, Categories, Flash Sale, Featured Products, Language Switching
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all homepage functions
    loadBannerSlides();
    loadCategories();
    loadFlashSale();
    loadFeaturedProducts();
    initLanguageFromStorage();
});

// ===== Banner Carousel =====
var currentSlide = 0;
var slides = [];
var dots = [];
var autoPlayInterval = null;

function loadBannerSlides() {
    slides = document.querySelectorAll('.carousel-item');
    dots = document.querySelectorAll('.carousel-dot');

    if (slides.length === 0) return;

    // Initialize first slide
    updateSlideDisplay();

    // Auto-play every 6 seconds
    autoPlayInterval = setInterval(nextSlide, 6000);

    // Initialize indicator styles
    if (dots[0]) {
        dots[0].classList.add('active');
        dots[0].style.width = '32px';
    }
}

function showSlide(n) {
    if (slides.length === 0) return;

    // Clear current active states
    slides.forEach(function(s) { s.classList.remove('active'); });
    dots.forEach(function(d) {
        d.classList.remove('active');
        d.style.width = '8px';
    });

    // Calculate new slide index
    currentSlide = ((n % slides.length) + slides.length) % slides.length;

    // Apply new active state
    slides[currentSlide].classList.add('active');
    if (dots[currentSlide]) {
        dots[currentSlide].classList.add('active');
        dots[currentSlide].style.width = '32px';
    }
}

function updateSlideDisplay() {
    slides.forEach(function(s, i) {
        s.classList.toggle('active', i === currentSlide);
    });
    dots.forEach(function(d, i) {
        d.classList.toggle('active', i === currentSlide);
        d.style.width = (i === currentSlide) ? '32px' : '8px';
    });
}

function nextSlide() {
    showSlide(currentSlide + 1);
}

function prevSlide() {
    showSlide(currentSlide - 1);
}

function goToSlide(n) {
    clearInterval(autoPlayInterval);
    showSlide(n);
    // Restart auto-play
    autoPlayInterval = setInterval(nextSlide, 6000);
}

// ===== Categories =====
async function loadCategories() {
    const container = document.getElementById('category-grid');
    if (!container) return;

    try {
        // Check if getCategories function exists (from supabase-client.js)
        if (typeof getCategories === 'function') {
            const categories = await getCategories();
            renderCategories(categories);
        } else {
            // Fallback: load static categories
            renderStaticCategories();
        }
    } catch (error) {
        console.error('Failed to load categories:', error);
        renderStaticCategories();
    }
}

function renderCategories(categories) {
    const container = document.getElementById('category-grid');
    if (!container) return;

    const icons = ['💄', '👗', '🍜', '🏠', '📱', '🎁', '🧴', '🧸', '📚', '⚽', '🎮', '💍'];
    const colors = [
        'from-pink-100 to-pink-200',
        'from-blue-100 to-blue-200',
        'from-green-100 to-green-200',
        'from-yellow-100 to-yellow-200',
        'from-purple-100 to-purple-200',
        'from-orange-100 to-orange-200'
    ];

    let html = '';
    categories.forEach(function(cat, index) {
        const icon = icons[index % icons.length];
        const color = colors[index % colors.length];
        html += `
            <div class="cursor-pointer" onclick="navigateToCategory('${cat.id}')">
                <div class="cat-icon bg-gradient-to-br ${color}">${icon}</div>
                <div class="text-sm font-semibold text-gray-700">
                    <span class="lang-zh">${cat.name_zh || cat.name}</span>
                    <span class="lang-en">${cat.name_en || cat.name}</span>
                    <span class="lang-th">${cat.name_th || cat.name}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderStaticCategories() {
    const container = document.getElementById('category-grid');
    if (!container) return;

    // Keep existing HTML content for static categories
    // This is handled by the static HTML, no action needed
}

function navigateToCategory(categoryId) {
    window.location.href = `products.html?category=${categoryId}`;
}

// ===== Flash Sale =====
var flashSaleInterval = null;

async function loadFlashSale() {
    const container = document.getElementById('flash-sale-grid');
    if (!container) return;

    try {
        // Check if getFlashSaleProducts function exists
        if (typeof getFlashSaleProducts === 'function') {
            const products = await getFlashSaleProducts();
            renderFlashSaleProducts(products);
        }

        // Get flash sale end time from promotions
        if (typeof getFlashSaleEndTime === 'function') {
            const endTime = await getFlashSaleEndTime();
            startFlashCountdown(endTime);
        } else {
            // Default: 2 hours from now
            const defaultEnd = new Date(Date.now() + 2 * 60 * 60 * 1000);
            startFlashCountdown(defaultEnd);
        }
    } catch (error) {
        console.error('Failed to load flash sale:', error);
    }
}

function renderFlashSaleProducts(products) {
    const container = document.getElementById('flash-sale-grid');
    if (!container || !products || products.length === 0) return;

    let html = '';
    const displayCount = Math.min(products.length, 5);

    for (let i = 0; i < displayCount; i++) {
        const p = products[i];
        const originalPrice = p.price;
        const salePrice = p.sale_price || p.price * 0.7;

        html += `
            <div class="product-card-thai cursor-pointer" onclick="navigateToProduct('${p.id}')">
                <div class="h-44 bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center text-6xl">
                    ${getProductEmoji(p.category_id)}
                </div>
                <div class="p-3">
                    <div class="text-sm font-semibold text-gray-800 line-clamp-2">
                        <span class="lang-zh">${p.name_zh || p.name}</span>
                        <span class="lang-en">${p.name_en || p.name}</span>
                        <span class="lang-th">${p.name_th || p.name}</span>
                    </div>
                    <div class="mt-2 flex items-center gap-2">
                        <span class="text-red-600 font-black text-lg">฿${Math.round(salePrice).toLocaleString()}</span>
                        <span class="text-gray-400 line-through text-xs">฿${Math.round(originalPrice).toLocaleString()}</span>
                    </div>
                    <div class="mt-1 text-xs text-gray-500">
                        <span class="lang-zh">已售 ${p.sold_count || 0}</span>
                        <span class="lang-en">${p.sold_count || 0} sold</span>
                        <span class="lang-th">ขายแล้ว ${p.sold_count || 0}</span>
                    </div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

function startFlashCountdown(endTime) {
    // Clear existing interval
    if (flashSaleInterval) clearInterval(flashSaleInterval);

    const hourEl = document.getElementById('flashH');
    const minEl = document.getElementById('flashM');
    const secEl = document.getElementById('flashS');

    if (!hourEl || !minEl || !secEl) return;

    function updateCountdown() {
        const now = new Date().getTime();
        const end = new Date(endTime).getTime();
        const distance = end - now;

        if (distance < 0) {
            // Flash sale ended
            hourEl.textContent = '00';
            minEl.textContent = '00';
            secEl.textContent = '00';
            return;
        }

        const hours = Math.floor(distance / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        hourEl.textContent = String(hours).padStart(2, '0');
        minEl.textContent = String(minutes).padStart(2, '0');
        secEl.textContent = String(seconds).padStart(2, '0');
    }

    updateCountdown();
    flashSaleInterval = setInterval(updateCountdown, 1000);
}

// ===== Featured Products =====
async function loadFeaturedProducts() {
    const container = document.getElementById('featured-grid');
    if (!container) return;

    try {
        // Check if getProducts function exists with sort parameter
        if (typeof getProducts === 'function') {
            const products = await getProducts({ sort: 'featured', limit: 8 });
            renderFeaturedProducts(products);
        } else {
            // Fallback: try with just limit
            const products = await getProducts({ limit: 8 });
            renderFeaturedProducts(products);
        }
    } catch (error) {
        console.error('Failed to load featured products:', error);
    }
}

function renderFeaturedProducts(products) {
    const container = document.getElementById('featured-grid');
    if (!container || !products || products.length === 0) return;

    let html = '';
    const displayCount = Math.min(products.length, 4);

    for (let i = 0; i < displayCount; i++) {
        const p = products[i];
        const originalPrice = p.price;
        const salePrice = p.sale_price || p.price;

        html += `
            <div class="product-card-thai cursor-pointer" onclick="navigateToProduct('${p.id}')">
                <div class="h-52 bg-gradient-to-br from-pink-50 to-yellow-50 flex items-center justify-center text-7xl">
                    ${getProductEmoji(p.category_id)}
                </div>
                <div class="p-4">
                    <div class="text-sm font-semibold text-gray-800 line-clamp-2 mb-2">
                        <span class="lang-zh">${p.name_zh || p.name}</span>
                        <span class="lang-en">${p.name_en || p.name}</span>
                        <span class="lang-th">${p.name_th || p.name}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-red-600 font-black text-xl">฿${Math.round(salePrice).toLocaleString()}</span>
                        ${salePrice < originalPrice ? `<span class="text-gray-400 line-through text-sm">฿${Math.round(originalPrice).toLocaleString()}</span>` : ''}
                    </div>
                    <div class="mt-2 flex items-center gap-1 text-yellow-400 text-sm">
                        ${generateStars(p.rating || 4.5)}
                        <span class="text-gray-500 text-xs ml-1">${p.rating || 4.9}</span>
                    </div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// ===== Language Switching =====
function initLanguageFromStorage() {
    try {
        var saved = localStorage.getItem('lang') || 'zh';
        switchLanguage(saved);
    } catch(e) {
        switchLanguage('zh');
    }
}

function switchLanguage(lang) {
    document.body.className = 'lang-' + lang;
    try {
        localStorage.setItem('lang', lang);
    } catch(e) {}

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

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    let stars = '★'.repeat(fullStars);
    if (halfStar) stars += '½';
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    stars += '☆'.repeat(emptyStars);
    return stars;
}

// ===== Toast Notification =====
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

// ===== Mobile Menu =====
function toggleMobileMenu() {
    var menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.toggle('hidden');
}

// Expose functions globally
window.switchLang = switchLanguage;
window.nextSlide = nextSlide;
window.prevSlide = prevSlide;
window.goToSlide = goToSlide;
window.toggleMobileMenu = toggleMobileMenu;
window.navigateToCategory = navigateToCategory;
window.navigateToProduct = navigateToProduct;

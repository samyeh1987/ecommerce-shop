/**
 * ThaiShop Product Detail Page JavaScript
 * Handles: Product loading, Image gallery, Quantity selector, Add to cart, Related products
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize page
    initLanguageFromStorage();
    loadProduct();
});

// ===== Page State =====
var currentProduct = null;
var selectedQuantity = 1;
var maxQuantity = 1;
var productImages = [];

// ===== Load Product =====
async function loadProduct() {
    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        showProductError();
        return;
    }

    try {
        // Try to load from API
        let product;
        if (typeof getProductById === 'function') {
            product = await getProductById(productId);
        } else {
            // Fallback mock data
            product = getMockProduct(productId);
        }

        if (!product) {
            showProductError();
            return;
        }

        currentProduct = product;
        maxQuantity = product.stock_quantity || 1;
        selectedQuantity = 1;

        // Update page with product data
        renderProduct(product);

        // Load related products
        loadRelatedProducts(product.category_id, productId);

    } catch (error) {
        console.error('Failed to load product:', error);
        showProductError();
    }
}

function showProductError() {
    const container = document.querySelector('.max-w-7xl.mx-auto.px-4.pb-12');
    if (container) {
        container.innerHTML = `
            <div class="text-center py-20">
                <div class="text-8xl mb-6">❌</div>
                <h2 class="text-2xl font-bold text-gray-700 mb-4">
                    <span class="lang-th">ไม่พบสินค้า</span>
                    <span class="lang-en">Product Not Found</span>
                    <span class="lang-zh">未找到商品</span>
                </h2>
                <p class="text-gray-500 mb-6">
                    <span class="lang-th">สินค้าที่คุณกำลังค้นหาอาจถูกลบหรือไม่มีอยู่แล้ว</span>
                    <span class="lang-en">The product you're looking for may have been removed or doesn't exist.</span>
                    <span class="lang-zh">您查找的商品可能已被删除或不存在。</span>
                </p>
                <a href="products.html" class="inline-block px-6 py-3 bg-thai-red text-white rounded-xl font-bold hover:bg-red-700 transition">
                    <span class="lang-th">กลับไปหน้าสินค้า</span>
                    <span class="lang-en">Back to Products</span>
                    <span class="lang-zh">返回商品列表</span>
                </a>
            </div>
        `;
    }
}

// ===== Render Product =====
function renderProduct(product) {
    // Update page title
    const titleEl = document.querySelector('title');
    if (titleEl) {
        const lang = document.body.className.replace('lang-', '') || 'th';
        const name = lang === 'zh' ? (product.name_zh || product.name) :
                     lang === 'en' ? (product.name_en || product.name) :
                     (product.name_th || product.name);
        titleEl.textContent = `ThaiShop - ${name}`;
    }

    // Update breadcrumb
    updateBreadcrumb(product);

    // Update main image
    const mainImage = document.getElementById('mainImage');
    if (mainImage) {
        mainImage.textContent = getProductEmoji(product.category_id);
        mainImage.className = `aspect-square rounded-2xl flex items-center justify-center text-9xl shadow-md bg-gradient-to-br from-thai-cream to-yellow-100`;
    }

    // Update thumbnails
    renderThumbnails(product);

    // Update product info
    updateProductInfo(product);

    // Update price
    updatePrice(product);

    // Update stock status
    updateStockStatus(product);

    // Initialize quantity
    selectedQuantity = 1;
    updateQuantityDisplay();

    // Update add to cart button
    updateAddToCartButton(product);
}

function updateBreadcrumb(product) {
    const breadcrumbProduct = document.getElementById('breadcrumbProduct');
    if (breadcrumbProduct) {
        const lang = document.body.className.replace('lang-', '') || 'th';
        const name = lang === 'zh' ? (product.name_zh || product.name) :
                     lang === 'en' ? (product.name_en || product.name) :
                     (product.name_th || product.name);
        breadcrumbProduct.textContent = name;
    }
}

function renderThumbnails(product) {
    const container = document.getElementById('thumbnailContainer');
    if (!container) return;

    // Default thumbnails based on category
    const defaultThumbnails = [
        { emoji: getProductEmoji(product.category_id), color: 'from-thai-cream to-yellow-100' },
        { emoji: '📦', color: 'from-gray-100 to-gray-200' },
        { emoji: '🖼️', color: 'from-blue-50 to-blue-100' },
        { emoji: '✨', color: 'from-purple-50 to-purple-100' }
    ];

    let html = '';
    defaultThumbnails.forEach(function(thumb, index) {
        html += `
            <div class="thumb-img w-20 h-20 bg-gradient-to-br ${thumb.color} rounded-lg flex items-center justify-center text-2xl cursor-pointer ${index === 0 ? 'active' : ''}" 
                 onclick="selectThumb(this, '${thumb.emoji}')">${thumb.emoji}</div>
        `;
    });

    container.innerHTML = html;
}

function updateProductInfo(product) {
    const titleEl = document.getElementById('productTitle');
    if (titleEl) {
        const lang = document.body.className.replace('lang-', '') || 'th';
        const name = lang === 'zh' ? (product.name_zh || product.name) :
                     lang === 'en' ? (product.name_en || product.name) :
                     (product.name_th || product.name);
        titleEl.innerHTML = `
            <span class="lang-th">${product.name_th || product.name}</span>
            <span class="lang-en">${product.name_en || product.name}</span>
            <span class="lang-zh">${product.name_zh || product.name}</span>
        `;
    }

    // Update SKU
    const skuEl = document.getElementById('productSku');
    if (skuEl) {
        skuEl.textContent = product.sku || `TH-${product.id}-2026`;
    }
}

function updatePrice(product) {
    const originalPrice = product.price;
    const salePrice = product.sale_price || product.price;
    const hasDiscount = salePrice < originalPrice;
    const discountPercent = hasDiscount ? Math.round((1 - salePrice / originalPrice) * 100) : 0;

    // Update price display
    const priceContainer = document.getElementById('priceContainer');
    if (priceContainer) {
        let html = `
            <div class="flex items-baseline gap-3">
                <span class="text-3xl font-bold text-thai-red">฿${Math.round(salePrice).toLocaleString()}</span>
        `;

        if (hasDiscount) {
            html += `<span class="text-lg text-gray-400 line-through">฿${Math.round(originalPrice).toLocaleString()}</span>`;
        }

        html += `</div>`;
        priceContainer.innerHTML = html;
    }

    // Update discount badge
    const discountBadge = document.getElementById('discountBadge');
    if (discountBadge) {
        if (hasDiscount) {
            discountBadge.className = 'bg-thai-red text-white text-xs px-2 py-0.5 rounded-full';
            discountBadge.innerHTML = `
                <span class="lang-th">ลด ${discountPercent}%</span>
                <span class="lang-en">-${discountPercent}%</span>
                <span class="lang-zh">降${discountPercent}%</span>
            `;
        } else {
            discountBadge.style.display = 'none';
        }
    }
}

function updateStockStatus(product) {
    const stockBadge = document.getElementById('stockBadge');
    const stockStatus = document.getElementById('stockStatus');

    if (stockBadge && stockStatus) {
        const stock = product.stock_quantity || 0;

        if (stock <= 0) {
            stockBadge.innerHTML = `
                <span class="lang-th">สินค้าหมด</span>
                <span class="lang-en">Sold Out</span>
                <span class="lang-zh">售完</span>
            `;
            stockBadge.className = 'bg-gray-500 text-white text-xs px-2 py-0.5 rounded-full';
            stockStatus.innerHTML = `
                <span class="lang-th">ขออภัย สินค้าหมดแล้ว</span>
                <span class="lang-en">Sorry, this item is sold out</span>
                <span class="lang-zh">抱歉，商品已售完</span>
            `;
        } else if (stock <= 5) {
            stockBadge.innerHTML = `
                <span class="lang-th">เหลือ ${stock} ชิ้น</span>
                <span class="lang-en">Only ${stock} left</span>
                <span class="lang-zh">仅剩 ${stock} 件</span>
            `;
            stockBadge.className = 'bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full';
            stockStatus.innerHTML = `
                <span class="lang-th">เหลือเพียง ${stock} ชิ้นเท่านั้น!</span>
                <span class="lang-en">Hurry! Only ${stock} left!</span>
                <span class="lang-zh">快！仅剩 ${stock} 件！</span>
            `;
        } else {
            stockBadge.innerHTML = `
                <span class="lang-th">มีสินค้า</span>
                <span class="lang-en">In Stock</span>
                <span class="lang-zh">有货</span>
            `;
            stockBadge.className = 'bg-green-500 text-white text-xs px-2 py-0.5 rounded-full';
            stockStatus.innerHTML = `
                <span class="lang-th">พร้อมส่ง</span>
                <span class="lang-en">Ready to ship</span>
                <span class="lang-zh">随时发货</span>
            `;
        }
    }
}

function updateAddToCartButton(product) {
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
        if (product.stock_quantity <= 0) {
            addToCartBtn.disabled = true;
            addToCartBtn.className = 'flex-1 bg-gray-300 text-gray-500 py-3 rounded-xl font-bold text-lg cursor-not-allowed';
        } else {
            addToCartBtn.disabled = false;
            addToCartBtn.className = 'flex-1 bg-thai-gold text-thai-purple py-3 rounded-xl font-bold text-lg hover:bg-thai-orange hover:text-white transition shadow-lg cursor-pointer';
        }
    }
}

// ===== Quantity Selector =====
function changeQty(delta) {
    const newQty = selectedQuantity + delta;
    if (newQty < 1) {
        selectedQuantity = 1;
    } else if (newQty > maxQuantity) {
        selectedQuantity = maxQuantity;
    } else {
        selectedQuantity = newQty;
    }
    updateQuantityDisplay();
}

function updateQuantityDisplay() {
    const qtyEl = document.getElementById('qty');
    if (qtyEl) {
        qtyEl.textContent = selectedQuantity;
    }

    // Update minus button state
    const minusBtn = document.querySelector('[onclick="changeQty(-1)"]');
    if (minusBtn) {
        minusBtn.className = `px-4 py-2 bg-gray-100 hover:bg-gray-200 text-xl font-bold transition ${selectedQuantity <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`;
        minusBtn.disabled = selectedQuantity <= 1;
    }

    // Update plus button state
    const plusBtn = document.querySelector('[onclick="changeQty(1)"]');
    if (plusBtn) {
        plusBtn.className = `px-4 py-2 bg-gray-100 hover:bg-gray-200 text-xl font-bold transition ${selectedQuantity >= maxQuantity ? 'opacity-50 cursor-not-allowed' : ''}`;
        plusBtn.disabled = selectedQuantity >= maxQuantity;
    }
}

// ===== Image Gallery =====
function selectThumb(element, emoji) {
    const mainImage = document.getElementById('mainImage');
    if (mainImage && element) {
        // Update main image
        mainImage.textContent = emoji;

        // Update thumbnail states
        document.querySelectorAll('.thumb-img').forEach(function(thumb) {
            thumb.classList.remove('active');
        });
        element.classList.add('active');
    }
}

// ===== Add to Cart =====
async function addToCart() {
    if (!currentProduct) return;

    if (currentProduct.stock_quantity <= 0) {
        showToast(getLocalizedText('out_of_stock'), 'error');
        return;
    }

    const addToCartBtn = document.getElementById('addToCartBtn');
    const originalContent = addToCartBtn ? addToCartBtn.innerHTML : '';

    try {
        // Show loading state
        if (addToCartBtn) {
            addToCartBtn.innerHTML = '⏳';
            addToCartBtn.disabled = true;
        }

        if (typeof addToCart === 'function') {
            await addToCart(currentProduct.id, selectedQuantity);
        } else {
            // Fallback local cart implementation
            await addToCartLocal(currentProduct.id, currentProduct.name, currentProduct.sale_price || currentProduct.price, selectedQuantity);
        }

        // Show success state
        if (addToCartBtn) {
            addToCartBtn.innerHTML = `✅ <span class="lang-th">เพิ่มแล้ว!</span><span class="lang-en">Added!</span><span class="lang-zh">已添加!</span>`;
            addToCartBtn.className = 'flex-1 bg-green-500 text-white py-3 rounded-xl font-bold text-lg';
        }

        showToast(getLocalizedText('added_to_cart'), 'success');

        // Reset button after delay
        setTimeout(function() {
            if (addToCartBtn) {
                addToCartBtn.innerHTML = originalContent;
                addToCartBtn.className = 'flex-1 bg-thai-gold text-thai-purple py-3 rounded-xl font-bold text-lg hover:bg-thai-orange hover:text-white transition shadow-lg';
                addToCartBtn.disabled = false;
            }
        }, 2000);

    } catch (error) {
        console.error('Failed to add to cart:', error);
        if (addToCartBtn) {
            addToCartBtn.innerHTML = originalContent;
        }
        showToast(getLocalizedText('failed_to_add'), 'error');
    }
}

async function addToCartLocal(productId, productName, price, quantity) {
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
            cart[existingIndex].quantity += quantity;
        } else {
            cart.push({
                id: productId,
                name: productName,
                price: price,
                quantity: quantity,
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

// ===== Related Products =====
async function loadRelatedProducts(categoryId, currentProductId) {
    const container = document.getElementById('relatedProductsGrid');
    if (!container) return;

    try {
        let products = [];

        if (typeof getProducts === 'function') {
            // Get products from same category, excluding current product
            products = await getProducts({ category: categoryId, limit: 10 });
            // Filter out current product
            if (Array.isArray(products)) {
                products = products.filter(p => p.id !== currentProductId);
            } else if (products.products) {
                products = products.products.filter(p => p.id !== currentProductId);
            }
        } else {
            // Fallback mock data
            products = getMockProducts().filter(p => p.id !== currentProductId);
        }

        // Randomly select 4 products
        const shuffled = products.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 4);

        renderRelatedProducts(selected);

    } catch (error) {
        console.error('Failed to load related products:', error);
    }
}

function renderRelatedProducts(products) {
    const container = document.getElementById('relatedProductsGrid');
    if (!container || !products || products.length === 0) return;

    let html = '';

    products.forEach(function(product) {
        html += `
            <div class="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition cursor-pointer" onclick="navigateToProduct('${product.id}')">
                <div class="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-4xl">
                    ${getProductEmoji(product.category_id)}
                </div>
                <div class="p-3">
                    <h3 class="font-semibold text-sm line-clamp-2">
                        <span class="lang-th">${product.name_th || product.name}</span>
                        <span class="lang-en">${product.name_en || product.name}</span>
                        <span class="lang-zh">${product.name_zh || product.name}</span>
                    </h3>
                    <p class="text-thai-red font-bold mt-1">฿${Math.round(product.sale_price || product.price).toLocaleString()}</p>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ===== Tabs =====
function switchTab(tab) {
    const descPanel = document.getElementById('panelDesc');
    const reviewsPanel = document.getElementById('panelReviews');
    const descBtn = document.getElementById('tabDesc');
    const reviewsBtn = document.getElementById('tabReviews');

    if (tab === 'desc') {
        if (descPanel) descPanel.classList.remove('hidden');
        if (reviewsPanel) reviewsPanel.classList.add('hidden');
        if (descBtn) {
            descBtn.classList.add('active');
            descBtn.classList.remove('text-gray-500');
        }
        if (reviewsBtn) {
            reviewsBtn.classList.remove('active');
            reviewsBtn.classList.add('text-gray-500');
        }
    } else {
        if (descPanel) descPanel.classList.add('hidden');
        if (reviewsPanel) reviewsPanel.classList.remove('hidden');
        if (descBtn) {
            descBtn.classList.remove('active');
            descBtn.classList.add('text-gray-500');
        }
        if (reviewsBtn) {
            reviewsBtn.classList.add('active');
            reviewsBtn.classList.remove('text-gray-500');
        }
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

    // Re-render product with new language if product is loaded
    if (currentProduct) {
        updateProductInfo(currentProduct);
        updateBreadcrumb(currentProduct);
    }
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
function getMockProduct(id) {
    const products = [
        { id: '1', name: 'Smartphone Pro Max 256GB', name_th: 'สมาร์ทโฟน Pro Max 256GB', name_en: 'Smartphone Pro Max 256GB', name_zh: '智能手机 Pro Max 256GB', price: 15990, sale_price: 12990, category_id: 'electronics', stock_quantity: 50, rating: 4.8, sold_count: 1200 },
        { id: '2', name: 'Sport Shoes Pro', name_th: 'รองเท้ากีฬา Pro', name_en: 'Sport Shoes Pro', name_zh: '运动鞋 Pro', price: 3990, sale_price: 2990, category_id: 'fashion', stock_quantity: 3, rating: 4.5, sold_count: 850 },
        { id: '3', name: 'Thai Green Tea Premium', name_th: 'ชาเขียวไทยพรีเมียม', name_en: 'Thai Green Tea Premium', name_zh: '泰式绿茶 Premium', price: 350, sale_price: 299, category_id: 'food', stock_quantity: 0, rating: 4.3, sold_count: 2300 },
        { id: '4', name: 'Luxury Skin Cream', name_th: 'ครีมบำรุงผิวหรู', name_en: 'Luxury Skin Cream', name_zh: '奢华护肤霜', price: 1290, sale_price: 990, category_id: 'beauty', stock_quantity: 25, rating: 4.7, sold_count: 560 }
    ];

    return products.find(p => p.id === id) || products[0];
}

function getMockProducts() {
    return [
        { id: '1', name: 'Smartphone Pro Max', name_th: 'สมาร์ทโฟน Pro Max', name_en: 'Smartphone Pro Max', name_zh: '智能手机 Pro Max', price: 15990, sale_price: 12990, category_id: 'electronics' },
        { id: '2', name: 'Sport Shoes', name_th: 'รองเท้ากีฬา', name_en: 'Sport Shoes', name_zh: '运动鞋', price: 2990, category_id: 'fashion' },
        { id: '3', name: 'Thai Green Tea', name_th: 'ชาเขียวไทย', name_en: 'Thai Green Tea', name_zh: '泰式绿茶', price: 199, category_id: 'food' },
        { id: '4', name: 'Skin Cream', name_th: 'ครีมบำรุงผิว', name_en: 'Skin Cream', name_zh: '护肤霜', price: 590, category_id: 'beauty' },
        { id: '5', name: 'Plant Pot', name_th: 'กระถางต้นไม้', name_en: 'Plant Pot', name_zh: '花盆', price: 350, category_id: 'home' },
        { id: '6', name: 'Wireless Earbuds', name_th: 'หูฟังไร้สาย', name_en: 'Wireless Earbuds', name_zh: '无线耳机', price: 1990, category_id: 'electronics' },
        { id: '7', name: 'Thai Style Dress', name_th: 'ชุดไทยสไตล์', name_en: 'Thai Style Dress', name_zh: '泰式连衣裙', price: 1290, category_id: 'fashion' },
        { id: '8', name: 'Thai Chili Sauce', name_th: 'ซอสพริกไทย', name_en: 'Thai Chili Sauce', name_zh: '泰式辣椒酱', price: 89, category_id: 'food' }
    ];
}

// Expose functions globally
window.switchLang = switchLanguage;
window.changeQty = changeQty;
window.selectThumb = selectThumb;
window.addToCart = addToCart;
window.switchTab = switchTab;
window.navigateToProduct = navigateToProduct;

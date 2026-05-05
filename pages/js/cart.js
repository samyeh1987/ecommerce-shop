// ThaiShop - Cart Page Logic

let cartItems = [];
let currentUser = null;
let selectedItems = new Set();

document.addEventListener('DOMContentLoaded', async function() {
  // Init language
  try {
    var s = localStorage.getItem('thaishop-lang');
    if (s) switchLang(s);
  } catch(e) {}

  // Check login
  try {
    var userResult = await getCurrentUser();
    currentUser = (userResult && userResult.success && userResult.data) ? userResult.data : null;
    // Also handle case where getCurrentUser returns user directly (non-wrapped)
    if (!currentUser && userResult && userResult.id) {
      currentUser = userResult;
    }
  } catch(e) {
    currentUser = null;
  }

  if (!currentUser) {
    showLoginPrompt();
    return;
  }

  // Load cart items
  await loadCartItems();
});

function showLoginPrompt() {
  var container = document.getElementById('cartContainer');
  container.innerHTML = '' +
    '<div class="flex flex-col items-center justify-center py-20">' +
    '  <div class="text-6xl mb-6">🔒</div>' +
    '  <h2 class="text-xl font-bold text-gray-700 mb-2">' +
    '    <span class="lang-th">กรุณาเข้าสู่ระบบเพื่อดูตะกร้าสินค้า</span>' +
    '    <span class="lang-en">Please login to view your cart</span>' +
    '    <span class="lang-zh">请登录后查看购物车</span>' +
    '  </h2>' +
    '  <p class="text-gray-500 mb-6 text-sm">' +
    '    <span class="lang-th">เข้าสู่ระบบเพื่อจัดการตะกร้าสินค้าของคุณ</span>' +
    '    <span class="lang-en">Login to manage your shopping cart</span>' +
    '    <span class="lang-zh">登录后即可管理您的购物车</span>' +
    '  </p>' +
    '  <a href="/login?redirect=/cart" class="bg-thai-red text-white px-8 py-3 rounded-xl font-bold hover:bg-red-700 transition">' +
    '    <span class="lang-th">เข้าสู่ระบบเลย</span>' +
    '    <span class="lang-en">Login Now</span>' +
    '    <span class="lang-zh">立即登录</span>' +
    '  </a>' +
    '</div>';
}

async function loadCartItems() {
  if (!currentUser) return;
  try {
    var result = await getCartItems(currentUser.id || currentUser);
    cartItems = (result && result.success) ? result.data : (Array.isArray(result) ? result : []);
  } catch(e) {
    cartItems = [];
  }
  selectedItems.clear();

  if (cartItems.length === 0) {
    showEmptyCart();
    return;
  }

  // Select all by default
  cartItems.forEach(function(item) {
    selectedItems.add(item.id);
  });

  renderCartItems();
  recalcTotal();
}

function showEmptyCart() {
  var container = document.getElementById('cartContainer');
  container.innerHTML = '' +
    '<div class="flex flex-col items-center justify-center py-20">' +
    '  <div class="text-6xl mb-6">🛒</div>' +
    '  <h2 class="text-xl font-bold text-gray-700 mb-2">' +
    '    <span class="lang-th">ตะกร้าสินค้าว่างเปล่า</span>' +
    '    <span class="lang-en">Your cart is empty</span>' +
    '    <span class="lang-zh">购物车是空的</span>' +
    '  </h2>' +
    '  <p class="text-gray-500 mb-6 text-sm">' +
    '    <span class="lang-th">เลือกซื้อสินค้าที่คุณชื่นชอบ</span>' +
    '    <span class="lang-en">Find something you love</span>' +
    '    <span class="lang-zh">挑选您喜欢的商品</span>' +
    '  </p>' +
    '  <a href="/products" class="bg-thai-gold text-thai-purple px-8 py-3 rounded-xl font-bold hover:bg-thai-orange hover:text-white transition">' +
    '    <span class="lang-th">เลือกซื้อสินค้าต่อ</span>' +
    '    <span class="lang-en">Continue Shopping</span>' +
    '    <span class="lang-zh">继续购物</span>' +
    '  </a>' +
    '</div>';

  // Hide summary
  var summary = document.getElementById('cartSummary');
  if (summary) summary.style.display = 'none';

  // Update title
  updateCartTitle(0);
}

function updateCartTitle(count) {
  var title = document.getElementById('cartTitle');
  if (title) {
    title.innerHTML = '' +
      '<span class="lang-th">ตะกร้าสินค้า (' + count + ' รายการ)</span>' +
      '<span class="lang-en">Shopping Cart (' + count + ' items)</span>' +
      '<span class="lang-zh">购物车 (' + count + ' 件商品)</span>';
  }
}

function renderCartItems() {
  var container = document.getElementById('cartItemsList');
  if (!container) return;

  updateCartTitle(cartItems.length);

  var html = '';

  // Select all checkbox
  html += '<div class="bg-white rounded-xl p-3 mb-3 flex items-center gap-3 shadow-sm">';
  html += '  <input type="checkbox" id="selectAll" onchange="toggleSelectAll(this.checked)" class="accent-thai-red w-5 h-5 cursor-pointer" ' + (selectedItems.size === cartItems.length ? 'checked' : '') + '>';
  html += '  <label for="selectAll" class="text-sm font-semibold text-gray-700 cursor-pointer">';
  html += '    <span class="lang-th">เลือกทั้งหมด</span><span class="lang-en">Select All</span><span class="lang-zh">全选</span>';
  html += '  </label>';
  html += '</div>';

  cartItems.forEach(function(item) {
    var product = item.products;
    if (!product) return;
    var img = (product.images && product.images.length > 0) ? product.images[0] : '';
    var price = Number(product.price);
    var subtotal = price * item.quantity;
    var isChecked = selectedItems.has(item.id) ? 'checked' : '';

    html += '<div class="cart-item bg-white rounded-xl p-4 flex gap-4 items-center shadow-sm mb-3" id="cart-' + item.id + '">';
    // Checkbox
    html += '  <input type="checkbox" class="accent-thai-red w-5 h-5 cursor-pointer flex-shrink-0" ' + isChecked + ' onchange="toggleItem(\'' + item.id + '\', this.checked)">';
    // Image
    html += '  <div class="w-20 h-20 bg-gradient-to-br from-thai-cream to-yellow-100 rounded-lg flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">';
    if (img) {
      html += '    <img src="' + img + '" alt="' + escapeHtml(product.name) + '" class="w-full h-full object-cover">';
    } else {
      html += '    📦';
    }
    html += '  </div>';
    // Info
    html += '  <div class="flex-1 min-w-0">';
    html += '    <h3 class="font-semibold text-sm text-gray-800 truncate">' + escapeHtml(product.name) + '</h3>';
    html += '    <p class="text-thai-red font-bold mt-1">฿' + price.toLocaleString() + '</p>';
    html += '    <div class="flex items-center gap-3 mt-2">';
    // Quantity controls
    html += '      <div class="flex items-center border rounded-lg overflow-hidden">';
    html += '        <button onclick="changeQty(\'' + item.id + '\', -1)" class="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-sm font-bold">−</button>';
    html += '        <span class="px-3 py-1 text-sm font-semibold qty-display" id="qty-' + item.id + '">' + item.quantity + '</span>';
    html += '        <button onclick="changeQty(\'' + item.id + '\', 1)" class="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-sm font-bold">+</button>';
    html += '      </div>';
    html += '      <p class="text-gray-500 text-xs"><span class="lang-th">รวม:</span><span class="lang-en">Subtotal:</span><span class="lang-zh">小计:</span> <span class="item-subtotal font-bold text-thai-purple" id="sub-' + item.id + '">฿' + subtotal.toLocaleString() + '</span></p>';
    html += '    </div>';
    html += '  </div>';
    // Remove
    html += '  <button onclick="removeItem(\'' + item.id + '\')" class="text-gray-400 hover:text-thai-red transition text-xl flex-shrink-0">✕</button>';
    html += '</div>';
  });

  // Coupon section
  html += '<div class="bg-white rounded-xl p-4 shadow-sm">';
  html += '  <div class="flex gap-3">';
  html += '    <input type="text" placeholder="SAVE10 / FLAT100" class="flex-1 border-2 rounded-lg px-4 py-2 text-sm focus:border-thai-gold outline-none" id="couponInput">';
  html += '    <button onclick="applyCoupon()" class="bg-thai-gold text-thai-purple px-6 py-2 rounded-lg font-bold text-sm hover:bg-thai-orange hover:text-white transition">';
  html += '      <span class="lang-th">ใช้คูปอง</span><span class="lang-en">Apply</span><span class="lang-zh">使用</span>';
  html += '    </button>';
  html += '  </div>';
  html += '  <p id="couponMsg" class="text-sm mt-2 hidden"></p>';
  html += '</div>';

  container.innerHTML = html;

  // Show summary
  var summary = document.getElementById('cartSummary');
  if (summary) summary.style.display = '';
}

function toggleSelectAll(checked) {
  if (checked) {
    cartItems.forEach(function(item) { selectedItems.add(item.id); });
  } else {
    selectedItems.clear();
  }
  // Update individual checkboxes
  var checkboxes = document.querySelectorAll('#cartItemsList input[type="checkbox"]:not(#selectAll)');
  checkboxes.forEach(function(cb) { cb.checked = checked; });
  recalcTotal();
}

function toggleItem(itemId, checked) {
  if (checked) {
    selectedItems.add(itemId);
  } else {
    selectedItems.delete(itemId);
  }
  // Update select all
  var selectAllCb = document.getElementById('selectAll');
  if (selectAllCb) {
    selectAllCb.checked = selectedItems.size === cartItems.length;
  }
  recalcTotal();
}

async function changeQty(itemId, delta) {
  var item = cartItems.find(function(i) { return i.id === itemId; });
  if (!item) return;

  var newQty = item.quantity + delta;
  if (newQty < 1) {
    await removeItem(itemId);
    return;
  }

  // Optimistic update
  item.quantity = newQty;
  document.getElementById('qty-' + itemId).textContent = newQty;
  var price = Number(item.products.price);
  document.getElementById('sub-' + itemId).textContent = '฿' + (price * newQty).toLocaleString();
  recalcTotal();

  // API call
  await updateCartItem(itemId, newQty);
}

async function removeItem(itemId) {
  var el = document.getElementById('cart-' + itemId);
  if (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateX(100px)';
    el.style.transition = 'all 0.3s';
  }

  // Remove from data
  cartItems = cartItems.filter(function(i) { return i.id !== itemId; });
  selectedItems.delete(itemId);

  // API call
  await removeCartItem(itemId);

  setTimeout(function() {
    if (cartItems.length === 0) {
      showEmptyCart();
    } else {
      renderCartItems();
    }
    recalcTotal();
  }, 300);
}

var discount = 0;

function recalcTotal() {
  var sub = 0;
  cartItems.forEach(function(item) {
    if (selectedItems.has(item.id)) {
      sub += Number(item.products.price) * item.quantity;
    }
  });

  var ship = sub >= 500 ? 0 : 50;
  var total = sub - discount + ship;

  var subtotalEl = document.getElementById('subtotal');
  var shippingEl = document.getElementById('shippingFee');
  var discountRow = document.getElementById('discountRow');
  var discountAmt = document.getElementById('discountAmt');
  var totalEl = document.getElementById('totalAmt');

  if (subtotalEl) subtotalEl.textContent = '฿' + sub.toLocaleString();
  if (shippingEl) {
    if (ship === 0) {
      shippingEl.innerHTML = '<span class="lang-th">ฟรี</span><span class="lang-en">Free</span><span class="lang-zh">免运费</span>';
    } else {
      shippingEl.textContent = '฿' + ship;
    }
  }
  if (discount > 0 && discountRow && discountAmt) {
    discountRow.style.display = 'flex';
    discountAmt.textContent = '-฿' + discount.toLocaleString();
  }
  if (totalEl) totalEl.textContent = '฿' + (total > 0 ? total.toLocaleString() : '0');

  // Update checkout button state
  var checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    if (selectedItems.size === 0) {
      checkoutBtn.disabled = true;
      checkoutBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      checkoutBtn.disabled = false;
      checkoutBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }
}

function applyCoupon() {
  var code = document.getElementById('couponInput').value.trim().toUpperCase();
  var msg = document.getElementById('couponMsg');
  msg.classList.remove('hidden');

  if (code === 'SAVE10') {
    var sub = 0;
    cartItems.forEach(function(item) {
      if (selectedItems.has(item.id)) {
        sub += Number(item.products.price) * item.quantity;
      }
    });
    discount = Math.round(sub * 0.1);
    recalcTotal();
    msg.className = 'text-sm mt-2 text-green-600';
    msg.textContent = '✅ ' + code + ' applied! Save ฿' + discount.toLocaleString();
  } else if (code === 'FLAT100') {
    discount = 100;
    recalcTotal();
    msg.className = 'text-sm mt-2 text-green-600';
    msg.textContent = '✅ ' + code + ' applied! Save ฿100';
  } else {
    msg.className = 'text-sm mt-2 text-red-500';
    msg.innerHTML = '❌ <span class="lang-th">รหัสไม่ถูกต้อง</span><span class="lang-en">Invalid code</span><span class="lang-zh">无效代码</span>';
  }
}

function goToCheckout() {
  if (selectedItems.size === 0) return;
  var selectedIds = [];
  selectedItems.forEach(function(id) { selectedIds.push(id); });
  localStorage.setItem('checkout_item_ids', JSON.stringify(selectedIds));
  location.href = '/checkout';
}

function escapeHtml(text) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

function switchLang(lang) {
  document.body.className = 'lang-' + lang;
  try { localStorage.setItem('thaishop-lang', lang); } catch(e) {}
  document.querySelectorAll('.lang-btn').forEach(function(b) {
    b.classList.remove('active');
    var label = lang === 'th' ? 'ไทย' : lang === 'en' ? 'EN' : '中文';
    if (b.textContent.trim() === label) b.classList.add('active');
  });
}

// ThaiShop - Checkout Page Logic

let currentUser = null;
let checkoutItems = [];
let savedAddresses = [];
let selectedAddressId = null;
let selectedPayment = 'promptpay';
let selectedShipping = 'standard';
let shippingCost = 50;

document.addEventListener('DOMContentLoaded', async function() {
  // Init language
  try {
    var s = localStorage.getItem('thaishop-lang');
    if (s) switchLang(s);
  } catch(e) {}

  // Check login
  currentUser = await getCurrentUser();
  if (!currentUser) {
    location.href = 'login.html?redirect=checkout.html';
    return;
  }

  // Load checkout item IDs from localStorage
  var itemIdsStr = localStorage.getItem('checkout_item_ids');
  if (!itemIdsStr) {
    location.href = 'cart.html';
    return;
  }

  var itemIds = JSON.parse(itemIdsStr);
  if (!itemIds || itemIds.length === 0) {
    location.href = 'cart.html';
    return;
  }

  // Load cart items
  var allCartItems = await getCartItems(currentUser.id);
  checkoutItems = allCartItems.filter(function(item) {
    return itemIds.indexOf(item.id) !== -1;
  });

  if (checkoutItems.length === 0) {
    location.href = 'cart.html';
    return;
  }

  // Load addresses
  await loadAddresses();

  // Pre-fill user info
  prefillUserInfo();

  // Render items in sidebar
  renderOrderSummary();

  // Calculate totals
  recalcTotal();
});

async function loadAddresses() {
  savedAddresses = await getAddresses(currentUser.id);
  renderAddressSelector();
}

function prefillUserInfo() {
  if (!currentUser) return;
  var nameInput = document.getElementById('recipientName');
  var phoneInput = document.getElementById('recipientPhone');
  if (nameInput && currentUser.full_name) nameInput.value = currentUser.full_name;
  if (phoneInput && currentUser.phone) phoneInput.value = currentUser.phone;
}

function renderAddressSelector() {
  var container = document.getElementById('savedAddressList');
  var newAddrSection = document.getElementById('newAddressSection');

  if (!container) return;

  if (savedAddresses.length > 0) {
    var html = '<div class="mb-3">' +
      '<label class="block text-sm font-semibold text-gray-700 mb-1">' +
      '<span class="lang-th">เลือกที่อยู่ที่บันทึกไว้</span>' +
      '<span class="lang-en">Select saved address</span>' +
      '<span class="lang-zh">选择已保存的地址</span>' +
      '</label>' +
      '<select id="addressSelect" onchange="onAddressSelect(this.value)" class="form-input w-full border-2 rounded-xl px-4 py-2.5 outline-none text-sm bg-white">' +
      '<option value="new">' +
      '<span class="lang-th">+ ที่อยู่ใหม่</span>' +
      '<span class="lang-en">+ New Address</span>' +
      '<span class="lang-zh">+ 新地址</span>' +
      '</option>';

    savedAddresses.forEach(function(addr) {
      var isDefault = addr.is_default ? ' ★' : '';
      html += '<option value="' + addr.id + '">' +
        escapeHtml(addr.recipient_name) + ' | ' +
        escapeHtml(addr.phone) + ' | ' +
        escapeHtml(addr.detail_address) + ', ' +
        escapeHtml(addr.district) + ', ' +
        escapeHtml(addr.city) + ', ' +
        escapeHtml(addr.province) + ' ' +
        escapeHtml(addr.postal_code || '') + isDefault +
        '</option>';
    });

    html += '</select></div>';

    // Select default address
    var defaultAddr = savedAddresses.find(function(a) { return a.is_default; });
    if (defaultAddr) {
      selectedAddressId = defaultAddr.id;
      fillAddressForm(defaultAddr);
    }

    container.innerHTML = html;

    // Set select value
    var sel = document.getElementById('addressSelect');
    if (sel && selectedAddressId) {
      sel.value = selectedAddressId;
    }
  }
}

function onAddressSelect(value) {
  if (value === 'new') {
    selectedAddressId = null;
    clearAddressForm();
  } else {
    selectedAddressId = value;
    var addr = savedAddresses.find(function(a) { return a.id === value; });
    if (addr) fillAddressForm(addr);
  }
}

function fillAddressForm(addr) {
  var nameEl = document.getElementById('recipientName');
  var phoneEl = document.getElementById('recipientPhone');
  var provinceEl = document.getElementById('provinceSelect');
  var districtEl = document.getElementById('districtInput');
  var subdistrictEl = document.getElementById('subdistrictInput');
  var postalEl = document.getElementById('postalCode');
  var detailEl = document.getElementById('detailAddress');

  if (nameEl) nameEl.value = addr.recipient_name || '';
  if (phoneEl) phoneEl.value = addr.phone || '';
  if (provinceEl) provinceEl.value = addr.province || '';
  if (districtEl) districtEl.value = addr.city || addr.district || '';
  if (subdistrictEl) subdistrictEl.value = addr.district || '';
  if (postalEl) postalEl.value = addr.postal_code || '';
  if (detailEl) detailEl.value = addr.detail_address || '';
}

function clearAddressForm() {
  var nameEl = document.getElementById('recipientName');
  var phoneEl = document.getElementById('recipientPhone');
  var provinceEl = document.getElementById('provinceSelect');
  var districtEl = document.getElementById('districtInput');
  var subdistrictEl = document.getElementById('subdistrictInput');
  var postalEl = document.getElementById('postalCode');
  var detailEl = document.getElementById('detailAddress');

  prefillUserInfo();
  if (provinceEl) provinceEl.selectedIndex = 0;
  if (districtEl) districtEl.value = '';
  if (subdistrictEl) subdistrictEl.value = '';
  if (postalEl) postalEl.value = '';
  if (detailEl) detailEl.value = '';
}

function renderOrderSummary() {
  var container = document.getElementById('orderItemsSummary');
  if (!container) return;

  var html = '';
  var itemCount = 0;
  var subtotal = 0;

  checkoutItems.forEach(function(item) {
    var product = item.products;
    if (!product) return;
    var price = Number(product.price);
    var itemSubtotal = price * item.quantity;
    subtotal += itemSubtotal;
    itemCount += item.quantity;

    var img = (product.images && product.images.length > 0) ? product.images[0] : '';

    html += '<div class="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">';
    html += '  <div class="w-12 h-12 bg-gradient-to-br from-thai-cream to-yellow-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">';
    if (img) {
      html += '    <img src="' + img + '" alt="" class="w-full h-full object-cover">';
    } else {
      html += '    📦';
    }
    html += '  </div>';
    html += '  <div class="flex-1 min-w-0">';
    html += '    <p class="text-sm font-semibold text-gray-800 truncate">' + escapeHtml(product.name) + '</p>';
    html += '    <p class="text-xs text-gray-500">฿' + price.toLocaleString() + ' x ' + item.quantity + '</p>';
    html += '  </div>';
    html += '  <span class="font-semibold text-sm text-thai-red">฿' + itemSubtotal.toLocaleString() + '</span>';
    html += '</div>';
  });

  container.innerHTML = html;

  // Update item count in sidebar
  var countEl = document.getElementById('itemCount');
  if (countEl) countEl.textContent = itemCount;

  // Update subtotal
  var subEl = document.getElementById('checkoutSubtotal');
  if (subEl) subEl.textContent = '฿' + subtotal.toLocaleString();
}

function recalcTotal() {
  var subtotal = 0;
  checkoutItems.forEach(function(item) {
    if (item.products) {
      subtotal += Number(item.products.price) * item.quantity;
    }
  });

  var total = subtotal + shippingCost;
  var subEl = document.getElementById('checkoutSubtotal');
  var shipEl = document.getElementById('checkoutShipping');
  var totalEl = document.getElementById('checkoutTotal');

  if (subEl) subEl.textContent = '฿' + subtotal.toLocaleString();
  if (shipEl) shipEl.textContent = shippingCost === 0 ? (getLang() === 'zh' ? '免运费' : getLang() === 'en' ? 'Free' : 'ฟรี') : '฿' + shippingCost;
  if (totalEl) totalEl.textContent = '฿' + total.toLocaleString();
}

// Step navigation
var currentStep = 1;

function goStep(n) {
  // Validate step 1 before proceeding
  if (n > 1 && currentStep === 1) {
    var name = document.getElementById('recipientName').value.trim();
    var phone = document.getElementById('recipientPhone').value.trim();
    var detail = document.getElementById('detailAddress').value.trim();
    if (!name || !phone || !detail) {
      var errEl = document.getElementById('step1Error');
      if (errEl) {
        errEl.classList.remove('hidden');
        errEl.innerHTML = '<span class="lang-th">กรุณากรอกข้อมูลที่อยู่ให้ครบ</span><span class="lang-en">Please fill in all address fields</span><span class="lang-zh">请填写完整的地址信息</span>';
      }
      return;
    }
  }

  for (var i = 1; i <= 4; i++) {
    document.getElementById('step' + i).classList.toggle('hidden', i !== n);
  }
  for (var i = 1; i <= 4; i++) {
    var dot = document.getElementById('step' + i + 'dot');
    dot.classList.remove('active', 'done', 'bg-gray-200', 'text-gray-500');
    if (i < n) dot.classList.add('done');
    else if (i === n) dot.classList.add('active');
    else { dot.classList.add('bg-gray-200', 'text-gray-500'); }
  }
  for (var i = 1; i <= 3; i++) {
    var line = document.getElementById('line' + i);
    line.classList.remove('active', 'done');
    if (i < n) line.classList.add('done');
    else if (i === n) line.classList.add('active');
  }
  currentStep = n;
  window.scrollTo(0, 0);

  // Update confirm step
  if (n === 4) updateConfirmStep();
}

function updateConfirmStep() {
  // Address summary
  var name = document.getElementById('recipientName').value;
  var phone = document.getElementById('recipientPhone').value;
  var detail = document.getElementById('detailAddress').value;
  var district = document.getElementById('districtInput').value;
  var province = document.getElementById('provinceSelect').value;
  var postal = document.getElementById('postalCode').value;

  var addrSummary = document.getElementById('confirmAddress');
  if (addrSummary) {
    addrSummary.innerHTML = '<p class="text-sm text-gray-600">' + escapeHtml(name) + ' | ' + escapeHtml(phone) + '</p>' +
      '<p class="text-sm text-gray-600">' + escapeHtml(detail) + ', ' + escapeHtml(district) + ', ' + escapeHtml(province) + ' ' + escapeHtml(postal) + '</p>';
  }

  // Shipping summary
  var shipSummary = document.getElementById('confirmShipping');
  if (shipSummary) {
    var shippingText = selectedShipping === 'express' ?
      '<span class="lang-th">ด่วน (1-2 วัน)</span><span class="lang-en">Express (1-2 days)</span><span class="lang-zh">快递 (1-2天)</span>' :
      '<span class="lang-th">มาตรฐาน (3-5 วัน)</span><span class="lang-en">Standard (3-5 days)</span><span class="lang-zh">标准配送 (3-5天)</span>';
    shipSummary.innerHTML = '<p class="text-sm text-gray-600">' + shippingText + ' — ฿' + shippingCost + '</p>';
  }

  // Payment summary
  var paySummary = document.getElementById('confirmPayment');
  if (paySummary) {
    var payText = selectedPayment === 'cod' ? '💵 COD' :
      selectedPayment === 'card' ? '💳 Credit/Debit' : '📱 PromptPay';
    paySummary.innerHTML = '<p class="text-sm text-gray-600">' + payText + '</p>';
  }

  // Items summary
  var itemsSummary = document.getElementById('confirmItems');
  if (itemsSummary) {
    var html = '';
    checkoutItems.forEach(function(item) {
      if (!item.products) return;
      html += '<div class="flex justify-between text-sm"><span>' + escapeHtml(item.products.name) + ' x' + item.quantity + '</span><span>฿' + (Number(item.products.price) * item.quantity).toLocaleString() + '</span></div>';
    });
    itemsSummary.innerHTML = html;
  }
}

function selectShipping(el) {
  document.querySelectorAll('.shipping-card').forEach(function(c) { c.classList.remove('selected'); });
  el.classList.add('selected');
  el.querySelector('input').checked = true;

  var radio = el.querySelector('input[type="radio"]');
  var cardIndex = Array.from(document.querySelectorAll('.shipping-card')).indexOf(el);

  if (cardIndex === 0) { selectedShipping = 'standard'; shippingCost = 50; }
  else if (cardIndex === 1) { selectedShipping = 'express'; shippingCost = 100; }
  else { selectedShipping = 'free'; shippingCost = 0; }

  recalcTotal();
}

function selectPayment(el, type) {
  document.querySelectorAll('.pay-card').forEach(function(c) { c.classList.remove('selected'); });
  el.classList.add('selected');
  el.querySelector('input').checked = true;
  selectedPayment = type;

  // Toggle sections
  var cardSection = document.getElementById('cardSection');
  var promptpaySection = document.getElementById('promptpaySection');
  if (cardSection) cardSection.classList.toggle('hidden', type !== 'card');
  if (promptpaySection) promptpaySection.classList.toggle('hidden', type !== 'promptpay');

  // Generate PromptPay QR if selected
  if (type === 'promptpay') {
    generatePromptPayQR();
  }
}

function generatePromptPayQR() {
  var qrContainer = document.getElementById('promptpayQR');
  if (!qrContainer) return;

  var subtotal = 0;
  checkoutItems.forEach(function(item) {
    if (item.products) subtotal += Number(item.products.price) * item.quantity;
  });
  var total = subtotal + shippingCost;

  // Generate PromptPay payload (simplified - in production use a proper PromptPay library)
  var promptPayId = '0812345678'; // Merchant phone number
  var payload = promptPayId + '?amount=' + total.toFixed(2);
  var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(payload);

  qrContainer.innerHTML = '<img src="' + qrUrl + '" alt="PromptPay QR" class="w-40 h-40 mx-auto rounded-xl">' +
    '<p class="text-xs text-gray-500 mt-2"><span class="lang-th">ยอดชำระ:</span><span class="lang-en">Amount:</span><span class="lang-zh">金额:</span> ฿' + total.toLocaleString() + '</p>';
}

async function placeOrder() {
  var btn = document.getElementById('placeOrderBtn');
  var errorEl = document.getElementById('orderError');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="lang-th">กำลังดำเนินการ...</span><span class="lang-en">Processing...</span><span class="lang-zh">处理中...</span>';
  }

  if (errorEl) errorEl.classList.add('hidden');

  try {
    // Calculate total
    var subtotal = 0;
    var orderItemsData = [];
    checkoutItems.forEach(function(item) {
      if (!item.products) return;
      var unitPrice = Number(item.products.price);
      var totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;
      orderItemsData.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: totalPrice
      });
    });
    var totalAmount = subtotal + shippingCost;

    // Get address info
    var recipientName = document.getElementById('recipientName').value.trim();
    var recipientPhone = document.getElementById('recipientPhone').value.trim();
    var detailAddress = document.getElementById('detailAddress').value.trim();
    var district = document.getElementById('districtInput').value.trim();
    var provinceEl = document.getElementById('provinceSelect');
    var province = provinceEl ? provinceEl.value : '';
    var postalCode = document.getElementById('postalCode').value.trim();

    // Save address if "save as default" checked
    var saveAddr = document.getElementById('saveAddressCheck');
    if (saveAddr && saveAddr.checked) {
      await addAddress({
        user_id: currentUser.id,
        recipient_name: recipientName,
        phone: recipientPhone,
        province: province,
        city: district,
        district: district,
        detail_address: detailAddress,
        postal_code: postalCode,
        is_default: true
      });
    }

    // Create order
    var orderNumber = generateOrderNumber();
    var orderData = {
      user_id: currentUser.id,
      order_number: orderNumber,
      total_amount: totalAmount,
      status: selectedPayment === 'cod' ? 'pending' : 'pending',
      payment_method: selectedPayment,
      payment_status: selectedPayment === 'cod' ? 'unpaid' : 'unpaid',
      notes: ''
    };

    // If we have a saved address, link it
    if (selectedAddressId) {
      orderData.shipping_address_id = selectedAddressId;
    }

    var orderResult = await createOrder(orderData);

    if (orderResult.error) {
      throw new Error(orderResult.error.message || 'Order creation failed');
    }

    var orderId = orderResult.data.id;

    // Create order items
    orderItemsData.forEach(function(oi) {
      oi.order_id = orderId;
    });
    await createOrderItems(orderItemsData);

    // Remove checked out items from cart
    var cartItemIds = checkoutItems.map(function(item) { return item.id; });
    await clearCartItems(currentUser.id, cartItemIds);

    // Clear localStorage
    localStorage.removeItem('checkout_item_ids');

    // Redirect to order detail
    location.href = 'order-detail.html?id=' + orderId;

  } catch (err) {
    console.error('Order error:', err);
    if (errorEl) {
      errorEl.classList.remove('hidden');
      errorEl.innerHTML = '<span class="lang-th">เกิดข้อผิดพลาด: </span><span class="lang-en">Error: </span><span class="lang-zh">发生错误: </span>' + escapeHtml(err.message);
    }
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🛒 <span class="lang-th">ยืนยันสั่งซื้อ</span><span class="lang-en">Place Order</span><span class="lang-zh">提交订单</span>';
    }
  }
}

function escapeHtml(text) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(text || ''));
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

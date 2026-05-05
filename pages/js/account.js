// ThaiShop - Account Page Logic

let currentUser = null;
let userOrders = [];
let userAddresses = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', async function() {
  // Init language
  try {
    var s = localStorage.getItem('thaishop-lang');
    if (s) switchLang(s);
  } catch(e) {}

  // Check login
  currentUser = await getCurrentUser();

  if (!currentUser) {
    showLoginPrompt();
    return;
  }

  // Show account sections
  showAccountContent();

  // Load user profile
  loadUserProfile();

  // Load orders
  await loadOrders();

  // Load addresses
  await loadAddresses();
});

function showLoginPrompt() {
  // Hide all sections
  ['sectionProfile', 'sectionOrders', 'sectionAddresses', 'sectionWishlist'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  // Show login prompt
  var promptEl = document.getElementById('loginPrompt');
  if (promptEl) promptEl.classList.remove('hidden');

  // Hide logout button
  var logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.classList.add('hidden');
}

function showAccountContent() {
  var promptEl = document.getElementById('loginPrompt');
  if (promptEl) promptEl.classList.add('hidden');

  var contentEl = document.getElementById('accountContent');
  if (contentEl) contentEl.classList.remove('hidden');
}

function loadUserProfile() {
  if (!currentUser) return;

  var nameEl = document.getElementById('profileName');
  var emailEl = document.getElementById('profileEmail');
  var phoneEl = document.getElementById('profilePhone');

  if (nameEl) nameEl.textContent = currentUser.full_name || 'N/A';
  if (emailEl) emailEl.textContent = currentUser.email || 'N/A';
  if (phoneEl) phoneEl.textContent = currentUser.phone || 'N/A';
}

async function loadOrders(filter) {
  if (!currentUser) return;
  if (filter) currentFilter = filter;

  userOrders = await getOrders(currentUser.id, currentFilter);
  renderOrders();
}

function renderOrders() {
  var container = document.getElementById('ordersList');
  if (!container) return;

  if (userOrders.length === 0) {
    container.innerHTML = '' +
      '<div class="text-center py-10 text-gray-400">' +
      '  <div class="text-4xl mb-3">📦</div>' +
      '  <p><span class="lang-th">ไม่มีคำสั่งซื้อ</span><span class="lang-en">No orders yet</span><span class="lang-zh">暂无订单</span></p>' +
      '</div>';
    return;
  }

  var html = '';
  userOrders.forEach(function(order) {
    var statusBadge = getStatusBadge(order.status);
    var date = new Date(order.created_at);
    var dateStr = date.toLocaleDateString('th-TH');

    html += '<div class="border rounded-xl p-4 flex items-center gap-4 hover:border-thai-gold transition cursor-pointer" onclick="location.href=\'order-detail.html?id=' + order.id + '\'">' +
      '  <div class="flex-1">' +
      '    <div class="flex items-center gap-2 mb-1">' +
      '      <span class="font-bold text-sm">' + escapeHtml(order.order_number) + '</span>' +
      '      ' + statusBadge +
      '    </div>' +
      '    <p class="text-xs text-gray-500">' + dateStr + ' | ' +
      '      <span class="lang-th">' + (order._count ? order._count.items : '?') + ' รายการ</span>' +
      '      <span class="lang-en">' + (order._count ? order._count.items : '?') + ' items</span>' +
      '      <span class="lang-zh">' + (order._count ? order._count.items : '?') + ' 件</span>' +
      '    </p>' +
      '  </div>' +
      '  <span class="font-bold text-thai-red">฿' + Number(order.total_amount).toLocaleString() + '</span>' +
      '  <span class="text-gray-400">›</span>' +
      '</div>';
  });

  container.innerHTML = html;
}

function getStatusBadge(status) {
  var lang = getLang();
  var badges = {
    'pending': {
      th: '<span class="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-semibold"><span class="lang-th">รอชำระเงิน</span><span class="lang-en">Pending</span><span class="lang-zh">待处理</span></span>',
      en: '<span class="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-semibold">Pending</span>',
      zh: '<span class="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-semibold">待处理</span>'
    },
    'paid': {
      th: '<span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold"><span class="lang-th">ชำระแล้ว</span><span class="lang-en">Paid</span><span class="lang-zh">已付款</span></span>',
      en: '<span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">Paid</span>',
      zh: '<span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">已付款</span>'
    },
    'shipped': {
      th: '<span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold"><span class="lang-th">จัดส่งแล้ว</span><span class="lang-en">Shipped</span><span class="lang-zh">已出貨</span></span>',
      en: '<span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">Shipped</span>',
      zh: '<span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">已出貨</span>'
    },
    'delivered': {
      th: '<span class="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-semibold"><span class="lang-th">จัดส่งแล้ว</span><span class="lang-en">Delivered</span><span class="lang-zh">已送达</span></span>',
      en: '<span class="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-semibold">Delivered</span>',
      zh: '<span class="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-semibold">已送达</span>'
    },
    'completed': {
      th: '<span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold"><span class="lang-th">เสร็จสมบูรณ์</span><span class="lang-en">Completed</span><span class="lang-zh">已完成</span></span>',
      en: '<span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">Completed</span>',
      zh: '<span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">已完成</span>'
    },
    'cancelled': {
      th: '<span class="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-semibold"><span class="lang-th">ยกเลิกแล้ว</span><span class="lang-en">Cancelled</span><span class="lang-zh">已取消</span></span>',
      en: '<span class="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-semibold">Cancelled</span>',
      zh: '<span class="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-semibold">已取消</span>'
    }
  };

  if (badges[status] && badges[status][lang]) {
    return badges[status][lang];
  }
  return '<span class="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">' + (status || 'unknown') + '</span>';
}

function filterOrders(filter) {
  // Update active button
  document.querySelectorAll('.order-filter-btn').forEach(function(btn) {
    btn.classList.remove('active', 'bg-thai-red', 'text-white');
    btn.classList.add('bg-gray-100', 'text-gray-600');
  });
  var activeBtn = document.getElementById('filter-' + filter);
  if (activeBtn) {
    activeBtn.classList.add('active', 'bg-thai-red', 'text-white');
    activeBtn.classList.remove('bg-gray-100', 'text-gray-600');
  }
  loadOrders(filter);
}

async function loadAddresses() {
  if (!currentUser) return;
  userAddresses = await getAddresses(currentUser.id);
  renderAddresses();
}

function renderAddresses() {
  var container = document.getElementById('addressesList');
  if (!container) return;

  if (userAddresses.length === 0) {
    container.innerHTML = '' +
      '<div class="text-center py-10 text-gray-400">' +
      '  <div class="text-4xl mb-3">📍</div>' +
      '  <p><span class="lang-th">ยังไม่มีที่อยู่</span><span class="lang-en">No addresses yet</span><span class="lang-zh">暂无地址</span></p>' +
      '</div>';
    return;
  }

  var html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';

  userAddresses.forEach(function(addr) {
    var isDefault = addr.is_default;
    html += '<div class="border-2 ' + (isDefault ? 'border-thai-gold' : '') + ' rounded-xl p-4 relative">' +
      (isDefault ? '<span class="absolute top-2 right-2 bg-thai-gold text-thai-purple text-xs px-2 py-0.5 rounded font-bold"><span class="lang-th">ค่าเริ่มต้น</span><span class="lang-en">Default</span><span class="lang-zh">默认</span></span>' : '') +
      '  <p class="font-semibold text-sm">' + escapeHtml(addr.recipient_name) + '</p>' +
      '  <p class="text-xs text-gray-500">' + escapeHtml(addr.phone) + '</p>' +
      '  <p class="text-xs text-gray-600 mt-1">' + escapeHtml(addr.detail_address) + ', ' + escapeHtml(addr.district) + ', ' + escapeHtml(addr.province) + ' ' + escapeHtml(addr.postal_code || '') + '</p>' +
      '  <div class="flex gap-2 mt-3">' +
      '    <button onclick="editAddress(\'' + addr.id + '\')" class="text-xs text-thai-red hover:underline"><span class="lang-th">แก้ไข</span><span class="lang-en">Edit</span><span class="lang-zh">编辑</span></button>' +
      '    <button onclick="deleteAddressConfirm(\'' + addr.id + '\')" class="text-xs text-gray-400 hover:underline"><span class="lang-th">ลบ</span><span class="lang-en">Delete</span><span class="lang-zh">删除</span></button>' +
      '  </div>' +
      '</div>';
  });

  html += '</div>';
  container.innerHTML = html;
}

function showAddAddressForm() {
  var formEl = document.getElementById('addAddressForm');
  if (formEl) formEl.classList.remove('hidden');
}

function cancelAddAddress() {
  var formEl = document.getElementById('addAddressForm');
  if (formEl) {
    formEl.classList.add('hidden');
    // Clear form
    ['newRecipientName', 'newPhone', 'newProvince', 'newDistrict', 'newSubdistrict', 'newPostalCode', 'newDetailAddress'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
  }
}

async function saveNewAddress() {
  if (!currentUser) return;

  var nameEl = document.getElementById('newRecipientName');
  var phoneEl = document.getElementById('newPhone');
  var provinceEl = document.getElementById('newProvince');
  var districtEl = document.getElementById('newDistrict');
  var subdistrictEl = document.getElementById('newSubdistrict');
  var postalEl = document.getElementById('newPostalCode');
  var detailEl = document.getElementById('newDetailAddress');
  var typeEl = document.getElementById('newAddressType');

  var name = nameEl ? nameEl.value.trim() : '';
  var phone = phoneEl ? phoneEl.value.trim() : '';
  var province = provinceEl ? provinceEl.value.trim() : '';
  var district = districtEl ? districtEl.value.trim() : '';
  var subdistrict = subdistrictEl ? subdistrictEl.value.trim() : '';
  var postal = postalEl ? postalEl.value.trim() : '';
  var detail = detailEl ? detailEl.value.trim() : '';
  var type = typeEl ? typeEl.value : 'home';

  if (!name || !phone || !detail) {
    showAddressError('<span class="lang-th">กรุณากรอกข้อมูลให้ครบ</span><span class="lang-en">Please fill in all required fields</span><span class="lang-zh">请填写完整信息</span>');
    return;
  }

  var addressData = {
    user_id: currentUser.id,
    recipient_name: name,
    phone: phone,
    province: province,
    city: district,
    district: subdistrict,
    detail_address: detail,
    postal_code: postal,
    address_type: type,
    is_default: false
  };

  var result = await addAddress(addressData);

  if (result.error) {
    showAddressError('<span class="lang-th">เกิดข้อผิดพลาด: </span><span class="lang-en">Error: </span><span class="lang-zh">错误: </span>' + escapeHtml(result.error.message));
    return;
  }

  // Reload addresses
  await loadAddresses();
  cancelAddAddress();
}

function showAddressError(msg) {
  var el = document.getElementById('addressError');
  if (el) {
    el.innerHTML = msg;
    el.classList.remove('hidden');
    setTimeout(function() { el.classList.add('hidden'); }, 3000);
  }
}

async function deleteAddressConfirm(addressId) {
  if (!confirm(getLang() === 'th' ? 'ยืนยันการลบที่อยู่นี้?' : getLang() === 'en' ? 'Confirm delete this address?' : '确认删除此地址？')) {
    return;
  }
  var result = await deleteAddress(addressId);
  if (result.error) {
    alert('Error: ' + result.error.message);
  } else {
    await loadAddresses();
  }
}

function editAddress(addressId) {
  // In a full implementation, this would populate a form with the address data
  alert(getLang() === 'th' ? 'ฟีเจอร์แก้ไขที่อยู่กำลังพัฒนา' : getLang() === 'en' ? 'Edit address feature is under development' : '编辑地址功能开发中');
}

async function handleLogout() {
  await logout();
  location.reload();
}

function switchSection(name) {
  var sections = ['Profile', 'Orders', 'Addresses', 'Wishlist'];
  sections.forEach(function(s) {
    var el = document.getElementById('section' + s);
    if (el) el.classList.toggle('hidden', s.toLowerCase() !== name);
  });

  // Update sidebar buttons
  document.querySelectorAll('.sidebar-btn').forEach(function(btn) {
    btn.classList.remove('active');
    var text = btn.textContent.toLowerCase();
    if (text.indexOf(name.substring(0, 3).toLowerCase()) !== -1) {
      btn.classList.add('active');
    }
  });
}

function escapeHtml(text) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(text || ''));
  return div.innerHTML;
}

function getLang() {
  try {
    return localStorage.getItem('thaishop-lang') || 'th';
  } catch (e) {
    return 'th';
  }
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

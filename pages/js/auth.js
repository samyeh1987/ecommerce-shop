// ThaiShop - Auth Page Logic (Login/Register)

let currentTab = 'login';

document.addEventListener('DOMContentLoaded', function() {
  // Init language
  try {
    var s = localStorage.getItem('thaishop-lang');
    if (s) switchLang(s);
  } catch(e) {}

  // Check if already logged in
  checkExistingAuth();

  // Setup form handlers
  setupFormHandlers();
});

async function checkExistingAuth() {
  try {
    var userResult = await getCurrentUser();
    var user = (userResult && userResult.success && userResult.data) ? userResult.data : null;
    if (!user && userResult && userResult.id) user = userResult;
    if (user) {
      // Already logged in, redirect
      var redirect = getRedirectUrl();
      location.href = redirect;
    }
  } catch(e) {
    // Not logged in, stay on page
  }
}

function getRedirectUrl() {
  var params = new URLSearchParams(window.location.search);
  return params.get('redirect') || '/account';
}

function setupFormHandlers() {
  // Login form
  var loginForm = document.getElementById('loginFormElement');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      handleLogin();
    });
  }

  // Register form
  var registerForm = document.getElementById('registerFormElement');
  if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
      e.preventDefault();
      handleRegister();
    });
  }

  // Forgot password link
  var forgotLink = document.getElementById('forgotPasswordLink');
  if (forgotLink) {
    forgotLink.addEventListener('click', function(e) {
      e.preventDefault();
      showInfoMessage('forgotMsg',
        '<span class="lang-th">ฟีเจอร์นี้กำลังพัฒนา</span>' +
        '<span class="lang-en">This feature is under development</span>' +
        '<span class="lang-zh">功能开发中</span>');
    });
  }
}

function switchAuthTab(tab) {
  currentTab = tab;
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabLogin').classList.toggle('bg-gray-100', tab !== 'login');
  document.getElementById('tabLogin').classList.toggle('text-gray-600', tab !== 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
  document.getElementById('tabRegister').classList.toggle('bg-gray-100', tab !== 'register');
  document.getElementById('tabRegister').classList.toggle('text-gray-600', tab !== 'register');

  // Clear messages
  clearMessages();
}

async function handleLogin() {
  clearMessages();
  var emailInput = document.getElementById('loginEmail');
  var passwordInput = document.getElementById('loginPassword');

  var email = emailInput ? emailInput.value.trim() : '';
  var password = passwordInput ? passwordInput.value : '';

  // Validation
  if (!email) {
    showFieldError('loginEmailError',
      '<span class="lang-th">กรุณากรอกอีเมล</span>' +
      '<span class="lang-en">Please enter email</span>' +
      '<span class="lang-zh">请输入邮箱</span>');
    return;
  }

  if (!isValidEmail(email)) {
    showFieldError('loginEmailError',
      '<span class="lang-th">รูปแบบอีเมลไม่ถูกต้อง</span>' +
      '<span class="lang-en">Invalid email format</span>' +
      '<span class="lang-zh">邮箱格式不正确</span>');
    return;
  }

  if (!password) {
    showFieldError('loginPasswordError',
      '<span class="lang-th">กรุณากรอกรหัสผ่าน</span>' +
      '<span class="lang-en">Please enter password</span>' +
      '<span class="lang-zh">请输入密码</span>');
    return;
  }

  // Show loading
  var btn = document.getElementById('loginBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="lang-th">กำลังเข้าสู่ระบบ...</span><span class="lang-en">Logging in...</span><span class="lang-zh">登录中...</span>';
  }

  try {
    var result = await login(email, password);

    // Handle wrapped response format {success, data, error}
    var errorMsg = null;
    if (result && result.success === false && result.error) {
      errorMsg = result.error;
    } else if (result && result.error) {
      errorMsg = result.error.message || result.error;
    }

    if (errorMsg) {
      showFieldError('loginGeneralError', getAuthErrorMessage(typeof errorMsg === 'string' ? errorMsg : errorMsg.message || 'Login failed'));
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="lang-th">เข้าสู่ระบบ</span><span class="lang-en">Login</span><span class="lang-zh">登录</span>';
      }
      return;
    }

    // Login success
    var redirect = getRedirectUrl();
    location.href = redirect;
  } catch (err) {
    showFieldError('loginGeneralError', getAuthErrorMessage(err.message));
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="lang-th">เข้าสู่ระบบ</span><span class="lang-en">Login</span><span class="lang-zh">登录</span>';
    }
  }
}

async function handleRegister() {
  clearMessages();
  var nameInput = document.getElementById('registerName');
  var emailInput = document.getElementById('registerEmail');
  var phoneInput = document.getElementById('registerPhone');
  var passwordInput = document.getElementById('registerPassword');
  var confirmInput = document.getElementById('registerConfirmPassword');

  var name = nameInput ? nameInput.value.trim() : '';
  var email = emailInput ? emailInput.value.trim() : '';
  var phone = phoneInput ? phoneInput.value.trim() : '';
  var password = passwordInput ? passwordInput.value : '';
  var confirmPassword = confirmInput ? confirmInput.value : '';

  // Validation
  var hasError = false;

  if (!name) {
    showFieldError('registerNameError',
      '<span class="lang-th">กรุณากรอกชื่อ</span>' +
      '<span class="lang-en">Please enter your name</span>' +
      '<span class="lang-zh">请输入姓名</span>');
    hasError = true;
  }

  if (!email) {
    showFieldError('registerEmailError',
      '<span class="lang-th">กรุณากรอกอีเมล</span>' +
      '<span class="lang-en">Please enter email</span>' +
      '<span class="lang-zh">请输入邮箱</span>');
    hasError = true;
  } else if (!isValidEmail(email)) {
    showFieldError('registerEmailError',
      '<span class="lang-th">รูปแบบอีเมลไม่ถูกต้อง</span>' +
      '<span class="lang-en">Invalid email format</span>' +
      '<span class="lang-zh">邮箱格式不正确</span>');
    hasError = true;
  }

  if (!phone) {
    showFieldError('registerPhoneError',
      '<span class="lang-th">กรุณากรอกเบอร์โทร</span>' +
      '<span class="lang-en">Please enter phone number</span>' +
      '<span class="lang-zh">请输入手机号</span>');
    hasError = true;
  }

  if (!password) {
    showFieldError('registerPasswordError',
      '<span class="lang-th">กรุณากรอกรหัสผ่าน</span>' +
      '<span class="lang-en">Please enter password</span>' +
      '<span class="lang-zh">请输入密码</span>');
    hasError = true;
  } else if (password.length < 6) {
    showFieldError('registerPasswordError',
      '<span class="lang-th">รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร</span>' +
      '<span class="lang-en">Password must be at least 6 characters</span>' +
      '<span class="lang-zh">密码至少6个字符</span>');
    hasError = true;
  }

  if (password !== confirmPassword) {
    showFieldError('registerConfirmError',
      '<span class="lang-th">รหัสผ่านไม่ตรงกัน</span>' +
      '<span class="lang-en">Passwords do not match</span>' +
      '<span class="lang-zh">两次密码不一致</span>');
    hasError = true;
  }

  if (hasError) return;

  // Show loading
  var btn = document.getElementById('registerBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="lang-th">กำลังสมัครสมาชิก...</span><span class="lang-en">Registering...</span><span class="lang-zh">注册中...</span>';
  }

  // 保險：20 秒後強制恢復按鈕（防止任何情況下卡死）
  var backupTimer = setTimeout(function() {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="lang-th">สมัครสมาชิก</span><span class="lang-en">Register</span><span class="lang-zh">注册</span>';
      showFieldError('registerGeneralError',
        '<span class="lang-th">ข้อผิดพลาดเครือข่าย กรุณาลองอีกครั้ง</span>' +
        '<span class="lang-en">Network error, please try again</span>' +
        '<span class="lang-zh">网络错误，请重试</span>');
    }
  }, 20000);

  try {
    console.log('[ThaiShop Register] 開始註冊，email:', email);

    // 檢查 Supabase 是否初始化
    if (typeof window.ThaiShop === 'undefined' || !window.supabase) {
      throw new Error('Supabase 尚未初始化，請檢查 config.js');
    }

    // 加入超時保護，避免 Supabase 專案暫停時無限等待
    var result = await Promise.race([
      new Promise(function(resolve) {
        register(email, password, name, phone).then(resolve).catch(resolve);
      }),
      new Promise(function(_, reject) {
        setTimeout(function() { reject(new Error('timeout')); }, 15000);
      })
    ]);

    clearTimeout(backupTimer);

    console.log('[ThaiShop Register] 結果:', result);

    // Handle wrapped response format {success, data, error}
    var errorMsg = null;
    if (result && result.success === false && result.error) {
      errorMsg = typeof result.error === 'string' ? result.error : (result.error.message || result.error);
    } else if (result && result.error) {
      errorMsg = result.error.message || result.error;
    }

    if (errorMsg) {
      showFieldError('registerGeneralError', getAuthErrorMessage(typeof errorMsg === 'string' ? errorMsg : (errorMsg.message || 'Registration failed')));
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="lang-th">สมัครสมาชิก</span><span class="lang-en">Register</span><span class="lang-zh">注册</span>';
      }
      return;
    }

    // Registration success - switch to login tab
    showSuccessMessage('registerSuccessMsg',
      '<span class="lang-th">สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ</span>' +
      '<span class="lang-en">Registration successful! Please login</span>' +
      '<span class="lang-zh">注册成功，请登录</span>');

    setTimeout(function() {
      switchAuthTab('login');
    }, 1500);

  } catch (err) {
    clearTimeout(backupTimer);
    console.error('[ThaiShop Register] 錯誤:', err);
    var displayMsg = (err && err.message === 'timeout') ?
        getAuthErrorMessage('Network error') :
        getAuthErrorMessage(err.message || 'Registration failed');
    showFieldError('registerGeneralError', displayMsg);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="lang-th">สมัครสมาชิก</span><span class="lang-en">Register</span><span class="lang-zh">注册</span>';
    }
  }
}

// ============ Validation Helpers ============

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============ Message Display ============

function showFieldError(elementId, message) {
  var el = document.getElementById(elementId);
  if (el) {
    el.innerHTML = message;
    el.classList.remove('hidden');
  }
}

function showSuccessMessage(elementId, message) {
  var el = document.getElementById(elementId);
  if (el) {
    el.innerHTML = '✅ ' + message;
    el.classList.remove('hidden');
  }
}

function showInfoMessage(elementId, message) {
  var el = document.getElementById(elementId);
  if (el) {
    el.innerHTML = 'ℹ️ ' + message;
    el.classList.remove('hidden');
    setTimeout(function() { el.classList.add('hidden'); }, 3000);
  }
}

function clearMessages() {
  var msgIds = [
    'loginEmailError', 'loginPasswordError', 'loginGeneralError',
    'registerNameError', 'registerEmailError', 'registerPhoneError',
    'registerPasswordError', 'registerConfirmError', 'registerGeneralError',
    'registerSuccessMsg', 'forgotMsg'
  ];
  msgIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.innerHTML = '';
      el.classList.add('hidden');
    }
  });
}

function getAuthErrorMessage(msg) {
  var lang = getLang();
  var errorMap = {
    'Invalid login credentials': {
      th: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      en: 'Invalid email or password',
      zh: '邮箱或密码不正确'
    },
    'User already registered': {
      th: 'อีเมลนี้ถูกลงทะเบียนแล้ว',
      en: 'This email is already registered',
      zh: '该邮箱已被注册'
    },
    'Email not confirmed': {
      th: 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ',
      en: 'Please confirm your email before logging in',
      zh: '请先验证邮箱后再登录'
    },
    'Password should be at least 6 characters': {
      th: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
      en: 'Password must be at least 6 characters',
      zh: '密码至少6个字符'
    },
    'Network error': {
      th: 'ข้อผิดพลาดของเครือข่าย กรุณาลองอีกครั้ง',
      en: 'Network error, please try again',
      zh: '网络错误，请重试'
    }
  };

  if (errorMap[msg] && errorMap[msg][lang]) {
    return errorMap[msg][lang];
  }
  return '<span class="lang-th">เกิดข้อผิดพลาด: </span><span class="lang-en">Error: </span><span class="lang-zh">错误: </span>' + escapeHtml(msg);
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

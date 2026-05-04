# 商城獨立站開發規格文件 (ThaiShop)

> 專案版本：v1.0 | 日期：2026-05-04  
> 目標市場：泰國本地｜目標用戶：泰國人 + TikTok 直播回購客戶  
> 流量目標：同時在線 10,000+ ｜日單量：數萬單

---

## 目錄

1. [需求概覽](#1-需求概覽)
2. [技術架構](#2-技術架構)
3. [資料庫設計](#3-資料庫設計)
4. [功能模組清單](#4-功能模組清單)
5. [API 規格](#5-api-規格)
6. [多語系方案](#6-多語系方案)
7. [泰國市場專用功能](#7-泰國市場專用功能)
8. [擴展與效能方案](#8-擴展與效能方案)
9. [開發時程建議](#9-開發時程建議)

---

## 1. 需求概覧

### 1.1 商業目標

| 項目 | 說明 |
|------|------|
| 核心目標 | 將 TikTok 直播流量轉化為私域回購客戶 |
| 目標客群 | 泰國本地消費者（泰人 + 在泰外籍人士） |
| 日單量 | 現有直播每日數萬單，獨立站承接回購 |
| 同時在線 | 支援 10,000+ 並發用戶（直播流量高峰） |

### 1.2 關鍵需求

- [x] 前後端完全分離（獨立部署、獨立擴展）
- [x] 模組化架構（樂高式，可插拔擴充）
- [x] 中英泰三語介面切換
- [x] 泰式視覺設計（符合泰國用戶審美）
- [x] 萬人在線高併發支援
- [ ] TikTok 直播訂單同步
- [ ] 泰國本地支付方式（PromptPay / 7-Eleven / 貨到付款）

---

## 2. 技術架構

### 2.1 整體技術堆疊

```
前端 (Frontend)
├── Framework: Next.js 14+ (App Router)
├── Styling: Tailwind CSS + 泰式主題變數
├── State: Zustand（輕量、模組化友好）
├── I18n: next-intl（zh / en / th）
├── PWA: next-pwa（手機加入主畫面）
└── Deploy: Vercel（全球 Edge Network）

後端 (Backend API)
├── Framework: Next.js API Routes（BFF 模式）
├── Database: PostgreSQL on Supabase
├── Auth: Supabase Auth（JWT + RLS）
├── Storage: Supabase Storage（圖片 CDN）
├── Cache: Upstash Redis（serverless Redis）
└── Deploy: Vercel + Supabase Cloud

支付 (Payment)
└── Omise API（泰國主流支付閘道）
    ├── PromptPay QR Code
    ├── Credit Card
    ├── Installments
    └── TrueMoney Wallet
```

### 2.2 前後端分離說明

| 對比項目 | 傳統一體式 | 本專案分離式 |
|----------|------------|--------------|
| 前端部署 | 同伺服器 | Vercel Edge（全球節點） |
| 後端部署 | 同伺服器 | Vercel Serverless + Supabase |
| 擴展方式 | 整體擴展 | 前端/後端獨立擴展 |
| CDN | 需額外設定 | Vercel 內建全球 CDN |
| 本地化 | 困難 | 前端可獨立做泰國節點部署 |

### 2.3 模組化設計（樂高式）

```
src/
├── modules/                  # 各業務模組（可獨立啟用/停用）
│   ├── core/                # 核心模組（不可移除）
│   │   ├── auth/           # 認證模組
│   │   ├── i18n/          # 多語系模組
│   │   └── ui/            # 基礎 UI 元件庫
│   ├── product/            # 商品模組
│   │   ├── components/     # 商品相關元件
│   │   ├── store.ts        # Zustand store
│   │   ├── api.ts          # API 呼叫
│   │   └── types.ts       # TypeScript 型別
│   ├── cart/              # 購物車模組
│   ├── checkout/          # 結帳模組
│   ├── order/             # 訂單模組
│   ├── payment/           # 支付模組
│   ├── user/              # 會員模組
│   ├── promotion/         # 促銷模組（秒殺/優惠券）
│   ├── review/            # 評論模組
│   ├── live/              # TikTok 直播串接模組 ⭐ 專案特色
│   └── analytics/        # 數據分析模組
├── pages/                 # Next.js 頁面路由
└── styles/               # 全域樣式 + 泰式主題
```

**模組啟用設定範例 (`config/modules.ts`)：**
```typescript
export const ENABLED_MODULES = {
  product: true,
  cart: true,
  checkout: true,
  live: true,        // TikTok 直播模組
  promotion: true,   // 秒殺功能
  review: false,     // 評論功能（二期再開）
};
```

---

## 3. 資料庫設計

### 3.1 現有表（已建立）

| 表名 | 說明 | 關鍵欄位 |
|------|------|----------|
| `product_categories` | 商品分類 | `id, name, slug, parent_id, is_active` |
| `products` | 商品主表 | `id, name, price, stock_quantity, sku` |
| `users` | 會員表 | `id, email, phone, role` |
| `addresses` | 收貨地址 | `province, city, district, detail_address` |
| `cart_items` | 購物車 | `user_id, product_id, quantity` |
| `orders` | 訂單主表 | `order_number, total_amount, status` |
| `order_items` | 訂單明細 | `order_id, product_id, unit_price` |

### 3.2 需擴充表（泰國市場專用）

#### `product_i18n`（多語商品描述）
```sql
CREATE TABLE IF NOT EXISTS product_i18n (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    locale VARCHAR(10) NOT NULL CHECK (locale IN ('zh','en','th')),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    meta_title VARCHAR(255),
    meta_description TEXT,
    UNIQUE(product_id, locale)
);
```

#### `promotions`（促銷活動）
```sql
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('flash_sale','coupon','bundle')),
    title_i18n JSONB NOT NULL,  -- {"zh":"週年慶","en":"Anniversary","th":"ครบรอบ"}
    discount_type VARCHAR(10) CHECK (discount_type IN ('percent','fixed')),
    discount_value DECIMAL(10,2),
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    applicable_products UUID[],  -- 適用商品 ID 陣列
    created_at TIMESTAMPTZ DEFAULT now()
);
```

#### `live_sessions`（TikTok 直播場次）
```sql
CREATE TABLE IF NOT EXISTS live_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_name VARCHAR(100),
    platform VARCHAR(20) DEFAULT 'tiktok',
    room_id VARCHAR(100),
    promoted_products UUID[],  -- 直播推薦商品
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    viewer_peak INTEGER DEFAULT 0,
    orders_count INTEGER DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0
);
```

#### `user_addresses_th`（泰國專用地址格式）
```sql
-- 擴充 addresses 表，加入泰國專用欄位
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS province_code VARCHAR(10);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS district_code VARCHAR(10);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS address_type VARCHAR(20) DEFAULT 'home' CHECK (address_type IN ('home','office','locker'));
```

#### `payments`（支付記錄）
```sql
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL,  -- 'promptpay'|'card'|'cod'|'truemoney'
    gateway VARCHAR(50) DEFAULT 'omise',
    gateway_txn_id VARCHAR(255),
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','success','failed','refunded')),
    paid_at TIMESTAMPTZ,
    raw_callback JSONB,  -- 支付閘道回調原始數據
    created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. 功能模組清單

### 4.1 前台（用戶端）

| 功能模組 | 功能項目 | 優先級 | 狀態 |
|----------|----------|--------|------|
| **首頁** | 輪播 Banner（三語） | P0 | 🟡 待開發 |
|  | 商品分類導航 | P0 | 🟡 待開發 |
|  | 秒殺倒數區 | P0 | 🟡 待開發 |
|  | 熱門推薦商品 | P0 | 🟡 待開發 |
|  | 會員註冊引流區 | P1 | 🟡 待開發 |
| **商品頁** | 商品列表 + 篩選 | P0 | 🟡 待開發 |
|  | 商品詳情頁（三語） | P0 | 🟡 待開發 |
|  | 庫存狀態顯示 | P0 | 🟡 待開發 |
|  | 相關推薦 | P1 | ⚪ 待規劃 |
| **購物車** | 加入購物車 | P0 | 🟡 待開發 |
|  | 購物車數量修改 | P0 | 🟡 待開發 |
|  | 批量結帳 | P1 | ⚪ 待規劃 |
| **結帳** | 地址選擇/新增 | P0 | 🟡 待開發 |
|  | 支付方式選擇 | P0 | 🟡 待開發 |
|  | PromptPay QR 產生 | P0 | 🟡 待開發 |
|  | 訂單確認 | P0 | 🟡 待開發 |
| **會員中心** | 註冊/登入（手機+密碼） | P0 | 🟡 待開發 |
|  | 訂單查詢 | P0 | 🟡 待開發 |
|  | 地址管理 | P0 | 🟡 待開發 |
|  | 會員積分 | P1 | ⚪ 待規劃 |
| **直播專區** | TikTok 直播間嵌入 | P1 | ⚪ 待規劃 |
|  | 直播同款商品快速下單 | P1 | ⚪ 待規劃 |

### 4.2 後台（管理端）

| 功能模組 | 功能項目 | 優先級 | 狀態 |
|----------|----------|--------|------|
| **數據儀表板** | 今日訂單/營收/活躍用戶 | P0 | ✅ 已建立原型 |
|  | 近 7 日營收趨勢圖 | P0 | ✅ 已建立原型 |
|  | 商品分類銷售佔比 | P1 | ✅ 已建立原型 |
| **商品管理** | 商品新增/編輯 | P0 | ✅ 已建立原型 |
|  | 多語系商品描述編輯 | P0 | 🟡 待開發 |
|  | 庫存批量匯入 | P1 | ⚪ 待規劃 |
|  | 商品上架/下架 | P0 | ✅ 已建立原型 |
| **訂單管理** | 訂單列表 + 狀態篩選 | P0 | ✅ 已建立原型 |
|  | 訂單詳情 + 物流追蹤 | P0 | 🟡 待開發 |
|  | 批次出貨 | P1 | ⚪ 待規劃 |
| **會員管理** | 會員列表 | P0 | ✅ 已建立原型 |
|  | 會員詳細資料編輯 | P1 | ⚪ 待規劃 |
| **促銷管理** | 秒殺活動建立 | P0 | 🟡 待開發 |
|  | 優惠券發放 | P1 | ⚪ 待規劃 |
| **系統設定** | 基本設定（網站名稱/幣別） | P0 | ✅ 已建立原型 |
|  | 通知設定 | P1 | ⚪ 待規劃 |

---

## 5. API 規格

### 5.1 商品 API

```
GET  /api/products              # 商品列表（支援分頁、篩選、排序）
GET  /api/products/:slug        # 商品詳情
GET  /api/products/featured     # 首頁推薦商品
GET  /api/products/flash-sale   # 秒殺商品列表
POST /api/products             # 新增商品（後台）
PUT  /api/products/:id         # 編輯商品（後台）
DEL  /api/products/:id         # 刪除商品（後台）
```

### 5.2 購物車 API

```
GET    /api/cart                # 取得購物車內容
POST   /api/cart/add            # 加入購物車
PUT    /api/cart/:item_id      # 修改數量
DELETE /api/cart/:item_id      # 移除商品
DELETE /api/cart               # 清空購物車
```

### 5.3 訂單 API

```
GET  /api/orders               # 訂單列表（用戶端/後台）
GET  /api/orders/:order_number # 訂單詳情
POST /api/orders               # 建立訂單
PUT  /api/orders/:id/status   # 更新訂單狀態（後台）
```

### 5.4 支付 API

```
POST /api/payments/promptpay   # 產生 PromptPay QR Code
POST /api/payments/card       # 信用卡支付（Omise）
POST /api/payments/webhook    # Omise 支付回調
GET  /api/payments/:order_id  # 查詢支付狀態
```

---

## 6. 多語系方案

### 6.1 語系架構

```
messages/
├── zh.json    # 繁體中文（台灣/香港用戶）
├── en.json    # 英文（外籍人士/國際化準備）
└── th.json    # 泰文（主要目標市場）
```

### 6.2 語系切換邏輯

1. **預設語系**：偵測瀏覽器語系，泰文優先 → 英文 → 中文
2. **手動切換**：右上角語系按鈕，即時切換不重整頁面
3. **持久化**：`localStorage.setItem('lang', 'th')`
4. **URL 參數**：`?lang=th` 支援分享連結帶語系

### 6.3 資料庫多語處理

- **商品名稱/描述**：`product_i18n` 表，按 `locale` 欄位區分
- **靜態 UI 文字**：前端 `messages/*.json` 檔，next-intl 載入
- **動態內容**（如促銷標題）：資料庫欄位用 `JSONB` 儲存三語

---

## 7. 泰國市場專用功能

### 7.1 支付方式

| 支付方式 | 說明 | 優先級 |
|----------|------|--------|
| **PromptPay** | 泰國最普及 QR 支付，Omise 支援 | P0 |
| **信用卡** | Visa/Mastercard，Omise 閘道 | P0 |
| **TrueMoney Wallet** | 泰國主流電子錢包 | P1 |
| **7-Eleven 付款** | 超商代收款，泰國 7-Eleven 密度極高 | P1 |
| **貨到付款 (COD)** | 泰國用戶習慣，必須支援 | P0 |

### 7.2 地址格式（泰國專用）

```
泰國地址格式範例：
123/45 หมู่ 3 ตำบล/แขวง : 廓昆區 (District)
อำเภอ/เขต : 巴吞他尼府 (Province)
จังหวัด : 巴吞他尼 (Province)
ไปรษณีย์ : 12120 (郵遞區號)
```

資料庫 `addresses` 表需包含：`province_code`, `district_code`, `sub_district`, `postal_code`

### 7.3 泰式節慶主題

| 節慶 | 月份 | 主題色系 | 活動類型 |
|------|------|----------|----------|
| **Songkran（潑水節）** | 4 月 | 水藍 + 白 | 全站 7 折 |
| **Loy Krathong（水燈節）** | 11 月 | 金 + 暖黃 | 限時閃購 |
| **Year End Sale** | 12 月 | 紅 + 金 | 年度清倉 |
| **Valentine's Day** | 2 月 | 粉紅 | 情侶特惠 |

---

## 8. 擴展與效能方案

### 8.1 萬人在線架構

```
[用戶] 
   ↓
[Cloudflare CDN] ← 靜態資源快取（圖片/CSS/JS）TTL=1年
   ↓
[Vercel Edge Network] ← Next.js ISR 頁面（商品頁 5 分鐘重新產生）
   ↓
[Vercel Serverless Functions] ← API Routes（自動擴展）
   ↓
[Upstash Redis] ← 購物車 Session、商品快取、秒殺庫存預扣
   ↓
[Supabase Postgres] ← 訂單/會員核心資料（PgBouncer 連線池）
```

### 8.2 直播流量高峰應對

```
直播開始前 10 分鐘（預熱階段）
├── 預熱 CDN：首頁、秒殺商品頁強制快取
├── 預先計算庫存：寫入 Redis（避免 DB 壓力）
└── 開啟佇列式下單：視覺先回應，後端批次寫入

直播期間（高峰流量）
├── 商品頁 100% CDN 命中（ISR 靜態頁面）
├── 下單請求進 Redis Stream 佇列（削峰）
├── 批次寫入訂單（每秒 500 筆）
└── 庫存預扣在 Redis，定時同步 DB
```

### 8.3 效能優化清單

| 優化項目 | 技術方案 | 目標值 |
|----------|----------|--------|
| 首頁載入 (FCP) | ISR + CDN | < 1.5s |
| 商品頁切換 | SSG 靜態產生 | < 0.8s |
| API 回應時間 (P95) | Redis 快取 | < 300ms |
| 圖片載入 | Next.js Image + WebP | 自動最佳化 |
| 程式碼分割 | 每頁面獨立 Bundle | 首頁 < 100KB |

---

## 9. 開發時程建議

### 第一階段（基礎架構 + 核心功能）— 預估 3-4 週

- [ ] Next.js + Supabase 專案初始化
- [ ] 多語系架構建立（zh/en/th）
- [ ] 首頁泰式模板實作
- [ ] 商品模組（列表 + 詳情頁）
- [ ] 購物車模組（Redis Session）
- [ ] 結帳流程 + PromptPay 支付整合
- [ ] 會員註冊/登入（手機號）
- [ ] 後台基礎管理功能

### 第二階段（直播串接 + 促銷功能）— 預估 2-3 週

- [ ] TikTok 直播場次 API 串接
- [ ] 秒殺功能（Redis 預扣庫存）
- [ ] 優惠券系統
- [ ] 7-Eleven / TrueMoney 支付整合
- [ ] 貨到付款（COD）流程

### 第三階段（優化 + 擴展）— 預估 2 週

- [ ] 效能測試（模擬 10,000 並發）
- [ ] CDN 最佳化設定
- [ ] 物流 API 串接（Flash Express / J&T）
- [ ] 數據分析儀表板強化
- [ ] SEO 最佳化（泰文關鍵字）

---

## 10. 驗收檢核表

### 功能驗收

- [ ] 中英泰三語切換流暢，無漏翻
- [ ] 商品頁面載入速度 < 2 秒（泰國本地測試）
- [ ] 模擬 100 人同時秒殺，庫存無超賣
- [ ] PromptPay QR Code 正確產生且可支付
- [ ] 手機版（Mobile First）所有頁面正常顯示
- [ ] 後台訂單管理可正常篩選/出貨

### 效能驗收

- [ ] Lighthouse 分數 > 85（手機模擬）
- [ ] 同時 1,000 用戶下單，API 回應 < 500ms
- [ ] CDN 快取命中率 > 95%（商品頁面）

---

*文件版本：v1.0 | 最後更新：2026-05-04 | 作者：WorkBuddy AI*

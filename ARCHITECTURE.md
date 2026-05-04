# 商城獨立站系統架構文件

> 針對泰國市場｜TikTok 直播帶貨高流量場景｜目標萬人在線

---

## 1. 整體架構概覽

```
┌─────────────────────────────────────────────────────────┐
│                     用戶端 (Client)                    │
│  ThaiEcom Web App (Next.js + PWA)                    │
│  中英泰三語切換 | Mobile First | 泰式設計              │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS / HTTP/3
┌──────────────────────▼──────────────────────────────────┐
│               CDN 層 (Cloudflare / AWS CloudFront)     │
│  靜態資源快取 | DDoS 防護 | 全球節點加速              │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              API Gateway / Load Balancer                │
│  Nginx / AWS ALB | Rate Limiting | SSL Termination    │
└─────────┬────────────────────────────┬─────────────────┘
          │                            │
┌─────────▼──────────┐  ┌────────────▼──────────────────┐
│   Frontend API     │  │      Admin API (後台)           │
│   Next.js API Routes│  │   Next.js API Routes            │
│   /api/products    │  │   /api/admin/orders             │
│   /api/cart        │  │   /api/admin/products           │
│   /api/orders      │  │   RBAC 權限控管                 │
└─────────┬──────────┘  └────────────┬──────────────────┘
          │                            │
┌─────────▼────────────────────────────▼──────────────────┐
│                Business Logic Layer (服務層)             │
│  產品服務 | 訂單服務 | 購物車服務 | 支付服務          │
│  會員服務 | 促銷服務 | 庫存服務                        │
└─────────┬────────────────────────────┬──────────────────┘
          │                            │
┌─────────▼──────────┐  ┌────────────▼──────────────────┐
│   PostgreSQL        │  │      Redis (快取 + 排程)        │
│   (Supabase)       │  │   • 商品快取                    │
│   • 核心資料       │  │   • 購物車 Session              │
│   • 訂單交易       │  │   • 秒殺庫存預扣               │
│   • 會員資料       │  │   • JWT Token 黑名單            │
└────────────────────┘  └───────────────────────────────┘
```

---

## 2. 前後端分離設計

### 2.1 前端 (Frontend)

| 項目 | 技術選型 | 說明 |
|------|----------|------|
| 框架 | Next.js 14+ (App Router) | SSR + SSG 混合渲染，SEO 友好 |
| 狀態管理 | Zustand | 輕量，適合模組化擴充 |
| UI 組件庫 | 自研組件庫 (Lego Blocks) | 每個組件獨立可插拔 |
| 樣式 | Tailwind CSS | 快速客製泰式風格 |
| 多語系 | next-intl | 中英泰三語完整支援 |
| 支付前端 | Omise.js / Stripe | 泰國主流支付整合 |
| PWA | next-pwa | 支援手機加入主畫面 |

### 2.2 後端 API (Backend API)

| 項目 | 技術選型 | 說明 |
|------|----------|------|
| 框架 | Next.js API Routes (BFF) + Supabase Functions | 前後端同倉庫，型別共享 |
| 資料庫 | PostgreSQL (Supabase) | 關聯式，支援 JSONB 彈性欄位 |
| 認證 | Supabase Auth | JWT + RLS，內建社交登入 |
| 檔案儲存 | Supabase Storage | 商品圖片 CDN 加速 |
| 快取 | Redis (Upstash) | 無伺服器 Redis，自動擴展 |
| 支付後端 | Omise API | 泰國 PromptPay / 信用卡 |

### 2.3 模組化 (Lego 式擴充)

```
modules/
├── core/              # 核心模組（不可移除）
│   ├── auth/         # 認證模組
│   ├── i18n/         # 多語系模組
│   └── ui/          # 基礎 UI 組件
├── product/          # 商品模組（可獨立啟用）
├── cart/             # 購物車模組
├── checkout/         # 結帳模組
├── order/            # 訂單模組
├── payment/          # 支付模組
├── user/             # 會員模組
├── promotion/        # 促銷模組（秒殺/優惠券）
├── review/           # 評論模組
├── live/             # TikTok 直播串接模組 ⭐ 新增
└── analytics/        # 數據分析模組
```

每個模組皆含：`types.ts` + `api.ts` + `store.ts` + `components/` + `tests/`

---

## 3. 萬人在線擴展方案

### 3.1 效能目標

| 指標 | 目標值 |
|------|--------|
| 同時在線用戶 | 10,000+ |
| API 回應時間 (P95) | < 300ms |
| 首頁載入 (FCP) | < 1.5s |
| 結帳流程完成率 | > 85% |

### 3.2 擴展策略

**前端擴展**
- ISR (Incremental Static Regeneration)：商品頁面靜態產生，按需更新
- CDN 全站快取：靜態資源 TTL 設定 1 年
- Image Optimization：Next.js Image 自動 WebP/AVIF 轉換
- 程式碼分割：每個頁面獨立 Bundle

**後端擴展**
- Supabase 連線池：PgBouncer，單一實例支援 200+ 連線
- Redis 快取層：商品詳情、首頁資料、購物車
- 資料庫唯讀副本：報表查詢導向 replica
- 分片策略（未來）：用戶表按區域分片

**流量高峰應對（TikTok 直播場景）**
```
直播開始前 5 分鐘
  → 預熱 CDN 快取（首頁、秒殺商品頁）
  → 預先計算庫存寫入 Redis
  → 開啟隊列式下單（避免庫存超賣）

直播期間
  → 商品頁面 100% CDN 命中
  → 下單請求進 Redis 隊列（削峰）
  → 資料庫批次寫入（每秒 500 筆）
```

---

## 4. 資料庫設計（Supabase PostgreSQL）

### 4.1 核心表（已建立）
- `product_categories` - 商品分類（支援多層）
- `products` - 商品主表
- `users` - 會員表（含 Supabase Auth 關聯）
- `addresses` - 收貨地址
- `cart_items` - 購物車
- `orders` - 訂單主表
- `order_items` - 訂單明細

### 4.2 需擴充表（Thai 市場專用）

```sql
-- 多語系商品描述
CREATE TABLE product_i18n (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    locale VARCHAR(10) NOT NULL, -- 'zh' | 'en' | 'th'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    UNIQUE(product_id, locale)
);

-- 促銷活動（秒殺/優惠券）
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('flash_sale','coupon','bundle')),
    title_i18n JSONB NOT NULL, -- {"zh":"週年慶","en":"Anniversary","th":"ครบรอบ"}
    discount_type VARCHAR(10) CHECK (discount_type IN ('percent','fixed')),
    discount_value DECIMAL(10,2),
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    usage_limit INTEGER,
    is_active BOOLEAN DEFAULT true
);

-- 直播場次（TikTok 串接）
CREATE TABLE live_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_name VARCHAR(100),
    platform VARCHAR(20) DEFAULT 'tiktok',
    room_id VARCHAR(100),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    viewer_peak INTEGER DEFAULT 0
);
```

---

## 5. 泰國市場專用功能

| 功能 | 說明 |
|------|------|
| PromptPay 支付 | 泰國最普及 QR 支付，Omise 支援 |
| 泰文收件地址格式 | 不同於台灣，需支援 省/縣/區 結構 |
| 7-Eleven 取貨 | 泰國 7-Eleven 密度極高，需串接 |
| 泰式節慶促銷 | Songkran（潑水節）、Loy Krathong 主題 |
| 泰銖 (THB) 結價 | 資料庫 price 欄位需支援 THB 與 CNY 雙幣別 |
| 泰國物流 API | 串接 Flash Express / J&T Thailand |
| TikTok Shop 訂單同步 | 直播帶貨訂單自動匯入獨立站 |

---

## 6. 技術堆疊總結

```
Frontend:  Next.js 14  + Tailwind CSS + Zustand + next-intl
Backend:   Next.js API Routes + Supabase (PostgreSQL + Auth + Storage)
Cache:     Upstash Redis
Deploy:    Vercel (Frontend) + Supabase (Backend)
CDN:       Cloudflare
Payment:   Omise (泰國主流支付閘道)
Monitoring: Sentry + Supabase Dashboard
```

---

*文件版本：v1.0 | 更新日期：2026-05-04*

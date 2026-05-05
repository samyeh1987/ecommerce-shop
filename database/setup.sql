-- ============================================================
-- ThaiShop E-Commerce Platform - Complete Setup Script
-- Supabase Project: bkjaypjowwyezefutatm
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- =============================================
-- 0. Trigger Function (auto-update updated_at)
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 1. Product Categories Table
-- =============================================
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    parent_id UUID REFERENCES product_categories(id),
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    name_th VARCHAR(255),
    name_en VARCHAR(255),
    name_zh VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_categories_parent_id ON product_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_is_active ON product_categories(is_active);

CREATE TRIGGER update_product_categories_updated_at
BEFORE UPDATE ON product_categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 2. Products Table
-- =============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    sale_price DECIMAL(10,2) CHECK (sale_price >= 0),
    compare_price DECIMAL(10,2),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    category_id UUID REFERENCES product_categories(id),
    images TEXT[],
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    sku VARCHAR(100) UNIQUE,
    weight DECIMAL(10,2),
    average_rating DECIMAL(3,2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    name_th VARCHAR(255),
    name_en VARCHAR(255),
    name_zh VARCHAR(255),
    description_th TEXT,
    description_en TEXT,
    description_zh TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 3. Users Table (references Supabase auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'vendor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 4. Addresses Table
-- =============================================
CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    province VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    detail_address TEXT NOT NULL,
    postal_code VARCHAR(10),
    country VARCHAR(100) DEFAULT 'Thailand',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);

CREATE TRIGGER update_addresses_updated_at
BEFORE UPDATE ON addresses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 5. Cart Items Table
-- =============================================
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

CREATE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON cart_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 6. Orders Table
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded')),
    shipping_address_id UUID REFERENCES addresses(id),
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded')),
    tracking_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 7. Order Items Table
-- =============================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- =============================================
-- 8. Product Variants
-- =============================================
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_name VARCHAR(255) NOT NULL,
    name_th VARCHAR(255),
    name_en VARCHAR(255),
    name_zh VARCHAR(255),
    sku VARCHAR(100) UNIQUE,
    price_adjustment DECIMAL(10,2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    attributes JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_is_active ON product_variants(is_active);

CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON product_variants
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 9. Product Images
-- =============================================
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON product_images(is_primary);

-- =============================================
-- 10. Payments
-- =============================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('promptpay', 'cod', 'credit_card', 'debit_card')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) DEFAULT 'THB',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    promptpay_ref VARCHAR(100),
    card_last4 VARCHAR(4),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 11. Shipping Methods
-- =============================================
CREATE TABLE IF NOT EXISTS shipping_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_th VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    free_above DECIMAL(10,2),
    estimated_days VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipping_methods_is_active ON shipping_methods(is_active);

CREATE TRIGGER update_shipping_methods_updated_at
BEFORE UPDATE ON shipping_methods
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 12. Promotions
-- =============================================
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE,
    name_th VARCHAR(255),
    name_en VARCHAR(255),
    name_zh VARCHAR(255),
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    max_discount DECIMAL(10,2),
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code);
CREATE INDEX IF NOT EXISTS idx_promotions_is_active ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(starts_at, ends_at);

CREATE TRIGGER update_promotions_updated_at
BEFORE UPDATE ON promotions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 13. Reviews
-- =============================================
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(255),
    content TEXT,
    images TEXT[],
    is_verified_purchase BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 14. Wishlist Items
-- =============================================
CREATE TABLE IF NOT EXISTS wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_product_id ON wishlist_items(product_id);

-- =============================================
-- 15. Audit Log
-- =============================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Product Categories (5 categories with trilingual names)
INSERT INTO product_categories (id, name, slug, name_th, name_en, name_zh, description, is_active, sort_order) VALUES
    ('c0000001-0000-0000-0000-000000000001', 'อิเล็กทรอนิกส์', 'electronics', 'อิเล็กทรอนิกส์', 'Electronics', '电子产品', 'Electronic devices and gadgets', true, 1),
    ('c0000001-0000-0000-0000-000000000002', 'แฟชั่น', 'fashion', 'แฟชั่น', 'Fashion', '时尚', 'Clothing, shoes and accessories', true, 2),
    ('c0000001-0000-0000-0000-000000000003', 'อาหารและเครื่องดื่ม', 'food-beverage', 'อาหารและเครื่องดื่ม', 'Food & Beverage', '食品饮料', 'Thai food, snacks and drinks', true, 3),
    ('c0000001-0000-0000-0000-000000000004', 'สุขภาพและความงาม', 'health-beauty', 'สุขภาพและความงาม', 'Health & Beauty', '健康美容', 'Health and beauty products', true, 4),
    ('c0000001-0000-0000-0000-000000000005', 'บ้านและที่อยู่อาศัย', 'home-living', 'บ้านและที่อยู่อาศัย', 'Home & Living', '家居生活', 'Home decoration and living essentials', true, 5);

-- Products (12 Thai brand products with trilingual names)
INSERT INTO products (id, name, slug, name_th, name_en, name_zh, description, price, sale_price, compare_price, stock_quantity, category_id, is_active, is_featured, average_rating, sku) VALUES
    -- Health & Beauty
    ('p0000001-0000-0000-0000-000000000001', 'Thann Sunscreen', 'thann-sunscreen-spf50', 'กันแดด Thann สมุนไพรทะเล SPF50+ PA++++', 'Thann Natural Sunscreen SPF50+ PA++++', 'Thann 紫苏防晒霜 SPF50+ PA++++', 'Thann herbal sunscreen with rice bran oil, SPF50+ PA++++, 80g', 1390.00, 890.00, 1390.00, 200, 'c0000001-0000-0000-0000-000000000004', true, true, 4.90, 'TH-THANN-SPF50'),
    ('p0000001-0000-0000-0000-000000000002', 'SnailWhite Cleanser', 'snailwhite-cleanser', 'โฟมล้างหน้า SnailWhite เอสเซนส์', 'SnailWhite Essence Facial Cleanser', 'SnailWhite 红宝石洗面奶', 'SnailWhite essence facial cleanser with snail mucin, 100ml', 590.00, 390.00, 590.00, 150, 'c0000001-0000-0000-0000-000000000004', true, true, 4.70, 'TH-SNW-CL01'),
    ('p0000001-0000-0000-0000-000000000003', 'Mistine Serum', 'mistine-aura-bright-serum', 'เซรั่ม Mistine Aura Bright', 'Mistine Aura Bright Serum', 'Mistine 亮白精华液', 'Mistine aura bright skin serum with vitamin C, 30ml', 450.00, 299.00, 450.00, 180, 'c0000001-0000-0000-0000-000000000004', true, false, 4.50, 'TH-MIS-SR01'),
    ('p0000001-0000-0000-0000-000000000004', 'Tiger Balm', 'tiger-balm-herbal', 'ยาหม่องไทย วัดโพธิ์ 50g', 'Thai Herbal Balm (Tiger Balm) 50g', '泰国青草膏 卧佛牌 50g', 'Classic Thai herbal balm for headache and muscle pain relief, 50g', 150.00, 85.00, 150.00, 500, 'c0000001-0000-0000-0000-000000000004', true, true, 4.90, 'TH-WP-BM50'),
    ('p0000001-0000-0000-0000-000000000005', 'Darlie Toothpaste', 'darlie-toothpaste', 'ยาสีฟัน Darlie สูตรเย็น', 'Darlie Cool Mint Toothpaste', 'Darlie 蓝管牙膏', 'Darlie double action cool mint toothpaste, 160g', 89.00, 59.00, 89.00, 300, 'c0000001-0000-0000-0000-000000000004', true, false, 4.30, 'TH-DAR-TP01'),
    -- Food & Beverage
    ('p0000001-0000-0000-0000-000000000006', 'ChaTraMue Tea', 'chatramue-thai-tea', 'ชาไทย ชาตรามือ 400g', 'ChaTraMue Thai Tea Powder 400g', 'ChaTraMue 泰式奶茶粉 400g', 'Authentic Thai tea powder by ChaTraMue, perfect for Thai milk tea, 400g', 120.00, 79.00, 120.00, 400, 'c0000001-0000-0000-0000-000000000003', true, true, 4.80, 'TH-CTM-TEA'),
    ('p0000001-0000-0000-0000-000000000007', 'Mango Sticky Rice', 'mango-sticky-rice', 'ข้าวเหนียวมะม่วง พร้อมทาน', 'Mango Sticky Rice Ready-to-eat', '芒果糯米饭即食包', 'Ready-to-eat Thai mango sticky rice, just heat and enjoy', 120.00, 79.00, 120.00, 100, 'c0000001-0000-0000-0000-000000000003', true, true, 4.60, 'TH-MGR-RTE'),
    ('p0000001-0000-0000-0000-000000000008', 'Sriracha Sauce', 'sriracha-chili-sauce', 'ซอสพริกศรีราชา', 'Sriracha Chili Sauce', '泰式辣椒酱 Sriracha', 'Classic Thai Sriracha hot chili sauce, 570ml', 65.00, 45.00, 65.00, 350, 'c0000001-0000-0000-0000-000000000003', true, false, 4.70, 'TH-SRH-CS01'),
    ('p0000001-0000-0000-0000-000000000009', 'Squid Fish Sauce', 'squid-fish-sauce', 'น้ำปลาสหอาหาร', 'Squid Brand Fish Sauce', 'Squid 鱼露', 'Squid brand fish sauce, premium quality for Thai cooking, 700ml', 55.00, 39.00, 55.00, 250, 'c0000001-0000-0000-0000-000000000003', true, false, 4.50, 'TH-SQD-FS01'),
    -- Electronics
    ('p0000001-0000-0000-0000-000000000010', 'JBL Earbuds', 'jbl-tune-buds', 'หูฟัง JBL Tune Buds', 'JBL Tune Buds Wireless Earbuds', 'JBL 蓝牙耳机泰国版', 'JBL Tune Buds true wireless earbuds with bass boost, Thai warranty', 1990.00, 1290.00, 1990.00, 80, 'c0000001-0000-0000-0000-000000000001', true, true, 4.60, 'TH-JBL-TB01'),
    -- Fashion
    ('p0000001-0000-0000-0000-000000000011', 'Thai Elephant T-Shirt', 'thai-elephant-tshirt', 'เสื้อยืดลายช้างไทย', 'Thai Elephant Print Cotton T-Shirt', '纯棉泰式图腾T恤', '100% cotton Thai elephant print t-shirt, unisex, S/M/L/XL', 590.00, 390.00, 590.00, 120, 'c0000001-0000-0000-0000-000000000002', true, false, 4.40, 'TH-FSH-ET01'),
    -- Food & Beverage (drinks)
    ('p0000001-0000-0000-0000-000000000012', 'Chang Beer', 'chang-beer', 'เบียร์ช้าง', 'Chang Beer', '象牌啤酒', 'Chang classic beer, 640ml can', 75.00, 55.00, 75.00, 200, 'c0000001-0000-0000-0000-000000000003', true, false, 4.20, 'TH-CHG-BEER');

-- Shipping Methods
INSERT INTO shipping_methods (name_th, name_en, name_zh, description, price, free_above, estimated_days, is_active, sort_order) VALUES
    ('การจัดส่งมาตรฐาน', 'Standard Shipping', '标准配送', '3-5 business days', 50.00, 500.00, '3-5', true, 1),
    ('การจัดส่งด่วน', 'Express Shipping', '快递配送', '1-2 business days', 100.00, NULL, '1-2', true, 2),
    ('ฟรีเมื่อสั่งมากกว่า 500 บาท', 'Free over ฿500', '满500免运费', 'Free standard shipping on orders over ฿500', 0.00, 500.00, '3-5', true, 3);

-- Promotions
INSERT INTO promotions (code, name_th, name_en, name_zh, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, starts_at, ends_at, is_active) VALUES
    ('SAVE10', 'ส่วนลด 10%', '10% Off', '全场9折', 'Save 10% on your order', 'percentage', 10.00, 200.00, 500.00, 1000, NOW(), NOW() + INTERVAL '90 days', true),
    ('FLAT100', 'ลด 100 บาท', '฿100 Off', '立减100铢', 'Get ฿100 off orders over ฿500', 'fixed', 100.00, 500.00, NULL, 500, NOW(), NOW() + INTERVAL '60 days', true);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Public Read (anyone)
-- =============================================

-- Product Categories: public read
CREATE POLICY "categories_public_read" ON product_categories
    FOR SELECT USING (true);

-- Products: public read (active only)
CREATE POLICY "products_public_read" ON products
    FOR SELECT USING (is_active = true);

-- Product Images: public read
CREATE POLICY "product_images_public_read" ON product_images
    FOR SELECT USING (true);

-- Product Variants: public read (active only)
CREATE POLICY "product_variants_public_read" ON product_variants
    FOR SELECT USING (is_active = true);

-- Shipping Methods: public read (active only)
CREATE POLICY "shipping_methods_public_read" ON shipping_methods
    FOR SELECT USING (is_active = true);

-- Promotions: public read (active and within date range)
CREATE POLICY "promotions_public_read" ON promotions
    FOR SELECT USING (is_active = true AND starts_at <= NOW() AND ends_at >= NOW());

-- Reviews: public read (approved only)
CREATE POLICY "reviews_public_read" ON reviews
    FOR SELECT USING (status = 'approved');

-- =============================================
-- Authenticated User: own data only
-- =============================================

-- Users: read own profile
CREATE POLICY "users_read_own" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Users: update own profile
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Users: insert own profile (after signup)
CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Addresses: full CRUD on own addresses
CREATE POLICY "addresses_read_own" ON addresses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "addresses_insert_own" ON addresses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses_update_own" ON addresses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "addresses_delete_own" ON addresses
    FOR DELETE USING (auth.uid() = user_id);

-- Cart Items: full CRUD on own cart
CREATE POLICY "cart_items_read_own" ON cart_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "cart_items_insert_own" ON cart_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cart_items_update_own" ON cart_items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "cart_items_delete_own" ON cart_items
    FOR DELETE USING (auth.uid() = user_id);

-- Orders: read own orders
CREATE POLICY "orders_read_own" ON orders
    FOR SELECT USING (auth.uid() = user_id);

-- Order Items: read own order items (via order relationship)
CREATE POLICY "order_items_read_own" ON order_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
    );

-- Payments: read own payments (via order relationship)
CREATE POLICY "payments_read_own" ON payments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.user_id = auth.uid())
    );

-- Wishlist: full CRUD on own wishlist
CREATE POLICY "wishlist_read_own" ON wishlist_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "wishlist_insert_own" ON wishlist_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wishlist_delete_own" ON wishlist_items
    FOR DELETE USING (auth.uid() = user_id);

-- Reviews: authenticated users can insert reviews
CREATE POLICY "reviews_insert_authenticated" ON reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Admin policies (role = 'admin')
-- =============================================

-- Admin can read all users
CREATE POLICY "users_admin_read" ON public.users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Admin can read/write all orders
CREATE POLICY "orders_admin_all" ON orders
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Admin can read/write all order items
CREATE POLICY "order_items_admin_all" ON order_items
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Admin can read/write all payments
CREATE POLICY "payments_admin_all" ON payments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Admin can manage all products (including inactive)
CREATE POLICY "products_admin_all" ON products
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Admin can manage categories
CREATE POLICY "categories_admin_all" ON product_categories
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Admin can manage product variants
CREATE POLICY "product_variants_admin_all" ON product_variants
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Admin can manage product images
CREATE POLICY "product_images_admin_all" ON product_images
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Audit log: admin read only
CREATE POLICY "audit_log_admin_read" ON audit_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- Trigger: Auto-create user profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

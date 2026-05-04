-- ============================================================
-- Schema v2 for ThaiShop E-Commerce Platform
-- Expanded tables for Thai market support
-- Compatible with Supabase PostgreSQL
-- ============================================================

-- =============================================
-- 1. Product Variants (size, color, etc.)
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
-- 2. Product Images (Multiple images per product)
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
-- 3. Payments (Thai payment methods)
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
-- 4. Shipping Methods (Thai logistics)
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
-- 5. Promotions (Discount coupons and campaigns)
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
-- 6. Reviews (Product reviews and ratings)
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
-- 7. Wishlist Items
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
-- 8. Audit Log (Admin activity tracking)
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

-- =============================================
-- ALTER TABLES: Add trilingual & Thai fields
-- =============================================

-- Products: Add trilingual names/descriptions and extra fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_th VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_zh VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_th TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_zh TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_price DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Product Categories: Add trilingual names
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS name_th VARCHAR(255);
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS name_zh VARCHAR(255);

-- Addresses: Add Thai-specific fields
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Thailand';

-- =============================================
-- SEED DATA
-- =============================================

-- Product Categories (5 categories with trilingual names)
INSERT INTO product_categories (id, name, slug, name_th, name_en, name_zh, description, is_active, sort_order) VALUES
    (gen_random_uuid(), 'Electronics', 'electronics', 'อิเล็กทรอนิกส์', 'Electronics', '电子产品', 'Electronic devices and gadgets', true, 1),
    (gen_random_uuid(), 'Fashion', 'fashion', 'แฟชั่น', 'Fashion', '时尚', 'Clothing, shoes and accessories', true, 2),
    (gen_random_uuid(), 'Food & Beverage', 'food-beverage', 'อาหารและเครื่องดื่ม', 'Food & Beverage', '食品饮料', 'Thai food, snacks and drinks', true, 3),
    (gen_random_uuid(), 'Health & Beauty', 'health-beauty', 'สุขภาพและความงาม', 'Health & Beauty', '健康美容', 'Health and beauty products', true, 4),
    (gen_random_uuid(), 'Home & Living', 'home-living', 'บ้านและที่อยู่อาศัย', 'Home & Living', '家居生活', 'Home decoration and living essentials', true, 5);

-- Shipping Methods (3 methods)
INSERT INTO shipping_methods (id, name_th, name_en, name_zh, description, price, free_above, estimated_days, is_active, sort_order) VALUES
    (gen_random_uuid(), 'การจัดส่งมาตรฐาน', 'Standard Shipping', '标准配送', '3-5 business days', 50.00, 500.00, '3-5', true, 1),
    (gen_random_uuid(), 'การจัดส่งด่วน', 'Express Shipping', '快递配送', '1-2 business days', 100.00, NULL, '1-2', true, 2),
    (gen_random_uuid(), 'ฟรีเมื่อสั่งมากกว่า 500 บาท', 'Free over ฿500', '满500免运费', 'Free standard shipping on orders over ฿500', 0.00, 500.00, '3-5', true, 3);

-- Promotions (2 sample coupons)
INSERT INTO promotions (id, code, name_th, name_en, name_zh, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, starts_at, ends_at, is_active) VALUES
    (gen_random_uuid(), 'SAVE10', 'ส่วนลด 10%', '10% Off', '全场9折', 'Save 10% on your order', 'percentage', 10.00, 200.00, 500.00, 1000, NOW(), NOW() + INTERVAL '90 days', true),
    (gen_random_uuid(), 'FLAT100', 'ลด 100 บาท', '฿100 Off', '立减100铢', 'Get ฿100 off orders over ฿500', 'fixed', 100.00, 500.00, NULL, 500, NOW(), NOW() + INTERVAL '60 days', true);

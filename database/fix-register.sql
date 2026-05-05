-- ============================================================
-- 修復註冊問題 - 三合一修復 SQL
-- 在 Supabase Dashboard → SQL Editor 執行
-- ============================================================

-- =============================================
-- 1. 自動建立用戶 Profile 的 Trigger
--    這樣不依賴前端 JS，Auth 層直接建立 profile
-- =============================================

-- 建立 trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, phone)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 移除舊 trigger（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 建立 trigger：auth.users 新增記錄時自動執行
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 2. 修復 RLS：允許已登入用戶插入自己的 profile
--    （即使 email 未驗證也能建立）
-- =============================================

-- 移除舊的 insert policy
DROP POLICY IF EXISTS "users_insert_own" ON public.users;

-- 新增：允許已認證用戶（含未驗證 email）插入自己的 profile
CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 也允許 service role 完整操作（trigger 用的 SECURITY DEFINER 已繞過 RLS）
-- 但確保前端用戶也能在需要時手動建立 profile
CREATE POLICY "users_insert_authenticated" ON public.users
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =============================================
-- 3. 關閉 Email 驗證要求（開發階段）
--    這樣註冊後可以直接登入，不需要驗證 email
--    上線前再開回來
-- =============================================

-- ⚠️ 這個必須在 Supabase Dashboard 手動操作：
-- Authentication → Providers → Email → Confirm email → 關閉
-- 路徑：https://supabase.com/dashboard/project/bkjaypjowwyezefutatm/auth/providers

-- =============================================
-- 4. 設定 Email Redirect URL
--    讓驗證郵件的連結指向正確的域名
-- =============================================

-- ⚠️ 這個必須在 Supabase Dashboard 手動操作：
-- Authentication → URL Configuration → Site URL
-- 改為：https://ecommerce-shop-git-dev-samyeh1987-7754s-projects.vercel.app
-- 路徑：https://supabase.com/dashboard/project/bkjaypjowwyezefutatm/auth/url-configuration

-- =============================================
-- 驗證
-- =============================================

-- 查看現有用戶（確認 trigger 是否正常）
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- 查看現有 profile
SELECT id, email, full_name, created_at FROM public.users ORDER BY created_at DESC LIMIT 5;

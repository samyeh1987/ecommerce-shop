/**
 * ThaiShop Supabase 配置
 * 支援新格式 (sb_publishable_xxx) 與舊格式 (JWT anon key)
 * 參考：https://supabase.com/docs/guides/getting-started/api-keys
 */

window.SUPABASE_CONFIG = {
  URL: 'https://bkjaypjowwyezefutatm.supabase.co',
  ANON_KEY: 'sb_publishable_38AbgsmrRHilDBIj9XzoaQ_UOpJvtIq'
};

// 檢測 key 格式並給出提示（不阻擋執行）
(function validateConfig() {
  var cfg = window.SUPABASE_CONFIG;
  if (!cfg) {
    console.error('[ThaiShop] SUPABASE_CONFIG 未定義');
    return;
  }

  if (!cfg.URL || cfg.URL === 'YOUR_SUPABASE_URL') {
    console.error('[ThaiShop] SUPABASE_CONFIG.URL 未設定');
  }

  if (cfg.ANON_KEY) {
    var isNewFormat = cfg.ANON_KEY.startsWith('sb_publishable_');
    var isOldFormat = cfg.ANON_KEY.startsWith('eyJ');
    if (!isNewFormat && !isOldFormat) {
      console.warn(
        '[ThaiShop] ANON_KEY 格式無法識別，請確認是否為有效 key。' +
        '新格式應為 sb_publishable_ 開頭，舊格式為 JWT（eyJ 開頭）。'
      );
    } else {
      console.log('[ThaiShop] ANON_KEY 格式:', isNewFormat ? '新格式 (sb_publishable_)' : '舊格式 (JWT)');
    }
  } else {
    console.error('[ThaiShop] ANON_KEY 未設定');
  }
})();

-- 阅读统计表
CREATE TABLE IF NOT EXISTS page_views (
  post_slug TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0
);

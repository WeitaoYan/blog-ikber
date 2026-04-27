-- 文章表
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,          -- 原始 markdown
  excerpt TEXT,
  tags TEXT,                      -- JSON 数组字符串，如 '["tech","js"]'
  published INTEGER DEFAULT 0,    -- 0 草稿, 1 已发布
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 全文搜索虚拟表（FTS5）
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
  title,
  content,
  tags,
  content=posts,
  content_rowid=id
);

-- 触发器：自动同步 FTS 索引
CREATE TRIGGER IF NOT EXISTS posts_ai AFTER INSERT ON posts BEGIN
  INSERT INTO posts_fts(rowid, title, content, tags)
  VALUES (new.id, new.title, new.content, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS posts_ad AFTER DELETE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, content, tags)
  VALUES('delete', old.id, old.title, old.content, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS posts_au AFTER UPDATE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, content, tags)
  VALUES('delete', old.id, old.title, old.content, old.tags);
  INSERT INTO posts_fts(rowid, title, content, tags)
  VALUES (new.id, new.title, new.content, new.tags);
END;

-- 点赞计数表
CREATE TABLE IF NOT EXISTS likes (
  post_slug TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0
);

-- 打赏设置表（博主配置）
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT                     -- 存储二维码 R2 URL 等 JSON
);

-- 插入默认设置
INSERT OR IGNORE INTO settings (key, value)
VALUES ('donate', '{"wechat":"", "alipay":""}'),
       ('blog_title', 'My Blog'),
       ('blog_description', '');

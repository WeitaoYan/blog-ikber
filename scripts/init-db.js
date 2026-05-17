/**
 * 初始化 D1 数据库表的脚本
 * 注意：此脚本应在 wrangler 环境中运行
 */
import { getDB } from '../src/lib/db.js';

async function initDB() {
  const db = getDB();

  // 创建文章表
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT,
      tags TEXT,
      published INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // 创建全文搜索虚拟表
  await db.prepare(`
    CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
      title,
      content,
      tags,
      content=posts,
      content_rowid=id
    )
  `).run();

  // 创建触发器
  try {
    await db.prepare(`
      CREATE TRIGGER IF NOT EXISTS posts_ai AFTER INSERT ON posts BEGIN
        INSERT INTO posts_fts(rowid, title, content, tags)
        VALUES (new.id, new.title, new.content, new.tags);
      END
    `).run();
  } catch (e) {
    console.log("Trigger posts_ai可能已存在:", e.message);
  }

  try {
    await db.prepare(`
      CREATE TRIGGER IF NOT EXISTS posts_ad AFTER DELETE ON posts BEGIN
        INSERT INTO posts_fts(posts_fts, rowid, title, content, tags)
        VALUES('delete', old.id, old.title, old.content, old.tags);
      END
    `).run();
  } catch (e) {
    console.log("Trigger posts_ad可能已存在:", e.message);
  }

  try {
    await db.prepare(`
      CREATE TRIGGER IF NOT EXISTS posts_au AFTER UPDATE ON posts BEGIN
        INSERT INTO posts_fts(posts_fts, rowid, title, content, tags)
        VALUES('delete', old.id, old.title, old.content, old.tags);
        INSERT INTO posts_fts(rowid, title, content, tags)
        VALUES (new.id, new.title, new.content, new.tags);
      END
    `).run();
  } catch (e) {
    console.log("Trigger posts_au可能已存在:", e.message);
  }

  // 创建点赞表
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS likes (
      post_slug TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0
    )
  `).run();

  // 创建设置表
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `).run();

  // 插入默认设置
  await db.prepare(`
    INSERT OR IGNORE INTO settings (key, value)
    VALUES ('donate_wechat', ''),
           ('donate_alipay', ''),
           ('blog_title', 'My Blog'),
           ('blog_description', '')
  `).run();

  console.log('数据库表创建完成！');
}

if (typeof require !== 'undefined' && require.main === module) {
  initDB().catch(console.error);
}

export { initDB };
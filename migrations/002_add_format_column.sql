-- 新增 format 列，区分 markdown / html 格式
ALTER TABLE posts ADD COLUMN format TEXT DEFAULT 'markdown';

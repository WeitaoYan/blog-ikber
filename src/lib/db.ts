// D1 database helper for Cloudflare Pages
// In Cloudflare Pages Functions, D1 is accessed via context.env.DB

// Type declaration for Cloudflare D1
interface D1Database {
  prepare(sql: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: (string | null)[]): D1PreparedStatement;
  first<T = unknown>(col?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[]; success: boolean }>;
  run(): Promise<{ success: boolean; meta: any }>;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  tags: string | null;
  published: number;
  created_at: string;
  updated_at: string;
}

export interface PostListItem {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  tags: string | null;
  updated_at: string;
}

export interface SearchResult {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  tags: string | null;
  updated_at: string;
  rank: number;
}

export interface LikeCount {
  post_slug: string;
  count: number;
}

export interface Setting {
  key: string;
  value: string;
}

// Get D1 binding from environment
// In Cloudflare Pages Functions, bindings are available via context.env
// For local development with wrangler, they are available via process.env
function getDB(): D1Database {
  // @ts-ignore - D1 binding injected by Cloudflare
  if (
    typeof process !== "undefined" &&
    process.env &&
    (process.env as any).DB
  ) {
    // @ts-ignore
    return (process.env as any).DB as D1Database;
  }
  throw new Error("D1 database binding (DB) is not available");
}

// --- Posts CRUD ---

export async function getPosts(
  page: number = 1,
  limit: number = 10,
  tag?: string,
): Promise<{ posts: PostListItem[]; total: number }> {
  const db = getDB();
  const offset = (page - 1) * limit;

  let countQuery = "SELECT COUNT(*) as total FROM posts WHERE published = 1";
  let query =
    "SELECT id, title, slug, excerpt, tags, updated_at FROM posts WHERE published = 1";
  const params: string[] = [];

  if (tag) {
    const tagCondition = " AND tags LIKE ?";
    countQuery += tagCondition;
    query += tagCondition;
    params.push(`%"${tag}"%`);
  }

  query += " ORDER BY updated_at DESC LIMIT ? OFFSET ?";

  const [countResult, postsResult] = await Promise.all([
    db
      .prepare(countQuery)
      .bind(...params)
      .first<{ total: number }>(),
    db
      .prepare(query)
      .bind(...params, limit.toString(), offset.toString())
      .all<PostListItem>(),
  ]);

  return {
    posts: postsResult.results || [],
    total: countResult?.total || 0,
  };
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const db = getDB();
  const result = await db
    .prepare("SELECT * FROM posts WHERE slug = ? AND published = 1")
    .bind(slug)
    .first<Post>();
  return result || null;
}

export async function getPostById(id: number): Promise<Post | null> {
  const db = getDB();
  const result = await db
    .prepare("SELECT * FROM posts WHERE id = ?")
    .bind(id.toString())
    .first<Post>();
  return result || null;
}

export async function getAllPostsAdmin(
  page: number = 1,
  limit: number = 50,
): Promise<{ posts: PostListItem[]; total: number }> {
  const db = getDB();
  const offset = (page - 1) * limit;

  const countResult = await db
    .prepare("SELECT COUNT(*) as total FROM posts")
    .first<{ total: number }>();
  const postsResult = await db
    .prepare(
      "SELECT id, title, slug, excerpt, tags, published, updated_at FROM posts ORDER BY updated_at DESC LIMIT ? OFFSET ?",
    )
    .bind(limit.toString(), offset.toString())
    .all<PostListItem & { published: number }>();

  return {
    posts: postsResult.results || [],
    total: countResult?.total || 0,
  };
}

export async function createPost(post: {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  tags?: string;
  published?: number;
}): Promise<Post> {
  const db = getDB();
  const result = await db
    .prepare(
      "INSERT INTO posts (title, slug, content, excerpt, tags, published) VALUES (?, ?, ?, ?, ?, ?) RETURNING *",
    )
    .bind(
      post.title,
      post.slug,
      post.content,
      post.excerpt || null,
      post.tags || null,
      (post.published ?? 0).toString(),
    )
    .first<Post>();
  return result!;
}

export async function updatePost(
  id: number,
  post: Partial<{
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    tags: string;
    published: number;
  }>,
): Promise<Post | null> {
  const db = getDB();
  const fields: string[] = [];
  const values: string[] = [];

  if (post.title !== undefined) {
    fields.push("title = ?");
    values.push(post.title);
  }
  if (post.slug !== undefined) {
    fields.push("slug = ?");
    values.push(post.slug);
  }
  if (post.content !== undefined) {
    fields.push("content = ?");
    values.push(post.content);
  }
  if (post.excerpt !== undefined) {
    fields.push("excerpt = ?");
    values.push(post.excerpt);
  }
  if (post.tags !== undefined) {
    fields.push("tags = ?");
    values.push(post.tags);
  }
  if (post.published !== undefined) {
    fields.push("published = ?");
    values.push(post.published.toString());
  }

  fields.push("updated_at = CURRENT_TIMESTAMP");

  if (fields.length === 1) return getPostById(id);

  const result = await db
    .prepare(`UPDATE posts SET ${fields.join(", ")} WHERE id = ? RETURNING *`)
    .bind(...values, id.toString())
    .first<Post>();
  return result || null;
}

export async function deletePost(id: number): Promise<boolean> {
  const db = getDB();
  const result = await db
    .prepare("DELETE FROM posts WHERE id = ?")
    .bind(id.toString())
    .run();
  return result.success;
}

// --- Likes ---

export async function getLikeCount(slug: string): Promise<number> {
  const db = getDB();
  const result = await db
    .prepare("SELECT count FROM likes WHERE post_slug = ?")
    .bind(slug)
    .first<{ count: number }>();
  return result?.count || 0;
}

export async function incrementLike(slug: string): Promise<number> {
  const db = getDB();
  const result = await db
    .prepare(
      "INSERT INTO likes (post_slug, count) VALUES (?, 1) ON CONFLICT(post_slug) DO UPDATE SET count = count + 1 RETURNING count",
    )
    .bind(slug)
    .first<{ count: number }>();
  return result?.count || 0;
}

// --- Search ---

export async function searchPosts(query: string): Promise<SearchResult[]> {
  const db = getDB();
  // Sanitize FTS5 query - escape special characters and add prefix matching
  const sanitized = query.replace(/['"]/g, "").trim();
  if (!sanitized) return [];

  // Use FTS5 MATCH with prefix matching
  const ftsQuery = sanitized
    .split(/\s+/)
    .map((term) => `"${term}"*`)
    .join(" ");

  const stmt = db.prepare(`
    SELECT p.id, p.title, p.slug, p.excerpt, p.tags, p.updated_at
    FROM posts_fts
    JOIN posts p ON posts_fts.rowid = p.id
    WHERE posts_fts MATCH ?
      AND p.published = 1
    ORDER BY rank
    LIMIT 20
  `);

  const { results } = await stmt.bind(ftsQuery).all<SearchResult>();
  return results || [];
}

// --- Settings ---

export async function getSetting(key: string): Promise<string | null> {
  const db = getDB();
  const result = await db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .bind(key)
    .first<{ value: string }>();
  return result?.value || null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = getDB();
  await db
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
    )
    .bind(key, value, value)
    .run();
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = getDB();
  const { results } = await db
    .prepare("SELECT key, value FROM settings")
    .all<Setting>();
  const settings: Record<string, string> = {};
  for (const row of results || []) {
    settings[row.key] = row.value;
  }
  return settings;
}

// --- RSS ---

export async function getRecentPostsForRSS(
  limit: number = 20,
): Promise<PostListItem[]> {
  const db = getDB();
  const { results } = await db
    .prepare(
      "SELECT id, title, slug, excerpt, tags, updated_at FROM posts WHERE published = 1 ORDER BY updated_at DESC LIMIT ?",
    )
    .bind(limit.toString())
    .all<PostListItem>();
  return results || [];
}

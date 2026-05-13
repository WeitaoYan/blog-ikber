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
  run(): Promise<{ success: boolean; meta: Record<string, unknown> }>;
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
// In Cloudflare Workers with OpenNext, D1 is accessed via env object passed to handlers
// For local development with wrangler, it's available via the worker context
function getDB(): D1Database {
  // Check process.env.NODE_ENV for development mode hints
  const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
  
  // Check globalThis.__D1_BUNDLES__ (OpenNext production mode)
  const hasGlobalThis = typeof globalThis !== "undefined";
  
  if (hasGlobalThis) {
    const globalAny = globalThis as any;
    const hasBundles = '__D1_BUNDLES__' in globalAny;
    
    if (hasBundles) {
      const hasDB = 'DB' in globalAny.__D1_BUNDLES__;
      
      if (hasDB) {
        return globalAny.__D1_BUNDLES__.DB as D1Database;
      }
    }
  }
  
  // Try process.env.DB after checking Cloudflare Worker env injected vars
  const hasProcess = typeof process !== "undefined";
  
  if (hasProcess && process.env) {
    const hasEnvDB = 'DB' in process.env;
    
    if (hasEnvDB) {
      return (process.env as any).DB as D1Database;
    }
  }
  
  // Check Cloudflare Worker env object pattern (wrangler dev injects via env param)
  // OpenNext wraps this as __D1_BUNDLES__, so this is a final fallback for custom setups
  if (typeof (globalThis as any)?.env?.DB !== 'undefined') {
    return (globalThis as any).env.DB as D1Database;
  }
  
  // In development mode (next dev), D1 is not available — provide clear guidance
  if (isDev) {
    console.warn(
      '[DB] D1 is not available in next dev mode.\n' +
      '  Use "npm run dev:wrangler" (wrangler dev) instead, which injects D1 bindings.\n' +
      '  Or set up a local SQLite file for development with: wrangler dev --local'
    );
    throw new Error('D1 not available in next dev mode. Use "npm run dev:wrangler" instead.');
  }
  
  throw new Error(
    "D1 database binding not available. The OpenNext build does not have D1 bindings injected.\n" +
    "Please rebuild: npm run build:cf\n" +
    "Make sure DATABASE_ID is set in .env file before building."
  );
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
  console.log('DEBUG - getAllPostsAdmin called with page:', page, 'limit:', limit);
  
  try {
    const db = getDB();
    console.log('DEBUG - D1 database obtained');
    
    const offset = (page - 1) * limit;
    console.log('DEBUG - Calculated offset:', offset);

    console.log('DEBUG - Executing COUNT query...');
    const countResult = await db
      .prepare("SELECT COUNT(*) as total FROM posts")
      .first<{ total: number }>();
    console.log('DEBUG - COUNT result:', countResult);

    console.log('DEBUG - Executing SELECT query...');
    const postsResult = await db
      .prepare(
        "SELECT id, title, slug, excerpt, tags, published, updated_at FROM posts ORDER BY updated_at DESC LIMIT ? OFFSET ?",
      )
      .bind(limit.toString(), offset.toString())
      .all<PostListItem & { published: number }>();
    console.log('DEBUG - SELECT result count:', postsResult.results?.length || 0);

    return {
      posts: postsResult.results || [],
      total: countResult?.total || 0,
    };
  } catch (error) {
    console.error('ERROR - getAllPostsAdmin failed:', error);
    throw error;
  }
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

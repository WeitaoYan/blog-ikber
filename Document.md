# 博客系统架构文档

## 1. 项目概述

一个运行于 Cloudflare 边缘网络的简约风格个人博客，博主通过后台管理系统编写 Markdown 文章，访客可使用 GitHub 账号评论、点赞、搜索全文、订阅 RSS 并扫码打赏。所有动态功能（认证、文章管理、搜索、点赞、图片上传）均通过 Cloudflare Workers/Pages Functions 实现，数据存储在 D1（关系型数据库）和 R2（对象存储）中，评论由 giscus 服务提供。

---

## 2. 技术栈

| 层级          | 技术选型                                                                         |
| ------------- | -------------------------------------------------------------------------------- |
| 框架          | Next.js 14 (App Router)                                                          |
| 部署平台      | Cloudflare Pages（with Functions）                                               |
| 数据库        | Cloudflare D1（SQLite，支持 FTS5）                                               |
| 对象存储      | Cloudflare R2（存储上传图片、二维码）                                            |
| 认证          | 环境变量中的用户名/密码，签发 JWT（jose 库）                                     |
| 搜索          | D1 FTS5 全文索引 + API 路由提供搜索接口                                          |
| 评论          | giscus 前端组件（使用 GitHub Discussions 存储评论）                              |
| Markdown 编辑 | @uiw/react-md-editor（后台编辑器，支持实时预览、图片拖拽上传）                   |
| Markdown 渲染 | react-markdown + remark-gfm + rehype-highlight + rehype-raw                      |
| 代码高亮      | highlight.js（通过 rehype-highlight 在服务端/构建时上色）                        |
| 订阅          | 构建时生成 RSS 2.0 XML（/rss.xml），并提供邮件订阅基础（本文档未含具体邮件服务） |
| 点赞          | API 路由 + D1 计数器，浏览器指纹/Cookie 防刷                                     |
| 打赏          | 后台可上传微信/支付宝二维码图片，文章页面按需展示                                |
| UI 样式       | Tailwind CSS（简约现代风格）                                                     |

---

## 3. 架构概览

```
┌─────────────────────── Cloudflare Pages ───────────────────────┐
│                                                                │
│  ┌─────────────┐   ┌──────────────────────┐                   │
│  │ 静态资源/CDN│   │  Pages Functions      │                   │
│  │ (R2 图片)   │   │  (API 路由 + SSR)     │                   │
│  └─────────────┘   └──────┬───────────────┘                   │
│                           │                                    │
│                ┌──────────▼──────────┐                        │
│                │  Cloudflare D1      │                        │
│                │  (文章、点赞、索引)  │                        │
│                └─────────────────────┘                        │
│                                                                │
│  ┌─────────────────────────────────────────┐                  │
│  │  giscus (GitHub App)  ← 评论加载         │                  │
│  └─────────────────────────────────────────┘                  │
└────────────────────────────────────────────────────────────────┘
```

- Next.js 项目编译为静态页面 + Edge API Routes，由 Cloudflare Pages 托管。
- 图片上传至 R2，通过自定义域名或 Cloudflare 提供全球加速访问。
- 管理后台登录使用 JWT，密钥与用户名密码均通过环境变量注入。
- 全文搜索基于 D1 的 FTS5 表，插入/更新文章时自动维护索引。

---

## 4. 项目结构

```
my-blog/
├── public/
│   └── assets/                 # 静态资源（如 logo.svg）
├── src/
│   ├── app/
│   │   ├── (frontend)/         # 前台页面
│   │   │   ├── page.tsx        # 文章列表首页
│   │   │   ├── posts/[slug]/page.tsx  # 文章详情页
│   │   │   ├── search/page.tsx # 搜索结果页
│   │   │   └── layout.tsx
│   │   ├── admin/              # 后台管理页面（均需登录）
│   │   │   ├── login/page.tsx
│   │   │   ├── dashboard/page.tsx     # 文章列表管理
│   │   │   ├── editor/[[...slug]]/page.tsx  # 新建/编辑文章
│   │   │   ├── settings/page.tsx     # 打赏二维码上传、个人信息等
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── route.ts          # POST 登录，返回 JWT
│   │   │   ├── posts/
│   │   │   │   ├── route.ts          # GET 列表, POST 新建（需认证）
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts      # GET/PATCH/DELETE（需认证）
│   │   │   │       └── like/route.ts # POST 点赞
│   │   │   ├── search/
│   │   │   │   └── route.ts          # GET ?q=keyword
│   │   │   ├── upload/
│   │   │   │   └── route.ts          # POST 图片上传（需认证）
│   │   │   └── rss/
│   │   │       └── route.ts          # GET 动态生成 RSS（可选）
│   │   └── layout.tsx
│   ├── components/
│   │   ├── MDXRenderer.tsx      # 安全渲染 Markdown 组件
│   │   ├── Giscus.tsx           # 封装 giscus 的客户端组件
│   │   ├── LikeButton.tsx       # 点赞按钮客户端组件
│   │   └── Admin/...
│   ├── lib/
│   │   ├── db.ts                # D1 连接与查询封装
│   │   ├── auth.ts              # JWT 签发/验证工具
│   │   ├── search.ts            # FTS 索引维护逻辑
│   │   └── constants.ts
│   ├── middleware.ts            # 保护 /admin 路由（检查 JWT cookie）
│   └── styles/
│       └── globals.css
├── schema.sql                   # D1 初始化 SQL
├── wrangler.toml
├── next.config.js
├── tailwind.config.js
├── package.json
└── .env.example
```

---

## 5. 数据模型（D1）

所有表使用 D1（SQLite）创建，初始化脚本 `schema.sql`:

```sql
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
```

---

## 6. API 路由设计

所有 API 路由均位于 `src/app/api/` 下，基于 Edge Runtime (Web API)。

### 6.1 认证

- `POST /api/auth`
  - Body: `{ username, password }`
  - 验证环境变量 `ADMIN_USERNAME` / `ADMIN_PASSWORD`
  - 成功返回 `{ token: "<JWT>" }`，并设置 `httpOnly` cookie `token`，有效期7天。
  - 后续需要认证的 API 通过 Cookie 或 Authorization header 验证。

### 6.2 文章 CRUD（需要认证）

- `GET /api/posts`  
  查询所有已发布文章，支持分页 `?page=1&limit=10`，返回 title, slug, excerpt, tags, updated_at。
- `POST /api/posts`  
  创建新文章，body: `{ title, slug, content, tags, published }`，自动同步 FTS。
- `GET /api/posts/[id]`  
  根据 id 获取文章详情（包含 content 等所有字段）。
- `PATCH /api/posts/[id]`  
  更新文章，并刷新 FTS。
- `DELETE /api/posts/[id]`  
  删除文章及 FTS 记录。

### 6.3 点赞

- `POST /api/posts/[slug]/like`  
  每次请求增加对应 `post_slug` 的点赞数。使用 Cookie 记录已点赞文章，防止单设备重复刷；无认证。
- `GET /api/posts/[slug]/like`  
  返回当前点赞数 `{ count: 42 }`。

### 6.4 搜索

- `GET /api/search?q=keyword`  
  使用 FTS5 查询 `posts_fts`，返回匹配文章列表（title, slug, excerpt, tags）。

### 6.5 图片上传（需要认证）

- `POST /api/upload`  
  Content-Type: multipart/form-data，字段 `file`。  
  将文件上传至 R2 存储桶，路径按日期命名（如 `images/2025/04/uuid.jpg`）。  
  返回 `{ url: "https://static.example.com/images/..." }`。

### 6.6 RSS

- `GET /api/rss`  
  动态查询最近20篇已发布文章，返回 XML。也可在构建时通过脚本生成静态 `public/rss.xml`，推荐静态生成以减轻 Worker 调用。

---

## 7. 前台页面路由

| 路径            | 说明                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------- |
| `/`             | 文章列表，支持按标签筛选（查询参数 `?tag=tech`），分页加载（ISR 或 SSR）。                         |
| `/posts/[slug]` | 文章详情。渲染 Markdown，包含文章内容、代码高亮、点赞按钮、打赏二维码（若已设置）、giscus 评论区。 |
| `/search`       | 搜索页面，包含输入框和搜索结果列表（使用 SWR 调用 `/api/search`）。                                |
| `/rss.xml`      | 静态 RSS 文件，若使用 API 路由可省略。                                                             |

### 文章详情页组件结构

```
<article>
  <MarkdownRenderer content={post.content} />
  <LikeButton slug={post.slug} />
  <DonateBox donate={settings.donate} />  {/* 展示二维码图片 */}
  <Giscus />                              {/* 客户端组件 */}
</article>
```

---

## 8. 身份验证与中间件

- 环境变量：`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET`（随机字符串）。
- 登录接口签发 JWT（payload: `{ sub: "admin" }`，有效期 7d）。
- Next.js Middleware (`src/middleware.ts`) 保护 `/admin` 所有路由：

  ```ts
  import { NextRequest, NextResponse } from "next/server";
  import { jwtVerify } from "jose";

  export async function middleware(req: NextRequest) {
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.redirect("/admin/login");
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
      return NextResponse.next();
    } catch {
      return NextResponse.redirect("/admin/login");
    }
  }

  export const config = {
    matcher: "/admin/:path*",
  };
  ```

- API 认证同样复用该 JWT 验证函数，放在 API route handler 开头。

---

## 9. 全文搜索实现

- 数据库层面使用 FTS5，在 `schema.sql` 中已建立虚拟表和触发器。
- 搜索 API 核心查询：
  ```ts
  // lib/db.ts
  export async function searchPosts(query: string) {
    const db = getD1(); // 从 context/global 获取 D1 绑定
    const stmt = db
      .prepare(
        `
      SELECT p.id, p.title, p.slug, p.excerpt, p.tags, p.updated_at
      FROM posts_fts
      JOIN posts p ON posts_fts.rowid = p.id
      WHERE posts_fts MATCH ?
      ORDER BY rank
      LIMIT 20
    `,
      )
      .bind(query);
    const { results } = await stmt.all();
    return results;
  }
  ```
- 前端搜索页面使用防抖 300ms 后请求 API，渲染结果列表。

---

## 10. 评论系统（GitHub 账号）

使用 [giscus](https://giscus.app/) 组件，无需自建后端。

1. 在 GitHub 仓库开启 Discussions 功能，安装 giscus GitHub App 并授权。
2. 获取 repo ID、category ID 等参数。
3. 在 `src/components/Giscus.tsx` 创建客户端组件，在文章详情页使用：

   ```tsx
   "use client";
   import { useEffect } from "react";

   export default function Giscus() {
     useEffect(() => {
       const script = document.createElement("script");
       script.src = "https://giscus.app/client.js";
       script.setAttribute("data-repo", process.env.NEXT_PUBLIC_GISCUS_REPO!);
       script.setAttribute(
         "data-repo-id",
         process.env.NEXT_PUBLIC_GISCUS_REPO_ID!,
       );
       script.setAttribute(
         "data-category",
         process.env.NEXT_PUBLIC_GISCUS_CATEGORY!,
       );
       script.setAttribute(
         "data-category-id",
         process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID!,
       );
       script.setAttribute("data-mapping", "pathname");
       script.setAttribute("data-strict", "0");
       script.setAttribute("data-reactions-enabled", "1");
       script.async = true;
       document.getElementById("giscus-container")?.appendChild(script);
     }, []);

     return <div id="giscus-container" className="mt-12" />;
   }
   ```

   相关配置通过 `NEXT_PUBLIC_*` 环境变量注入，构建时可用。

---

## 11. 订阅功能

- **RSS 订阅**：在构建时通过脚本生成 `public/rss.xml`。可配置 `scripts/generate-rss.mjs`，查询 D1 获取文章并生成 XML，通过 `next.config.js` 在构建前执行。
- **邮件订阅**（可选拓展）：可集成 ConvertKit、Mailchimp 等第三方服务，或通过 Cloudflare Workers + Mailgun 实现自建邮件列表。本文档不深入，但文章详情页应预留订阅表单位置（前端占位）。

---

## 12. 点赞与打赏

### 点赞

- 详情页通过 `LikeButton` 客户端组件调用 `POST /api/posts/[slug]/like`。
- API 检查 cookie `liked_posts`（存储已点赞 slug 列表，编码为 JSON），若已存在则拒绝重复点赞。
- 点赞按钮展示当前计数（通过 `GET /api/posts/[slug]/like` 获取），并即时更新。

### 打赏

- 博主在后台 `/admin/settings` 上传微信和支付宝收款二维码，调用 `/api/upload` 得到图片 URL，保存至 `settings` 表键 `donate`。
- 前台文章详情页的 `DonateBox` 组件从 props 获取二维码 URL，点击“打赏”按钮弹窗或展开显示两张图片。
- 二维码图片由 R2 提供，支持响应式优化。

---

## 13. 图床集成

- 后台编辑器使用 `@uiw/react-md-editor`，粘贴或拖拽图片时，自动调用 `/api/upload` 上传至 R2，返回的 URL 直接替换到 Markdown 光标处。
- `/api/upload` 实现：
  1. 验证 JWT 身份。
  2. 读取 Request formData 中的文件。
  3. 使用 `crypto.randomUUID()` 生成唯一文件名，保留原始扩展名。
  4. 通过 R2 绑定（`env.MY_BUCKET`）上传文件，键值如 `images/2025/04/abc123.jpg`。
  5. 返回可公开访问的 URL（R2 绑定了自定义域或使用 `https://pub-xxx.r2.dev`）。
- R2 存储桶应公开读取，写权限仅 API 通过 Workers 允许（通过绑定授权）。

---

## 14. 部署到 Cloudflare

### 准备工作

1. Cloudflare 账号，开通 Pages、D1、R2 服务。
2. 创建 D1 数据库（如 `blog-db`），执行 `schema.sql`。
3. 创建 R2 存储桶（如 `blog-images`），设置为公开访问（绑定自定义域更佳）。
4. GitHub 仓库，安装 giscus App 并获取配置参数。
5. 环境变量准备：所有 `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET`, `GISCUS_*`, R2 绑定信息等。

### 配置 wrangler.toml（供本地开发与部署参考）

```toml
name = "blog"
compatibility_date = "2024-04-05"

[[d1_databases]]
binding = "DB"
database_name = "blog-db"
database_id = "your-database-id"

[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "blog-images"
```

### 部署步骤

1. 本地开发使用 `npx wrangler pages dev .next`（确保 `next.config.js` 配置了 `@cloudflare/next-on-pages`）。
2. 推送代码到 GitHub，关联 Cloudflare Pages 项目，构建命令 `npm run build`，输出目录 `.next` 或 `out`（若 SSG 模式）。
3. 在 Cloudflare Pages 仪表盘设置环境变量（所有不带 `NEXT_PUBLIC_` 的变量），并绑定 D1 和 R2。
4. 配置 Routes：如有需要，自定义域名。

> **重要**：因为使用了 `@cloudflare/next-on-pages`，部分 Node.js API 不可用，需使用其提供的 Edge 替代方案。所有数据访问均通过 D1 binding (context) 完成。

---

## 15. 环境变量一览

| 变量名                           | 说明                         | 类型     |
| -------------------------------- | ---------------------------- | -------- |
| `ADMIN_USERNAME`                 | 后台登录用户名               | 秘密     |
| `ADMIN_PASSWORD`                 | 后台登录密码                 | 秘密     |
| `JWT_SECRET`                     | JWT 签名密钥（随机长字符串） | 秘密     |
| `NEXT_PUBLIC_GISCUS_REPO`        | 格式 `owner/repo`            | 公开     |
| `NEXT_PUBLIC_GISCUS_REPO_ID`     | giscus 仓库 ID               | 公开     |
| `NEXT_PUBLIC_GISCUS_CATEGORY`    | 分类名称                     | 公开     |
| `NEXT_PUBLIC_GISCUS_CATEGORY_ID` | 分类 ID                      | 公开     |
| `R2_PUBLIC_URL`                  | 图片公开访问前缀（自定义域） | 公开构建 |
| `DB` (binding)                   | D1 数据库绑定（平台注入）    | 自动     |
| `MY_BUCKET` (binding)            | R2 存储桶绑定（平台注入）    | 自动     |

---

## 16. 关键规范与注意事项

- **Markdown 渲染**：必须使用 `rehype-raw` 以支持部分 HTML，代码块由 `rehype-highlight` 配合 `highlight.js` CSS 主题实现高亮，避免客户端闪烁。
- **安全性**：后台 API 严格验证 JWT；图片上传限制文件大小（5MB）和类型（image/\*），避免恶意上传；所有用户输入在存储前做基本清理（markdown 允许 HTML 但需过滤脚本）。
- **性能**：前台文章列表、详情使用静态生成或 ISR（若部署支持），减少边缘函数调用。点赞等实时数据通过客户端 fetch 动态获取。
- **订阅**：RSS 文件在每次部署时自动更新，保证内容同步。
- **评论区 ID**：giscus 使用 `pathname` 映射，确保每篇文章独立讨论。

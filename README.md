# Blog Ikber

一个运行在 Cloudflare 边缘网络的简约风格个人博客。支持 Markdown 写作、GitHub 账号评论、全文搜索、点赞打赏、RSS 订阅等功能。

---

## 功能特性

- **Markdown 编辑器** — 基于 `@uiw/react-md-editor`，支持实时预览、图片拖拽上传
- **全文搜索** — D1 FTS5 全文索引，实时搜索文章内容
- **评论系统** — 基于 giscus，使用 GitHub Discussions 存储评论，无需自建后端
- **点赞** — 浏览器指纹/Cookie 防刷
- **打赏** — 支持微信/支付宝二维码
- **RSS 订阅** — 自动生成 RSS 2.0 XML
- **后台管理** — 文章 CRUD、设置管理，JWT 认证保护
- **代码高亮** — highlight.js 服务端/构建时上色，无客户端闪烁

---

## 技术栈

| 层级     | 技术                                      |
| -------- | ----------------------------------------- |
| 框架     | Next.js 15 (App Router)                   |
| 部署     | Cloudflare Workers                        |
| 数据库   | Cloudflare D1 (SQLite + FTS5)             |
| 存储     | Cloudflare R2 (图片/二维码对象存储)        |
| 样式     | Tailwind CSS                              |
| 评论     | giscus (GitHub Discussions)               |
| 认证     | JWT (jose 库)                             |

---

## 前置准备

你只需要：

1. 一个 **[GitHub](https://github.com)** 账号
2. 一个 **[Cloudflare](https://dash.cloudflare.com)** 账号

> **不需要本地安装任何开发工具**，所有操作都可以在浏览器中完成。

---

## 部署指南

整个部署流程分为 **6 步**，全程在浏览器中操作即可。

---

### 第 1 步：Fork 项目

1. 点击本仓库右上角的 **Fork** 按钮，将项目 Fork 到你的 GitHub 账号下
2. Fork 完成后，你会在自己账号下看到 `你的用户名/blog-ikber` 仓库

---

### 第 2 步：修改项目配置文件

Fork 后需要在 GitHub 网页中直接修改两个配置文件，将它们替换为你自己的资源 ID。

#### 2.1 创建 Cloudflare D1 数据库

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧菜单 → **Workers & Pages** → **D1**
3. 点击 **创建数据库**，名称填 `blog-db`，点击创建
4. 创建完成后，点击进入该数据库，你会看到 **数据库 ID**（一串 UUID），**复制它**

#### 2.2 创建 Cloudflare R2 存储桶

1. 左侧菜单 → **R2**
2. 点击 **创建存储桶**，名称填 `blog-images`，点击创建
3. 创建完成后，点击进入该存储桶 → **设置** → **公开访问** → 绑定自定义域名或开启 `r2.dev`
4. 记录你的公开访问 URL（如 `https://static.你的域名.com`），这个就是你的 `R2_PUBLIC_URL`

#### 2.3 修改 wrangler.toml

在你 Fork 的 GitHub 仓库中，点击 `wrangler.toml` 文件 → 点击右上角 ✏️（编辑），将文件中高亮的部分替换为你自己的值：

```toml
name = "blog-ikber"              # 可改为你的项目名，建议保持
compatibility_date = "2026-04-28"
compatibility_flags = ["nodejs_compat"]

main = ".open-next/worker.js"
assets = { directory = ".open-next/assets", binding = "ASSETS" }

services = [
  { binding = "WORKER_SELF_REFERENCE", service = "blog-ikber" },  # 如果改了 name，这里 service 也要同步
]

[[d1_databases]]
binding = "DB"
database_name = "blog-db"
database_id = "<替换为第2.1步获取的D1数据库ID>"
migrations_dir = "./migrations"

[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "blog-images"

[observability]
enabled = false

[vars]
NEXT_PUBLIC_GISCUS_REPO = "<你的用户名>/blog-ikber"
NEXT_PUBLIC_GISCUS_REPO_ID = "<稍后在第3步获取>"
NEXT_PUBLIC_GISCUS_CATEGORY = "Announcements"
NEXT_PUBLIC_GISCUS_CATEGORY_ID = "<稍后在第3步获取>"
R2_PUBLIC_URL = "<第2.2步记录的公开访问URL>"
```

编辑完成后点击 **Commit changes** 保存。

#### 2.4 修改 open-next.config.ts

同样在 GitHub 网页中编辑 `open-next.config.ts`，将 `databaseId` 替换为你的 D1 数据库 ID：

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  d1: [
    {
      binding: "DB",
      databaseName: "blog-db",
      databaseId: process.env.DATABASE_ID || "<替换为第2.1步获取的D1数据库ID>",
    },
  ],
  r2: [
    {
      binding: "MY_BUCKET",
      bucketName: "blog-images",
    },
  ],
});
```

保存并 Commit。

---

### 第 3 步：配置 giscus 评论

giscus 是一个基于 GitHub Discussions 的评论系统，无需自建后端。

#### 3.1 启用 Discussions

进入你 **Fork 后的 GitHub 仓库** → **Settings** → 向下滚动到 **Features** → 勾选 **Discussions**。

#### 3.2 安装 giscus App

访问 [giscus.app](https://giscus.app/zh-CN)，点击页面中的 **Install giscus on GitHub**，选择你 Fork 的仓库进行授权。

#### 3.3 获取并填入配置参数

在 [giscus.app](https://giscus.app/zh-CN) 页面：

1. "仓库" 输入 `<你的用户名>/blog-ikber`
2. "页面 ↔️ Discussion 映射关系" 选择 **Discussion 的标题包含页面路径名 (pathname)**
3. "Discussion 分类" 选择 **Announcements**（推荐）
4. 页面下方会生成你的配置参数，将以下值**更新到 `wrangler.toml` 的 `[vars]` 段中**：
   - `NEXT_PUBLIC_GISCUS_REPO_ID` → 对应页面显示的 `data-repo-id`
   - `NEXT_PUBLIC_GISCUS_CATEGORY_ID` → 对应页面显示的 `data-category-id`

再次编辑 `wrangler.toml`，把这两个值填入，然后 Commit。

---

### 第 4 步：初始化 D1 数据库表

1. 打开 Cloudflare Dashboard → **Workers & Pages** → **D1** → 点击 `blog-db`
2. 点击 **控制台 (Console)** 标签页
3. 将你仓库中 [`schema.sql`](./schema.sql) 的全部内容复制粘贴到控制台中
4. 点击 **执行**，你会看到成功提示

> 如果执行报错 "already exists"，说明表已经创建过，忽略即可。

---

### 第 5 步：创建 Cloudflare Worker 并部署

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages**
2. 点击 **创建** → 选择 **Worker** → **连接到 Git**
3. 授权 GitHub，选择你 Fork 的 `blog-ikber` 仓库
4. 配置构建设置：

   | 设置项       | 值                      |
   | ------------ | ----------------------- |
   | 构建命令     | `npm run build:cf`      |
   | 构建输出目录 | `.open-next`            |


   > ⚠ 此处**不需要**选 "框架预设"（Workers 没有框架预设选项），直接填上面两个值即可。

5. 展开 **环境变量**，添加以下**秘密变量**（务必保密，不要提交到 Git）：

   | 变量名            | 值                       |
   | ----------------- | ------------------------ |
   | `ADMIN_USERNAME`  | 你的后台登录用户名        |
   | `ADMIN_PASSWORD`  | 你的后台登录密码          |
   | `JWT_SECRET`      | 一段随机长字符串（密钥）  |

   > 💡 **生成 JWT_SECRET**：随便输入一段足够长且随机的字符串即可，比如 `my-blog-super-secret-key-2026-please-change-me`。不要用太简单或太短的字符串。

6. 点击 **保存并部署**

7. 首次部署完成后，进入 Worker 项目 → **设置** → **绑定** → 添加资源绑定：
   - **D1 数据库**：变量名 `DB`，选择 `blog-db`
   - **R2 存储桶**：变量名 `MY_BUCKET`，选择 `blog-images`

8. 保存后会自动重新部署，等待完成即可。

---

### 第 6 步：开始使用

部署完成后，Cloudflare 会提供一个 `*.workers.dev` 域名。访问即可：

- **前台首页**：`https://你的项目.你的用户名.workers.dev/` — 文章列表
- **后台登录**：`https://你的项目.你的用户名.workers.dev/admin/login` — 用你设置的 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 登录
- **开始写作**：后台 → **新建文章**
- **设置打赏**：后台 → **设置** → 上传微信/支付宝收款码
- **RSS 订阅**：`https://你的项目.你的用户名.workers.dev/api/rss`

> 💡 可绑定自定义域名：在 Worker 项目 → **设置** → **触发器** → **自定义域** 中添加即可。

---

## 本地开发（可选）

如果你想在本地进行二次开发或自定义样式，可以搭建本地环境：

```bash
# 1. 克隆仓库
git clone https://github.com/<你的用户名>/blog-ikber.git
cd blog-ikber

# 2. 安装依赖
npm install

# 3. 创建本地环境变量文件
cp .env.example .env.local
# 编辑 .env.local，填入你的配置（参考 wrangler.toml 中的值）

# 4. 登录 Wrangler
npx wrangler login

# 5. 初始化本地 D1 数据库
npx wrangler d1 execute blog-db --file=./schema.sql --local

# 6. 启动开发服务器
npm run dev
```

浏览器打开 `http://localhost:3000` 即可预览。

---

## 项目结构

```
blog-ikber/
├── src/
│   ├── app/
│   │   ├── (frontend)/          # 前台页面（文章列表、详情、搜索）
│   │   ├── admin/               # 后台管理（登录、仪表盘、编辑器、设置）
│   │   └── api/                 # API 路由（认证、文章 CRUD、搜索、上传等）
│   ├── components/              # 公共组件
│   └── lib/                     # 工具库（数据库、认证、搜索）
├── migrations/                  # D1 数据库迁移
├── public/                      # 静态资源
├── schema.sql                   # 数据库初始化脚本
├── wrangler.toml                # Cloudflare Wrangler 配置
├── open-next.config.ts          # OpenNext Cloudflare 适配配置
└── package.json
```

---

## 常见问题

### Q: 部署后页面 404？
检查 Cloudflare Worker 的构建输出目录是否为 `.open-next`，确认 D1 和 R2 绑定已完成并已重新部署。

### Q: 评论不显示？
确认已在 GitHub 仓库启用 Discussions，giscus App 已授权，`wrangler.toml` 中的 giscus 参数与 [giscus.app](https://giscus.app) 生成的一致。

### Q: 图片上传失败？
确认 R2 存储桶已创建并配置了公开访问，`wrangler.toml` 中 `R2_PUBLIC_URL` 填写正确。

### Q: 全文搜索无结果？
确保已在 D1 控制台中执行了 `schema.sql`，FTS5 虚拟表和触发器已成功创建。

### Q: 部署后修改了 wrangler.toml，如何生效？
每次修改 `wrangler.toml` 或其他源码后，Cloudflare Worker 会自动检测 Git 更新并重新部署。

### Q: D1 控制台执行 SQL 报错 "already exists"？
正常的。首次执行会创建表，再次执行会提示已存在，不影响使用。

---

## License

MIT

/**
 * RSS Feed Generator
 * Run this script during build to generate a static public/rss.xml
 * Usage: node scripts/generate-rss.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

// In a real deployment with D1, this would query the database.
// For static generation, we read from a JSON file or generate a placeholder.
async function generateRSS() {
  const siteUrl = process.env.R2_PUBLIC_URL || "https://blog.example.com";
  const blogTitle = "My Blog";
  const blogDescription = "";

  // Try to read posts from a generated JSON file if it exists
  let posts = [];
  const postsJsonPath = path.join(publicDir, "posts.json");
  if (fs.existsSync(postsJsonPath)) {
    try {
      posts = JSON.parse(fs.readFileSync(postsJsonPath, "utf-8"));
    } catch {
      posts = [];
    }
  }

  const rssItems = posts
    .slice(0, 20)
    .map(
      (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${siteUrl}/posts/${post.slug}</link>
      <guid>${siteUrl}/posts/${post.slug}</guid>
      <description><![CDATA[${post.excerpt || ""}]]></description>
      <pubDate>${new Date(post.updated_at).toUTCString()}</pubDate>
    </item>`,
    )
    .join("");

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${blogTitle}</title>
    <link>${siteUrl}</link>
    <description>${blogDescription}</description>
    <language>zh-CN</language>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${rssItems}
  </channel>
</rss>`;

  const outputPath = path.join(publicDir, "rss.xml");
  fs.writeFileSync(outputPath, rssXml, "utf-8");
  console.log(`RSS feed generated at ${outputPath}`);
}

generateRSS().catch(console.error);

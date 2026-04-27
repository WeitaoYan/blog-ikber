import { NextResponse } from "next/server";
import { getRecentPostsForRSS } from "@/lib/db";

export async function GET() {
  try {
    const posts = await getRecentPostsForRSS(20);

    const siteUrl = process.env.R2_PUBLIC_URL || "https://blog.example.com";
    const blogTitle = "My Blog";
    const blogDescription = "";

    const rssItems = posts
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
    <atom:link href="${siteUrl}/api/rss" rel="self" type="application/rss+xml"/>
    ${rssItems}
  </channel>
</rss>`;

    return new NextResponse(rssXml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return new NextResponse("Failed to generate RSS feed", { status: 500 });
  }
}

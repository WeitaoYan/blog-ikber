import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function POST(request: NextRequest) {
  const authenticated = await requireAuth(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    // 提取R2键值，从URL中获取路径部分
    const r2PublicUrl = process.env.R2_PUBLIC_URL;
    if (!r2PublicUrl) {
      return NextResponse.json(
        { error: "R2_PUBLIC_URL environment variable is not configured" },
        { status: 500 }
      );
    }

    // 确保URL以R2公共URL开头
    if (!url.startsWith(r2PublicUrl)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // 提取文件路径部分
    let key = url.substring(r2PublicUrl.length);
    if (key.startsWith('/')) {
      key = key.substring(1);
    }
    
    if (!key) {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // 验证key的格式，确保它是一个合法的图片路径
    if (!isValidImagePath(key)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    const cf = getCloudflareContext();
    const bucket = cf.env.MY_BUCKET;
    if (!bucket) {
      return NextResponse.json(
        { error: "Storage not configured" },
        { status: 500 },
      );
    }

    // 尝试获取文件信息以确认文件存在
    const fileExists = await bucket.head(key);
    if (!fileExists) {
      return NextResponse.json({ error: "File does not exist" }, { status: 404 });
    }

    // 执行删除操作
    await bucket.delete(key);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

// 验证是否为合法的图片路径
function isValidImagePath(key: string): boolean {
  // 检查是否为 images 目录下的文件，防止路径遍历攻击
  if (!key.startsWith('images/')) {
    return false;
  }

  // 检查路径中是否包含非法字符，如 ../ 等
  if (key.includes('../') || key.includes('..\\')) {
    return false;
  }

  // 检查扩展名是否为图片类型
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = '.' + key.split('.').pop()?.toLowerCase();
  return validExtensions.includes(ext);
}
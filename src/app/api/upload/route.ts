import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES } from "@/lib/constants";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function POST(request: NextRequest) {
  const authenticated = await requireAuth(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop() || "jpg";
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const uuid = crypto.randomUUID();
    const key = `images/${year}/${month}/${uuid}.${ext}`;

    const cf = getCloudflareContext();
    const bucket = cf.env.MY_BUCKET;
    if (!bucket) {
      return NextResponse.json(
        { error: "Storage not configured" },
        { status: 500 },
      );
    }

    const buffer = await file.arrayBuffer();
    await bucket.put(key, buffer, {
      httpMetadata: { contentType: file.type },
    });

    // 使用环境变量配置的R2公共URL
    const r2PublicUrl = process.env.R2_PUBLIC_URL;
    
    // 如果没有配置R2_PUBLIC_URL环境变量，则抛出错误
    if (!r2PublicUrl) {
      return NextResponse.json(
        { error: "R2_PUBLIC_URL environment variable is not configured" },
        { status: 500 }
      );
    }
    
    const publicUrl = `${r2PublicUrl}/${key}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
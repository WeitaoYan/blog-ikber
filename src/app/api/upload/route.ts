import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES } from "@/lib/constants";

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

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.",
        },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 },
      );
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "jpg";
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const uuid = crypto.randomUUID();
    const key = `images/${year}/${month}/${uuid}.${ext}`;

    // Upload to R2
    // @ts-ignore - R2 binding injected by Cloudflare
    const bucket = process.env.MY_BUCKET;
    if (!bucket) {
      return NextResponse.json(
        { error: "Storage not configured" },
        { status: 500 },
      );
    }

    const buffer = await file.arrayBuffer();
    // @ts-ignore
    await process.env.MY_BUCKET.put(key, buffer, {
      httpMetadata: { contentType: file.type },
    });

    const publicUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${key}`
      : `/${key}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAllSettings, setSetting } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const settings = await getAllSettings();
    
    // 兼容旧的 donate JSON 格式和新的独立字段
    let donateWechat = settings.donateWechat || "";
    let donateAlipay = settings.donateAlipay || "";
    
    // 如果存在旧的 donate JSON 格式，解析它
    if (settings.donate && !donateWechat && !donateAlipay) {
      try {
        const donateData = JSON.parse(settings.donate);
        donateWechat = donateData.wechat || "";
        donateAlipay = donateData.alipay || "";
      } catch {
        // 忽略解析错误
      }
    }
    
    return NextResponse.json({
      donateWechat,
      donateAlipay,
      blogTitle: settings.blogTitle || settings.blog_title || "My Blog",
      blogDescription: settings.blogDescription || settings.blog_description || "",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authenticated = await requireAuth(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { donateWechat, donateAlipay, blogTitle, blogDescription } = body;

    // Save each setting to database
    if (donateWechat !== undefined) {
      await setSetting("donateWechat", donateWechat);
    }
    if (donateAlipay !== undefined) {
      await setSetting("donateAlipay", donateAlipay);
    }
    if (blogTitle !== undefined) {
      await setSetting("blogTitle", blogTitle);
    }
    if (blogDescription !== undefined) {
      await setSetting("blogDescription", blogDescription);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}

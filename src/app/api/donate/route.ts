import { NextResponse } from "next/server";
import { getSetting } from "@/lib/db";

export async function GET() {
  try {
    const donateWechat = await getSetting("donate_wechat");
    const donateAlipay = await getSetting("donate_alipay");

    return NextResponse.json({
      donateWechat: donateWechat || "",
      donateAlipay: donateAlipay || "",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch donate settings" },
      { status: 500 }
    );
  }
}

import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  d1: [
    {
      binding: "DB", // 必须与 wrangler.toml 中的 binding 一致
      databaseName: "blog-db", // 必须与 wrangler.toml 中的 database_name 一致
      databaseId: process.env.DATABASE_ID || "0b92cec8-41fe-4354-b844-fea2e4c7024e",
    },
  ],
  r2: [
    {
      binding: "MY_BUCKET",
      bucketName: "blog-images",
    },
  ],
});
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  d1: [
    {
      binding: "DB",
      databaseName: "blog-db",
      databaseId: process.env.DATABASE_ID || "",
    },
  ],
  r2: [
    {
      binding: "MY_BUCKET",
      bucketName: "blog-images",
    },
  ],
});

import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  d1: [
    {
      binding: "DB",
      databaseName: "blog-db",
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

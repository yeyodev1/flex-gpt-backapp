import dotenv from "dotenv";
import { dbConnect } from "./config/mongo";
import { seedInitialUsers } from "./config/seed";
import { createApp } from "./app";

const port = process.env.PORT || 8100;

async function main() {
  dotenv.config();
  await dbConnect();
  await seedInitialUsers();

  const { app, server } = createApp();

  server.timeout = 10 * 60 * 1000;

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

main();

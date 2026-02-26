import dotenv from "dotenv";
import { dbConnect } from "./config/mongo";
import { seedInitialUsers } from "./config/seed";
import { createApp } from "./app";

dotenv.config();

const port = process.env.PORT || 8100;
const app = createApp();

async function startServer() {
  try {
    await dbConnect();
    await seedInitialUsers();

    // Only listen if we are not on Vercel
    if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
      const server = app.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });
      server.timeout = 10 * 60 * 1000;
    }
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

// In serverless environments, we often want to ensure DB connection
// but Vercel handles the lifecycle differently. 
// For typical Express on Vercel, we export the app.
startServer();

export default app;

import express, { Application } from "express";
import authRouter from "./auth.router";
import chatRouter from "./chat.router";

function routerApi(app: Application) {
  const router = express.Router();
  app.use("/api", router);

  router.use("/auth", authRouter);
  router.use("/chat", chatRouter);
}

export default routerApi;

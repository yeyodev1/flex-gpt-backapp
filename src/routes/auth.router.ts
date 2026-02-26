import { Router } from "express";
import { login, getProfile } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const authRouter = Router();

authRouter.post("/login", login as any);
authRouter.get("/profile", authMiddleware as any, getProfile as any);

export default authRouter;

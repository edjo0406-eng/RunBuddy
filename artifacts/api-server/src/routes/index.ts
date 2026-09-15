import { Router, type IRouter } from "express";
import healthRouter from "./health";
import runnersRouter from "./runners";
import connectionsRouter from "./connections";
import statsRouter from "./stats";
import messagesRouter from "./messages";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(runnersRouter);
router.use(connectionsRouter);
router.use(statsRouter);
router.use(messagesRouter);

export default router;

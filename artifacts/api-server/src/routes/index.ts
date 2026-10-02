import { Router, type IRouter } from "express";
import healthRouter from "./health";
import runnersRouter from "./runners";
import connectionsRouter from "./connections";
import statsRouter from "./stats";
import messagesRouter from "./messages";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(runnersRouter);
router.use(connectionsRouter);
router.use(statsRouter);
router.use(messagesRouter);
router.use(storageRouter);

export default router;

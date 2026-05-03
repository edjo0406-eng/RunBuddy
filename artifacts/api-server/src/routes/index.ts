import { Router, type IRouter } from "express";
import healthRouter from "./health";
import runnersRouter from "./runners";
import connectionsRouter from "./connections";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(runnersRouter);
router.use(connectionsRouter);
router.use(statsRouter);

export default router;

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storeRateRouter from "./store-rate";
import { errorHandler } from "../middlewares/error-handler";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storeRateRouter);
router.use(errorHandler);

export default router;

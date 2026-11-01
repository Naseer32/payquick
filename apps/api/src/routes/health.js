import { Router } from "express";
import { ACTIVE_NETWORK_NAME } from "../constants.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "payquick-api",
    network: ACTIVE_NETWORK_NAME
  });
});

export default router;

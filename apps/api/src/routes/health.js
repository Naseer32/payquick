import { Router } from "express";
import { NETWORK_NAME } from "../constants.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "payquick-api",
    network: NETWORK_NAME
  });
});

export default router;

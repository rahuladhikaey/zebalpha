import { Router } from "express";

const router = Router();

router.get("/me", (req, _res) => {
    console.log(req.body);
});

export default router;

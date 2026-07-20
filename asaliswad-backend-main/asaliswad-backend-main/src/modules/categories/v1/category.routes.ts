import { Router } from "express";
import * as categoryController from "@/modules/categories/v1/category.controller";
import validator from "@/middlewares/global.validator";
import { createCategoryPayloadSchema } from "@/types/category";

const router = Router();

router.post("/",
	validator(createCategoryPayloadSchema),
    categoryController.createCategory
);

router.get("/",
    categoryController.getCategories
);

export default router;

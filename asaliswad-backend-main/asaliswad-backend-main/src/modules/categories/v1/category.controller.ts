import type {
	Request,
    Response,
    NextFunction
} from "express";
import * as categoryService from "@/modules/categories/category.service";

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
		const category = await categoryService.createCategory(req.body);

        res.status(201).json({
            sucess: true,
            message: "category created successfully!",
            statusCode: 201,
            category
        });
    } catch(err) {
        next(err);
    }
}

export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const categories = await categoryService.getCategories();

        res.status(200).json({
            sucess: true,
            message: "categories fetched successfully!",
            statusCode: 200,
            categories
        });
    } catch(err) {
        next(err);
    }
}

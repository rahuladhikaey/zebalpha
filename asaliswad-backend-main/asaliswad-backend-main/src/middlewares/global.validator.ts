import type { 
	Response, 
	Request, 
	NextFunction, 
} from 'express';
import { ZodType } from 'zod';

const validator = <T>(schema: ZodType<T>) => 
	(req: Request<{}, {}, T>, _res: Response, next: NextFunction) => {
		const parsed = schema.safeParse(req.body);

		if(!parsed.success) return next(parsed.error);

		req.body = parsed.data;
		next();
	}

export default validator;

import { z } from "zod";

export const registerSchema = z
	.object({
		email: z.string().email("Invalid email address"),
		username: z.string().min(4, "Username must be at least 4 characters long"),
		password: z.string().min(6, "Password must be at least 6 characters long"),
		confirmPassword: z.string().min(6, "Password confirmation is required"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

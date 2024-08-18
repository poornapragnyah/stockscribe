"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { loginSchema } from "@/schemas/login"; // Adjust the path as necessary

type LoginFormInputs = z.infer<typeof loginSchema>;

const Login = () => {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginFormInputs>({
		resolver: zodResolver(loginSchema),
	});

	const router = useRouter();

	const onSubmit = async (data: LoginFormInputs) => {
		try {
			const response = await fetch("http://localhost:5000/api/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
				credentials: "include",
			});

			if (response.ok) {
				router.push("/home"); // Redirect to home page
			} else {
				throw new Error("Login failed");
			}
		} catch (error) {
			console.error("Login error:", error);
			toast.error("Login failed. Please try again.");
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-100">
			<div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
				<h2 className="text-3xl font-bold mb-6 text-center text-[#43c49f]">
					Login
				</h2>
				<form onSubmit={handleSubmit(onSubmit)}>
					<div className="mb-4">
						<label className="block text-sm font-medium text-gray-700">
							Username
						</label>
						<div className="relative mt-1">
							<input
								type="text"
								{...register("username")}
								placeholder="Enter your username"
								className="input input-bordered w-full pl-10 bg-white"
							/>
							{errors.username && (
								<p className="text-red-500 text-sm mt-1">
									{errors.username.message}
								</p>
							)}
						</div>
					</div>

					<div className="mb-6">
						<label className="block text-sm font-medium text-gray-700">
							Password
						</label>
						<div className="relative mt-1">
							<input
								type="password"
								{...register("password")}
								placeholder="Enter your password"
								className="input input-bordered w-full pl-10 bg-white"
							/>
							{errors.password && (
								<p className="text-red-500 text-sm mt-1">
									{errors.password.message}
								</p>
							)}
						</div>
					</div>

					<button
						type="submit"
						className="btn bg-[#43c49f] w-full text-slate-50 hover:bg-[#3aae8b] border-gray-50"
					>
						Login
					</button>
				</form>
				<p className="mt-4 text-center">
					Don't have an account?{" "}
					<a href="/register" className="text-[#43c49f] hover:underline">
						Register
					</a>
				</p>
				<ToastContainer position="bottom-right" />
			</div>
		</div>
	);
};

export default Login;

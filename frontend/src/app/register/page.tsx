"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { registerSchema } from "@/schemas/register"; // Adjust the path as necessary

type RegisterFormInputs = z.infer<typeof registerSchema>;

const Register = () => {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<RegisterFormInputs>({
		resolver: zodResolver(registerSchema),
	});

	const router = useRouter();

	const onSubmit = async (data: RegisterFormInputs) => {
		try {
			const response = await fetch("http://localhost:5000/api/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});

			if (response.ok) {
				toast.success("Registration successful! Please log in.");
				router.push("/login"); // Redirect to login page
			} else {
				throw new Error("Registration failed");
			}
		} catch (error) {
			console.error("Registration error:", error);
			toast.error("Registration failed. Please try again.");
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-100">
			<div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
				<h2 className="text-4xl font-bold mb-6 text-center text-[#6975fc]">
					Register
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

					<div className="mb-4">
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

					<div className="mb-6">
						<label className="block text-sm font-medium text-gray-700">
							Confirm Password
						</label>
						<div className="relative mt-1">
							<input
								type="password"
								{...register("confirmPassword")}
								placeholder="Confirm your password"
								className="input input-bordered w-full pl-10 bg-white"
							/>
							{errors.confirmPassword && (
								<p className="text-red-500 text-sm mt-1">
									{errors.confirmPassword.message}
								</p>
							)}
						</div>
					</div>

					<button
						type="submit"
						className="btn btn-primary w-full text-slate-50"
					>
						Register
					</button>
				</form>
				<p className="mt-4 text-center">
					Already have an account?{" "}
					<a href="/login" className="text-blue-500 hover:underline">
						Login
					</a>
				</p>
				<ToastContainer position="bottom-right" />
			</div>
		</div>
	);
};

export default Register;

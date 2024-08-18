"use client";

import React, { useState, useEffect } from "react";
import "react-toastify/dist/ReactToastify.css";

import type { NextPage } from "next";
import { useRouter } from "next/navigation";
import { PulseLoader } from "react-spinners";

const frontslash: NextPage = () => {
	const router = useRouter();
	useEffect(() => {
		router.push("/home");
	}, []);
	return (
		<div className="flex justify-center items-center h-screen bg-slate-100">
			<PulseLoader color="#2563EB" loading={true} size={15} />
		</div>
	);
};

export default frontslash;

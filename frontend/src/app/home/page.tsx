"use client";

import React, { useState, useCallback, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Navbar, NewsArticles } from "../../components/NewsList";
import type { NextPage } from "next";
import { useRouter } from "next/navigation";
import { PulseLoader } from "react-spinners";

interface Article {
	title: string;
	summary: string;
	url: string;
	image_url: string;
}

interface CachedData {
	timestamp: number;
	data: Article[];
}

const Home: NextPage = () => {
	const [stock, setStock] = useState<string>("");
	const [news, setNews] = useState<Article[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
	const [requestCount, setRequestCount] = useState<number>(0);
	const [timestamps, setTimestamps] = useState<number[]>([]);
	const router = useRouter();

	const RATE_LIMIT = 2;
	const TIME_WINDOW = 60 * 1000; // 1 hour

	useEffect(() => {
		// Check authentication status
		const checkAuth = async () => {
			setTimeout(() => {}, 1000);
			try {
				const response = await fetch("http://localhost:5000/api/protected", {
					credentials: "include",
				});
				if (response.ok) {
					setIsAuthenticated(true);
					console.log("Authenticated");
				} else {
					// Redirect to login page if not authenticated
					setIsAuthenticated(false);
					router.push("/login");
					console.log("Not Authenticated");
				}
			} catch (error) {
				console.error("Error checking authentication:", error);
				setIsAuthenticated(false);
			}
		};

		checkAuth();
	}, [router]);
	useEffect(() => {
		if (isAuthenticated && stock) {
			// Check for cached data on component mount
			const cachedNews = localStorage.getItem(`stockNews_${stock}`);
			if (cachedNews) {
				const { timestamp, data }: CachedData = JSON.parse(cachedNews);
				const now = new Date().getTime();
				const hoursSinceCached = (now - timestamp) / (1000 * 60 * 60);

				if (hoursSinceCached < 24) {
					setNews(data);
					toast.info(`Loaded cached news for ${stock}`);
				} else {
					localStorage.removeItem(`stockNews_${stock}`);
				}
			}
		}
	}, [stock, isAuthenticated]);
	const handleLogout = async () => {
		try {
			const response = await fetch("http://localhost:5000/api/logout", {
				method: "POST",
				credentials: "include",
			});
			if (response.ok) {
				setIsAuthenticated(false);
				router.push("/login");
			} else {
				throw new Error("Logout failed");
			}
		} catch (error) {
			console.error("Error during logout:", error);
			toast.error("Logout failed");
		}
	};

	const handleSearch = useCallback(
		async (searchTerm: string, numArticles: number) => {
			if (!isAuthenticated) {
				toast.error("Please log in to search for news");
				return;
			}

			setLoading(true);
			setNews([]);

			try {
				const response = await fetch(
					`http://localhost:5000/api/news?stock=${searchTerm}&num_articles=${numArticles}`,
					{
						credentials: "include",
					}
				);

				if (!response.ok) {
					if (response.status === 401) {
						router.push("/login");
						return;
					}
					if (response.status === 429) {
						toast.error("Rate limit exceeded");
						throw new Error("Rate limit exceeded");
					}
					throw new Error("Network response was not ok");
				}

				const data: Article[] = await response.json();
				setNews(data);

				// Cache the new data
				const cacheData: CachedData = {
					timestamp: new Date().getTime(),
					data: data,
				};
				localStorage.setItem(
					`stockNews_${searchTerm}`,
					JSON.stringify(cacheData)
				);
			} catch (error) {
				console.error("Error fetching news:", error);
				if (error instanceof Error) {
					toast.error(error.message);
				} else {
					toast.error("Failed to fetch news articles");
				}
			} finally {
				setLoading(false);
			}
		},
		[isAuthenticated, router]
	);

	if (!isAuthenticated) {
		return (
			<div className="flex justify-center items-center h-screen">
				<PulseLoader color="#2563EB" loading={true} size={15} />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-100">
			<Navbar
				onSearch={handleSearch}
				stock={stock}
				setStock={setStock}
				onLogout={handleLogout}
			/>
			<main className="container mx-auto px-4 py-8">
				<NewsArticles news={news} loading={loading} />
			</main>
			<ToastContainer position="bottom-right" />
		</div>
	);
};

export default Home;

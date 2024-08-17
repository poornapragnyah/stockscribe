"use client";

import React, { useState, useCallback, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Navbar, NewsArticles } from "../../components/NewsList";
import type { NextPage } from "next";

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

	useEffect(() => {
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
	}, [stock]);

	const handleSearch = useCallback(
		async (searchTerm: string, numArticles: number) => {
			setLoading(true);
			setNews([]);
			try {
				const cachedNews = localStorage.getItem(`stockNews_${searchTerm}`);
				if (cachedNews) {
					const { timestamp, data }: CachedData = JSON.parse(cachedNews);
					const now = new Date().getTime();
					const hoursSinceCached = (now - timestamp) / (1000 * 60);

					if (hoursSinceCached < 1) {
						setNews(data);
						setLoading(false);
						toast.info(`Loaded cached news for ${searchTerm}`);
						return;
					} else {
						localStorage.removeItem(`stockNews_${searchTerm}`);
					}
				}

				const response = await fetch(
					`http://localhost:5000/api/news?stock=${searchTerm}&num_articles=${numArticles}`
				);
				if (!response.ok) {
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

				setTimeout(() => {
					toast.success(`Found ${data.length} articles for ${searchTerm}`);
				}, data.length * 100 + 500);
			} catch (error) {
				console.error("Error fetching news:", error);
				toast.error("Failed to fetch news articles");
			} finally {
				setLoading(false);
			}
		},
		[]
	);

	return (
		<div className="min-h-screen bg-gray-100">
			<Navbar onSearch={handleSearch} stock={stock} setStock={setStock} />
			<main className="container mx-auto px-4 py-8">
				<NewsArticles news={news} loading={loading} />
			</main>
			<ToastContainer position="bottom-right" />
		</div>
	);
};

export default Home;

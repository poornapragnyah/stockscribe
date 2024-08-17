import React, { FormEvent, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Article {
	title: string;
	summary: string;
	url: string;
	image_url: string;
}
interface NewsArticlesProps {
	news: Article[];
	loading: boolean;
}

interface NavbarProps {
	onSearch: (searchTerm: string, numArticles: number) => void;
	stock: string;
	setStock: (value: string) => void;
}

interface NavbarProps {
	onSearch: (searchTerm: string, numArticles: number) => void;
	stock: string;
	setStock: (value: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSearch, stock, setStock }) => {
	const [numArticles, setNumArticles] = useState<number>(5);

	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		onSearch(stock, numArticles);
		toast.success("Search submitted successfully!");
	};

	return (
		<div className="navbar bg-base-100 p-2">
			<div className="flex-1">
				<a className="btn btn-ghost text-xl">Stock News Summariser</a>
			</div>
			<div className="flex-none gap-2">
				<div className="form-control">
					<form onSubmit={handleSubmit} className="flex items-center gap-2">
						<input
							type="text"
							value={stock}
							onChange={(e) => setStock(e.target.value)}
							placeholder="Enter stock name"
							className="input input-bordered w-24 md:w-auto"
						/>
						<select
							value={numArticles}
							onChange={(e) => setNumArticles(Number(e.target.value))}
							className="select select-bordered"
						>
							<option value="5">5 articles</option>
							<option value="10">10 articles</option>
							<option value="15">15 articles</option>
						</select>
						<button type="submit" className="btn btn-primary">
							Search
						</button>
					</form>
				</div>
				<div className="dropdown dropdown-end">
					<div
						tabIndex={0}
						role="button"
						className="btn btn-ghost btn-circle avatar"
					>
						<div className="w-10 rounded-full">
							<img alt="Tailwind CSS Navbar component" src="/p1.jpg" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
const NewsArticles: React.FC<NewsArticlesProps> = ({ news, loading }) => {
	return (
		<div className="space-y-4">
			{loading ? (
				<p className="text-center text-gray-600">Loading articles...</p>
			) : news.length === 0 ? (
				<p className="text-center text-gray-600">
					No articles found. Try searching for a stock symbol.
				</p>
			) : (
				news.map((article, index) => (
					<div
						key={index}
						className="bg-white shadow-md rounded-lg overflow-hidden transform transition-all duration-500 ease-in-out slide-in news-article"
						style={{ "--index": index } as React.CSSProperties}
					>
						<div className="md:flex">
							<div className="md:flex-shrink-0">
								<img
									className="h-48 w-full object-cover md:w-48"
									src={article.image_url}
									alt={article.title}
								/>
							</div>
							<div className="p-8">
								<a
									href={article.url}
									target="_blank"
									rel="noopener noreferrer"
									className="block mt-1 text-lg leading-tight font-medium text-black hover:underline"
								>
									{article.title}
								</a>
								<p className="mt-2 text-gray-500">{article.summary}</p>
							</div>
						</div>
					</div>
				))
			)}
		</div>
	);
};

export { Navbar, NewsArticles };

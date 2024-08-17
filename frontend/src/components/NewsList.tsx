import React, { FormEvent, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { PulseLoader } from "react-spinners";
import Image from "next/image";
import logo from "../../public/logo.png";
import { useRouter } from "next/navigation";

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
	onLogout: () => void; // New prop for logout functionality
}

const Navbar: React.FC<NavbarProps> = ({
	onSearch,
	stock,
	setStock,
	onLogout,
}) => {
	const [numArticles, setNumArticles] = useState<number>(5);
	const router = useRouter();

	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		onSearch(stock, numArticles);
		toast.success("Search submitted successfully!");
	};

	const handleLogout = async () => {
		try {
			await onLogout();
			toast.success("Logged out successfully");
			router.push("/login");
		} catch (error) {
			console.error("Logout error:", error);
			toast.error("Logout failed. Please try again.");
		}
	};

	return (
		<div className="navbar bg-base-100 p-2">
			<div className="flex-1">
				<a className="btn btn-ghost text-xl">
					<Image src={logo} alt="logo" height={26}></Image>StockScribe
				</a>
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
						<button
							type="submit"
							className="btn btn-primary text disabled:btn-primary disabled:cursor-not-allowed text-slate-50 disabled:text-white"
							disabled={stock === ""}
						>
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
							<img alt="profile picture" src="/p1.jpg" />
						</div>
					</div>
					<ul
						tabIndex={0}
						className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52"
					>
						<li>
							<a onClick={handleLogout}>Logout</a>
						</li>
					</ul>
				</div>
			</div>
		</div>
	);
};

export default Navbar;
const NewsArticles: React.FC<NewsArticlesProps> = ({ news, loading }) => {
	return (
		<div className="space-y-4">
			{loading ? (
				<p className="text-center text-gray-600 ">
					{" "}
					<div className="spinner-container">
						<PulseLoader color="#7480ff" />
					</div>
					Loading articles...
				</p>
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

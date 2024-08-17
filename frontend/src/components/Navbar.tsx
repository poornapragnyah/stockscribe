import React, { FormEvent } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface NavbarProps {
	onSearch: (searchTerm: string) => void; // Adjust the return type as needed
	stock: string;
	setStock: (value: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSearch, stock, setStock }) => {
	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		onSearch(stock);
		toast.success("Search submitted successfully!"); // Triggering the toast
	};

	return (
		<div className="navbar bg-base-100">
			<ToastContainer /> {/* Toast container */}
			<div className="flex-1">
				<a className="btn btn-ghost text-xl">Stock News Summariser</a>
			</div>
			<div className="flex-none gap-2">
				<div className="form-control">
					<form onSubmit={handleSubmit}>
						<input
							type="text"
							value={stock}
							onChange={(e) => setStock(e.target.value)}
							placeholder="Enter stock name"
							className="input input-bordered w-24 md:w-auto"
						/>
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

export default Navbar;

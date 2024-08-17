import React, { FormEvent } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface NavbarProps {
	onSearch: (searchTerm: string) => void;
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
		<div className="navbar bg-base-100 p-4">
			<ToastContainer />
			<div className="flex items-center justify-between">
				<div className="flex-1">
					<a className="btn btn-ghost text-xl">StockScribe</a>
				</div>
				<div className="flex items-center gap-4">
					<div className="form-control flex-1">
						<form onSubmit={handleSubmit} className="flex flex-col md:flex-row">
							<input
								type="text"
								value={stock}
								onChange={(e) => setStock(e.target.value)}
								placeholder="Enter stock name"
								className="input input-bordered w-full md:w-64"
							/>
							<button
								type="submit"
								className="btn btn-primary mt-2 md:mt-0 md:ml-2"
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
								<img alt="profile-pic" src="/p1.jpg" />
							</div>
						</div>
						{/* Add dropdown menu if needed */}
					</div>
				</div>
			</div>
		</div>
	);
};

export default Navbar;

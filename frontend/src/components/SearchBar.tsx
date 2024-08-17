import { useState, FormEvent } from 'react'

interface SearchBarProps {
  onSearch: (stock: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [stock, setStock] = useState('')

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSearch(stock)
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      <input
        type="text"
        value={stock}
        onChange={(e) => setStock(e.target.value)}
        placeholder="Enter stock name"
        className="input w-full max-w-xs"
      />
      <button type="submit" className="btn bg-neutral-50">Search</button>
    </form>
  )
}
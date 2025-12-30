'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

interface SearchBarProps {
  initialQuery?: string;
  className?: string;
  size?: 'default' | 'large';
}

export default function SearchBar({
  initialQuery = '',
  className = '',
  size = 'default',
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const inputClasses =
    size === 'large'
      ? 'py-4 pl-14 pr-4 text-lg'
      : 'py-2 pl-10 pr-4 text-sm';

  const iconClasses =
    size === 'large'
      ? 'h-6 w-6 left-4'
      : 'h-5 w-5 left-3';

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <Search
        className={`absolute ${iconClasses} top-1/2 -translate-y-1/2 text-gray-400`}
      />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search transcripts by meaning..."
        className={`w-full ${inputClasses} border border-gray-300 dark:border-gray-600 rounded-lg
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                   placeholder-gray-400 dark:placeholder-gray-500
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                   transition-shadow`}
      />
    </form>
  );
}

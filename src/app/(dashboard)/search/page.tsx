'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter, X, Calendar, User } from 'lucide-react';
import TranscriptCard from '@/components/TranscriptCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { TranscriptWithTopics, Topic } from '@/types/database';

interface SearchResult extends TranscriptWithTopics {
  similarity?: number | null;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [selectedTopic, setSelectedTopic] = useState(searchParams.get('topic') || '');
  const [startDate, setStartDate] = useState(searchParams.get('start') || '');
  const [endDate, setEndDate] = useState(searchParams.get('end') || '');
  const [speaker, setSpeaker] = useState(searchParams.get('speaker') || '');

  // Fetch topics for filter
  useEffect(() => {
    async function fetchTopics() {
      try {
        const res = await fetch('/api/topics');
        if (res.ok) {
          const { topics } = await res.json();
          setTopics(topics || []);
        }
      } catch {
        console.error('Failed to fetch topics');
      }
    }
    fetchTopics();
  }, []);

  const doSearch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (selectedTopic) params.set('topic', selectedTopic);
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);
      if (speaker) params.set('speaker', speaker);

      const res = await fetch(`/api/search?${params.toString()}`);
      if (res.ok) {
        const { results } = await res.json();
        setResults(results || []);
      }
    } catch {
      console.error('Search failed');
    } finally {
      setLoading(false);
    }
  }, [query, selectedTopic, startDate, endDate, speaker]);

  // Initial search on mount if there's a query
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      doSearch();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Update URL
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (selectedTopic) params.set('topic', selectedTopic);
    if (startDate) params.set('start', startDate);
    if (endDate) params.set('end', endDate);
    if (speaker) params.set('speaker', speaker);
    router.push(`/search?${params.toString()}`);
    doSearch();
  };

  const clearFilters = () => {
    setSelectedTopic('');
    setStartDate('');
    setEndDate('');
    setSpeaker('');
  };

  const hasActiveFilters = selectedTopic || startDate || endDate || speaker;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Search Transcripts
      </h1>

      {/* Search form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by meaning... (e.g., 'pricing strategy discussions')"
              className="w-full py-3 pl-12 pr-4 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       placeholder-gray-400 dark:placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 border rounded-lg flex items-center gap-2 transition-colors
              ${
                hasActiveFilters
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
          >
            <Filter className="h-5 w-5" />
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            )}
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Search
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Filters</h3>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Topic
                </label>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All topics</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  From Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  To Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  Speaker
                </label>
                <input
                  type="text"
                  value={speaker}
                  onChange={(e) => setSpeaker(e.target.value)}
                  placeholder="e.g., Brian"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           placeholder-gray-400 dark:placeholder-gray-500
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="large" />
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Found {results.length} result{results.length !== 1 ? 's' : ''}
          </p>
          {results.map((result) => (
            <TranscriptCard
              key={result.id}
              transcript={result}
              similarity={result.similarity}
            />
          ))}
        </div>
      ) : query || hasActiveFilters ? (
        <EmptyState
          icon={Search}
          title="No results found"
          description="Try adjusting your search query or filters"
        />
      ) : (
        <EmptyState
          icon={Search}
          title="Search your transcripts"
          description="Enter a search query to find transcripts by meaning, or use filters to browse"
        />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="large" className="py-12" />}>
      <SearchPageContent />
    </Suspense>
  );
}

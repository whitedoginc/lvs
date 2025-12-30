'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Tag, Calendar, Upload, ArrowRight } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import TranscriptCard from '@/components/TranscriptCard';
import StatCard from '@/components/StatCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import TopicBadge from '@/components/TopicBadge';
import { DashboardStats, Topic } from '@/types/database';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, topicsRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/topics'),
        ]);

        if (!statsRes.ok || !topicsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const statsData = await statsRes.json();
        const topicsData = await topicsRes.json();

        setStats(statsData);
        setTopics(topicsData.topics || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Your transcript knowledge base
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg
                     hover:bg-blue-700 transition-colors font-medium"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Transcript
        </Link>
      </div>

      {/* Search bar */}
      <SearchBar size="large" />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Transcripts"
          value={stats?.total_transcripts || 0}
          icon={FileText}
        />
        <StatCard
          label="Topics"
          value={stats?.total_topics || 0}
          icon={Tag}
        />
        <StatCard
          label="This Month"
          value={stats?.this_month_transcripts || 0}
          icon={Calendar}
        />
      </div>

      {/* Topic cloud */}
      {topics.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Topics
            </h2>
            <Link
              href="/topics"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              View all
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {topics.slice(0, 15).map((topic) => (
              <TopicBadge key={topic.id} topic={topic} />
            ))}
          </div>
        </div>
      )}

      {/* Recent transcripts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Transcripts
          </h2>
          <Link
            href="/search"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
          >
            View all
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        {stats?.recent_transcripts && stats.recent_transcripts.length > 0 ? (
          <div className="grid gap-4">
            {stats.recent_transcripts.map((transcript) => (
              <TranscriptCard key={transcript.id} transcript={transcript} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="No transcripts yet"
            description="Upload your first transcript to get started with your knowledge base."
            action={
              <Link
                href="/upload"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg
                           hover:bg-blue-700 transition-colors font-medium"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Transcript
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}

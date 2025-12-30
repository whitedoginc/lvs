'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  User,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import TopicBadge from '@/components/TopicBadge';
import LoadingSpinner from '@/components/LoadingSpinner';
import { TranscriptWithTopics } from '@/types/database';

export default function TranscriptPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [transcript, setTranscript] = useState<TranscriptWithTopics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRawContent, setShowRawContent] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchTranscript() {
      try {
        const res = await fetch(`/api/transcripts/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Transcript not found');
          }
          throw new Error('Failed to fetch transcript');
        }
        const { transcript } = await res.json();
        setTranscript(transcript);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchTranscript();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this transcript? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/transcripts/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to delete transcript');
      }
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !transcript) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{error || 'Transcript not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400
                     hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors
                     disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete
          </button>
        </div>
      </div>

      {/* Title and metadata */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {transcript.title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          {transcript.recorded_date && (
            <span className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Recorded: {format(new Date(transcript.recorded_date), 'MMMM d, yyyy')}
            </span>
          )}
          <span className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            Uploaded: {format(new Date(transcript.uploaded_at), 'MMMM d, yyyy')}
          </span>
        </div>
      </div>

      {/* Topics */}
      {transcript.topics && transcript.topics.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Topics
          </h2>
          <div className="flex flex-wrap gap-2">
            {transcript.topics.map((topic) => (
              <TopicBadge key={topic.id} topic={topic} />
            ))}
          </div>
        </div>
      )}

      {/* Speakers */}
      {transcript.speakers && transcript.speakers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Speakers
          </h2>
          <div className="flex flex-wrap gap-2">
            {transcript.speakers.map((speaker, i) => (
              <span
                key={i}
                className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300"
              >
                <User className="h-3 w-3 mr-1" />
                {speaker}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {transcript.summary && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Summary
          </h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {transcript.summary}
          </p>
        </div>
      )}

      {/* Key Points */}
      {transcript.key_points && transcript.key_points.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Key Points
          </h2>
          <ul className="space-y-2">
            {transcript.key_points.map((point, i) => (
              <li key={i} className="flex items-start">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-sm flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-gray-700 dark:text-gray-300">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Items */}
      {transcript.action_items && transcript.action_items.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Action Items
          </h2>
          <ul className="space-y-2">
            {transcript.action_items.map((item, i) => (
              <li key={i} className="flex items-start">
                <input
                  type="checkbox"
                  className="mt-1 mr-3 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700 dark:text-gray-300">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notable Quotes */}
      {transcript.quotes && transcript.quotes.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Notable Quotes
          </h2>
          <div className="space-y-4">
            {transcript.quotes.map((quote, i) => (
              <blockquote
                key={i}
                className="border-l-4 border-blue-500 pl-4 py-2"
              >
                <p className="text-gray-700 dark:text-gray-300 italic">
                  &ldquo;{quote}&rdquo;
                </p>
              </blockquote>
            ))}
          </div>
        </div>
      )}

      {/* Raw Content (collapsible) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowRawContent(!showRawContent)}
          className="w-full px-6 py-4 flex items-center justify-between text-left
                   hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Full Transcript
          </h2>
          {showRawContent ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>
        {showRawContent && (
          <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700">
            <pre className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-x-auto text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
              {transcript.raw_content}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

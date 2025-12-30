'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  X,
  FileText,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import { TopicWithCount, Transcript } from '@/types/database';

interface TopicWithTranscripts extends TopicWithCount {
  transcripts?: Transcript[];
}

function TopicsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedId = searchParams.get('id');

  const [topics, setTopics] = useState<TopicWithCount[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicWithTranscripts | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTopic, setLoadingTopic] = useState(false);

  // Create/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TopicWithCount | null>(null);
  const [topicName, setTopicName] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all topics
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
      } finally {
        setLoading(false);
      }
    }
    fetchTopics();
  }, []);

  // Fetch selected topic details
  useEffect(() => {
    async function fetchTopicDetails() {
      if (!selectedId) {
        setSelectedTopic(null);
        return;
      }

      setLoadingTopic(true);
      try {
        const res = await fetch(`/api/topics/${selectedId}`);
        if (res.ok) {
          const { topic } = await res.json();
          setSelectedTopic(topic);
        }
      } catch {
        console.error('Failed to fetch topic details');
      } finally {
        setLoadingTopic(false);
      }
    }
    fetchTopicDetails();
  }, [selectedId]);

  const openCreateModal = () => {
    setEditingTopic(null);
    setTopicName('');
    setTopicDescription('');
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (topic: TopicWithCount) => {
    setEditingTopic(topic);
    setTopicName(topic.name);
    setTopicDescription(topic.description || '');
    setError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!topicName.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = editingTopic
        ? `/api/topics/${editingTopic.id}`
        : '/api/topics';
      const method = editingTopic ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: topicName.trim(),
          description: topicDescription.trim() || null,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Failed to save topic');
      }

      // Refresh topics list
      const topicsRes = await fetch('/api/topics');
      if (topicsRes.ok) {
        const { topics } = await topicsRes.json();
        setTopics(topics || []);
      }

      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (topic: TopicWithCount) => {
    if (topic.name === 'Uncategorized') {
      alert('Cannot delete the Uncategorized topic');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${topic.name}"? Transcripts will be unassigned from this topic.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/topics/${topic.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete topic');
      }

      // Refresh topics list
      const topicsRes = await fetch('/api/topics');
      if (topicsRes.ok) {
        const { topics } = await topicsRes.json();
        setTopics(topics || []);
      }

      // Clear selection if deleted topic was selected
      if (selectedId === topic.id) {
        router.push('/topics');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete topic');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Topics</h1>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg
                     hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Topic
        </button>
      </div>

      {topics.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No topics yet"
          description="Topics are created automatically when you process transcripts, or you can create them manually."
          action={
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg
                         hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Topic
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Topics list */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className={`flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0
                    ${selectedId === topic.id ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-750'}`}
                >
                  <button
                    onClick={() => router.push(`/topics?id=${topic.id}`)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center">
                      <Tag className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {topic.name}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-6">
                      {topic.transcript_count} transcript{topic.transcript_count !== 1 ? 's' : ''}
                    </span>
                  </button>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => openEditModal(topic)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {topic.name !== 'Uncategorized' && (
                      <button
                        onClick={() => handleDelete(topic)}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Topic details */}
          <div className="lg:col-span-2">
            {loadingTopic ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : selectedTopic ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                      {selectedTopic.name}
                    </h2>
                    {selectedTopic.description && (
                      <p className="text-gray-500 dark:text-gray-400">
                        {selectedTopic.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => router.push('/topics')}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
                  Transcripts ({selectedTopic.transcripts?.length || 0})
                </h3>

                {selectedTopic.transcripts && selectedTopic.transcripts.length > 0 ? (
                  <div className="space-y-3">
                    {selectedTopic.transcripts.map((transcript) => (
                      <Link
                        key={transcript.id}
                        href={`/transcript/${transcript.id}`}
                        className="block p-3 border border-gray-200 dark:border-gray-600 rounded-lg
                                 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                      >
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {transcript.title}
                          </span>
                        </div>
                        {transcript.summary && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                            {transcript.summary}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {format(new Date(transcript.uploaded_at), 'MMM d, yyyy')}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No transcripts in this topic yet.
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                <Tag className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Select a topic to view its transcripts
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingTopic ? 'Edit Topic' : 'Create Topic'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  placeholder="e.g., Marketing Strategy"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={topicDescription}
                  onChange={(e) => setTopicDescription(e.target.value)}
                  rows={3}
                  placeholder="A brief description of this topic..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && (
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingTopic ? 'Save Changes' : 'Create Topic'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TopicsPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="large" className="py-12" />}>
      <TopicsPageContent />
    </Suspense>
  );
}

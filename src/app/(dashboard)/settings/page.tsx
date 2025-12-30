'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { User, Mail, Calendar, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import LoadingSpinner from '@/components/LoadingSpinner';

interface UserProfile {
  id: string;
  email: string;
  created_at: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUser({
          id: user.id,
          email: user.email || '',
          created_at: user.created_at,
        });
      }
      setLoading(false);
    }
    fetchUser();
  }, [supabase.auth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Settings
      </h1>

      {/* Profile Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <User className="h-5 w-5 mr-2" />
          Profile
        </h2>

        <div className="space-y-4">
          <div className="flex items-center py-3 border-b border-gray-100 dark:border-gray-700">
            <Mail className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
              <p className="text-gray-900 dark:text-white">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center py-3 border-b border-gray-100 dark:border-gray-700">
            <Calendar className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Member since</p>
              <p className="text-gray-900 dark:text-white">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Unknown'}
              </p>
            </div>
          </div>

          <div className="flex items-center py-3">
            <Shield className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">User ID</p>
              <p className="text-gray-900 dark:text-white font-mono text-sm">
                {user?.id}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          About Transcript Vault
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          A personal knowledge base for storing, processing, and searching conversation transcripts
          using AI-powered analysis and semantic search.
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <p>Powered by:</p>
          <ul className="list-disc list-inside ml-2">
            <li>Claude AI for transcript analysis</li>
            <li>OpenAI embeddings for semantic search</li>
            <li>Supabase for database and auth</li>
            <li>Next.js for the web application</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

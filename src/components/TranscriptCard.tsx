import Link from 'next/link';
import { format } from 'date-fns';
import { TranscriptWithTopics } from '@/types/database';
import TopicBadge from './TopicBadge';
import { FileText, Calendar, Clock } from 'lucide-react';

interface TranscriptCardProps {
  transcript: TranscriptWithTopics;
  similarity?: number | null;
}

export default function TranscriptCard({
  transcript,
  similarity,
}: TranscriptCardProps) {
  const displayDate = transcript.recorded_date
    ? format(new Date(transcript.recorded_date), 'MMM d, yyyy')
    : format(new Date(transcript.uploaded_at), 'MMM d, yyyy');

  const uploadedDate = format(new Date(transcript.uploaded_at), 'MMM d, yyyy');

  return (
    <Link
      href={`/transcript/${transcript.id}`}
      className="block p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700
                 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center">
          <FileText className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white line-clamp-1">
            {transcript.title}
          </h3>
        </div>
        {similarity !== null && similarity !== undefined && (
          <span className="ml-2 px-2 py-1 text-xs font-medium rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            {Math.round(similarity * 100)}% match
          </span>
        )}
      </div>

      {transcript.summary && (
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
          {transcript.summary}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {transcript.topics?.slice(0, 4).map((topic) => (
          <TopicBadge key={topic.id} topic={topic} clickable={false} />
        ))}
        {transcript.topics && transcript.topics.length > 4 && (
          <span className="text-xs text-gray-500">
            +{transcript.topics.length - 4} more
          </span>
        )}
      </div>

      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-4">
        {transcript.recorded_date && (
          <span className="flex items-center">
            <Calendar className="h-3.5 w-3.5 mr-1" />
            Recorded: {displayDate}
          </span>
        )}
        <span className="flex items-center">
          <Clock className="h-3.5 w-3.5 mr-1" />
          Uploaded: {uploadedDate}
        </span>
      </div>
    </Link>
  );
}

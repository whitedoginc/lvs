import Link from 'next/link';
import { Topic } from '@/types/database';

interface TopicBadgeProps {
  topic: Topic;
  clickable?: boolean;
  onRemove?: () => void;
}

export default function TopicBadge({
  topic,
  clickable = true,
  onRemove,
}: TopicBadgeProps) {
  const baseClasses =
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';

  if (clickable) {
    return (
      <Link
        href={`/topics?id=${topic.id}`}
        className={`${baseClasses} hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors`}
      >
        {topic.name}
      </Link>
    );
  }

  return (
    <span className={baseClasses}>
      {topic.name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full
                     hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
        >
          ×
        </button>
      )}
    </span>
  );
}

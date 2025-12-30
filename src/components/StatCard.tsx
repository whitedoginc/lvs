import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  trend?: string;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend,
}: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
            {value}
          </p>
          {trend && (
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
              {trend}
            </p>
          )}
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    </div>
  );
}

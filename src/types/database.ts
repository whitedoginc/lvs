export interface Transcript {
  id: string;
  title: string;
  raw_content: string;
  summary: string | null;
  key_points: string[];
  action_items: string[];
  quotes: string[];
  speakers: string[];
  recorded_date: string | null;
  uploaded_at: string;
  uploaded_by: string | null;
  processed: boolean;
  processing_error: string | null;
}

export interface Topic {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface TranscriptTopic {
  transcript_id: string;
  topic_id: string;
  relevance_score: number | null;
}

export interface TranscriptWithTopics extends Transcript {
  topics: Topic[];
}

export interface TopicWithCount extends Topic {
  transcript_count: number;
}

export interface SearchResult {
  id: string;
  title: string;
  summary: string | null;
  key_points: string[];
  recorded_date: string | null;
  uploaded_at: string;
  similarity: number;
}

export interface ProcessedTranscript {
  title: string;
  summary: string;
  key_points: string[];
  action_items: string[];
  quotes: string[];
  speakers: string[];
  suggested_topics: string[];
}

export interface User {
  id: string;
  email: string;
}

export interface DashboardStats {
  total_transcripts: number;
  total_topics: number;
  this_month_transcripts: number;
  recent_transcripts: TranscriptWithTopics[];
}

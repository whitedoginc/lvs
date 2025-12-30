'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Calendar, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ProcessedTranscript } from '@/types/database';

type UploadStep = 'input' | 'processing' | 'review' | 'saving';

export default function UploadPage() {
  const router = useRouter();
  const [step, setStep] = useState<UploadStep>('input');
  const [content, setContent] = useState('');
  const [recordedDate, setRecordedDate] = useState('');
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ProcessedTranscript | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setContent(text);
    };
    reader.readAsText(file);
  }, []);

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('Please enter or upload transcript content');
      return;
    }

    setError(null);
    setStep('processing');

    try {
      // Step 1: Save raw content
      const createRes = await fetch('/api/transcripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_content: content,
          recorded_date: recordedDate || null,
        }),
      });

      if (!createRes.ok) {
        throw new Error('Failed to save transcript');
      }

      const { transcript } = await createRes.json();
      setTranscriptId(transcript.id);

      // Step 2: Process with AI
      const processRes = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptId: transcript.id }),
      });

      if (!processRes.ok) {
        throw new Error('Failed to process transcript');
      }

      const { analysis: processedAnalysis } = await processRes.json();
      setAnalysis(processedAnalysis);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStep('input');
    }
  };

  const handleSave = async () => {
    if (!transcriptId) return;

    setStep('saving');

    try {
      // Update with any user modifications (if we add edit capability later)
      // For now, just navigate to the transcript
      router.push(`/transcript/${transcriptId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setStep('review');
    }
  };

  const handleStartOver = () => {
    setStep('input');
    setContent('');
    setRecordedDate('');
    setTranscriptId(null);
    setAnalysis(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Upload Transcript
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Paste or upload a transcript to process and catalog
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center mb-8">
        {['input', 'processing', 'review'].map((s, index) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${
                  step === s
                    ? 'bg-blue-600 text-white'
                    : ['processing', 'review'].indexOf(step) > ['input', 'processing', 'review'].indexOf(s)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
            >
              {['processing', 'review', 'saving'].indexOf(step) > ['input', 'processing', 'review'].indexOf(s) ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                index + 1
              )}
            </div>
            {index < 2 && (
              <div
                className={`w-20 h-1 mx-2
                  ${
                    ['processing', 'review', 'saving'].indexOf(step) > index
                      ? 'bg-green-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Step 1: Input */}
      {step === 'input' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Transcript Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={15}
              placeholder="Paste your transcript here..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       placeholder-gray-400 dark:placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       font-mono text-sm"
            />

            <div className="mt-4 flex items-center gap-4">
              <label
                className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg
                         text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600
                         cursor-pointer transition-colors"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload File
                <input
                  type="file"
                  accept=".txt,.md"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Supports .txt and .md files
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="h-4 w-4 inline mr-2" />
              When was this recorded? (optional)
            </label>
            <input
              type="date"
              value={recordedDate}
              onChange={(e) => setRecordedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!content.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
          >
            Process Transcript
          </button>
        </div>
      )}

      {/* Step 2: Processing */}
      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            Processing your transcript...
          </p>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            This may take a minute while we analyze the content
          </p>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 'review' && analysis && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {analysis.title}
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Summary
                </h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {analysis.summary}
                </p>
              </div>

              {analysis.key_points.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Key Points
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                    {analysis.key_points.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.action_items.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Action Items
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                    {analysis.action_items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.quotes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Notable Quotes
                  </h3>
                  <div className="space-y-2">
                    {analysis.quotes.map((quote, i) => (
                      <blockquote
                        key={i}
                        className="border-l-4 border-blue-500 pl-4 italic text-gray-600 dark:text-gray-400"
                      >
                        &ldquo;{quote}&rdquo;
                      </blockquote>
                    ))}
                  </div>
                </div>
              )}

              {analysis.speakers.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Speakers
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.speakers.map((speaker, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300"
                      >
                        {speaker}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.suggested_topics.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Topics
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.suggested_topics.map((topic, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm text-blue-700 dark:text-blue-300"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleStartOver}
              className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                       text-gray-700 dark:text-gray-300 font-medium
                       hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Start Over
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium
                       hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Save & View
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Saving */}
      {step === 'saving' && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            Saving...
          </p>
        </div>
      )}
    </div>
  );
}

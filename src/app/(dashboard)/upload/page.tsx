'use client';

export const dynamic = 'force-dynamic';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Calendar, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { ProcessedTranscript } from '@/types/database';
import * as mammoth from 'mammoth';

type FileStatus = 'pending' | 'reading' | 'saving' | 'processing' | 'done' | 'error';

interface UploadedFile {
  id: string;
  name: string;
  content: string;
  status: FileStatus;
  transcriptId?: string;
  error?: string;
}

type UploadStep = 'input' | 'processing' | 'review' | 'complete';

export default function UploadPage() {
  const router = useRouter();
  const [step, setStep] = useState<UploadStep>('input');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [recordedDate, setRecordedDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // For single file review mode
  const [singleFileAnalysis, setSingleFileAnalysis] = useState<ProcessedTranscript | null>(null);
  const [singleFileTranscriptId, setSingleFileTranscriptId] = useState<string | null>(null);

  // For paste mode
  const [pastedContent, setPastedContent] = useState('');

  const extractTextFromPdf = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    // Dynamic import to avoid SSR issues
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const textParts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      textParts.push(pageText);
    }

    return textParts.join('\n\n');
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'pdf') {
      const arrayBuffer = await file.arrayBuffer();
      return await extractTextFromPdf(arrayBuffer);
    } else if (extension === 'docx') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } else {
      return await file.text();
    }
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoadingFiles(true);
    setError(null);

    try {
      const fileArray = Array.from(files);
      const newFiles: UploadedFile[] = [];

      for (const file of fileArray) {
        const id = `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        try {
          const content = await extractTextFromFile(file);
          newFiles.push({
            id,
            name: file.name,
            content,
            status: 'pending',
          });
        } catch (err) {
          newFiles.push({
            id,
            name: file.name,
            content: '',
            status: 'error',
            error: err instanceof Error ? err.message : 'Failed to read file',
          });
        }
      }

      setUploadedFiles((prev) => [...prev, ...newFiles]);
    } catch (err) {
      setError(`Failed to read files: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoadingFiles(false);
      // Reset the input so the same file can be selected again
      e.target.value = '';
    }
  }, []);

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFileStatus = (id: string, updates: Partial<UploadedFile>) => {
    setUploadedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const processFile = async (file: UploadedFile): Promise<void> => {
    // Step 1: Save raw content
    updateFileStatus(file.id, { status: 'saving' });

    const createRes = await fetch('/api/transcripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_content: file.content,
        recorded_date: recordedDate || null,
      }),
    });

    if (!createRes.ok) {
      throw new Error('Failed to save transcript');
    }

    const { transcript } = await createRes.json();
    updateFileStatus(file.id, { status: 'processing', transcriptId: transcript.id });

    // Step 2: Process with AI
    const processRes = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcriptId: transcript.id }),
    });

    if (!processRes.ok) {
      throw new Error('Failed to process transcript');
    }

    return await processRes.json();
  };

  const handleSubmit = async () => {
    // Determine what we're processing
    const hasFiles = uploadedFiles.filter((f) => f.status === 'pending' && f.content).length > 0;
    const hasPastedContent = pastedContent.trim().length > 0;

    if (!hasFiles && !hasPastedContent) {
      setError('Please upload files or paste transcript content');
      return;
    }

    setError(null);
    setStep('processing');

    // If only pasted content (no files), treat it as a single "file"
    let filesToProcess = uploadedFiles.filter((f) => f.status === 'pending' && f.content);

    if (hasPastedContent && filesToProcess.length === 0) {
      const pastedFile: UploadedFile = {
        id: `pasted-${Date.now()}`,
        name: 'Pasted Content',
        content: pastedContent,
        status: 'pending',
      };
      filesToProcess = [pastedFile];
      setUploadedFiles([pastedFile]);
    }

    // Single file/paste: use review flow
    if (filesToProcess.length === 1) {
      const file = filesToProcess[0];
      try {
        updateFileStatus(file.id, { status: 'saving' });

        const createRes = await fetch('/api/transcripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            raw_content: file.content,
            recorded_date: recordedDate || null,
          }),
        });

        if (!createRes.ok) {
          throw new Error('Failed to save transcript');
        }

        const { transcript } = await createRes.json();
        updateFileStatus(file.id, { status: 'processing', transcriptId: transcript.id });
        setSingleFileTranscriptId(transcript.id);

        const processRes = await fetch('/api/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcriptId: transcript.id }),
        });

        if (!processRes.ok) {
          throw new Error('Failed to process transcript');
        }

        const { analysis } = await processRes.json();
        updateFileStatus(file.id, { status: 'done' });
        setSingleFileAnalysis(analysis);
        setStep('review');
      } catch (err) {
        updateFileStatus(file.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Processing failed'
        });
        setError(err instanceof Error ? err.message : 'An error occurred');
        setStep('input');
      }
      return;
    }

    // Multiple files: process all and go to complete
    for (const file of filesToProcess) {
      try {
        await processFile(file);
        updateFileStatus(file.id, { status: 'done' });
      } catch (err) {
        updateFileStatus(file.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Processing failed'
        });
      }
    }

    setStep('complete');
  };

  const handleSaveAndView = async () => {
    if (!singleFileTranscriptId) return;
    router.push(`/transcript/${singleFileTranscriptId}`);
  };

  const handleStartOver = () => {
    setStep('input');
    setUploadedFiles([]);
    setPastedContent('');
    setRecordedDate('');
    setSingleFileAnalysis(null);
    setSingleFileTranscriptId(null);
    setError(null);
  };

  const handleGoToDashboard = () => {
    router.push('/');
  };

  const pendingFiles = uploadedFiles.filter((f) => f.status === 'pending' && f.content);
  const hasContent = pendingFiles.length > 0 || pastedContent.trim().length > 0;

  const getStatusIcon = (status: FileStatus) => {
    switch (status) {
      case 'pending':
        return <FileText className="h-4 w-4 text-gray-400" />;
      case 'reading':
      case 'saving':
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'done':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = (status: FileStatus) => {
    switch (status) {
      case 'pending':
        return 'Ready';
      case 'reading':
        return 'Reading...';
      case 'saving':
        return 'Saving...';
      case 'processing':
        return 'Processing with AI...';
      case 'done':
        return 'Complete';
      case 'error':
        return 'Failed';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Upload Transcripts
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Upload one or more transcripts to process and catalog
        </p>
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
          {/* File Upload Area */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Upload Files
            </label>

            <label
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer
                       border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500
                       bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700
                       transition-colors ${isLoadingFiles ? 'opacity-50 cursor-wait' : ''}`}
            >
              {isLoadingFiles ? (
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              ) : (
                <>
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    .txt, .md, .docx, .pdf (multiple files allowed)
                  </p>
                </>
              )}
              <input
                type="file"
                accept=".txt,.md,.docx,.pdf"
                onChange={handleFileUpload}
                disabled={isLoadingFiles}
                multiple
                className="hidden"
              />
            </label>

            {/* File List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(file.status)}
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[300px]">
                        {file.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {getStatusText(file.status)}
                      </span>
                    </div>
                    {file.status === 'pending' && (
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {file.status === 'error' && file.error && (
                      <span className="text-xs text-red-500">{file.error}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Paste Area - only show if no files uploaded */}
          {uploadedFiles.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Or Paste Content
              </label>
              <textarea
                value={pastedContent}
                onChange={(e) => setPastedContent(e.target.value)}
                rows={10}
                placeholder="Paste your transcript here..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         placeholder-gray-400 dark:placeholder-gray-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         font-mono text-sm"
              />
            </div>
          )}

          {/* Date picker */}
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
            disabled={!hasContent}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
          >
            {pendingFiles.length > 1
              ? `Process ${pendingFiles.length} Transcripts`
              : 'Process Transcript'}
          </button>
        </div>
      )}

      {/* Step 2: Processing */}
      {step === 'processing' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Processing Transcripts
            </h2>
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(file.status)}
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[300px]">
                      {file.name}
                    </span>
                  </div>
                  <span className={`text-xs ${
                    file.status === 'error' ? 'text-red-500' :
                    file.status === 'done' ? 'text-green-500' :
                    'text-gray-500 dark:text-gray-400'
                  }`}>
                    {file.status === 'error' ? file.error : getStatusText(file.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review (single file only) */}
      {step === 'review' && singleFileAnalysis && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {singleFileAnalysis.title}
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Summary
                </h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {singleFileAnalysis.summary}
                </p>
              </div>

              {singleFileAnalysis.key_points.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Key Points
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                    {singleFileAnalysis.key_points.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {singleFileAnalysis.action_items.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Action Items
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                    {singleFileAnalysis.action_items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {singleFileAnalysis.quotes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Notable Quotes
                  </h3>
                  <div className="space-y-2">
                    {singleFileAnalysis.quotes.map((quote, i) => (
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

              {singleFileAnalysis.speakers.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Speakers
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {singleFileAnalysis.speakers.map((speaker, i) => (
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

              {singleFileAnalysis.suggested_topics.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Topics
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {singleFileAnalysis.suggested_topics.map((topic, i) => (
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
              Upload More
            </button>
            <button
              onClick={handleSaveAndView}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium
                       hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              View Transcript
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Complete (multiple files) */}
      {step === 'complete' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Processing Complete
              </h2>
            </div>

            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(file.status)}
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[300px]">
                      {file.name}
                    </span>
                  </div>
                  {file.status === 'done' && file.transcriptId && (
                    <button
                      onClick={() => router.push(`/transcript/${file.transcriptId}`)}
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      View
                    </button>
                  )}
                  {file.status === 'error' && (
                    <span className="text-xs text-red-500">{file.error}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {uploadedFiles.filter((f) => f.status === 'done').length} of {uploadedFiles.length} transcripts processed successfully
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleStartOver}
              className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                       text-gray-700 dark:text-gray-300 font-medium
                       hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Upload More
            </button>
            <button
              onClick={handleGoToDashboard}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium
                       hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

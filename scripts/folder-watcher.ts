import chokidar from 'chokidar';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import * as mammoth from 'mammoth';
import * as dotenv from 'dotenv';

// We'll load pdf-parse dynamically when needed

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Configuration
const WATCH_FOLDER = process.env.TRANSCRIPT_WATCH_FOLDER || process.argv[2];
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.docx', '.pdf'];
const ONE_SHOT_MODE = process.argv.includes('--once'); // Process existing files and exit

if (!WATCH_FOLDER) {
  console.error('Error: No watch folder specified.');
  console.error('Set TRANSCRIPT_WATCH_FOLDER in .env.local or pass as argument:');
  console.error('  npx tsx scripts/folder-watcher.ts "C:/path/to/folder"');
  process.exit(1);
}

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Track files being processed to avoid duplicates
const processingFiles = new Set<string>();

// Analysis prompt (same as in the app)
const ANALYSIS_PROMPT = `Analyze this conversation transcript and return a JSON object with:

1. "title": A descriptive title for this conversation (5-10 words)
2. "summary": A 2-3 paragraph summary capturing the main thrust of the discussion
3. "key_points": An array of 3-7 main insights or takeaways (one sentence each)
4. "action_items": An array of any todos, next steps, or commitments mentioned (empty array if none)
5. "quotes": An array of 2-5 notable quotable moments worth remembering (exact quotes from the transcript)
6. "speakers": An array of speaker names if identifiable from context
7. "suggested_topics": An array of 2-5 topic categories this conversation belongs to (use general business/life categories like "Marketing", "Mindset", "Product Development", "Customer Success", "Personal Growth", "Content Strategy", etc.)

Return ONLY valid JSON, no markdown formatting or code blocks.

TRANSCRIPT:
`;

async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = await fs.readFile(filePath);

  switch (ext) {
    case '.pdf': {
      // pdf-parse v1 - simple function call
      const pdfParse = (await import('pdf-parse')).default;
      const result = await pdfParse(buffer);
      return result.text;
    }
    case '.docx': {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    case '.txt':
    case '.md':
    default:
      return buffer.toString('utf-8');
  }
}

async function analyzeTranscript(rawContent: string) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: ANALYSIS_PROMPT + rawContent,
      },
    ],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  try {
    const parsed = JSON.parse(responseText);
    return {
      title: parsed.title || 'Untitled Conversation',
      summary: parsed.summary || '',
      key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
      action_items: Array.isArray(parsed.action_items) ? parsed.action_items : [],
      quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
      speakers: Array.isArray(parsed.speakers) ? parsed.speakers : [],
      suggested_topics: Array.isArray(parsed.suggested_topics) ? parsed.suggested_topics : [],
    };
  } catch {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        title: parsed.title || 'Untitled Conversation',
        summary: parsed.summary || '',
        key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
        action_items: Array.isArray(parsed.action_items) ? parsed.action_items : [],
        quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
        speakers: Array.isArray(parsed.speakers) ? parsed.speakers : [],
        suggested_topics: Array.isArray(parsed.suggested_topics) ? parsed.suggested_topics : [],
      };
    }
    throw new Error('Failed to parse AI response as JSON');
  }
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function moveToArchive(filePath: string): Promise<string> {
  const dir = path.dirname(filePath);
  const filename = path.basename(filePath);
  const archiveDir = path.join(dir, 'archived');

  // Create archive directory if it doesn't exist
  await fs.mkdir(archiveDir, { recursive: true });

  const archivePath = path.join(archiveDir, filename);

  // If file already exists in archive, add timestamp
  let finalPath = archivePath;
  try {
    await fs.access(archivePath);
    // File exists, add timestamp
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    finalPath = path.join(archiveDir, `${base}_${timestamp}${ext}`);
  } catch {
    // File doesn't exist, use original path
  }

  await fs.rename(filePath, finalPath);
  return finalPath;
}

async function processFile(filePath: string): Promise<void> {
  const filename = path.basename(filePath);

  // Skip if already processing
  if (processingFiles.has(filePath)) {
    return;
  }

  // Skip files in archived folder
  if (filePath.includes(path.sep + 'archived' + path.sep) || filePath.includes('/archived/')) {
    return;
  }

  processingFiles.add(filePath);
  console.log(`\n📄 Processing: ${filename}`);

  try {
    // Wait a moment to ensure file is fully written
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 1: Extract text
    console.log(`   📖 Reading file...`);
    const rawContent = await extractTextFromFile(filePath);

    if (!rawContent.trim()) {
      console.log(`   ⚠️  File is empty, skipping`);
      processingFiles.delete(filePath);
      return;
    }

    // Step 2: Save to database
    console.log(`   💾 Saving to database...`);
    const { data: transcript, error: createError } = await supabase
      .from('transcripts')
      .insert({
        raw_content: rawContent,
        source_filename: filename,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to save transcript: ${createError.message}`);
    }

    // Step 3: Analyze with AI
    console.log(`   🤖 Analyzing with AI...`);
    const analysis = await analyzeTranscript(rawContent);

    // Step 4: Generate embedding
    console.log(`   🧮 Generating embedding...`);
    const embeddingText = `${analysis.summary}\n\nKey Points: ${analysis.key_points.join('. ')}`;
    const embedding = await generateEmbedding(embeddingText);

    // Step 5: Update transcript with analysis
    console.log(`   📝 Updating transcript...`);
    const { error: updateError } = await supabase
      .from('transcripts')
      .update({
        title: analysis.title,
        summary: analysis.summary,
        key_points: analysis.key_points,
        action_items: analysis.action_items,
        quotes: analysis.quotes,
        speakers: analysis.speakers,
        embedding: embedding,
        processed: true,
        processing_error: null,
      })
      .eq('id', transcript.id);

    if (updateError) {
      throw new Error(`Failed to update transcript: ${updateError.message}`);
    }

    // Step 6: Handle topics
    console.log(`   🏷️  Creating topics...`);
    for (const topicName of analysis.suggested_topics) {
      const { data: existingTopics } = await supabase
        .from('topics')
        .select('*')
        .ilike('name', topicName);

      let topicId: string;

      if (existingTopics && existingTopics.length > 0) {
        topicId = existingTopics[0].id;
      } else {
        const { data: newTopic, error: topicError } = await supabase
          .from('topics')
          .insert({ name: topicName })
          .select()
          .single();

        if (topicError) {
          console.error(`   ⚠️  Error creating topic "${topicName}":`, topicError.message);
          continue;
        }
        topicId = newTopic.id;
      }

      await supabase.from('transcript_topics').upsert(
        {
          transcript_id: transcript.id,
          topic_id: topicId,
          relevance_score: 1.0,
        },
        { onConflict: 'transcript_id,topic_id' }
      );
    }

    // Step 7: Move to archive
    console.log(`   📦 Moving to archive...`);
    const archivePath = await moveToArchive(filePath);

    console.log(`   ✅ Complete! "${analysis.title}"`);
    console.log(`      Archived to: ${path.basename(archivePath)}`);

  } catch (error) {
    console.error(`   ❌ Error processing ${filename}:`, error instanceof Error ? error.message : error);
  } finally {
    processingFiles.delete(filePath);
  }
}

async function processExistingFiles(): Promise<void> {
  console.log(`\n🔍 Checking for existing files in ${WATCH_FOLDER}...`);

  try {
    const files = await fs.readdir(WATCH_FOLDER);
    const supportedFiles = files.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return SUPPORTED_EXTENSIONS.includes(ext);
    });

    if (supportedFiles.length === 0) {
      console.log('   No files to process');
      return;
    }

    console.log(`   Found ${supportedFiles.length} file(s) to process`);

    for (const file of supportedFiles) {
      const filePath = path.join(WATCH_FOLDER, file);
      await processFile(filePath);
    }
  } catch (error) {
    console.error('Error reading directory:', error);
  }
}

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   Transcript Vault - Folder Watcher');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📁 Watching: ${WATCH_FOLDER}`);
  console.log(`📋 Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`);
  if (ONE_SHOT_MODE) {
    console.log(`⚡ Mode: One-shot (process and exit)`);
  }
  console.log('───────────────────────────────────────────────────────────');

  // Verify the watch folder exists
  try {
    await fs.access(WATCH_FOLDER);
  } catch {
    console.error(`\n❌ Error: Watch folder does not exist: ${WATCH_FOLDER}`);
    process.exit(1);
  }

  // Create archived folder if it doesn't exist
  const archiveDir = path.join(WATCH_FOLDER, 'archived');
  await fs.mkdir(archiveDir, { recursive: true });
  console.log(`📦 Archive folder: ${archiveDir}`);
  console.log('───────────────────────────────────────────────────────────\n');

  // Process any existing files first
  await processExistingFiles();

  // In one-shot mode, exit after processing existing files
  if (ONE_SHOT_MODE) {
    console.log('\n✅ One-shot processing complete. Exiting.');
    process.exit(0);
  }

  // Set up watcher for new files
  console.log('\n👀 Watching for new files... (Press Ctrl+C to stop)\n');

  const watcher = chokidar.watch(WATCH_FOLDER, {
    ignored: [
      /(^|[\/\\])\../,  // Ignore dotfiles
      /archived/,       // Ignore archived folder
    ],
    persistent: true,
    ignoreInitial: true,  // Don't trigger for existing files (we processed them above)
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    },
    depth: 0,  // Only watch the top level, not subdirectories
  });

  watcher.on('add', async (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (SUPPORTED_EXTENSIONS.includes(ext)) {
      await processFile(filePath);
    }
  });

  watcher.on('error', (error) => {
    console.error('Watcher error:', error);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down watcher...');
    watcher.close();
    process.exit(0);
  });
}

main().catch(console.error);

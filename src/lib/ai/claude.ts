import Anthropic from '@anthropic-ai/sdk';
import { ProcessedTranscript } from '@/types/database';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

export async function analyzeTranscript(rawContent: string): Promise<ProcessedTranscript> {
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
    // Try to parse the response as JSON
    const parsed = JSON.parse(responseText);

    // Validate and provide defaults
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
    // If JSON parsing fails, try to extract JSON from the response
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

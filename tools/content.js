/**
 * Category 8: Content & Language Tools (AI-Powered)
 * - translate_document: AI translation
 * - rewrite_text: Tone/style rewriting
 * - sentiment_analysis: Text sentiment scoring
 * - generate_seo_content: SEO-optimized content from keywords
 */

const { generateText, generateJSON, isAvailable } = require('./gemini');

const definitions = [
    {
        name: 'translate_document',
        description: 'AI translates text between any languages. Preserves formatting and tone. Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'Text to translate' },
                target_language: { type: 'string', description: 'Target language (e.g., "Spanish", "French", "Japanese")' },
                source_language: { type: 'string', description: 'Source language (auto-detected if not specified)' },
                preserve_tone: { type: 'boolean', description: 'Preserve the original tone and formality (default: true)' }
            },
            required: ['text', 'target_language']
        }
    },
    {
        name: 'rewrite_text',
        description: 'AI rewrites text in a different tone, style, or reading level. Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'Text to rewrite' },
                style: { type: 'string', enum: ['professional', 'casual', 'academic', 'simple', 'persuasive', 'technical', 'friendly', 'formal', 'concise'], description: 'Target writing style' },
                instructions: { type: 'string', description: 'Specific rewriting instructions' }
            },
            required: ['text', 'style']
        }
    },
    {
        name: 'sentiment_analysis',
        description: 'AI analyzes text sentiment — positive/negative/neutral scoring with emotion detection. Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'Text to analyze' },
                detailed: { type: 'boolean', description: 'Include per-sentence breakdown (default: false)' }
            },
            required: ['text']
        }
    },
    {
        name: 'generate_seo_content',
        description: 'AI generates SEO-optimized content from keywords and topic. Ready for blog posts, landing pages, or social media. Only charges on VERIFIED_SUCCESS.',
        inputSchema: {
            type: 'object',
            properties: {
                topic: { type: 'string', description: 'Topic or subject to write about' },
                keywords: { type: 'array', items: { type: 'string' }, description: 'Target SEO keywords to include' },
                content_type: { type: 'string', enum: ['blog_post', 'landing_page', 'social_post', 'product_description', 'meta_description'], description: 'Type of content (default: blog_post)' },
                word_count: { type: 'number', description: 'Target word count (default: 500)' },
                tone: { type: 'string', description: 'Writing tone (default: informative)' }
            },
            required: ['topic']
        }
    }
];

async function handleTranslateDocument(args) {
    const { text, target_language, source_language, preserve_tone = true } = args;
    if (!text || !target_language) return { status: 'ERROR', error: 'text and target_language are required' };
    if (!isAvailable()) return { status: 'FAILED', error: 'AI not available — GEMINI_API_KEY required' };

    const result = await generateJSON(
        `Translate the following text to ${target_language}.${source_language ? ` Source language: ${source_language}.` : ' Auto-detect the source language.'}
${preserve_tone ? 'Preserve the original tone, formality level, and formatting.' : ''}

Return JSON:
{"translated_text":"the translation","source_language":"detected source language","target_language":"${target_language}","word_count":0,"notes":"any translation notes or culturally-specific adaptations made"}

Text:
${text.substring(0, 5000)}`
    );

    if (!result || !result.translated_text) return { status: 'FAILED', error: 'Translation failed' };
    return { status: 'VERIFIED_SUCCESS', tool: 'translate_document', translation: result.translated_text, source_language: result.source_language, target_language: result.target_language, word_count: result.word_count, notes: result.notes, ai_powered: true, timestamp: new Date().toISOString() };
}

async function handleRewriteText(args) {
    const { text, style, instructions } = args;
    if (!text || !style) return { status: 'ERROR', error: 'text and style are required' };
    if (!isAvailable()) return { status: 'FAILED', error: 'AI not available — GEMINI_API_KEY required' };

    const rewritten = await generateText(
        `Rewrite the following text in a ${style} style.${instructions ? `\n\nAdditional instructions: ${instructions}` : ''}\n\nOriginal text:\n${text.substring(0, 4000)}`,
        { maxTokens: 1024 }
    );

    if (!rewritten) return { status: 'FAILED', error: 'Rewrite failed' };
    return { status: 'VERIFIED_SUCCESS', tool: 'rewrite_text', original_length: text.length, rewritten_text: rewritten, style, rewritten_length: rewritten.length, ai_powered: true, timestamp: new Date().toISOString() };
}

async function handleSentimentAnalysis(args) {
    const { text, detailed = false } = args;
    if (!text || text.trim().length < 5) return { status: 'ERROR', error: 'text is required (min 5 chars)' };
    if (!isAvailable()) return { status: 'FAILED', error: 'AI not available — GEMINI_API_KEY required' };

    const promptExtra = detailed ? '\n"sentences":[{"text":"","sentiment":"positive|negative|neutral","score":0.0-1.0}]' : '';
    const result = await generateJSON(
        `Analyze the sentiment of this text.

Return JSON:
{"overall_sentiment":"positive|negative|neutral|mixed","confidence":0.0-1.0,"score":-1.0 to 1.0 where -1 is most negative and 1 is most positive,"emotions":["list of detected emotions like joy, anger, sadness, surprise, etc."],"key_phrases":[{"phrase":"","sentiment":"positive|negative|neutral"}]${promptExtra}}

Text:
${text.substring(0, 4000)}`
    );

    if (!result || !result.overall_sentiment) return { status: 'FAILED', error: 'Sentiment analysis failed' };
    return { status: 'VERIFIED_SUCCESS', tool: 'sentiment_analysis', sentiment: result.overall_sentiment, confidence: result.confidence, score: result.score, emotions: result.emotions, key_phrases: result.key_phrases, sentences: result.sentences || undefined, text_length: text.length, ai_powered: true, timestamp: new Date().toISOString() };
}

async function handleGenerateSeoContent(args) {
    const { topic, keywords = [], content_type = 'blog_post', word_count = 500, tone = 'informative' } = args;
    if (!topic) return { status: 'ERROR', error: 'topic is required' };
    if (!isAvailable()) return { status: 'FAILED', error: 'AI not available — GEMINI_API_KEY required' };

    const typeGuide = {
        blog_post: `a blog post with H2 headings, intro paragraph, and conclusion. Target ${word_count} words.`,
        landing_page: `landing page copy with a hero headline, subheadline, 3 benefits, and CTA. Target ${word_count} words.`,
        social_post: 'a social media post (under 280 characters for Twitter, or a longer LinkedIn post)',
        product_description: `a product description with features and benefits. Target ${word_count} words.`,
        meta_description: 'a meta description under 160 characters, compelling and keyword-rich'
    };

    const content = await generateText(
        `Write ${typeGuide[content_type] || typeGuide.blog_post}

Topic: ${topic}
${keywords.length > 0 ? `SEO Keywords to naturally include: ${keywords.join(', ')}` : ''}
Tone: ${tone}

Write engaging, original content. Do not use filler. Every sentence should add value.`,
        { maxTokens: content_type === 'meta_description' ? 256 : 2048 }
    );

    if (!content) return { status: 'FAILED', error: 'Content generation failed' };

    const includedKeywords = keywords.filter(k => content.toLowerCase().includes(k.toLowerCase()));
    return { status: 'VERIFIED_SUCCESS', tool: 'generate_seo_content', content, content_type, topic, word_count: content.split(/\s+/).length, keywords_included: includedKeywords, keywords_total: keywords.length, ai_powered: true, timestamp: new Date().toISOString() };
}

const handlers = { translate_document: handleTranslateDocument, rewrite_text: handleRewriteText, sentiment_analysis: handleSentimentAnalysis, generate_seo_content: handleGenerateSeoContent };
module.exports = { definitions, handlers };

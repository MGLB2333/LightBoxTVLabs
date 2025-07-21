import { BaseAgent } from './BaseAgent';
import type { AgentContext, AgentMessage, AgentResponse } from './types';
import { supabase } from '../supabase';

interface ExperianSegment {
  'Segment ID': string;
  'Segment Name': string;
  'Taxonomy > Parent Path': string;
  'Description': string;
  'Value': number;
}

interface SegmentEmbedding {
  segmentId: string;
  segmentName: string;
  taxonomyPath: string;
  description: string;
  embedding: number[];
  textForEmbedding: string;
}

interface AudienceRecommendation {
  segmentId: string;
  segmentName: string;
  taxonomyPath: string;
  description: string;
  confidence: number;
  reasoning: string;
  matchScore: number;
}

export class AudienceAgent extends BaseAgent {
  private static instance: AudienceAgent;
  private experianSegments: ExperianSegment[] = [];
  private segmentEmbeddings: SegmentEmbedding[] = [];
  private segmentCache: Map<string, any> = new Map();
  private embeddingsInitialized = false;

  private constructor() {
    super(
      'audience',
      'Audience Agent',
      'Expert in audience targeting and segment recommendations using semantic search and AI validation',
      [
        {
          name: 'Audience Recommendations',
          description: 'Recommend Experian segments based on user descriptions using semantic search',
          examples: [
            'Find segments for young professionals',
            'Recommend affluent audience segments',
            'Suggest segments for fitness enthusiasts'
          ]
        },
        {
          name: 'Segment Analysis',
          description: 'Analyze and explain Experian segments',
          examples: [
            'What is segment ABC123?',
            'Explain demographic segments',
            'Show me lifestyle segments'
          ]
        }
      ]
    );
  }

  public static getInstance(): AudienceAgent {
    if (!AudienceAgent.instance) {
      AudienceAgent.instance = new AudienceAgent();
    }
    return AudienceAgent.instance;
  }

  canHandle(message: string, context: AgentContext): boolean {
    const audienceKeywords = [
      'audience', 'segment', 'demographic', 'targeting', 'recommend', 'suggest',
      'find audience', 'audience builder', 'segment match', 'audience match'
    ];
    
    const lowerMessage = message.toLowerCase();
    return audienceKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  async process(message: string, context: AgentContext, history: AgentMessage[]): Promise<AgentResponse> {
    if (message.toLowerCase().includes('recommend') || message.toLowerCase().includes('suggest') || 
        message.toLowerCase().includes('give me') || message.toLowerCase().includes('find') ||
        message.toLowerCase().includes('audience') || message.toLowerCase().includes('segment')) {
      try {
        // Extract the actual audience description from the request
        const audienceDescription = this.extractAudienceDescription(message);
        
        if (audienceDescription) {
          const recommendations = await this.recommendAudiences(audienceDescription);
          
          if (recommendations.length > 0) {
            return {
              content: `Here are audience segments that match "${audienceDescription}":\n\n${recommendations.map((rec, index) => 
                `${index + 1}. **${rec.segmentName}** (${Math.round(rec.confidence * 100)}% match)\n   📍 Category: ${rec.taxonomyPath}\n   💡 Why: ${rec.reasoning}`
              ).join('\n\n')}\n\n**💡 Tip:** You can apply these segments to your campaign or ask me to find more specific audiences.`,
              confidence: 0.9,
              agentId: 'audience',
              agentName: 'Audience Agent',
              data: recommendations,
              suggestions: [
                'Apply these segments to a campaign',
                'Find more specific audience types',
                'Get geographic distribution for these segments',
                'Compare segment performance'
              ]
            };
          } else {
            return {
              content: `I couldn't find specific audience segments for "${audienceDescription}". Try being more specific, for example:\n\n• "Young professionals interested in fitness"\n• "Parents with children under 10"\n• "High-income tech enthusiasts"\n• "Urban millennials interested in sustainability"`,
              confidence: 0.5,
              agentId: 'audience',
              agentName: 'Audience Agent',
              suggestions: [
                'Try a more specific audience description',
                'Browse all available segments',
                'Get help with audience targeting'
              ]
            };
          }
        } else {
          return {
            content: `I'd be happy to help you find audience segments! Could you describe the type of audience you're looking for? For example:\n\n• "Sports fans" → I'll find fitness, sports, and athletic segments\n• "Young professionals" → I'll find career-focused, urban segments\n• "Luxury consumers" → I'll find high-income, premium segments\n\n**Just describe your target audience and I'll find the best segments for you!**`,
            confidence: 0.7,
            agentId: 'audience',
            agentName: 'Audience Agent',
            suggestions: [
              'Describe your target audience',
              'Browse popular segments',
              'Get help with audience targeting'
            ]
          };
        }
      } catch (error) {
        return {
          content: 'Sorry, I encountered an error while finding audience segments. Please try again with a different description.',
          confidence: 0.1,
          agentId: 'audience',
          agentName: 'Audience Agent'
        };
      }
    }

    return {
      content: 'I can help you find the perfect audience segments! Just describe who you want to reach, like "sports fans" or "young professionals" and I\'ll find the best Experian segments for you.',
      confidence: 0.7,
      agentId: 'audience',
      agentName: 'Audience Agent'
    };
  }

  private extractAudienceDescription(message: string): string | null {
    const lowerMessage = message.toLowerCase();
    
    // Remove common request words
    const cleanedMessage = lowerMessage
      .replace(/give me (a|an|some) /gi, '')
      .replace(/find (a|an|some) /gi, '')
      .replace(/recommend (a|an|some) /gi, '')
      .replace(/suggest (a|an|some) /gi, '')
      .replace(/audience/gi, '')
      .replace(/segments?/gi, '')
      .trim();

    // If we have meaningful content after cleaning, return it
    if (cleanedMessage.length > 3 && cleanedMessage !== 'sports') {
      return cleanedMessage;
    }

    // Handle specific cases
    if (lowerMessage.includes('sports')) return 'sports fans and fitness enthusiasts';
    if (lowerMessage.includes('tech')) return 'technology enthusiasts and professionals';
    if (lowerMessage.includes('luxury')) return 'high-income luxury consumers';
    if (lowerMessage.includes('young')) return 'young professionals and millennials';
    if (lowerMessage.includes('family')) return 'families with children';
    if (lowerMessage.includes('business')) return 'business professionals and executives';

    return null;
  }

  async initialize(): Promise<void> {
    if (this.experianSegments.length === 0) {
      await this.loadExperianSegments();
    }
    
    if (!this.embeddingsInitialized) {
      await this.initializeEmbeddings();
    }
  }

  private async loadExperianSegments(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('experian_taxonomy')
        .select('*')
        .limit(10000);

      if (error) throw error;
      this.experianSegments = data || [];
      console.log(`📊 Loaded ${this.experianSegments.length} Experian segments`);
    } catch (error) {
      console.error('❌ Error loading Experian segments:', error);
      throw error;
    }
  }

  private async initializeEmbeddings(): Promise<void> {
    console.log('🔧 Initializing embeddings for', this.experianSegments.length, 'segments...');
    
    const embeddingPromises = this.experianSegments.map(async (segment) => {
      const textForEmbedding = `${segment['Segment Name']} ${segment['Taxonomy > Parent Path']} ${segment['Description'] || ''}`.trim();
      const embedding = await this.generateEmbedding(textForEmbedding);
      
      if (embedding) {
        return {
          segmentId: segment['Segment ID'],
          segmentName: segment['Segment Name'],
          taxonomyPath: segment['Taxonomy > Parent Path'],
          description: segment['Description'] || '',
          embedding,
          textForEmbedding
        };
      }
      return null;
    });

    const results = await Promise.all(embeddingPromises);
    this.segmentEmbeddings = results.filter((result): result is SegmentEmbedding => result !== null);
    
    console.log(`✅ Initialized ${this.segmentEmbeddings.length} embeddings (${this.experianSegments.length - this.segmentEmbeddings.length} failed)`);
  }

  private async generateEmbedding(text: string): Promise<number[] | null> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      console.warn('OpenAI API key not configured, skipping embedding generation');
      return null;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('OpenAI API key is invalid or expired');
          return null;
        } else if (response.status === 429) {
          console.warn('OpenAI API rate limit exceeded');
          return null;
        } else {
          console.warn(`OpenAI API error: ${response.status}`);
          return null;
        }
      }

      const data = await response.json();
      return data.data[0]?.embedding || null;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    }
  }

  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  async recommendAudiences(userDescription: string): Promise<AudienceRecommendation[]> {
    await this.initialize();
    
    console.log('🎯 Generating audience recommendations for:', userDescription);

    // Step 1: Generate embedding for user input
    const userEmbedding = await this.generateEmbedding(userDescription);
    
    if (!userEmbedding) {
      console.warn('⚠️ Could not generate user embedding, falling back to keyword-based search');
      // Fallback to simple keyword matching
      const lowerDescription = userDescription.toLowerCase();
      const keywordMatches = this.experianSegments
        .filter(segment => {
          const text = `${segment['Segment Name']} ${segment['Taxonomy > Parent Path']} ${segment['Description'] || ''}`.toLowerCase();
          return text.includes(lowerDescription) || lowerDescription.split(' ').some(word => text.includes(word));
        })
        .slice(0, 5)
        .map((segment, index) => ({
          segmentId: segment['Segment ID'],
          segmentName: segment['Segment Name'],
          taxonomyPath: segment['Taxonomy > Parent Path'],
          description: segment['Description'] || '',
          confidence: Math.max(0.3, 1 - (index * 0.1)),
          reasoning: `Keyword match for "${userDescription}"`,
          matchScore: Math.max(30, 100 - (index * 10))
        }));
      
      return keywordMatches;
    }

    console.log('📝 Generated user input embedding');

    // Step 2: Perform vector search to find top matches
    const topMatches = this.segmentEmbeddings
      .map(segment => ({
        ...segment,
        similarity: this.calculateCosineSimilarity(userEmbedding, segment.embedding)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10); // Get top 10 semantic matches

    console.log(`🔍 Found ${topMatches.length} semantic matches`);

    // Step 3: Send top matches to GPT for final selection and reasoning
    if (topMatches.length > 0) {
      try {
        const validatedRecommendations = await this.validateWithAI(userDescription, topMatches);
        console.log(`✅ AI validated ${validatedRecommendations.length} recommendations`);
        return validatedRecommendations;
      } catch (error) {
        console.warn('⚠️ AI validation failed, using semantic matches:', error);
        // Fallback to semantic matches if AI fails
        return topMatches.map((match, index) => ({
          segmentId: match.segmentId,
          segmentName: match.segmentName,
          taxonomyPath: match.taxonomyPath,
          description: match.description,
          confidence: Math.min(match.similarity, 1),
          reasoning: `Semantic similarity match (${Math.round(match.similarity * 100)}% similarity)`,
          matchScore: match.similarity * 100
        }));
      }
    }

    console.log('❌ No semantic matches found');
    return [];
  }

  /**
   * Validate and refine recommendations using OpenAI
   */
  private async validateWithAI(userDescription: string, segments: Array<SegmentEmbedding & { similarity: number }>): Promise<AudienceRecommendation[]> {
    const prompt = `
You are an expert audience targeting specialist. Your task is to select the best audience segments from the provided options.

USER REQUEST: "${userDescription}"

TOP SEMANTIC MATCHES (ranked by similarity):
${segments.map((s, index) => `${index + 1}. ${s.segmentName} (${s.segmentId})
   Category: ${s.taxonomyPath}
   Description: ${s.description || 'No description available'}
   Similarity Score: ${Math.round(s.similarity * 100)}%
   Full Text: ${s.textForEmbedding}`).join('\n\n')}

TASK: 
1. Select the 3-5 most relevant segments for the user's described audience
2. Provide specific, accurate reasoning for why each selected segment matches
3. Adjust confidence scores based on actual relevance (not just similarity)
4. Remove segments that don't genuinely match the user's needs

RESPONSE FORMAT (JSON only):
{
  "validated_recommendations": [
    {
      "segmentId": "ABC123",
      "segmentName": "Segment Name",
      "taxonomyPath": "Category > Subcategory",
      "description": "Segment description",
      "confidence": 85,
      "reasoning": "Specific explanation of why this segment matches the user's needs",
      "matchScore": 85
    }
  ]
}

CRITICAL INSTRUCTIONS:
- Only include segments that genuinely match the user's described audience
- Focus on quality over quantity - 3-5 best matches is ideal
- Provide specific reasoning based on the segment's characteristics
- Don't include segments just because they have high similarity scores
- Consider the user's actual intent, not just keyword matches
`;

    try {
      const response = await this.callOpenAI([
        { 
          role: 'system', 
          content: 'You are an expert audience targeting specialist. Select the best segments from semantic matches and provide accurate reasoning. Focus on genuine relevance to the user\'s needs.' 
        },
        { role: 'user', content: prompt }
      ], { currentPage: 'audience-builder' });

      console.log('🤖 AI Validation Response:', response);

      // Parse the JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.validated_recommendations || !Array.isArray(parsed.validated_recommendations)) {
        throw new Error('Invalid response format from AI');
      }

      return parsed.validated_recommendations.map((rec: any) => ({
        segmentId: rec.segmentId,
        segmentName: rec.segmentName,
        taxonomyPath: rec.taxonomyPath,
        description: rec.description,
        confidence: Math.min(rec.confidence / 100, 1),
        reasoning: rec.reasoning,
        matchScore: rec.matchScore
      }));

    } catch (error) {
      console.error('❌ Error in AI validation:', error);
      throw error;
    }
  }

  async getSegmentDetails(segmentId: string): Promise<any> {
    if (this.segmentCache.has(segmentId)) {
      return this.segmentCache.get(segmentId);
    }

    const segment = this.experianSegments.find(s => s['Segment ID'] === segmentId);
    if (segment) {
      this.segmentCache.set(segmentId, segment);
      return segment;
    }

    return null;
  }

  async getAllSegments(): Promise<ExperianSegment[]> {
    await this.initialize();
    return this.experianSegments;
  }

  async searchSegments(query: string): Promise<ExperianSegment[]> {
    await this.initialize();
    const lowerQuery = query.toLowerCase();
    
    return this.experianSegments.filter(segment => 
      segment['Segment Name'].toLowerCase().includes(lowerQuery) ||
      segment['Taxonomy > Parent Path'].toLowerCase().includes(lowerQuery) ||
      (segment['Description'] && segment['Description'].toLowerCase().includes(lowerQuery))
    );
  }

  async getSegmentsByCategory(category: string): Promise<ExperianSegment[]> {
    await this.initialize();
    const lowerCategory = category.toLowerCase();
    
    return this.experianSegments.filter(segment => 
      segment['Taxonomy > Parent Path'].toLowerCase().includes(lowerCategory)
    );
  }
} 
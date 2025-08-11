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
    try {
      // 🧠 Step 1: Analyze user request with internal reasoning
      const analysis = await this.conversationHelper.analyzeUserRequest(message, context);
      
      // Get conversation memory
      const memory = this.conversationHelper.getConversationMemory(context.userId || 'default');
      this.conversationHelper.updateMemory(memory, message, context);
      
      // ✅ Reflect user intent clearly
      const intentReflection = this.conversationHelper.reflectUserIntent(message, context);
      
      // Check if clarification is needed
      if (analysis.requiresClarification) {
        return {
          content: `${intentReflection} ${analysis.clarificationQuestion}`,
          confidence: analysis.confidence,
          agentId: 'audience',
          agentName: 'Audience Agent',
          suggestions: [
            'Ask about specific demographics',
            'Request audience segments',
            'Get geographic insights'
          ],
          nextActions: []
        };
      }

      // 🗃️ Step 2: Validate query and map to schema
      const validation = this.conversationHelper.validateQuery(message);
      if (!validation.isValid) {
        return {
          content: this.conversationHelper.generateFallbackResponse(message, 'audience'),
          confidence: 0.1,
          agentId: 'audience',
          agentName: 'Audience Agent',
          suggestions: ['Try rephrasing your question', 'Ask about specific demographics'],
          nextActions: []
        };
      }

      // Step 3: Determine analysis type and gather data
      const analysisType = this.determineAnalysisType(message);
      const data = await this.gatherRelevantData(analysisType, context);
      
      if (!data || Object.keys(data).length === 0) {
        return {
          content: this.conversationHelper.generateFallbackResponse(message, 'audience'),
          confidence: 0.1,
          agentId: 'audience',
          agentName: 'Audience Agent',
          suggestions: ['Check your audience dashboard', 'Set up audience tracking'],
          nextActions: []
        };
      }

      // Step 4: Generate response using iterative reasoning
      const systemPrompt = this.createSystemPrompt(context);
      const response = await this.processWithIterativeReasoning(message, context, history, systemPrompt);

      // ✅ Format response with human-like touches
      const formattedResponse = this.conversationHelper.formatResponse(response, true);
      
      // ✅ Add relevant context from memory
      const relevantContext = this.conversationHelper.getRelevantContext(memory, message);
      const finalResponse = relevantContext ? `${relevantContext} ${formattedResponse}` : formattedResponse;

      return {
        content: finalResponse,
        confidence: analysis.confidence,
        agentId: 'audience',
        agentName: 'Audience Agent',
        suggestions: [
          'Ask about demographic insights',
          'Request geographic analysis',
          'Get audience segments',
          'Compare audience performance'
        ],
        nextActions: []
      };
    } catch (error) {
      console.error('Audience Agent error:', error);
      return {
        content: this.conversationHelper.generateFallbackResponse(message, 'audience'),
        confidence: 0.1,
        agentId: 'audience',
        agentName: 'Audience Agent',
        suggestions: ['Try rephrasing your question', 'Check your audience dashboard'],
        nextActions: []
      };
    }
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

  private determineAnalysisType(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest') || lowerMessage.includes('find')) {
      return 'recommendation';
    } else if (lowerMessage.includes('explain') || lowerMessage.includes('what is') || lowerMessage.includes('analyze')) {
      return 'analysis';
    } else if (lowerMessage.includes('segment') && (lowerMessage.includes('list') || lowerMessage.includes('show'))) {
      return 'list';
    }
    
    return 'general';
  }

  protected async gatherRelevantData(analysisType: string, context: AgentContext): Promise<any> {
    await this.initialize();
    
    switch (analysisType) {
      case 'recommendation':
        return {
          segments: this.experianSegments.slice(0, 50), // Limit for performance
          type: 'recommendation'
        };
      case 'analysis':
        return {
          segments: this.experianSegments,
          type: 'analysis'
        };
      case 'list':
        return {
          segments: this.experianSegments,
          type: 'list'
        };
      default:
        return {
          segments: this.experianSegments.slice(0, 20),
          type: 'general'
        };
    }
  }
} 
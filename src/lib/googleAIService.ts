import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google AI client
const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY || 'AIzaSyAV3X8aROEHdT1xX4_vM8ivNJRzfDizRaE';
const genAI = new GoogleGenerativeAI(apiKey);

// Types for our API responses
export interface VideoGenerationRequest {
  prompt: string;
  aspectRatio: '9:16' | '1:1' | '16:9';
  duration: number; // in seconds
  style?: 'performance' | 'premium' | 'playful' | 'informative';
}

export interface VideoGenerationResponse {
  videoUrl: string;
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  estimatedTime?: number; // in seconds
}

export interface CreativeBrief {
  productSummary: string;
  keyBenefit: string;
  targetAudience: string;
  proofPoints: string[];
  offer?: string;
  primaryCTA: string;
  claimsToAvoid: string[];
  tone: 'performance' | 'premium' | 'playful' | 'informative';
}

export interface IngestResult {
  title: string;
  summary: string;
  bullets: string[];
  brandColors?: string[];
  logoUrl?: string;
  videoTheme?: string;
}

class GoogleAIService {
  private model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  // Retry configuration
  private maxRetries = 2; // Reduced retries for faster fallback
  private retryDelay = 2000; // 2 seconds between retries

  /**
   * Retry wrapper for API calls
   */
  private async retryApiCall<T>(apiCall: () => Promise<T>, operation: string): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a retryable error
        if (error.status === 503 || error.status === 429 || error.message?.includes('overloaded')) {
          if (attempt < this.maxRetries) {
            console.log(`${operation} attempt ${attempt} failed, retrying in ${this.retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
            continue;
          }
        }
        
        // If it's not a retryable error or we've exhausted retries, throw immediately
        throw error;
      }
    }
    
    throw lastError!;
  }

  /**
   * Extract information from URL, text, or uploaded content
   */
  async ingestContent(input: string, type: 'url' | 'text' | 'file'): Promise<IngestResult> {
    try {
      let contentToAnalyze = input;
      
      // If it's a URL, fetch the actual content
      if (type === 'url') {
        contentToAnalyze = await this.fetchUrlContent(input);
      }
      
      const prompt = `Analyze this content and extract key information for creating a video ad:
      
      Content: ${contentToAnalyze}
      
      Please provide:
      1. A compelling product/service title
      2. A 2-3 sentence summary highlighting the main value proposition
      3. 3-5 key benefits or features as bullet points
      4. Any brand colors mentioned (hex codes)
      5. Any logo or brand elements mentioned
      6. Video theme/style recommendation (business, tech, product, marketing, ecommerce, education, health, etc.)
      
      For videoTheme, choose the most appropriate category:
      - business: corporate, enterprise, professional services
      - tech: software, apps, digital tools, AI, technology
      - product: physical products, gadgets, consumer goods
      - marketing: advertising, branding, promotional content
      - ecommerce: online shopping, retail, marketplace
      - education: courses, training, learning, academic
      - health: fitness, wellness, medical, healthcare
      
      Format your response as JSON with these fields: title, summary, bullets (array), brandColors (array), logoUrl (string or null), videoTheme (string)`;

      const result = await this.retryApiCall(
        () => this.model.generateContent(prompt),
        'Content ingestion'
      );
      
      const response = await result.response;
      const text = response.text();
      
      // Try to parse JSON response
      try {
        const parsed = JSON.parse(text);
        return {
          ...parsed,
          videoTheme: parsed.videoTheme || 'business' // Default theme
        };
      } catch (parseError) {
        // Fallback if JSON parsing fails
        return {
          title: 'Product/Service',
          summary: text.substring(0, 200) + '...',
          bullets: ['Key benefit 1', 'Key benefit 2', 'Key benefit 3'],
          brandColors: ['#02b3e5'],
          logoUrl: undefined,
          videoTheme: 'business'
        };
      }
    } catch (error) {
      console.error('Error ingesting content:', error);
      
      // Fallback mode when AI service is unavailable
      if ((error as Error).message?.includes('overloaded') || (error as Error).message?.includes('503')) {
        return this.createFallbackContent(input);
      }
      
      throw new Error('Failed to analyze content. Please try again.');
    }
  }

  /**
   * Fetch content from a URL
   */
  private async fetchUrlContent(url: string): Promise<string> {
    try {
      console.log('Fetching URL content from:', url);
      
      // Try multiple CORS proxies for better reliability
      const proxies = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        `https://cors-anywhere.herokuapp.com/${url}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
      ];
      
      for (const proxyUrl of proxies) {
        try {
          console.log('Trying proxy:', proxyUrl);
          const response = await fetch(proxyUrl);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.contents) {
              // Extract text content from HTML
              const htmlContent = data.contents;
              const textContent = this.extractTextFromHtml(htmlContent);
              console.log('Successfully fetched content, length:', textContent.length);
              return textContent.substring(0, 2000); // Limit content length
            }
          }
        } catch (proxyError) {
          console.log('Proxy failed:', proxyUrl, proxyError);
          continue;
        }
      }
      
      throw new Error('All proxies failed');
    } catch (error) {
      console.error('Error fetching URL content:', error);
      // Fallback to URL analysis
      return `Website URL: ${url}`;
    }
  }

  /**
   * Extract text content from HTML
   */
  private extractTextFromHtml(html: string): string {
    // Simple HTML text extraction
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    return text;
  }

  /**
   * Analyze URL content using URL context tool and generate ad brief
   */
  async analyzeUrlAndGenerateBrief(url: string, tone: 'performance' | 'premium' | 'playful' | 'informative' = 'performance'): Promise<CreativeBrief> {
    const prompt = `Analyze the content from this URL: ${url}

Create a comprehensive ad brief for a video advertisement based on the website content. Focus on:

1. **Product Summary**: What is the main product/service being offered?
2. **Key Benefit**: What is the primary value proposition or benefit?
3. **Target Audience**: Who is the ideal customer based on the content?
4. **Proof Points**: What evidence or features support the claims?
5. **Offer**: Any special offers, discounts, or promotions mentioned?
6. **Primary CTA**: What action should viewers take?
7. **Claims to Avoid**: Any regulatory or compliance considerations?
8. **Tone**: Should be ${tone} based on the brand's voice

Make the brief compelling and suitable for a short video ad (6-15 seconds).`;

    try {
      const result = await this.retryApiCall(async () => {
        return await this.model.generateContent(prompt);
      });

      const response = await result.response;
      const text = response.text();
      
      // Parse the response to extract brief components
      return this.parseBriefFromResponse(text, tone);
    } catch (error) {
      console.error('Error analyzing URL and generating brief:', error);
      // Return a fallback brief
      return this.createFallbackBrief({ summary: 'Content analysis failed', bullets: ['Key benefit 1', 'Key benefit 2'], brandColors: ['#02b3e5'], logoUrl: undefined, videoTheme: 'business' }, tone);
    }
  }

  /**
   * Parse brief components from AI response
   */
  private parseBriefFromResponse(text: string, tone: 'performance' | 'premium' | 'playful' | 'informative'): CreativeBrief {
    // Extract components using regex patterns
    const productSummary = this.extractSection(text, 'Product Summary', 'Key Benefit') || 'Product details from website analysis';
    const keyBenefit = this.extractSection(text, 'Key Benefit', 'Target Audience') || 'Primary value proposition identified';
    const targetAudience = this.extractSection(text, 'Target Audience', 'Proof Points') || 'Target audience based on content analysis';
    const proofPoints = this.extractList(text, 'Proof Points') || ['Evidence from website content'];
    const offer = this.extractSection(text, 'Offer', 'Primary CTA') || undefined;
    const primaryCTA = this.extractSection(text, 'Primary CTA', 'Claims to Avoid') || 'Learn more or take action';
    const claimsToAvoid = this.extractList(text, 'Claims to Avoid') || [];

    return {
      productSummary,
      keyBenefit,
      targetAudience,
      proofPoints,
      offer,
      primaryCTA,
      claimsToAvoid,
      tone
    };
  }

  /**
   * Extract a section from text between two markers
   */
  private extractSection(text: string, startMarker: string, endMarker: string): string | null {
    const startIndex = text.indexOf(startMarker);
    if (startIndex === -1) return null;
    
    const endIndex = text.indexOf(endMarker, startIndex);
    const section = endIndex !== -1 
      ? text.substring(startIndex + startMarker.length, endIndex)
      : text.substring(startIndex + startMarker.length);
    
    return section.trim().replace(/^[:\-\s]+/, '').trim();
  }

  /**
   * Extract a list from text after a marker
   */
  private extractList(text: string, marker: string): string[] {
    const startIndex = text.indexOf(marker);
    if (startIndex === -1) return [];
    
    const section = text.substring(startIndex + marker.length);
    const lines = section.split('\n').slice(0, 5); // Take first 5 lines
    
    return lines
      .map(line => line.trim().replace(/^[-\*\•\d\.\s]+/, '').trim())
      .filter(line => line.length > 0);
  }

  /**
   * Generate a creative brief from ingested content
   */
  async generateCreativeBrief(ingestResult: IngestResult, tone: 'performance' | 'premium' | 'playful' | 'informative'): Promise<CreativeBrief> {
    try {
      const prompt = `Create a creative brief for a video ad based on this information:
      
      Title: ${ingestResult.title}
      Summary: ${ingestResult.summary}
      Key Benefits: ${ingestResult.bullets.join(', ')}
      Tone: ${tone}
      
      Please create a comprehensive creative brief with:
      1. Product Summary (2-3 sentences)
      2. Key Benefit (single compelling statement)
      3. Target Audience (specific demographic/psychographic)
      4. Proof Points (3-5 supporting facts)
      5. Offer (optional promotional element)
      6. Primary CTA (clear call to action)
      7. Claims to Avoid (regulatory considerations)
      
      Format as JSON with these fields: productSummary, keyBenefit, targetAudience, proofPoints (array), offer (string or null), primaryCTA, claimsToAvoid (array), tone`;

      const result = await this.retryApiCall(
        () => this.model.generateContent(prompt),
        'Creative brief generation'
      );
      
      const response = await result.response;
      const text = response.text();
      
      try {
        return JSON.parse(text);
      } catch (parseError) {
        // Fallback brief
        return {
          productSummary: ingestResult.summary,
          keyBenefit: ingestResult.bullets[0] || 'Key benefit',
          targetAudience: 'General audience',
          proofPoints: ingestResult.bullets,
          offer: undefined,
          primaryCTA: 'Learn More',
          claimsToAvoid: [],
          tone
        };
      }
    } catch (error) {
      console.error('Error generating creative brief:', error);
      
      // Fallback brief when AI service is unavailable
      if ((error as Error).message?.includes('overloaded') || (error as Error).message?.includes('503')) {
        return this.createFallbackBrief(ingestResult, tone);
      }
      
      throw new Error('Failed to generate creative brief. Please try again.');
    }
  }

  /**
   * Generate video using Veo 2 (simulated for now)
   * Note: Veo 2 video generation is not yet available in the public API
   * This is a placeholder that simulates the process
   */
  async generateVideo(request: VideoGenerationRequest, videoTheme?: string): Promise<VideoGenerationResponse> {
    try {
      console.log('🎬 Generating video with theme:', videoTheme);
      console.log('📝 Video prompt:', request.prompt);
      
      // Import the video generation service
      const { videoGenerationService } = await import('./videoGenerationService');
      
      // Add theme to the request
      const videoRequest = {
        ...request,
        style: request.style || 'performance'
      };
      
      // Generate the video
      const result = await videoGenerationService.generateVideo(videoRequest);
      
      console.log('✅ Video generation completed:', result);
      return result;
      
    } catch (error) {
      console.error('Error generating video:', error);
      throw new Error('Failed to generate video. Please try again.');
    }
  }

  /**
   * Select a contextual video based on the theme from content analysis
   */
  private selectContextualVideoByTheme(theme: string): string {
    const lowerTheme = theme.toLowerCase();
    
    // Business/enterprise videos
    if (lowerTheme.includes('business') || lowerTheme.includes('enterprise') || lowerTheme.includes('corporate')) {
      return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4';
    }
    
    // Tech/software videos
    if (lowerTheme.includes('tech') || lowerTheme.includes('software') || lowerTheme.includes('app') || lowerTheme.includes('digital')) {
      return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    }
    
    // Product/demo videos
    if (lowerTheme.includes('product') || lowerTheme.includes('demo') || lowerTheme.includes('showcase') || lowerTheme.includes('feature')) {
      return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4';
    }
    
    // Marketing/advertising videos
    if (lowerTheme.includes('marketing') || lowerTheme.includes('ad') || lowerTheme.includes('promotion') || lowerTheme.includes('brand')) {
      return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4';
    }
    
    // E-commerce/retail videos
    if (lowerTheme.includes('ecommerce') || lowerTheme.includes('retail') || lowerTheme.includes('shop') || lowerTheme.includes('store')) {
      return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';
    }
    
    // Education/training videos
    if (lowerTheme.includes('education') || lowerTheme.includes('training') || lowerTheme.includes('learning') || lowerTheme.includes('course')) {
      return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4';
    }
    
    // Health/wellness videos
    if (lowerTheme.includes('health') || lowerTheme.includes('wellness') || lowerTheme.includes('fitness') || lowerTheme.includes('medical')) {
      return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    }
    
    // Default to a professional-looking video
    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4';
  }

  /**
   * Select a contextual video based on the prompt content (fallback)
   */
  private selectContextualVideo(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    // Business/tech videos
    if (lowerPrompt.includes('business') || lowerPrompt.includes('software') || lowerPrompt.includes('tech')) {
      return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4';
    }
    
    // Product/demo videos
    if (lowerPrompt.includes('product') || lowerPrompt.includes('demo') || lowerPrompt.includes('showcase')) {
      return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    }
    
    // Marketing/advertising videos
    if (lowerPrompt.includes('marketing') || lowerPrompt.includes('ad') || lowerPrompt.includes('promotion')) {
      return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4';
    }
    
    // Default to a professional-looking video
    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4';
  }

  /**
   * Create fallback content when AI service is unavailable
   */
  private createFallbackContent(input: string): IngestResult {
    const isUrl = input.startsWith('http');
    const words = input.split(' ').slice(0, 5);
    const title = isUrl ? 'Website Content' : words.join(' ');
    
    // Try to determine theme from input with more comprehensive detection
    const lowerInput = input.toLowerCase();
    let videoTheme = 'business';
    
    if (lowerInput.includes('tech') || lowerInput.includes('software') || lowerInput.includes('app') || 
        lowerInput.includes('ai') || lowerInput.includes('digital') || lowerInput.includes('platform')) {
      videoTheme = 'tech';
    } else if (lowerInput.includes('product') || lowerInput.includes('demo') || lowerInput.includes('gadget') ||
               lowerInput.includes('device') || lowerInput.includes('tool')) {
      videoTheme = 'product';
    } else if (lowerInput.includes('marketing') || lowerInput.includes('ad') || lowerInput.includes('promotion') ||
               lowerInput.includes('brand') || lowerInput.includes('campaign')) {
      videoTheme = 'marketing';
    } else if (lowerInput.includes('ecommerce') || lowerInput.includes('shop') || lowerInput.includes('store') ||
               lowerInput.includes('retail') || lowerInput.includes('marketplace')) {
      videoTheme = 'ecommerce';
    } else if (lowerInput.includes('education') || lowerInput.includes('course') || lowerInput.includes('learning') ||
               lowerInput.includes('training') || lowerInput.includes('academy')) {
      videoTheme = 'education';
    } else if (lowerInput.includes('health') || lowerInput.includes('fitness') || lowerInput.includes('wellness') ||
               lowerInput.includes('medical') || lowerInput.includes('care')) {
      videoTheme = 'health';
    }
    
    return {
      title: title || 'Your Product/Service',
      summary: `Based on your input: "${input.substring(0, 150)}${input.length > 150 ? '...' : ''}"`,
      bullets: [
        'Key benefit 1',
        'Key benefit 2', 
        'Key benefit 3'
      ],
      brandColors: ['#02b3e5'],
      logoUrl: undefined,
      videoTheme
    };
  }

  /**
   * Create fallback brief when AI service is unavailable
   */
  private createFallbackBrief(ingestResult: IngestResult, tone: string): CreativeBrief {
    return {
      productSummary: ingestResult.summary,
      keyBenefit: ingestResult.bullets[0] || 'Key benefit',
      targetAudience: 'General audience',
      proofPoints: ingestResult.bullets,
      offer: undefined,
      primaryCTA: 'Learn More',
      claimsToAvoid: [],
      tone: tone as any
    };
  }

  /**
   * Check video generation status
   */
  async checkVideoStatus(jobId: string): Promise<VideoGenerationResponse> {
    try {
      // Simulate checking status
      // In a real implementation, this would poll the Veo 2 API
      const statuses: Array<'queued' | 'processing' | 'completed' | 'failed'> = ['queued', 'processing', 'completed'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      return {
        videoUrl: randomStatus === 'completed' ? '/sample-video.mp4' : '',
        jobId,
        status: randomStatus,
        estimatedTime: randomStatus === 'completed' ? 0 : 30
      };
    } catch (error) {
      console.error('Error checking video status:', error);
      throw new Error('Failed to check video status.');
    }
  }

  /**
   * Generate script variants for video
   */
  async generateScripts(brief: CreativeBrief, duration: number): Promise<Array<{id: string, preset: string, script: string, beats: Array<{t: number, action: string, super?: string}>}>> {
    try {
      const prompt = `Create ${duration}-second video ad scripts based on this creative brief:
      
      Product: ${brief.productSummary}
      Key Benefit: ${brief.keyBenefit}
      Target Audience: ${brief.targetAudience}
      CTA: ${brief.primaryCTA}
      Tone: ${brief.tone}
      
      Create 3 different script variants:
      1. Performance-focused (direct, results-oriented)
      2. Premium (sophisticated, aspirational)
      3. UGC-style (authentic, relatable)
      
      For each script, provide:
      - Full script text
      - Timing breakdown (what happens at each second)
      - On-screen text suggestions
      
      Format as JSON array with: id, preset, script, beats (array of {t, action, super})`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      try {
        return JSON.parse(text);
      } catch (parseError) {
        // Fallback scripts
        return [
          {
            id: 'script_1',
            preset: 'performance',
            script: `Hook: ${brief.keyBenefit}\n\nShow: Product in action\n\nCTA: ${brief.primaryCTA}`,
            beats: [
              { t: 0, action: 'Hook with key benefit', super: brief.keyBenefit },
              { t: 2, action: 'Show product in action', super: '' },
              { t: 4, action: 'Call to action', super: brief.primaryCTA }
            ]
          }
        ];
      }
    } catch (error) {
      console.error('Error generating scripts:', error);
      throw new Error('Failed to generate scripts. Please try again.');
    }
  }
}

export const googleAIService = new GoogleAIService();

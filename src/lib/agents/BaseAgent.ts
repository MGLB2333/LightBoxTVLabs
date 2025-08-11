import type { Agent, AgentContext, AgentMessage, AgentResponse, AgentCapability } from './types';
import { supabase } from '../supabase';
import { ConversationHelper } from './ConversationHelper';

export abstract class BaseAgent implements Agent {
  id: string;
  name: string;
  description: string;
  capabilities: AgentCapability[];
  protected conversationHelper: ConversationHelper;

  constructor(id: string, name: string, description: string, capabilities: AgentCapability[] = []) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.capabilities = capabilities;
    this.conversationHelper = new ConversationHelper();
  }

  abstract canHandle(message: string, context: AgentContext): boolean;
  abstract process(message: string, context: AgentContext, history: AgentMessage[]): Promise<AgentResponse>;

  protected async querySupabase(query: string, context: AgentContext) {
    try {
      // Temporarily disabled - RPC function doesn't exist
      console.warn('Supabase analytics query disabled - RPC function not available');
      return { message: 'Analytics queries are temporarily unavailable. Please contact support.' };
    } catch (error) {
      console.error('Supabase query error:', error);
      throw error;
    }
  }

  protected async callOpenAI(messages: any[], context: AgentContext): Promise<string> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo';
    const maxTokens = parseInt(import.meta.env.VITE_OPENAI_MAX_TOKENS || '4000');
    const temperature = parseFloat(import.meta.env.VITE_OPENAI_TEMPERATURE || '0.7');

    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('OpenAI API key is invalid or expired');
        } else if (response.status === 429) {
          throw new Error('OpenAI API rate limit exceeded');
        } else if (response.status >= 500) {
          throw new Error('OpenAI API server error');
        } else {
          throw new Error(`OpenAI API error: ${response.status}`);
        }
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'No response from OpenAI';
    } catch (error) {
      console.error('OpenAI API error:', error);
      
      // Return a fallback response instead of throwing
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          return 'OpenAI API key is not configured or invalid. Please check your API key in the environment variables.';
        } else if (error.message.includes('rate limit')) {
          return 'OpenAI API rate limit exceeded. Please try again later.';
        } else if (error.message.includes('server error')) {
          return 'OpenAI API is currently unavailable. Please try again later.';
        }
      }
      
      return 'Unable to connect to OpenAI API. Please check your internet connection and API key configuration.';
    }
  }

  protected async processWithTwoCalls(
    message: string, 
    context: AgentContext, 
    history: AgentMessage[],
    systemPrompt: string
  ): Promise<string> {
    // First call: Analyze the query and determine what data/context is needed
    const analysisPrompt = `You are ${this.name}. Analyze the following user query and determine:
1. What specific information or data is being requested
2. What type of analysis or insight would be most helpful
3. What context from the user's current situation is relevant

User query: "${message}"
Current context: ${JSON.stringify(context)}

Provide a brief analysis (2-3 sentences) of what the user is asking for and what would be most helpful to them.`;

    const analysisMessages = [
      { role: 'system', content: analysisPrompt },
      ...history.slice(-3).map(msg => ({ role: msg.role, content: msg.content }))
    ];

    const analysis = await this.callOpenAI(analysisMessages, context);

    // Second call: Provide detailed response based on the analysis
    const detailedPrompt = `${systemPrompt}

ANALYSIS OF USER QUERY:
${analysis}

Based on this analysis, provide a detailed, helpful response to the user's query. Be specific, actionable, and relevant to their LightBoxTV analytics context.`;

    const detailedMessages = [
      { role: 'system', content: detailedPrompt },
      ...history.slice(-3).map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: message }
    ];

    return await this.callOpenAI(detailedMessages, context);
  }

  protected async processWithChainOfThought(
    message: string, 
    context: AgentContext, 
    history: AgentMessage[],
    systemPrompt: string
  ): Promise<string> {
    // Step 1: Query Analysis and Planning
    const planningPrompt = `You are ${this.name}. Analyze this user query and determine:
1. What specific information or data is being requested
2. What type of analysis or insight would be most helpful
3. What context from the user's current situation is relevant

User query: "${message}"
Current context: ${JSON.stringify(context)}

Provide a brief analysis (2-3 sentences) of what the user is asking for and what would be most helpful to them.`;

    const planningMessages = [
      { role: 'system', content: planningPrompt },
      ...history.slice(-5).map(msg => ({ role: msg.role, content: msg.content }))
    ];

    const analysis = await this.callOpenAI(planningMessages, context);

    // Step 2: Data Gathering (if needed)
    let dataContext = '';
    if (analysis.includes('DATA_NEEDED')) {
      dataContext = await this.gatherRelevantData(message, context, analysis);
    }

    // Step 3: Structured Response Generation
    const detailedPrompt = `${systemPrompt}

ANALYSIS OF USER QUERY:
${analysis}

${dataContext ? `RELEVANT DATA:\n${dataContext}\n` : ''}

Based on this analysis, provide a direct, helpful response to the user's query. Be specific, actionable, and relevant to their LightBoxTV analytics context. Keep it concise and clean - no excessive formatting or asterisks.`;

    const detailedMessages = [
      { role: 'system', content: detailedPrompt },
      ...history.slice(-3).map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: message }
    ];

    return await this.callOpenAI(detailedMessages, context);
  }

  protected async gatherRelevantData(message: string, context: AgentContext, planning: string): Promise<string> {
    // This method should be overridden by specific agents to gather relevant data
    return '';
  }

  protected async classifyQuery(message: string, context: AgentContext): Promise<{
    intent: string;
    confidence: number;
    requiresData: boolean;
    complexity: 'simple' | 'moderate' | 'complex';
    potentialIssues: string[];
  }> {
    const classificationPrompt = `Classify this user query for a LightBoxTV analytics platform:

QUERY: "${message}"
CONTEXT: ${JSON.stringify(context, null, 2)}

Provide classification in JSON format:
{
  "intent": "what the user is trying to accomplish",
  "confidence": 0.0-1.0,
  "requiresData": true/false,
  "complexity": "simple|moderate|complex",
  "potentialIssues": ["list of potential problems or misunderstandings"]
}

Focus on:
- Is this a data request, analysis request, or general question?
- Does it require specific data from the platform?
- How complex is the reasoning required?
- What could go wrong in understanding this query?`;

    const classificationMessages = [
      { role: 'system', content: classificationPrompt },
      { role: 'user', content: message }
    ];

    try {
      const response = await this.callOpenAI(classificationMessages, context);
      const classification = JSON.parse(response);
      return classification;
    } catch (error) {
      console.error('Query classification failed:', error);
      return {
        intent: 'general_question',
        confidence: 0.5,
        requiresData: false,
        complexity: 'simple',
        potentialIssues: ['Unable to classify query']
      };
    }
  }

  protected async validateResponse(response: string, originalQuery: string): Promise<{
    isValid: boolean;
    issues: string[];
    suggestedImprovements: string[];
  }> {
    const validationPrompt = `Validate this AI response for a user query:

ORIGINAL QUERY: "${originalQuery}"
AI RESPONSE: "${response}"

Evaluate the response and provide feedback in JSON format:
{
  "isValid": true/false,
  "issues": ["list of problems with the response"],
  "suggestedImprovements": ["how to improve the response"]
}

Check for:
- Does it actually answer the user's question?
- Is it factually accurate and relevant?
- Is it actionable and helpful?
- Does it avoid generic or vague statements?
- Is it appropriate for the LightBoxTV context?`;

    const validationMessages = [
      { role: 'system', content: validationPrompt },
      { role: 'user', content: `Query: "${originalQuery}"\nResponse: "${response}"` }
    ];

    try {
      const validation = await this.callOpenAI(validationMessages, {});
      return JSON.parse(validation);
    } catch (error) {
      console.error('Response validation failed:', error);
      return {
        isValid: true,
        issues: [],
        suggestedImprovements: []
      };
    }
  }

  protected createSystemPrompt(context: AgentContext): string {
    return `You are ${this.name}, a specialized AI agent for LightBoxTV. 

Your capabilities include:
${this.capabilities.map(cap => `- ${cap.name}: ${cap.description}`).join('\n')}

Current context:
- User ID: ${context.userId || 'Unknown'}
- Organization ID: ${context.organizationId || 'Unknown'}
- Current page: ${context.currentPage || 'Unknown'}
- Active filters: ${JSON.stringify(context.filters || {})}

Provide helpful, accurate responses based on the LightBoxTV analytics data. Always be concise and actionable.`;
  }

  protected async processWithIterativeReasoning(
    message: string, 
    context: AgentContext, 
    history: AgentMessage[],
    systemPrompt: string,
    maxIterations: number = 3
  ): Promise<string> {
    let currentResponse = '';
    let iteration = 0;
    let isSatisfactory = false;

    while (iteration < maxIterations && !isSatisfactory) {
      iteration++;
      console.log(`${this.name} - Iteration ${iteration}/${maxIterations}`);

      // Step 1: Generate or improve response
      if (iteration === 1) {
        // First attempt - use Chain-of-Thought
        currentResponse = await this.processWithChainOfThought(message, context, history, systemPrompt);
      } else {
        // Subsequent attempts - improve based on feedback
        currentResponse = await this.improveResponseWithContext(message, currentResponse, context, history);
      }

      // Step 2: Validate against original question
      const validation = await this.validateResponseThoroughly(currentResponse, message, context);
      
      if (validation.isSatisfactory) {
        isSatisfactory = true;
        console.log(`${this.name} - Response validated successfully on iteration ${iteration}`);
      } else {
        console.log(`${this.name} - Response needs improvement:`, validation.issues);
        
        // If this is the last iteration, try one final improvement
        if (iteration === maxIterations) {
          currentResponse = await this.generateFinalResponse(message, currentResponse, validation.issues, context);
          isSatisfactory = true; // Force completion
        }
      }
    }

    return currentResponse;
  }

  private async validateResponseThoroughly(
    response: string, 
    originalQuery: string, 
    context: AgentContext
  ): Promise<{
    isSatisfactory: boolean;
    issues: string[];
    score: number;
  }> {
    const validationPrompt = `CRITICALLY EVALUATE this AI response for a user query:

ORIGINAL USER QUERY: "${originalQuery}"
AI RESPONSE: "${response}"

Rate this response on a scale of 1-10 and provide detailed feedback in JSON format:
{
  "score": 1-10,
  "isSatisfactory": true/false,
  "issues": ["list of specific problems"],
  "strengths": ["what the response does well"],
  "missing": ["what the response fails to address"]
}

EVALUATION CRITERIA:
1. **Direct Answer**: Does it actually answer the user's question?
2. **Relevance**: Is the response relevant to what was asked?
3. **Specificity**: Does it provide specific, actionable information?
4. **Data Usage**: Does it use real data when available?
5. **Helpfulness**: Would this response actually help the user?
6. **Conciseness**: Is it concise and to the point?
7. **Formatting**: Is it clean without excessive formatting?

A response is SATISFACTORY if:
- Score >= 7
- Directly addresses the user's question
- Provides specific, actionable information
- Uses real data when appropriate
- Doesn't give generic error messages or feature lists
- Is concise (under 3 sentences unless listing data)
- Has clean formatting (no excessive asterisks or bold text)

A response is NOT SATISFACTORY if:
- Score < 7
- Gives generic error messages
- Lists capabilities instead of answering
- Provides vague or non-specific information
- Doesn't address the actual question asked
- Is too verbose or wordy
- Uses excessive formatting or asterisks`;

    try {
      const validationMessages = [
        { role: 'system', content: validationPrompt },
        { role: 'user', content: `Query: "${originalQuery}"\nResponse: "${response}"` }
      ];

      const validationResult = await this.callOpenAI(validationMessages, context);
      const parsed = JSON.parse(validationResult);
      
      return {
        isSatisfactory: parsed.isSatisfactory || parsed.score >= 7,
        issues: parsed.issues || [],
        score: parsed.score || 0
      };
    } catch (error) {
      console.error('Response validation failed:', error);
      // Fallback validation
      const hasErrorKeywords = response.toLowerCase().includes('error') || 
                              response.toLowerCase().includes('trouble') ||
                              response.toLowerCase().includes('try again');
      
      const hasGenericKeywords = response.toLowerCase().includes('i can help you') ||
                                response.toLowerCase().includes('try asking me') ||
                                response.toLowerCase().includes('capabilities');

      const hasExcessiveFormatting = response.includes('**') || 
                                    response.includes('Direct Answer:') ||
                                    response.includes('Supporting Evidence:') ||
                                    response.includes('Actionable Insights:') ||
                                    response.includes('Next Steps:');

      const isTooVerbose = response.split('.').length > 5;

      return {
        isSatisfactory: !hasErrorKeywords && !hasGenericKeywords && !hasExcessiveFormatting && !isTooVerbose && response.length > 20,
        issues: [
          ...(hasErrorKeywords ? ['Contains error message'] : []),
          ...(hasGenericKeywords ? ['Generic response'] : []),
          ...(hasExcessiveFormatting ? ['Excessive formatting'] : []),
          ...(isTooVerbose ? ['Too verbose'] : [])
        ],
        score: hasErrorKeywords || hasGenericKeywords || hasExcessiveFormatting || isTooVerbose ? 3 : 6
      };
    }
  }

  private async improveResponseWithContext(
    originalQuery: string,
    currentResponse: string,
    context: AgentContext,
    history: AgentMessage[]
  ): Promise<string> {
    const improvementPrompt = `IMPROVE this AI response. The current response is inadequate and needs to be better.

ORIGINAL USER QUERY: "${originalQuery}"
CURRENT INADEQUATE RESPONSE: "${currentResponse}"

CONTEXT: ${JSON.stringify(context, null, 2)}

TASK: Generate a MUCH BETTER response that:
1. Actually answers the user's question - Don't give generic responses or error messages
2. Uses real data - If the user is asking about campaigns, actually fetch and show their campaigns
3. Be specific and actionable - Give concrete information, not vague suggestions
4. Be helpful - Provide value to the user
5. Be concise and clean - No asterisks, no excessive formatting, keep it short and to the point

IMPORTANT:
- If the user asks "what campaigns do I have", actually list their campaigns
- If the user asks "what was my last campaign", find and show their most recent campaign
- If you can't access data, explain why briefly and suggest alternatives
- NEVER give generic error messages or capability lists
- Keep responses under 3 sentences unless listing specific data
- No bold formatting or asterisks

Generate a direct, helpful, concise response:`;

    const improvementMessages = [
      { role: 'system', content: improvementPrompt },
      ...history.slice(-3).map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: originalQuery }
    ];

    try {
      return await this.callOpenAI(improvementMessages, context);
    } catch (error) {
      console.error('Response improvement failed:', error);
      return currentResponse;
    }
  }

  private async generateFinalResponse(
    originalQuery: string,
    currentResponse: string,
    issues: string[],
    context: AgentContext
  ): Promise<string> {
    const finalPrompt = `The user asked: "${originalQuery}"

Previous attempts failed with these issues: ${issues.join(', ')}

Current inadequate response: "${currentResponse}"

Generate a FINAL, DIRECT response that actually helps the user. 

RULES:
1. Answer the question directly - No generic responses
2. Be honest about limitations - If you can't access data, say why briefly
3. Provide alternatives - Suggest what the user can do
4. Be specific - Give concrete information
5. Be concise - Keep it short and to the point
6. No formatting - No asterisks, no bold text, no excessive structure

Generate a helpful, direct, concise response:`;

    try {
      const finalMessages = [
        { role: 'system', content: finalPrompt },
        { role: 'user', content: originalQuery }
      ];

      return await this.callOpenAI(finalMessages, context);
    } catch (error) {
      console.error('Final response generation failed:', error);
      return `I understand you're asking about "${originalQuery}", but I'm having difficulty accessing the specific data needed. Please try checking your dashboard directly or contact support if you need immediate assistance.`;
    }
  }

  protected async generateAndExecuteSQL(
    userQuery: string,
    context: AgentContext,
    tableSchema?: Record<string, any>
  ): Promise<{ data: any; query: string; error?: string }> {
    try {
      // Step 1: Generate SQL query based on user question
      const sqlQuery = await this.generateSQLQuery(userQuery, context, tableSchema);
      
      if (!sqlQuery) {
        return { data: null, query: '', error: 'Could not generate SQL query' };
      }

      console.log('Generated SQL:', sqlQuery);

      // Step 2: Execute the query
      const { data, error } = await supabase.rpc('execute_sql', { 
        sql_query: sqlQuery,
        user_id: context.userId,
        organization_id: context.organizationId
      });

      if (error) {
        console.error('SQL execution error:', error);
        return { data: null, query: sqlQuery, error: error.message };
      }

      return { data, query: sqlQuery };
    } catch (error) {
      console.error('SQL generation/execution error:', error);
      return { data: null, query: '', error: 'Failed to execute SQL query' };
    }
  }

  private async generateSQLQuery(
    userQuery: string,
    context: AgentContext,
    tableSchema?: Record<string, any>
  ): Promise<string | null> {
    const schemaInfo = tableSchema || await this.getTableSchema();
    
    const sqlPrompt = `You are a SQL expert. Generate a SQL query to answer this user question.

USER QUESTION: "${userQuery}"
USER CONTEXT: User ID: ${context.userId}, Organization ID: ${context.organizationId}

AVAILABLE TABLES AND SCHEMAS:
${schemaInfo}

REQUIREMENTS:
1. Generate a valid PostgreSQL query
2. Always filter by organization_id = '${context.organizationId}' for data security
3. Use appropriate JOINs if needed
4. Limit results to reasonable amounts (max 1000 rows)
5. Order by relevant fields (created_at DESC for recent data)
6. Handle NULL values appropriately
7. Use proper aggregation if asking for counts, sums, etc.
8. Only use columns that definitely exist in the schema
9. If unsure about a column, use a simpler query with basic fields

SAFE EXAMPLES:
- "what campaigns do I have" → SELECT name, status, created_at FROM campaigns WHERE organization_id = '${context.organizationId}' ORDER BY created_at DESC
- "how many impressions" → SELECT SUM(impressions) as total_impressions FROM campaign_events WHERE organization_id = '${context.organizationId}'
- "recent performance" → SELECT campaign_id, SUM(impressions) as impressions, SUM(completions) as completions FROM campaign_events WHERE organization_id = '${context.organizationId}' GROUP BY campaign_id ORDER BY SUM(impressions) DESC LIMIT 10

Generate only the SQL query, no explanations:`;

    try {
      const response = await this.callOpenAI([
        { role: 'system', content: sqlPrompt },
        { role: 'user', content: userQuery }
      ], context);

      // Extract SQL from response (remove any markdown formatting)
      const sqlMatch = response.match(/```sql\s*([\s\S]*?)\s*```/) || 
                      response.match(/```\s*([\s\S]*?)\s*```/) ||
                      [null, response.trim()];
      
      return sqlMatch[1] || null;
    } catch (error) {
      console.error('SQL generation failed:', error);
      return null;
    }
  }

  private async getTableSchema(): Promise<string> {
    // This would ideally fetch the actual schema from Supabase
    // For now, return a hardcoded schema based on what we know
    return `
campaigns:
- id (uuid, primary key)
- name (text)
- status (text)
- organization_id (uuid)
- created_at (timestamp)
- start_date (date)
- end_date (date)
- budget (numeric)
- spend (numeric)

campaign_events:
- id (uuid, primary key)
- campaign_id (uuid, foreign key to campaigns.id)
- organization_id (uuid)
- postcode_sector (text)
- impressions (integer)
- completions (integer)
- spend (numeric)
- created_at (timestamp)

experian_segments:
- id (uuid, primary key)
- segment_name (text)
- category (text)
- description (text)

organizations:
- id (uuid, primary key)
- name (text)
- created_at (timestamp)

organization_members:
- id (uuid, primary key)
- organization_id (uuid, foreign key to organizations.id)
- user_id (uuid)
- role (text)
- created_at (timestamp)

youtube_curated_packages:
- id (uuid, primary key)
- name (text)
- organization_id (uuid)
- is_public (boolean)
- created_at (timestamp)
`;
  }

  protected async solveWithSQL(
    userQuery: string,
    context: AgentContext
  ): Promise<string> {
    try {
      // First, try to understand what the user is asking for
      const analysis = await this.analyzeUserQuery(userQuery);
      
      // Try multiple approaches to solve the problem
      const approaches = [
        () => this.tryDirectSupabaseQuery(userQuery, context),
        () => this.generateAndExecuteSQL(userQuery, context),
        () => this.tryAlternativeQuery(userQuery, context, analysis)
      ];

      for (const approach of approaches) {
        try {
          const result = await approach();
          if (result && result.data && result.data.length > 0) {
            return this.formatSQLResults(result.data, userQuery);
          }
        } catch (error) {
          console.log('Approach failed, trying next:', error.message);
          continue;
        }
      }

      // If all approaches fail, provide a helpful response
      return this.generateHelpfulNoDataResponse(userQuery, context);
    } catch (error) {
      console.error('SQL solving error:', error);
      return this.generateHelpfulNoDataResponse(userQuery, context);
    }
  }

  private async analyzeUserQuery(userQuery: string): Promise<any> {
    const analysisPrompt = `Analyze this user query to understand what data they need:

QUERY: "${userQuery}"

Provide analysis in JSON format:
{
  "dataType": "campaigns|metrics|performance|audience|etc",
  "timeframe": "current|recent|historical|specific",
  "aggregation": "count|sum|average|list|compare",
  "specificFields": ["field1", "field2"],
  "filters": ["active", "recent", "top"]
}`;

    try {
      const response = await this.callOpenAI([
        { role: 'system', content: analysisPrompt },
        { role: 'user', content: userQuery }
      ], {});

      return JSON.parse(response);
    } catch (error) {
      return { dataType: 'general', timeframe: 'current', aggregation: 'list' };
    }
  }

  private async tryDirectSupabaseQuery(userQuery: string, context: AgentContext): Promise<any> {
    const lowerQuery = userQuery.toLowerCase();
    
    // Try simple, safe queries first
    if (lowerQuery.includes('campaign') && (lowerQuery.includes('have') || lowerQuery.includes('running'))) {
      const { data, error } = await supabase
        .from('campaigns')
        .select('name, status, created_at')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return { data, query: 'direct_campaigns_query' };
      }
    }

    if (lowerQuery.includes('last') || lowerQuery.includes('recent')) {
      const { data, error } = await supabase
        .from('campaigns')
        .select('name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data) {
        return { data, query: 'direct_last_campaign_query' };
      }
    }

    throw new Error('Direct query not applicable');
  }

  private async tryAlternativeQuery(userQuery: string, context: AgentContext, analysis: any): Promise<any> {
    // Try alternative approaches based on analysis
    const lowerQuery = userQuery.toLowerCase();
    
    if (analysis.dataType === 'campaigns') {
      // Try with minimal fields to avoid missing column errors
      const { data, error } = await supabase
        .from('campaigns')
        .select('name, status, created_at')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return { data, query: 'alternative_campaigns_query' };
      }
    }

    if (analysis.dataType === 'metrics' || lowerQuery.includes('performance')) {
      // Try campaign summary metrics for performance data
      const { data, error } = await supabase
        .from('campaign_summary_metrics')
        .select('campaign_id, campaign_name, total_impressions, total_completed_views, total_spend, total_revenue, completion_rate')
        .limit(100);

      if (!error && data) {
        return { data, query: 'alternative_metrics_query' };
      }
    }

    throw new Error('Alternative query not applicable');
  }

  private generateHelpfulNoDataResponse(userQuery: string, context: AgentContext): string {
    const lowerQuery = userQuery.toLowerCase();
    
    if (lowerQuery.includes('campaign')) {
      return "I couldn't find any campaign data in your account. This might mean you haven't created any campaigns yet, or the data isn't properly connected. You can create campaigns from the Campaigns page in your dashboard.";
    }
    
    if (lowerQuery.includes('performance') || lowerQuery.includes('metrics')) {
      return "I couldn't access your performance data. This could be because there's no campaign data yet, or the data connection needs to be set up. Check your campaign dashboard for current metrics.";
    }
    
    return `I understand you're asking about "${userQuery}", but I couldn't find the relevant data in your account. This might be because the data hasn't been set up yet, or there's a connection issue. You can check your dashboard directly or contact support for assistance.`;
  }

  private formatSQLResults(data: any[], userQuery: string): string {
    if (!data || data.length === 0) {
      return 'No data found.';
    }

    const lowerQuery = userQuery.toLowerCase();
    
    // Handle different types of queries
    if (lowerQuery.includes('count') || lowerQuery.includes('how many')) {
      const count = data[0]?.count || data[0]?.total || data.length;
      return `${count} ${lowerQuery.includes('campaign') ? 'campaigns' : 'records'} found.`;
    }
    
    if (lowerQuery.includes('campaign') && (lowerQuery.includes('have') || lowerQuery.includes('list'))) {
      const campaigns = data.map(row => `${row.name} (${row.status || 'draft'})`);
      return `Your campaigns: ${campaigns.join(', ')}.`;
    }
    
    if (lowerQuery.includes('performance') || lowerQuery.includes('metrics')) {
      const metrics = data.map(row => {
        const parts = [];
        if (row.total_impressions) parts.push(`${row.total_impressions.toLocaleString()} impressions`);
        if (row.total_completed_views) parts.push(`${row.total_completed_views.toLocaleString()} completed views`);
        if (row.completion_rate) parts.push(`${row.completion_rate}% completion rate`);
        if (row.total_spend) parts.push(`£${row.total_spend.toLocaleString()} spend`);
        if (row.total_revenue) parts.push(`£${row.total_revenue.toLocaleString()} revenue`);
        return parts.join(', ');
      });
      return `Performance data: ${metrics.join('; ')}.`;
    }
    
    // Default formatting
    if (data.length === 1) {
      const row = data[0];
      const fields = Object.entries(row)
        .filter(([key, value]) => value !== null && key !== 'id')
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      return fields;
    }
    
    return `${data.length} records found. First few: ${data.slice(0, 3).map(row => 
      Object.values(row).filter(v => v !== null).join(', ')
    ).join('; ')}.`;
  }
} 
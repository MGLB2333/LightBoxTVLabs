import type { AgentContext, AgentMessage, AgentResponse } from './types';
import { MasterAgent } from './MasterAgent';

class AgentService {
  private masterAgent: MasterAgent;
  private messageHistory: AgentMessage[] = [];

  constructor() {
    this.masterAgent = new MasterAgent();
  }

  async processMessage(message: string, context: AgentContext): Promise<AgentResponse> {
    try {
      // Add user message to history
      const userMessage: AgentMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: new Date()
      };
      this.messageHistory.push(userMessage);

      // Process with master agent directly
      const response = await this.masterAgent.process(message, context, this.messageHistory);

      // Add AI response to history
      const aiMessage: AgentMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        agentId: 'master'
      };
      this.messageHistory.push(aiMessage);

      return response;
    } catch (error) {
      console.error('AgentService error:', error);
      return {
        content: 'I apologize, but I encountered an error while processing your request. Please try again.',
        confidence: 0.1
      };
    }
  }

  getMessageHistory(): AgentMessage[] {
    return [...this.messageHistory];
  }

  clearHistory(): void {
    this.messageHistory = [];
  }

  getAvailableAgents() {
    // Since agents is now private, we'll return a static list of available agents
    return [
      {
        id: 'campaign',
        name: 'Campaign Agent',
        description: 'Specialized in campaign analytics, performance insights, and strategic recommendations using real LightBoxTV data',
        capabilities: [
          {
            name: 'Campaign Analytics',
            description: 'Analyze campaign performance metrics and data insights',
            examples: ['How is my campaign performing?', 'Show me campaign impressions']
          },
          {
            name: 'Performance Insights',
            description: 'Provide insights from campaign data and identify patterns',
            examples: ['Which campaigns perform best?', 'What insights can you find?']
          }
        ]
      },
      {
        id: 'audience',
        name: 'Audience Agent',
        description: 'Specialized in audience analysis, demographics, and geographic distribution insights',
        capabilities: [
          {
            name: 'Demographic Analysis',
            description: 'Analyze audience demographics and characteristics',
            examples: ['What is my audience demographic breakdown?', 'Who are my target viewers?']
          },
          {
            name: 'Geographic Insights',
            description: 'Provide geographic distribution and location-based insights',
            examples: ['Where are my viewers located?', 'Which regions perform best?']
          }
        ]
      }
    ];
  }

  async getAgentSuggestions(context: AgentContext): Promise<string[]> {
    const suggestions: string[] = [
      'How many impressions did my campaign deliver?',
      'Which regions perform best?',
      'What are my top publishers?',
      'How can I optimize my campaign?',
      'Where are my viewers located?',
      'What insights can you find in my data?'
    ];

    return suggestions;
  }
}

// Create singleton instance
export const agentService = new AgentService(); 
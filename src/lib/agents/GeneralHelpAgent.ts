import { BaseAgent } from './BaseAgent';
import type { AgentContext, AgentMessage, AgentResponse } from './types';

interface HelpTopic {
  id: string;
  title: string;
  description: string;
  content: string;
  keywords: string[];
  relatedTopics: string[];
  relevanceScore?: number;
}

export class GeneralHelpAgent extends BaseAgent {
  private helpTopics: HelpTopic[] = [];

  constructor() {
    super(
      'general-help',
      'General Help Agent',
      'Provides assistance with platform navigation, UI help, and general questions about LightBoxTV',
      [
        {
          name: 'Platform Navigation',
          description: 'Help users navigate the LightBoxTV platform and understand its features',
          examples: [
            'How do I create a new campaign?',
            'Where can I find my analytics?',
            'How do I use the audience builder?'
          ]
        },
        {
          name: 'Feature Help',
          description: 'Explain platform features and how to use them effectively',
          examples: [
            'What is the AI Audience Builder?',
            'How does the map visualization work?',
            'What are the different analytics views?'
          ]
        },
        {
          name: 'General Support',
          description: 'Provide general support and answer common questions',
          examples: [
            'How do I contact support?',
            'What are the system requirements?',
            'How do I export my data?'
          ]
        }
      ]
    );

    this.initializeHelpTopics();
  }

  canHandle(message: string, context: AgentContext): boolean {
    const helpKeywords = [
      'help', 'how', 'what', 'where', 'when', 'why', 'guide', 'tutorial',
      'support', 'assist', 'explain', 'show me', 'tell me', 'navigate',
      'feature', 'function', 'button', 'menu', 'page', 'section',
      'create', 'find', 'access', 'use', 'work', 'understand'
    ];

    const lowerMessage = message.toLowerCase();
    return helpKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  async process(message: string, context: AgentContext, history: AgentMessage[]): Promise<AgentResponse> {
    try {
      // Step 1: Analyze the request and find relevant help topics
      const relevantTopics = await this.findRelevantTopics(message);
      
      // Step 2: Check if we have enough information to provide a helpful response
      if (relevantTopics.length === 0) {
        return {
          content: this.generateGeneralHelpResponse(),
          confidence: 0.3,
          agentId: 'general-help',
          agentName: 'General Help Agent',
          suggestions: [
            'Ask about specific platform features',
            'Request help with navigation',
            'Ask about analytics or campaigns',
            'Get help with audience building'
          ]
        };
      }

      // Step 3: Generate a comprehensive help response
      const response = await this.generateHelpResponse(message, relevantTopics, context);
      
      // Step 4: Add suggestions and next actions
      const suggestions = this.generateSuggestions(relevantTopics);

      return {
        content: response,
        confidence: 0.8,
        agentId: 'general-help',
        agentName: 'General Help Agent',
        suggestions,
        nextActions: [
          'Explore the platform features',
          'Contact support for specific issues',
          'Check the documentation',
          'Try the interactive tutorials'
        ]
      };
    } catch (error) {
      console.error('General Help Agent error:', error);
      return {
        content: "I encountered an error while processing your help request. Please try rephrasing your question or contact support directly.",
        confidence: 0.1,
        agentId: 'general-help',
        agentName: 'General Help Agent'
      };
    }
  }

  private initializeHelpTopics(): void {
    this.helpTopics = [
      {
        id: 'campaign-creation',
        title: 'Creating Campaigns',
        description: 'How to create and manage campaigns in LightBoxTV',
        content: `## 🚀 Creating Campaigns

**To create a new campaign:**

1. **Navigate to Campaigns** - Click on "Campaigns" in the main navigation
2. **Click "New Campaign"** - Use the "+" button or "Create Campaign" button
3. **Fill in Campaign Details:**
   - Campaign name
   - Start and end dates
   - Budget allocation
   - Target audience segments
4. **Configure Settings:**
   - Geographic targeting
   - Inventory selection
   - Creative assets
5. **Review and Launch** - Review all settings and click "Launch Campaign"

**Pro Tips:**
- Use the AI Audience Builder to find the perfect target segments
- Set up A/B testing for different creative variations
- Monitor performance in real-time using the analytics dashboard`,
        keywords: ['create', 'campaign', 'new', 'launch', 'start', 'setup'],
        relatedTopics: ['audience-builder', 'analytics', 'targeting']
      },
      {
        id: 'audience-builder',
        title: 'AI Audience Builder',
        description: 'How to use the AI-powered audience builder to find target segments',
        content: `## 🎯 AI Audience Builder

**The AI Audience Builder helps you find the perfect audience segments:**

### **Main Features:**
- **AI-Powered Recommendations** - Describe your target audience and get AI suggestions
- **Experian Data Integration** - Access to comprehensive demographic and lifestyle data
- **Geographic Visualization** - See audience distribution on interactive maps
- **Segment Comparison** - Compare different audience segments

### **How to Use:**

1. **Navigate to Audience Builder** - Click "Audience Builder" in the main menu
2. **Choose Your Approach:**
   - **Manual Selection** - Browse and select segments manually
   - **AI Recommendations** - Use the AI tab to get intelligent suggestions
3. **For AI Recommendations:**
   - Describe your target audience (e.g., "Young professionals interested in tech")
   - Click "Generate Recommendations"
   - Review and select relevant segments
   - Apply to your campaign

### **Pro Tips:**
- Be specific in your audience descriptions for better AI recommendations
- Use the geographic map to visualize audience distribution
- Combine multiple segments for broader reach`,
        keywords: ['audience', 'builder', 'ai', 'segment', 'target', 'demographic'],
        relatedTopics: ['campaign-creation', 'analytics', 'geographic-targeting']
      },
      {
        id: 'analytics-dashboard',
        title: 'Analytics Dashboard',
        description: 'Understanding and using the analytics dashboard',
        content: `## 📊 Analytics Dashboard

**The Analytics Dashboard provides comprehensive insights into your campaigns:**

### **Available Views:**

1. **Overview** - High-level campaign performance metrics
2. **Audience** - Demographic and audience insights
3. **Content** - Content performance and engagement
4. **Inventory** - Publisher and inventory performance
5. **Supply Path** - Campaign delivery and optimization insights

### **Key Metrics:**
- **Reach** - Total unique viewers reached
- **Impressions** - Total ad impressions served
- **CPM** - Cost per thousand impressions
- **Completion Rate** - Percentage of completed video views
- **Geographic Distribution** - Audience location breakdown

### **How to Use:**
1. **Select Time Period** - Choose the date range for your analysis
2. **Filter Data** - Use filters to focus on specific campaigns or segments
3. **Export Reports** - Download data for external analysis
4. **Set Alerts** - Configure notifications for key metrics

### **Pro Tips:**
- Use the comparison feature to analyze performance over time
- Set up custom dashboards for your most important metrics
- Export data regularly for external reporting`,
        keywords: ['analytics', 'dashboard', 'metrics', 'performance', 'report', 'data'],
        relatedTopics: ['campaign-creation', 'audience-builder', 'optimization']
      },
      {
        id: 'geographic-targeting',
        title: 'Geographic Targeting',
        description: 'How to target specific geographic areas and use the map visualization',
        content: `## 🗺️ Geographic Targeting

**Target your campaigns to specific geographic areas:**

### **Map Visualization:**
- **Interactive Hexagons** - See audience distribution in hexagonal grid
- **Color Coding** - Different colors represent audience density
- **Postcode Sectors** - Drill down to specific postcode areas
- **Resolution Control** - Adjust hexagon size for different detail levels

### **How to Use Geographic Targeting:**

1. **In Audience Builder:**
   - Select segments and see their geographic distribution
   - Use the map to understand audience concentration
   - Filter by specific regions or postcodes

2. **In Campaign Creation:**
   - Set geographic targeting parameters
   - Exclude or include specific areas
   - Use radius targeting around specific locations

3. **In Analytics:**
   - View geographic performance data
   - Identify high-performing areas
   - Optimize targeting based on results

### **Pro Tips:**
- Use different hexagon resolutions for different analysis needs
- Combine geographic targeting with demographic targeting
- Monitor geographic performance to optimize future campaigns`,
        keywords: ['geographic', 'map', 'location', 'postcode', 'area', 'region', 'targeting'],
        relatedTopics: ['audience-builder', 'analytics', 'campaign-creation']
      },
      {
        id: 'optimization',
        title: 'Campaign Optimization',
        description: 'How to optimize your campaigns for better performance',
        content: `## ⚡ Campaign Optimization

**Optimize your campaigns for maximum performance:**

### **Key Optimization Areas:**

1. **Audience Targeting:**
   - Use AI recommendations to find better segments
   - Analyze audience overlap and reach
   - Test different audience combinations

2. **Creative Optimization:**
   - A/B test different creative variations
   - Monitor completion rates and engagement
   - Optimize for different audience segments

3. **Budget Allocation:**
   - Distribute budget across high-performing segments
   - Adjust bids based on performance
   - Use automated optimization features

4. **Geographic Optimization:**
   - Focus budget on high-performing areas
   - Exclude low-performing regions
   - Use geographic insights for future campaigns

### **Optimization Tools:**
- **Real-time Monitoring** - Track performance as it happens
- **Automated Recommendations** - Get AI-powered optimization suggestions
- **Performance Alerts** - Set up notifications for key metrics
- **A/B Testing** - Test different campaign variations

### **Pro Tips:**
- Start with broad targeting and narrow down based on performance
- Monitor campaigns regularly and make adjustments
- Use historical data to inform optimization decisions`,
        keywords: ['optimize', 'optimization', 'performance', 'improve', 'better', 'efficient'],
        relatedTopics: ['analytics', 'audience-builder', 'campaign-creation']
      },
      {
        id: 'support-contact',
        title: 'Contact Support',
        description: 'How to get help and contact the support team',
        content: `## 🆘 Contact Support

**Need help? Here's how to get support:**

### **Support Channels:**

1. **In-App Chat** - Use the chat widget in the bottom right corner
2. **Email Support** - Send detailed questions to support@lightboxtv.com
3. **Phone Support** - Call +44 (0) 20 1234 5678 during business hours
4. **Documentation** - Check our comprehensive help documentation

### **Before Contacting Support:**

1. **Check the Help Section** - Many questions are answered in our help topics
2. **Gather Information** - Have your campaign details and issue description ready
3. **Screenshots** - Include screenshots if reporting a visual issue
4. **Steps to Reproduce** - Provide clear steps to reproduce the issue

### **Response Times:**
- **Chat Support** - Usually within minutes during business hours
- **Email Support** - Within 24 hours
- **Phone Support** - Immediate during business hours (9 AM - 6 PM GMT)

### **Business Hours:**
- **Monday - Friday:** 9:00 AM - 6:00 PM GMT
- **Weekend:** Limited support available

**Pro Tip:** Use the chat widget for quick questions and email for complex issues requiring detailed investigation.`,
        keywords: ['support', 'help', 'contact', 'assist', 'issue', 'problem', 'error'],
        relatedTopics: ['campaign-creation', 'analytics', 'audience-builder']
      }
    ];
  }

  private async findRelevantTopics(message: string): Promise<HelpTopic[]> {
    const lowerMessage = message.toLowerCase();
    const relevantTopics: HelpTopic[] = [];

    for (const topic of this.helpTopics) {
      const keywordMatches = topic.keywords.filter(keyword => 
        lowerMessage.includes(keyword)
      ).length;
      
      if (keywordMatches > 0) {
        relevantTopics.push({
          ...topic,
          relevanceScore: keywordMatches / topic.keywords.length
        });
      }
    }

    // Sort by relevance and return top 3
    return relevantTopics
      .sort((a, b) => (b as any).relevanceScore - (a as any).relevanceScore)
      .slice(0, 3);
  }

  private async generateHelpResponse(message: string, relevantTopics: HelpTopic[], context: AgentContext): Promise<string> {
    if (relevantTopics.length === 1) {
      // Single topic match - provide detailed help
      return this.formatDetailedHelp(relevantTopics[0]);
    } else if (relevantTopics.length > 1) {
      // Multiple topics - provide overview and let user choose
      return this.formatMultipleTopics(relevantTopics, message);
    } else {
      // No specific topics - provide general help
      return this.generateGeneralHelpResponse();
    }
  }

  private formatDetailedHelp(topic: HelpTopic): string {
    return `${topic.content}\n\n**Related Topics:** ${topic.relatedTopics.join(', ')}`;
  }

  private formatMultipleTopics(topics: HelpTopic[], message: string): string {
    let response = `I found several help topics that might be relevant to your question:\n\n`;

    topics.forEach((topic, index) => {
      response += `**${index + 1}. ${topic.title}**\n`;
      response += `${topic.description}\n\n`;
    });

    response += `**Which topic would you like me to explain in detail?**\n`;
    response += `You can ask me about any of the above topics, or I can provide a general overview of the platform.`;

    return response;
  }

  private generateGeneralHelpResponse(): string {
    return `## 🎉 Welcome to LightBoxTV Help!

I'm here to help you get the most out of the LightBoxTV platform. Here are some common areas I can assist with:

### **🚀 Getting Started:**
- Creating your first campaign
- Understanding the dashboard
- Setting up audience targeting

### **📊 Analytics & Performance:**
- Understanding your campaign metrics
- Using the analytics dashboard
- Optimizing campaign performance

### **🎯 Audience & Targeting:**
- Using the AI Audience Builder
- Geographic targeting and mapping
- Understanding audience segments

### **⚡ Platform Features:**
- Navigation and UI help
- Feature explanations
- Best practices and tips

**What would you like to learn about?** You can ask me specific questions or request help with any platform feature.`;
  }

  private generateSuggestions(relevantTopics: HelpTopic[]): string[] {
    const suggestions = [];
    
    if (relevantTopics.length > 0) {
      suggestions.push(`Learn more about ${relevantTopics[0].title.toLowerCase()}`);
      
      if (relevantTopics.length > 1) {
        suggestions.push(`Explore ${relevantTopics[1].title.toLowerCase()}`);
      }
    }

    suggestions.push('Get help with campaign creation');
    suggestions.push('Learn about the analytics dashboard');
    suggestions.push('Understand audience targeting');

    return suggestions;
  }
} 
import type { AgentContext, AgentMessage, AgentResponse } from './types';

interface HelpTopic {
  id: string;
  title: string;
  description: string;
  content: string;
  keywords: string[];
  relatedTopics: string[];
  relevanceScore?: number;
}

export class GeneralHelpAgent extends BaseAgent {
  private helpTopics: HelpTopic[] = [];

  constructor() {
    super(
      'general-help',
      'General Help Agent',
      'Provides assistance with platform navigation, UI help, and general questions about LightBoxTV',
      [
        {
          name: 'Platform Navigation',
          description: 'Help users navigate the LightBoxTV platform and understand its features',
          examples: [
            'How do I create a new campaign?',
            'Where can I find my analytics?',
            'How do I use the audience builder?'
          ]
        },
        {
          name: 'Feature Help',
          description: 'Explain platform features and how to use them effectively',
          examples: [
            'What is the AI Audience Builder?',
            'How does the map visualization work?',
            'What are the different analytics views?'
          ]
        },
        {
          name: 'General Support',
          description: 'Provide general support and answer common questions',
          examples: [
            'How do I contact support?',
            'What are the system requirements?',
            'How do I export my data?'
          ]
        }
      ]
    );

    this.initializeHelpTopics();
  }

  canHandle(message: string, context: AgentContext): boolean {
    const helpKeywords = [
      'help', 'how', 'what', 'where', 'when', 'why', 'guide', 'tutorial',
      'support', 'assist', 'explain', 'show me', 'tell me', 'navigate',
      'feature', 'function', 'button', 'menu', 'page', 'section',
      'create', 'find', 'access', 'use', 'work', 'understand'
    ];

    const lowerMessage = message.toLowerCase();
    return helpKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  async process(message: string, context: AgentContext, history: AgentMessage[]): Promise<AgentResponse> {
    try {
      // Step 1: Analyze the request and find relevant help topics
      const relevantTopics = await this.findRelevantTopics(message);
      
      // Step 2: Check if we have enough information to provide a helpful response
      if (relevantTopics.length === 0) {
        return {
          content: this.generateGeneralHelpResponse(),
          confidence: 0.3,
          agentId: 'general-help',
          agentName: 'General Help Agent',
          suggestions: [
            'Ask about specific platform features',
            'Request help with navigation',
            'Ask about analytics or campaigns',
            'Get help with audience building'
          ]
        };
      }

      // Step 3: Generate a comprehensive help response
      const response = await this.generateHelpResponse(message, relevantTopics, context);
      
      // Step 4: Add suggestions and next actions
      const suggestions = this.generateSuggestions(relevantTopics);

      return {
        content: response,
        confidence: 0.8,
        agentId: 'general-help',
        agentName: 'General Help Agent',
        suggestions,
        nextActions: [
          'Explore the platform features',
          'Contact support for specific issues',
          'Check the documentation',
          'Try the interactive tutorials'
        ]
      };
    } catch (error) {
      console.error('General Help Agent error:', error);
      return {
        content: "I encountered an error while processing your help request. Please try rephrasing your question or contact support directly.",
        confidence: 0.1,
        agentId: 'general-help',
        agentName: 'General Help Agent'
      };
    }
  }

  private initializeHelpTopics(): void {
    this.helpTopics = [
      {
        id: 'campaign-creation',
        title: 'Creating Campaigns',
        description: 'How to create and manage campaigns in LightBoxTV',
        content: `## 🚀 Creating Campaigns

**To create a new campaign:**

1. **Navigate to Campaigns** - Click on "Campaigns" in the main navigation
2. **Click "New Campaign"** - Use the "+" button or "Create Campaign" button
3. **Fill in Campaign Details:**
   - Campaign name
   - Start and end dates
   - Budget allocation
   - Target audience segments
4. **Configure Settings:**
   - Geographic targeting
   - Inventory selection
   - Creative assets
5. **Review and Launch** - Review all settings and click "Launch Campaign"

**Pro Tips:**
- Use the AI Audience Builder to find the perfect target segments
- Set up A/B testing for different creative variations
- Monitor performance in real-time using the analytics dashboard`,
        keywords: ['create', 'campaign', 'new', 'launch', 'start', 'setup'],
        relatedTopics: ['audience-builder', 'analytics', 'targeting']
      },
      {
        id: 'audience-builder',
        title: 'AI Audience Builder',
        description: 'How to use the AI-powered audience builder to find target segments',
        content: `## 🎯 AI Audience Builder

**The AI Audience Builder helps you find the perfect audience segments:**

### **Main Features:**
- **AI-Powered Recommendations** - Describe your target audience and get AI suggestions
- **Experian Data Integration** - Access to comprehensive demographic and lifestyle data
- **Geographic Visualization** - See audience distribution on interactive maps
- **Segment Comparison** - Compare different audience segments

### **How to Use:**

1. **Navigate to Audience Builder** - Click "Audience Builder" in the main menu
2. **Choose Your Approach:**
   - **Manual Selection** - Browse and select segments manually
   - **AI Recommendations** - Use the AI tab to get intelligent suggestions
3. **For AI Recommendations:**
   - Describe your target audience (e.g., "Young professionals interested in tech")
   - Click "Generate Recommendations"
   - Review and select relevant segments
   - Apply to your campaign

### **Pro Tips:**
- Be specific in your audience descriptions for better AI recommendations
- Use the geographic map to visualize audience distribution
- Combine multiple segments for broader reach`,
        keywords: ['audience', 'builder', 'ai', 'segment', 'target', 'demographic'],
        relatedTopics: ['campaign-creation', 'analytics', 'geographic-targeting']
      },
      {
        id: 'analytics-dashboard',
        title: 'Analytics Dashboard',
        description: 'Understanding and using the analytics dashboard',
        content: `## 📊 Analytics Dashboard

**The Analytics Dashboard provides comprehensive insights into your campaigns:**

### **Available Views:**

1. **Overview** - High-level campaign performance metrics
2. **Audience** - Demographic and audience insights
3. **Content** - Content performance and engagement
4. **Inventory** - Publisher and inventory performance
5. **Supply Path** - Campaign delivery and optimization insights

### **Key Metrics:**
- **Reach** - Total unique viewers reached
- **Impressions** - Total ad impressions served
- **CPM** - Cost per thousand impressions
- **Completion Rate** - Percentage of completed video views
- **Geographic Distribution** - Audience location breakdown

### **How to Use:**
1. **Select Time Period** - Choose the date range for your analysis
2. **Filter Data** - Use filters to focus on specific campaigns or segments
3. **Export Reports** - Download data for external analysis
4. **Set Alerts** - Configure notifications for key metrics

### **Pro Tips:**
- Use the comparison feature to analyze performance over time
- Set up custom dashboards for your most important metrics
- Export data regularly for external reporting`,
        keywords: ['analytics', 'dashboard', 'metrics', 'performance', 'report', 'data'],
        relatedTopics: ['campaign-creation', 'audience-builder', 'optimization']
      },
      {
        id: 'geographic-targeting',
        title: 'Geographic Targeting',
        description: 'How to target specific geographic areas and use the map visualization',
        content: `## 🗺️ Geographic Targeting

**Target your campaigns to specific geographic areas:**

### **Map Visualization:**
- **Interactive Hexagons** - See audience distribution in hexagonal grid
- **Color Coding** - Different colors represent audience density
- **Postcode Sectors** - Drill down to specific postcode areas
- **Resolution Control** - Adjust hexagon size for different detail levels

### **How to Use Geographic Targeting:**

1. **In Audience Builder:**
   - Select segments and see their geographic distribution
   - Use the map to understand audience concentration
   - Filter by specific regions or postcodes

2. **In Campaign Creation:**
   - Set geographic targeting parameters
   - Exclude or include specific areas
   - Use radius targeting around specific locations

3. **In Analytics:**
   - View geographic performance data
   - Identify high-performing areas
   - Optimize targeting based on results

### **Pro Tips:**
- Use different hexagon resolutions for different analysis needs
- Combine geographic targeting with demographic targeting
- Monitor geographic performance to optimize future campaigns`,
        keywords: ['geographic', 'map', 'location', 'postcode', 'area', 'region', 'targeting'],
        relatedTopics: ['audience-builder', 'analytics', 'campaign-creation']
      },
      {
        id: 'optimization',
        title: 'Campaign Optimization',
        description: 'How to optimize your campaigns for better performance',
        content: `## ⚡ Campaign Optimization

**Optimize your campaigns for maximum performance:**

### **Key Optimization Areas:**

1. **Audience Targeting:**
   - Use AI recommendations to find better segments
   - Analyze audience overlap and reach
   - Test different audience combinations

2. **Creative Optimization:**
   - A/B test different creative variations
   - Monitor completion rates and engagement
   - Optimize for different audience segments

3. **Budget Allocation:**
   - Distribute budget across high-performing segments
   - Adjust bids based on performance
   - Use automated optimization features

4. **Geographic Optimization:**
   - Focus budget on high-performing areas
   - Exclude low-performing regions
   - Use geographic insights for future campaigns

### **Optimization Tools:**
- **Real-time Monitoring** - Track performance as it happens
- **Automated Recommendations** - Get AI-powered optimization suggestions
- **Performance Alerts** - Set up notifications for key metrics
- **A/B Testing** - Test different campaign variations

### **Pro Tips:**
- Start with broad targeting and narrow down based on performance
- Monitor campaigns regularly and make adjustments
- Use historical data to inform optimization decisions`,
        keywords: ['optimize', 'optimization', 'performance', 'improve', 'better', 'efficient'],
        relatedTopics: ['analytics', 'audience-builder', 'campaign-creation']
      },
      {
        id: 'support-contact',
        title: 'Contact Support',
        description: 'How to get help and contact the support team',
        content: `## 🆘 Contact Support

**Need help? Here's how to get support:**

### **Support Channels:**

1. **In-App Chat** - Use the chat widget in the bottom right corner
2. **Email Support** - Send detailed questions to support@lightboxtv.com
3. **Phone Support** - Call +44 (0) 20 1234 5678 during business hours
4. **Documentation** - Check our comprehensive help documentation

### **Before Contacting Support:**

1. **Check the Help Section** - Many questions are answered in our help topics
2. **Gather Information** - Have your campaign details and issue description ready
3. **Screenshots** - Include screenshots if reporting a visual issue
4. **Steps to Reproduce** - Provide clear steps to reproduce the issue

### **Response Times:**
- **Chat Support** - Usually within minutes during business hours
- **Email Support** - Within 24 hours
- **Phone Support** - Immediate during business hours (9 AM - 6 PM GMT)

### **Business Hours:**
- **Monday - Friday:** 9:00 AM - 6:00 PM GMT
- **Weekend:** Limited support available

**Pro Tip:** Use the chat widget for quick questions and email for complex issues requiring detailed investigation.`,
        keywords: ['support', 'help', 'contact', 'assist', 'issue', 'problem', 'error'],
        relatedTopics: ['campaign-creation', 'analytics', 'audience-builder']
      }
    ];
  }

  private async findRelevantTopics(message: string): Promise<HelpTopic[]> {
    const lowerMessage = message.toLowerCase();
    const relevantTopics: HelpTopic[] = [];

    for (const topic of this.helpTopics) {
      const keywordMatches = topic.keywords.filter(keyword => 
        lowerMessage.includes(keyword)
      ).length;
      
      if (keywordMatches > 0) {
        relevantTopics.push({
          ...topic,
          relevanceScore: keywordMatches / topic.keywords.length
        });
      }
    }

    // Sort by relevance and return top 3
    return relevantTopics
      .sort((a, b) => (b as any).relevanceScore - (a as any).relevanceScore)
      .slice(0, 3);
  }

  private async generateHelpResponse(message: string, relevantTopics: HelpTopic[], context: AgentContext): Promise<string> {
    if (relevantTopics.length === 1) {
      // Single topic match - provide detailed help
      return this.formatDetailedHelp(relevantTopics[0]);
    } else if (relevantTopics.length > 1) {
      // Multiple topics - provide overview and let user choose
      return this.formatMultipleTopics(relevantTopics, message);
    } else {
      // No specific topics - provide general help
      return this.generateGeneralHelpResponse();
    }
  }

  private formatDetailedHelp(topic: HelpTopic): string {
    return `${topic.content}\n\n**Related Topics:** ${topic.relatedTopics.join(', ')}`;
  }

  private formatMultipleTopics(topics: HelpTopic[], message: string): string {
    let response = `I found several help topics that might be relevant to your question:\n\n`;

    topics.forEach((topic, index) => {
      response += `**${index + 1}. ${topic.title}**\n`;
      response += `${topic.description}\n\n`;
    });

    response += `**Which topic would you like me to explain in detail?**\n`;
    response += `You can ask me about any of the above topics, or I can provide a general overview of the platform.`;

    return response;
  }

  private generateGeneralHelpResponse(): string {
    return `## 🎉 Welcome to LightBoxTV Help!

I'm here to help you get the most out of the LightBoxTV platform. Here are some common areas I can assist with:

### **🚀 Getting Started:**
- Creating your first campaign
- Understanding the dashboard
- Setting up audience targeting

### **📊 Analytics & Performance:**
- Understanding your campaign metrics
- Using the analytics dashboard
- Optimizing campaign performance

### **🎯 Audience & Targeting:**
- Using the AI Audience Builder
- Geographic targeting and mapping
- Understanding audience segments

### **⚡ Platform Features:**
- Navigation and UI help
- Feature explanations
- Best practices and tips

**What would you like to learn about?** You can ask me specific questions or request help with any platform feature.`;
  }

  private generateSuggestions(relevantTopics: HelpTopic[]): string[] {
    const suggestions = [];
    
    if (relevantTopics.length > 0) {
      suggestions.push(`Learn more about ${relevantTopics[0].title.toLowerCase()}`);
      
      if (relevantTopics.length > 1) {
        suggestions.push(`Explore ${relevantTopics[1].title.toLowerCase()}`);
      }
    }

    suggestions.push('Get help with campaign creation');
    suggestions.push('Learn about the analytics dashboard');
    suggestions.push('Understand audience targeting');

    return suggestions;
  }
} 
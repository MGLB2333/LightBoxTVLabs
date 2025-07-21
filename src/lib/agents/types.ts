export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentId?: string;
  agentName?: string;
}

export interface AgentContext {
  userId?: string;
  organizationId?: string;
  currentPage?: string;
  filters?: Record<string, any>;
}

export interface AgentResponse {
  content: string;
  confidence: number;
  data?: any;
  suggestions?: string[];
  nextActions?: string[];
  agentId?: string;
  agentName?: string;
}

export interface AgentCapability {
  name: string;
  description: string;
  examples: string[];
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: AgentCapability[];
  canHandle: (message: string, context: AgentContext) => boolean;
  process: (message: string, context: AgentContext, history: AgentMessage[]) => Promise<AgentResponse>;
}

export interface MasterAgent extends Agent {
  agents: Agent[];
  routeMessage: (message: string, context: AgentContext, history: AgentMessage[]) => Promise<AgentResponse>;
} 
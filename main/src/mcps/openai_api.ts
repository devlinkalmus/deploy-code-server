/**
 * OpenAI API MCP
 * Sample Modular Compute Pod for OpenAI API integration
 */

export interface OpenAIMCPConfig {
  apiKey?: string;
  baseUrl: string;
  model: string;
  rateLimit: {
    requestsPerMinute: number;
    currentUsage: number;
    lastReset: Date;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
}

export class OpenAIMCP {
  private config: OpenAIMCPConfig;
  private lastHealthCheck: Date;

  constructor(config: OpenAIMCPConfig) {
    this.config = config;
    this.lastHealthCheck = new Date();
  }

  /**
   * Health check method called by MCP registry
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simulate API health check
      const response = await this.makeRequest('GET', '/models');
      this.lastHealthCheck = new Date();
      return response !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate chat completion
   */
  async createChatCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<{
    content: string;
    tokens: number;
    model: string;
  }> {
    const payload = {
      model: this.config.model,
      messages,
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 1,
      presence_penalty: options.presencePenalty || 0,
      frequency_penalty: options.frequencyPenalty || 0
    };

    const response = await this.makeRequest('POST', '/chat/completions', payload);
    
    return {
      content: response.choices[0]?.message?.content || '',
      tokens: response.usage?.total_tokens || 0,
      model: response.model || this.config.model
    };
  }

  /**
   * Generate code completion
   */
  async generateCode(
    prompt: string,
    language: string = 'typescript',
    options: CompletionOptions = {}
  ): Promise<{
    code: string;
    explanation: string;
    tokens: number;
  }> {
    const systemMessage = `You are a helpful coding assistant. Generate ${language} code based on the user's prompt. Provide clean, well-commented code with a brief explanation.`;
    
    const messages: ChatMessage[] = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: prompt }
    ];

    const response = await this.createChatCompletion(messages, options);
    
    // Parse response to separate code and explanation
    const content = response.content;
    const codeMatch = content.match(/```[\w]*\n([\s\S]*?)\n```/);
    const code = codeMatch ? codeMatch[1] : content;
    const explanation = content.replace(/```[\w]*\n[\s\S]*?\n```/, '').trim();

    return {
      code: code.trim(),
      explanation: explanation || 'Code generated successfully',
      tokens: response.tokens
    };
  }

  /**
   * Create embeddings for text
   */
  async createEmbeddings(texts: string[]): Promise<{
    embeddings: number[][];
    tokens: number;
  }> {
    const payload = {
      model: 'text-embedding-ada-002',
      input: texts
    };

    const response = await this.makeRequest('POST', '/embeddings', payload);
    
    return {
      embeddings: response.data?.map((item: any) => item.embedding) || [],
      tokens: response.usage?.total_tokens || 0
    };
  }

  /**
   * Auto-adapt as JRVI logic agent
   */
  async adaptAsJRVIAgent(): Promise<{
    capabilities: string[];
    methods: string[];
    description: string;
  }> {
    return {
      capabilities: [
        'text_generation',
        'code_completion',
        'chat_interface',
        'content_analysis',
        'creative_writing',
        'problem_solving'
      ],
      methods: [
        'createChatCompletion',
        'generateCode',
        'createEmbeddings',
        'analyzeContent',
        'generateIdeas',
        'solveProblems',
        'reviewCode'
      ],
      description: 'OpenAI integration agent for AI-powered text generation, code completion, and intelligent assistance'
    };
  }

  /**
   * Analyze content for insights
   */
  async analyzeContent(content: string, analysisType: 'sentiment' | 'summary' | 'keywords' | 'all' = 'all'): Promise<{
    sentiment?: 'positive' | 'negative' | 'neutral';
    summary?: string;
    keywords?: string[];
    insights?: string[];
  }> {
    const systemMessage = `You are an expert content analyst. Analyze the provided content and return insights based on the analysis type: ${analysisType}`;
    
    const userMessage = `Please analyze this content:\n\n${content}\n\nAnalysis type: ${analysisType}`;
    
    const messages: ChatMessage[] = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ];

    const response = await this.createChatCompletion(messages, { temperature: 0.3 });
    
    // Parse response based on analysis type
    const result: any = {};
    
    if (analysisType === 'sentiment' || analysisType === 'all') {
      if (response.content.toLowerCase().includes('positive')) {
        result.sentiment = 'positive';
      } else if (response.content.toLowerCase().includes('negative')) {
        result.sentiment = 'negative';
      } else {
        result.sentiment = 'neutral';
      }
    }
    
    if (analysisType === 'summary' || analysisType === 'all') {
      result.summary = response.content.split('\n')[0] || 'Summary not available';
    }
    
    if (analysisType === 'keywords' || analysisType === 'all') {
      // Extract keywords from response
      const keywordMatch = response.content.match(/keywords?:?\s*(.+)/i);
      result.keywords = keywordMatch ? 
        keywordMatch[1].split(',').map(k => k.trim()) : 
        ['analysis', 'content', 'insights'];
    }
    
    if (analysisType === 'all') {
      result.insights = [
        'Content analyzed successfully',
        'Analysis completed with AI assistance',
        'Results based on natural language processing'
      ];
    }

    return result;
  }

  /**
   * Generate creative ideas
   */
  async generateIdeas(topic: string, count: number = 5, creativity: 'low' | 'medium' | 'high' = 'medium'): Promise<{
    ideas: string[];
    theme: string;
    tokens: number;
  }> {
    const temperatureMap = { low: 0.3, medium: 0.7, high: 1.0 };
    const temperature = temperatureMap[creativity];
    
    const systemMessage = `You are a creative ideation assistant. Generate innovative and practical ideas related to the given topic.`;
    const userMessage = `Generate ${count} creative ideas related to: ${topic}`;
    
    const messages: ChatMessage[] = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ];

    const response = await this.createChatCompletion(messages, { temperature });
    
    // Parse ideas from response
    const ideas = response.content
      .split('\n')
      .filter(line => line.trim().length > 0)
      .slice(0, count);

    return {
      ideas,
      theme: topic,
      tokens: response.tokens
    };
  }

  /**
   * Review code for improvements
   */
  async reviewCode(code: string, language: string = 'typescript'): Promise<{
    score: number;
    suggestions: string[];
    strengths: string[];
    improvements: string[];
    tokens: number;
  }> {
    const systemMessage = `You are an expert code reviewer. Analyze the provided ${language} code and provide constructive feedback including a score (1-10), suggestions, strengths, and improvements.`;
    
    const userMessage = `Please review this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;
    
    const messages: ChatMessage[] = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ];

    const response = await this.createChatCompletion(messages, { temperature: 0.3 });
    
    // Parse response for structured feedback
    const content = response.content.toLowerCase();
    
    // Extract score
    const scoreMatch = content.match(/score:?\s*(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 7;
    
    return {
      score: Math.min(Math.max(score, 1), 10),
      suggestions: [
        'Consider adding more comments',
        'Review variable naming conventions',
        'Add error handling where appropriate'
      ],
      strengths: [
        'Clean code structure',
        'Good use of TypeScript types',
        'Readable implementation'
      ],
      improvements: [
        'Add unit tests',
        'Optimize performance',
        'Enhance error messages'
      ],
      tokens: response.tokens
    };
  }

  /**
   * Make API request with rate limiting and error handling
   */
  private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    // Check and reset rate limit if needed
    const now = new Date();
    if (now.getTime() - this.config.rateLimit.lastReset.getTime() > 60000) {
      this.config.rateLimit.currentUsage = 0;
      this.config.rateLimit.lastReset = now;
    }

    // Check rate limit
    if (this.config.rateLimit.currentUsage >= this.config.rateLimit.requestsPerMinute) {
      throw new Error('Rate limit exceeded');
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay
      
      // Update rate limit
      this.config.rateLimit.currentUsage++;

      // Simulate successful response
      switch (endpoint) {
        case '/models':
          return {
            data: [
              { id: 'gpt-3.5-turbo', object: 'model' },
              { id: 'gpt-4', object: 'model' }
            ]
          };
        
        case '/chat/completions':
          return {
            choices: [{
              message: {
                role: 'assistant',
                content: this.generateMockResponse(data?.messages || [])
              }
            }],
            usage: { total_tokens: 150 },
            model: this.config.model
          };
        
        case '/embeddings':
          return {
            data: data?.input?.map(() => ({
              embedding: Array.from({ length: 1536 }, () => Math.random())
            })) || [],
            usage: { total_tokens: 50 }
          };
        
        default:
          return { success: true, method, endpoint, data };
      }
    } catch (error) {
      throw new Error(`OpenAI API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate mock response for demonstration
   */
  private generateMockResponse(messages: ChatMessage[]): string {
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage?.content || '';
    
    if (content.includes('code') || content.includes('function')) {
      return `\`\`\`typescript
// Generated code example
function exampleFunction(input: string): string {
  // Process the input
  return input.toUpperCase();
}
\`\`\`

This is a simple example function that demonstrates TypeScript best practices.`;
    }
    
    if (content.includes('analyze') || content.includes('analysis')) {
      return 'Based on my analysis, this content shows positive sentiment with key themes around technology and innovation. The main insights include clear communication and structured approach.';
    }
    
    if (content.includes('ideas') || content.includes('creative')) {
      return '1. Innovative user interface design\n2. Advanced automation workflows\n3. Enhanced security protocols\n4. Improved performance optimization\n5. Better user experience patterns';
    }
    
    return 'Thank you for your query. I\'m here to help with various tasks including code generation, content analysis, creative ideation, and problem-solving. How can I assist you today?';
  }

  /**
   * Get current configuration
   */
  getConfig(): OpenAIMCPConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<OpenAIMCPConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get MCP metadata for registry
   */
  static getMetadata() {
    return {
      id: 'openai_api',
      name: 'OpenAI API Wrapper',
      version: '1.2.0',
      description: 'OpenAI API integration for AI-powered JRVI functions',
      type: 'external_api' as const,
      capabilities: [
        'text_generation',
        'code_completion',
        'chat_interface',
        'content_analysis',
        'creative_writing',
        'embeddings'
      ],
      healthCheckInterval: 600,
      autoDisableOnFailure: true,
      maxFailures: 5
    };
  }
}

export default OpenAIMCP;
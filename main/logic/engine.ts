import { LogicInput, LogicResponse, LogicModule } from './types';
import { greetingLogic } from './greeting';
import { plannerLogic } from './planner';
import { forecastLogic } from './forecast';
import { memoryEngine } from '../memory/engine';
import { logger } from '../src/utils/logging';
import { strategyKernel, createOperationRequest, OperationType, Priority } from '../src/kernel/strategy';


class LogicEngine {
  private modules: LogicModule[] = [];
  private logicLogger = logger.createChildLogger('logic-engine');

  constructor() {
    this.initializeModules();
    this.logicLogger.info('Logic engine initialized', 'logic-engine', {
      moduleCount: this.modules.length,
      modules: this.modules.map(m => m.name)
    });
  }

  // Initialize all logic modules
  private initializeModules(): void {
    this.modules = [
      {
        name: 'greeting',
        tags: ['greeting', 'hello', 'hi', 'social'],
        run: greetingLogic
      },
      {
        name: 'planner',
        tags: ['planning', 'strategy', 'goals', 'project', 'organize'],
        run: plannerLogic
      },
      {
        name: 'forecast',
        tags: ['forecast', 'prediction', 'analysis', 'future', 'trends'],
        run: forecastLogic
      }
    ];
  }

  // Process input through all logic modules
  async processInput(input: LogicInput): Promise<LogicResponse> {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    
    // Kernel enforcement: ensure persona and compliance
    try {
      enforceKernel(input);
    } catch (err) {
      this.logicLogger.error(
        'Kernel enforcement failed in logic engine',
        'logic-engine',
        {
          requestId,
          error: err instanceof Error ? err.message : String(err),
          input: input.message
        }
      );
      return {
        response: 'Kernel enforcement failed: missing or invalid persona',
        confidence: 0,
        tags: ['error', 'kernel'],
        reasoning: 'Kernel enforcement failed in logic engine'
      };
    }
    
    this.logicLogger.info(
      `Processing input: "${input.message}"`,
      'logic-engine',
      {
        requestId,
        persona: input.persona,
        messageLength: input.message.length
      },
      {
        tags: ['input-processing'],
        source: 'logic-engine'
      }
    );


    const memory = memoryEngine.getAllMemories();
    const responses: LogicResponse[] = [];

    // Try each logic module through the kernel
    for (const module of this.modules) {
      try {
        const moduleRequest = createOperationRequest(
          OperationType.LOGIC_UPDATE,
          'logic-engine',
          module.name,
          { input, memory },
          {
            priority: Priority.MEDIUM,
            requiresApproval: false,
            metadata: { moduleType: 'logic-processor' },
            source: 'logic-engine'
          }
        );

        const kernelResult = await strategyKernel.route(moduleRequest);
        
        if (kernelResult.success) {
          const response = module.run(input, memory);
          if (response && response.confidence > 0.5) {
            responses.push({
              ...response,
              tags: [...response.tags, 'kernel-approved']
            });
            
            this.logicLogger.debug(
              `Module ${module.name} generated response`,
              'logic-engine',
              {
                requestId,
                module: module.name,
                confidence: response.confidence,
                auditLogId: kernelResult.auditLogId
              }
            );
          }
        }
      } catch (error) {
        this.logicLogger.error(
          `Error in module ${module.name}`,
          'logic-engine',
          {
            requestId,
            module: module.name,
            error: error instanceof Error ? error.message : String(error)
          }
        );
      }
    }

    // Sort by confidence and select best response
    responses.sort((a, b) => b.confidence - a.confidence);

    let bestResponse: LogicResponse;

    if (responses.length > 0) {
      bestResponse = responses[0];
      this.logicLogger.info(
        `Selected best response`,
        'logic-engine',
        {
          requestId,
          confidence: bestResponse.confidence,
          tags: bestResponse.tags,
          responseLength: bestResponse.response.length
        }
      );
    } else {
      // Fallback response
      bestResponse = this.getFallbackResponse(input);
      this.logicLogger.warn(
        `Using fallback response - no modules matched`,
        'logic-engine',
        {
          requestId,
          input: input.message,
          fallbackConfidence: bestResponse.confidence
        }
      );
    }

    // Store interaction in memory through kernel
    await this.storeInteraction(input, bestResponse, requestId);


    return bestResponse;
  }

  // Fallback response when no modules match
  private getFallbackResponse(input: LogicInput): LogicResponse {
    const fallbackResponses = [
      "Let me think about that from a different angle. What's the main challenge you're facing?",
      "I understand you're looking for insights. What specific aspect would you like me to focus on?",
      "That's a thoughtful question. What outcome are you hoping to achieve?"
    ];

    const response = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

    return {
      response,
      confidence: 0.3,
      tags: ['fallback', 'general'],
      reasoning: 'No specific logic module matched, using fallback response'
    };
  }

  // Store interaction in memory
  private async storeInteraction(input: LogicInput, response: LogicResponse, requestId?: string): Promise<void> {
    const lineage = requestId ? [requestId] : undefined;
    
    // Store user input through kernel
    const inputRequest = createOperationRequest(
      OperationType.MEMORY_CREATE,
      'logic-engine',
      'memory-engine',
      {
        content: `User: ${input.message}`,
        tags: ['user_input', 'conversation', ...this.extractTags(input.message)],
        importance: 60,
        metadata: {
          persona: input.persona,
          context: input.context
        }
      },
      {
        priority: Priority.LOW,
        requiresApproval: false,
        metadata: { memoryType: 'user-input' },
        lineage,
        source: 'logic-engine'
      }
    );

    await strategyKernel.route(inputRequest);

    // Store AI response through kernel
    const responseRequest = createOperationRequest(
      OperationType.MEMORY_CREATE,
      'logic-engine',
      'memory-engine',
      {
        content: `JRVI: ${response.response}`,
        tags: ['ai_response', 'conversation', ...response.tags],
        importance: response.confidence > 0.8 ? 80 : 50,
        metadata: {
          confidence: response.confidence,
          reasoning: response.reasoning
        }
      },
      {
        priority: Priority.LOW,
        requiresApproval: false,
        metadata: { memoryType: 'ai-response' },
        lineage,
        source: 'logic-engine'
      }
    );

    await strategyKernel.route(responseRequest);

    // Store reasoning if available
    if (response.reasoning) {
      const reasoningRequest = createOperationRequest(
        OperationType.MEMORY_CREATE,
        'logic-engine',
        'memory-engine',
        {
          content: `Reasoning: ${response.reasoning}`,
          tags: ['reasoning', 'meta', ...response.tags],
          importance: 30,
          metadata: {
            confidence: response.confidence,
            associatedResponse: response.response
          }
        },
        {
          priority: Priority.LOW,
          requiresApproval: false,
          metadata: { memoryType: 'reasoning' },
          lineage,
          source: 'logic-engine'
        }
      );

      await strategyKernel.route(reasoningRequest);
    }

    this.logicLogger.audit(
      `Stored interaction in memory`,
      'logic-engine',
      {
        requestId,
        userMessage: input.message,
        aiResponse: response.response,
        confidence: response.confidence,
        hasReasoning: !!response.reasoning
      },
      {
        tags: ['memory-storage', 'interaction'],
        lineage
      }
    );
  }

  // Extract basic tags from message content
  private extractTags(message: string): string[] {
    const tags: string[] = [];
    const messageLower = message.toLowerCase();

    // Common topic tags
    const topicMap = {
      'code': ['coding', 'programming', 'development', 'software'],
      'business': ['business', 'strategy', 'market', 'startup'],
      'learning': ['learn', 'study', 'education', 'skill'],
      'project': ['project', 'task', 'work', 'job'],
      'personal': ['personal', 'life', 'goals', 'habits'],
      'technical': ['technical', 'system', 'architecture', 'design'],
      'planning': ['plan', 'organize', 'schedule', 'timeline'],
      'analysis': ['analyze', 'assess', 'evaluate', 'review']
    };

    for (const [tag, keywords] of Object.entries(topicMap)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        tags.push(tag);
      }
    }

    return tags;
  }

  // Get available modules info
  getModules(): LogicModule[] {
    return this.modules.map(m => ({
      name: m.name,
      tags: m.tags,
      run: m.run
    }));
  }

  // Add new logic module dynamically
  addModule(module: LogicModule): void {
    this.modules.push(module);
    
    this.logicLogger.audit(
      `Logic module added: ${module.name}`,
      'logic-engine',
      {
        module: module.name,
        tags: module.tags,
        totalModules: this.modules.length
      },
      {
        tags: ['module-addition', 'system-update']
      }
    );
  }
}

// Singleton instance
export const logicEngine = new LogicEngine();
export default logicEngine;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logicEngine = void 0;
const greeting_1 = require("./greeting");
const planner_1 = require("./planner");
const forecast_1 = require("./forecast");
const engine_1 = require("../memory/engine");
const logging_1 = require("../src/utils/logging");
const strategy_1 = require("../src/kernel/strategy");
const kernel_1 = require("../src/kernel");
class LogicEngine {
    constructor() {
        this.modules = [];
        this.logicLogger = logging_1.logger.createChildLogger('logic-engine');
        this.initializeModules();
        this.logicLogger.info('Logic engine initialized', 'logic-engine', {
            moduleCount: this.modules.length,
            modules: this.modules.map(m => m.name)
        });
    }
    // Initialize all logic modules
    initializeModules() {
        this.modules = [
            {
                name: 'greeting',
                tags: ['greeting', 'hello', 'hi', 'social'],
                run: greeting_1.greetingLogic
            },
            {
                name: 'planner',
                tags: ['planning', 'strategy', 'goals', 'project', 'organize'],
                run: planner_1.plannerLogic
            },
            {
                name: 'forecast',
                tags: ['forecast', 'prediction', 'analysis', 'future', 'trends'],
                run: forecast_1.forecastLogic
            }
        ];
    }
    // Process input through all logic modules
    async processInput(input) {
        const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        this.logicLogger.info(`Processing input: "${input.message}"`, 'logic-engine', {
            requestId,
            persona: input.persona,
            messageLength: input.message.length
        }, {
            tags: ['input-processing'],
            source: 'logic-engine'
        });
        // Kernel enforcement: ensure persona and compliance
        try {
            (0, kernel_1.enforceKernel)({ persona: input.persona || 'JRVI' });
        }
        catch (err) {
            this.logicLogger.error('Kernel enforcement failed in logic engine', 'logic-engine', { err, input });
            return {
                response: 'Kernel enforcement failed: missing or invalid persona',
                confidence: 0,
                tags: ['error', 'kernel'],
                reasoning: 'Kernel enforcement failed in logic engine'
            };
        }
        const memory = engine_1.memoryEngine.getAllMemories();
        const responses = [];
        // Try each logic module through the kernel
        for (const module of this.modules) {
            try {
                const moduleRequest = (0, strategy_1.createOperationRequest)(strategy_1.OperationType.LOGIC_UPDATE, 'logic-engine', module.name, { input, memory }, {
                    priority: strategy_1.Priority.MEDIUM,
                    requiresApproval: false,
                    metadata: { moduleType: 'logic-processor' },
                    source: 'logic-engine'
                });
                const kernelResult = await strategy_1.strategyKernel.route(moduleRequest);
                if (kernelResult.success) {
                    const response = module.run(input, memory);
                    if (response && response.confidence > 0.5) {
                        responses.push({
                            ...response,
                            tags: [...response.tags, 'kernel-approved']
                        });
                        this.logicLogger.debug(`Module ${module.name} generated response`, 'logic-engine', {
                            requestId,
                            module: module.name,
                            confidence: response.confidence,
                            auditLogId: kernelResult.auditLogId
                        });
                    }
                }
            }
            catch (error) {
                this.logicLogger.error(`Error in module ${module.name}`, 'logic-engine', {
                    requestId,
                    module: module.name,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        // Sort by confidence and select best response
        responses.sort((a, b) => b.confidence - a.confidence);
        let bestResponse;
        if (responses.length > 0) {
            bestResponse = responses[0];
            this.logicLogger.info(`Selected best response`, 'logic-engine', {
                requestId,
                confidence: bestResponse.confidence,
                tags: bestResponse.tags,
                responseLength: bestResponse.response.length
            });
        }
        else {
            // Fallback response
            bestResponse = this.getFallbackResponse(input);
            this.logicLogger.warn(`Using fallback response - no modules matched`, 'logic-engine', {
                requestId,
                input: input.message,
                fallbackConfidence: bestResponse.confidence
            });
        }
        // Store interaction in memory through kernel
        await this.storeInteraction(input, bestResponse, requestId);
        this.logicLogger.info('Logic engine processed input', 'logic-engine', {
            messageLength: input.message.length,
            persona: input.persona,
            responseConfidence: bestResponse.confidence,
            responseTags: bestResponse.tags
        });
        return bestResponse;
    }
    // Fallback response when no modules match
    getFallbackResponse(input) {
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
    async storeInteraction(input, response, requestId) {
        const lineage = requestId ? [requestId] : undefined;
        // Store user input through kernel
        const inputRequest = (0, strategy_1.createOperationRequest)(strategy_1.OperationType.MEMORY_CREATE, 'logic-engine', 'memory-engine', {
            content: `User: ${input.message}`,
            tags: ['user_input', 'conversation', ...this.extractTags(input.message)],
            importance: 60,
            metadata: {
                persona: input.persona,
                context: input.context
            }
        }, {
            priority: strategy_1.Priority.LOW,
            requiresApproval: false,
            metadata: { memoryType: 'user-input' },
            lineage,
            source: 'logic-engine'
        });
        await strategy_1.strategyKernel.route(inputRequest);
        // Store AI response through kernel
        const responseRequest = (0, strategy_1.createOperationRequest)(strategy_1.OperationType.MEMORY_CREATE, 'logic-engine', 'memory-engine', {
            content: `JRVI: ${response.response}`,
            tags: ['ai_response', 'conversation', ...response.tags],
            importance: response.confidence > 0.8 ? 80 : 50,
            metadata: {
                confidence: response.confidence,
                reasoning: response.reasoning
            }
        }, {
            priority: strategy_1.Priority.LOW,
            requiresApproval: false,
            metadata: { memoryType: 'ai-response' },
            lineage,
            source: 'logic-engine'
        });
        await strategy_1.strategyKernel.route(responseRequest);
        // Store reasoning if available
        if (response.reasoning) {
            const reasoningRequest = (0, strategy_1.createOperationRequest)(strategy_1.OperationType.MEMORY_CREATE, 'logic-engine', 'memory-engine', {
                content: `Reasoning: ${response.reasoning}`,
                tags: ['reasoning', 'meta', ...response.tags],
                importance: 30,
                metadata: {
                    confidence: response.confidence,
                    associatedResponse: response.response
                }
            }, {
                priority: strategy_1.Priority.LOW,
                requiresApproval: false,
                metadata: { memoryType: 'reasoning' },
                lineage,
                source: 'logic-engine'
            });
            await strategy_1.strategyKernel.route(reasoningRequest);
        }
        this.logicLogger.audit(`Stored interaction in memory`, 'logic-engine', {
            requestId,
            userMessage: input.message,
            aiResponse: response.response,
            confidence: response.confidence,
            hasReasoning: !!response.reasoning
        }, {
            tags: ['memory-storage', 'interaction'],
            lineage
        });
    }
    // Extract basic tags from message content
    extractTags(message) {
        const tags = [];
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
    getModules() {
        return this.modules.map(m => ({
            name: m.name,
            tags: m.tags,
            run: m.run
        }));
    }
    // Add new logic module dynamically
    addModule(module) {
        this.modules.push(module);
        this.logicLogger.audit(`Logic module added: ${module.name}`, 'logic-engine', {
            module: module.name,
            tags: module.tags,
            totalModules: this.modules.length
        }, {
            tags: ['module-addition', 'system-update']
        });
    }
}
// Singleton instance
exports.logicEngine = new LogicEngine();
exports.default = exports.logicEngine;

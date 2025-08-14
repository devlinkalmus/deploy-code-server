"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.greetingLogic = greetingLogic;
function greetingLogic(input, memory) {
    const message = input.message.toLowerCase();
    // Check for greeting patterns
    const greetingPatterns = [
        /\b(hello|hi|hey|greetings|good\s*(morning|afternoon|evening))\b/i,
        /\b(what'?s\s*up|how\s*are\s*you|howdy)\b/i
    ];
    const isGreeting = greetingPatterns.some(pattern => pattern.test(message));
    if (!isGreeting)
        return null;
    // Check if we've greeted this session
    const recentGreeting = memory.find(m => m.tags.includes('greeting') &&
        (Date.now() - m.timestamp.getTime()) < 300000 // 5 minutes
    );
    const responses = recentGreeting ? [
        "We just said hello! How can I help you further?",
        "Still here to assist! What would you like to explore?",
        "Ready for the next challenge! What's on your mind?"
    ] : [
        "Hello! I'm JRVI, your AI assistant. I'm here to help with planning, analysis, and creative problem-solving.",
        "Greetings! Ready to dive into some interesting conversations and problem-solving together.",
        "Hi there! I'm JRVI - think of me as your digital thinking partner. What shall we explore today?"
    ];
    const response = responses[Math.floor(Math.random() * responses.length)];
    return {
        response,
        confidence: 0.95,
        tags: ['greeting', 'social'],
        reasoning: recentGreeting ? 'Follow-up greeting detected' : 'Initial greeting detected'
    };
}

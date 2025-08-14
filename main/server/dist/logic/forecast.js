"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forecastLogic = forecastLogic;
function forecastLogic(input, memory) {
    const message = input.message.toLowerCase();
    // Check for forecasting/prediction patterns
    const forecastPatterns = [
        /\b(predict|prediction|forecast|future|trend|trends)\b/i,
        /\b(what\s*will|what\s*might|outcome|result|consequence)\b/i,
        /\b(scenario|scenarios|possibility|likely|probable)\b/i,
        /\b(analysis|analyze|assess|evaluation|impact)\b/i
    ];
    const isForecast = forecastPatterns.some(pattern => pattern.test(message));
    if (!isForecast)
        return null;
    // Analyze context for forecast type
    const contexts = {
        technology: /\b(tech|technology|ai|software|digital|code)\b/i.test(message),
        market: /\b(market|business|economy|sales|revenue|growth)\b/i.test(message),
        social: /\b(social|society|culture|people|behavior)\b/i.test(message),
        personal: /\b(career|personal|skill|learning|development)\b/i.test(message),
        project: /\b(project|timeline|deadline|milestone|progress)\b/i.test(message)
    };
    const activeContext = Object.keys(contexts).find(key => contexts[key]) || 'general';
    // Generate forecast based on recent memory patterns
    const recentMemory = memory
        .filter(m => (Date.now() - m.timestamp.getTime()) < 3600000) // Last hour
        .sort((a, b) => b.importance - a.importance);
    const memoryContext = recentMemory.length > 0
        ? recentMemory.slice(0, 3).map(m => m.tags).flat()
        : [];
    const confidenceFactors = {
        hasRecentData: recentMemory.length > 2,
        contextMatch: memoryContext.some(tag => message.includes(tag)),
        specificDomain: activeContext !== 'general'
    };
    const baseConfidence = 0.65;
    const confidenceBoost = Object.values(confidenceFactors).filter(Boolean).length * 0.1;
    const confidence = Math.min(0.95, baseConfidence + confidenceBoost);
    const forecastResponses = {
        technology: [
            "Based on current trends, I see increased integration of AI tools in development workflows, with low-code/no-code solutions gaining traction. Key factors: automation, accessibility, and rapid prototyping capabilities.",
            "Technology forecast suggests a shift toward edge computing and distributed systems. The convergence of AI, IoT, and 5G will likely create new interaction paradigms within 12-18 months."
        ],
        market: [
            "Market indicators suggest volatility in the short term, but potential stabilization as adaptive strategies emerge. Key variables: consumer behavior shifts, supply chain resilience, and digital transformation acceleration.",
            "Business landscape analysis points to subscription-based models and customer experience differentiation as competitive advantages. Timeline: 6-12 months for significant market shifts."
        ],
        social: [
            "Social trend analysis indicates increased emphasis on digital wellness and authentic connections. Hybrid work models are likely to become the new standard, affecting urban planning and community structures.",
            "Behavioral patterns suggest a growing preference for purposeful consumption and transparency in brands. This shift toward conscious decision-making will likely accelerate over the next 2-3 years."
        ],
        personal: [
            "Personal development trends show increased focus on adaptability and continuous learning. The half-life of skills is decreasing, making learning agility a critical competency for career resilience.",
            "Career forecasting suggests a shift toward portfolio careers and specialized expertise. Building a personal brand and network will become increasingly important for professional success."
        ],
        project: [
            "Project trajectory analysis based on current patterns suggests [specific timeline assessment needed]. Key risk factors include scope creep and resource allocation. Recommend implementing agile checkpoints.",
            "Forecasting project outcomes: current velocity indicates potential for early completion if current momentum is maintained. Consider adding buffer time for integration challenges."
        ],
        general: [
            "Analyzing patterns and trends... Multiple scenarios are possible depending on key variables. I recommend scenario planning: identify 3-4 potential outcomes and prepare adaptive strategies for each.",
            "Forecast analysis suggests uncertainty in several key areas. The most likely scenario involves gradual change with potential for rapid acceleration given the right catalysts."
        ]
    };
    const responses = forecastResponses[activeContext];
    const response = responses[Math.floor(Math.random() * responses.length)];
    // Add confidence qualifier to response
    const confidenceText = confidence > 0.8 ? "High confidence: " :
        confidence > 0.7 ? "Moderate confidence: " :
            "Preliminary analysis: ";
    return {
        response: confidenceText + response,
        confidence,
        tags: ['forecast', 'analysis', activeContext, 'prediction'],
        reasoning: `Forecast analysis for ${activeContext} context with ${Object.values(confidenceFactors).filter(Boolean).length} confidence factors`
    };
}

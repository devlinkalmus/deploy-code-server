"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plannerLogic = plannerLogic;
function plannerLogic(input, memory) {
    const message = input.message.toLowerCase();
    // Check for planning/goal-setting patterns
    const planningPatterns = [
        /\b(plan|planning|goal|goals|strategy|roadmap|schedule)\b/i,
        /\b(how\s*to|steps|process|workflow|approach)\b/i,
        /\b(organize|structure|framework|methodology)\b/i,
        /\b(project|task|todo|deadline|timeline)\b/i
    ];
    const isPlanning = planningPatterns.some(pattern => pattern.test(message));
    if (!isPlanning)
        return null;
    // Extract planning context
    const contexts = {
        project: /\b(project|development|build|create)\b/i.test(message),
        learning: /\b(learn|study|understand|research)\b/i.test(message),
        business: /\b(business|startup|company|market)\b/i.test(message),
        personal: /\b(personal|life|habit|routine)\b/i.test(message),
        technical: /\b(code|coding|programming|system|architecture)\b/i.test(message)
    };
    const activeContext = Object.keys(contexts).find(key => contexts[key]) || 'general';
    const planningResponses = {
        project: [
            "For project planning, I recommend breaking it down into: 1) Requirements gathering 2) Architecture design 3) Implementation phases 4) Testing & validation 5) Deployment. What's your project scope?",
            "Let's structure this project systematically. First, define your MVP (Minimum Viable Product), then identify dependencies and create a timeline. What's the core problem you're solving?"
        ],
        learning: [
            "Effective learning follows the 70-20-10 rule: 70% hands-on practice, 20% social learning, 10% formal study. What specific skill or topic are you targeting?",
            "I suggest a spiral learning approach: overview → deep dive → practice → teach others → iterate. What's your current knowledge level in this area?"
        ],
        business: [
            "Business planning should start with: 1) Market research 2) Value proposition 3) Business model 4) Financial projections 5) Go-to-market strategy. Which area needs focus?",
            "Let's apply the lean startup methodology: Build → Measure → Learn. What's your hypothesis about your target market?"
        ],
        personal: [
            "Personal planning works best with SMART goals: Specific, Measurable, Achievable, Relevant, Time-bound. What area of life are you looking to improve?",
            "I recommend the Getting Things Done (GTD) approach: Capture → Clarify → Organize → Reflect → Engage. What's your biggest productivity challenge?"
        ],
        technical: [
            "Technical planning should consider: 1) System requirements 2) Architecture patterns 3) Technology stack 4) Scalability 5) Security. What's your technical challenge?",
            "Let's use the C4 model: Context → Container → Component → Code. Start high-level and drill down. What system are you designing?"
        ],
        general: [
            "Good planning starts with the end in mind. Define your outcome, work backwards to identify steps, then execute with regular check-ins. What's your desired outcome?",
            "I recommend the PDCA cycle: Plan → Do → Check → Act. This creates continuous improvement. What specific area needs planning?"
        ]
    };
    const responses = planningResponses[activeContext];
    const response = responses[Math.floor(Math.random() * responses.length)];
    return {
        response,
        confidence: 0.88,
        tags: ['planning', 'strategy', activeContext],
        reasoning: `Planning request detected in ${activeContext} context`
    };
}

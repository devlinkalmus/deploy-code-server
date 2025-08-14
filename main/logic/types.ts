export interface LogicInput {
  message: string;
  persona?: string;
  context?: any;
}

export interface LogicResponse {
  response: string;
  confidence: number;
  tags: string[];
  reasoning?: string;
}

export interface Memory {
  id: string;
  content: string;
  tags: string[];
  importance: number; // 0-100
  type: 'STM' | 'LTM';
  timestamp: Date;
  decay?: number;
}

export interface LogicModule {
  name: string;
  tags: string[];
  run: (input: LogicInput, memory: Memory[]) => LogicResponse | null;
}

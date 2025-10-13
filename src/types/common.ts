// Base types used across the application
export type Department = 'KIDS' | 'MENS' | 'LADIES';
export type AttributeType = 'select' | 'text' | 'number' | 'boolean';
export type ExtractionStatus = 'Pending' | 'Queued' | 'Extracting' | 'Processing' | 'Done' | 'Error';
export type ModelType = 
  | 'gpt-4o'              // Latest GPT-4 with vision (most capable)
  | 'gpt-4-vision-preview' // Backup vision model
  | 'gpt-4-turbo'         // Fast text-only model for prompts
  | 'gpt-3.5-turbo'       // Text-only model
  | 'llava-1.5-7b-hf'     // HuggingFace LLaVA model
  | 'llava-local'         // Local Ollama LLaVA model
  | 'unknown';  

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// OpenAI API types
export interface OpenAIMessage {
  role: 'user' | 'system' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
      detail?: 'low' | 'high' | 'auto';
    };
  }>;
}

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens: number;
  temperature: number;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }>;
}

export interface APIResponse {
  content: string;
  tokensUsed: number;
  modelUsed: ModelType;
}
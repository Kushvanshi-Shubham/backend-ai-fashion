import type { ModelType, APIResponse } from '../types/common';
import { BaseApiService } from './baseApi';

export interface VLMProvider {
  id: string;
  name: string;
  type: 'primary' | 'secondary' | 'fallback' | 'local';
  isAvailable: boolean;
  priority: number;
  fashionOptimized: boolean;
  avgResponseTime: number;
  costPerRequest: number;
}

export interface VLMResponse extends APIResponse {
  provider: string;
  fallbacksUsed: string[];
  totalAttempts: number;
}

export class VLMService extends BaseApiService {
  private providers: VLMProvider[] = [
    {
      id: 'gpt-4o',
      name: 'OpenAI GPT-4o',
      type: 'primary',
      isAvailable: true,
      priority: 1,
      fashionOptimized: true,
      avgResponseTime: 2500,
      costPerRequest: 0.02
    },
    {
      id: 'huggingface-llava',
      name: 'HuggingFace LLaVA',
      type: 'secondary',
      isAvailable: false, // Will be checked dynamically
      priority: 2,
      fashionOptimized: true,
      avgResponseTime: 3000,
      costPerRequest: 0.005
    },
    {
      id: 'gpt-4v',
      name: 'OpenAI GPT-4V',
      type: 'fallback',
      isAvailable: true,
      priority: 3,
      fashionOptimized: false,
      avgResponseTime: 3500,
      costPerRequest: 0.03
    },
    {
      id: 'ollama-llava',
      name: 'Local Ollama LLaVA',
      type: 'local',
      isAvailable: false, // Will be checked dynamically
      priority: 4,
      fashionOptimized: false,
      avgResponseTime: 8000,
      costPerRequest: 0.0
    }
  ];

  constructor() {
    super();
    this.initializeProviders();
  }

  private async initializeProviders() {
    // Check HuggingFace availability
    if (process.env.HUGGINGFACE_API_KEY) {
      this.providers.find(p => p.id === 'huggingface-llava')!.isAvailable = await this.checkHuggingFaceHealth();
    }

    // Check Ollama availability
    this.providers.find(p => p.id === 'ollama-llava')!.isAvailable = await this.checkOllamaHealth();

    console.log('🎯 VLM Providers initialized:');
    this.getAvailableProviders().forEach(p => {
      console.log(`   ✅ ${p.name} (Priority: ${p.priority}, Fashion-Optimized: ${p.fashionOptimized})`);
    });
  }

  private async checkHuggingFaceHealth(): Promise<boolean> {
    try {
      const response = await fetch('https://api-inference.huggingface.co/models/llava-hf/llava-1.5-7b-hf', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: "test",
          options: { wait_for_model: false }
        })
      });
      return response.status !== 401 && response.status !== 403;
    } catch {
      return false;
    }
  }

  private async checkOllamaHealth(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const models = await response.json() as any;
      return models?.models?.some((model: any) => model.name.includes('llava')) || false;
    } catch {
      return false;
    }
  }

  public getAvailableProviders(): VLMProvider[] {
    return this.providers
      .filter(p => p.isAvailable)
      .sort((a, b) => a.priority - b.priority);
  }

  public getSystemHealth() {
    const available = this.getAvailableProviders();
    const fashionOptimized = available.filter(p => p.fashionOptimized);
    
    return {
      totalProviders: available.length,
      fashionOptimized: fashionOptimized.length,
      primaryAvailable: available.some(p => p.type === 'primary'),
      systemHealth: available.length > 0 ? (available.length / this.providers.length) * 100 : 0,
      recommendation: this.getRecommendation(available),
      providers: available.reduce((acc, p) => {
        acc[p.id] = p.isAvailable;
        return acc;
      }, {} as Record<string, boolean>)
    };
  }

  private getRecommendation(available: VLMProvider[]): string {
    if (available.length === 0) return 'No VLM providers available. Check API keys and connections.';
    if (available.length === 1) return `Only ${available[0].name} available. Consider setting up backup providers.`;
    if (available.some(p => p.fashionOptimized)) return 'Fashion-optimized models available. System ready for optimal extraction.';
    return 'Basic models available. Performance may vary for fashion-specific tasks.';
  }

  /**
   * 🎯 SMART FALLBACK EXTRACTION
   * Tries providers in optimal order for fashion extraction
   */
  async extractWithFallback(base64Image: string, prompt: string): Promise<VLMResponse> {
    const availableProviders = this.getAvailableProviders();
    const fallbacksUsed: string[] = [];
    let lastError: Error | null = null;
    let totalAttempts = 0;

    console.log(`🔍 Starting VLM extraction with ${availableProviders.length} available providers`);

    for (const provider of availableProviders) {
      totalAttempts++;
      console.log(`🎯 Attempting ${provider.name} (Priority ${provider.priority})...`);

      try {
        const startTime = Date.now();
        let result: APIResponse;

        switch (provider.id) {
          case 'gpt-4o':
            result = await this.callOpenAI(base64Image, prompt, 'gpt-4o');
            break;
          case 'gpt-4v':
            result = await this.callOpenAI(base64Image, prompt, 'gpt-4-vision-preview');
            break;
          case 'huggingface-llava':
            result = await this.callHuggingFace(base64Image, prompt);
            break;
          case 'ollama-llava':
            result = await this.callOllama(base64Image, prompt);
            break;
          default:
            throw new Error(`Unknown provider: ${provider.id}`);
        }

        const responseTime = Date.now() - startTime;
        console.log(`✅ Success with ${provider.name} (${responseTime}ms)`);

        return {
          ...result,
          provider: provider.name,
          fallbacksUsed,
          totalAttempts
        };

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.log(`❌ ${provider.name} failed: ${errorMsg}`);
        
        fallbacksUsed.push(`${provider.name}: ${errorMsg}`);
        lastError = error instanceof Error ? error : new Error(errorMsg);

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    throw new Error(`All VLM providers failed. Last error: ${lastError?.message}. Fallbacks attempted: ${fallbacksUsed.length}`);
  }

  private async callOpenAI(base64Image: string, prompt: string, model: string): Promise<APIResponse> {
    const formattedImage = base64Image.startsWith('data:') 
      ? base64Image 
      : `data:image/jpeg;base64,${base64Image}`;

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: formattedImage, detail: 'high' } }
          ]
        }],
        max_tokens: 3000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json() as any;
    return {
      content: data.choices[0].message.content,
      tokensUsed: data.usage?.total_tokens || 0,
      modelUsed: model as ModelType
    };
  }

  private async callHuggingFace(base64Image: string, prompt: string): Promise<APIResponse> {
    const response = await fetch('https://api-inference.huggingface.co/models/llava-hf/llava-1.5-7b-hf', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: {
          image: base64Image,
          text: prompt
        },
        options: { wait_for_model: true }
      })
    });

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.status}`);
    }

    const data = await response.json() as any;
    return {
      content: data.generated_text || data[0]?.generated_text || 'No response generated',
      tokensUsed: 0, // HuggingFace doesn't provide token count
      modelUsed: 'llava-1.5-7b-hf' as ModelType
    };
  }

  private async callOllama(base64Image: string, prompt: string): Promise<APIResponse> {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llava',
        prompt,
        images: [base64Image],
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json() as any;
    return {
      content: data.response || 'No response generated',
      tokensUsed: 0, // Ollama doesn't provide token count
      modelUsed: 'llava-local' as ModelType
    };
  }
}
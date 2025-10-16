export interface Settings {
  geminiApiKey: string;
  elasticsearchUrl: string;
  elasticsearchUsername: string;
  elasticsearchPassword: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  theme: 'light' | 'dark' | 'system';
  searchPreferences: {
    defaultSearchType: 'ai' | 'basic' | 'hybrid';
    resultsPerPage: number;
    enableSuggestions: boolean;
    enableAnalytics: boolean;
  };
  aiPreferences: {
    enableQueryEnhancement: boolean;
    enableDocumentAnalysis: boolean;
    enableStrategyGeneration: boolean;
    confidenceThreshold: number;
  };
}

export interface ApiKeyStatus {
  gemini: {
    configured: boolean;
    valid: boolean;
    lastChecked?: Date;
  };
  elasticsearch: {
    configured: boolean;
    connected: boolean;
    lastChecked?: Date;
  };
  supabase: {
    configured: boolean;
    connected: boolean;
    lastChecked?: Date;
  };
}

export class SettingsService {
  private static readonly STORAGE_KEY = 'lex-ai-settings';
  private static readonly API_KEY_PREFIX = 'lex-ai-key-';

  static getDefaultSettings(): Settings {
    return {
      geminiApiKey: '',
      elasticsearchUrl: 'http://localhost:9200',
      elasticsearchUsername: '',
      elasticsearchPassword: '',
      supabaseUrl: '',
      supabaseAnonKey: '',
      theme: 'system',
      searchPreferences: {
        defaultSearchType: 'ai',
        resultsPerPage: 10,
        enableSuggestions: true,
        enableAnalytics: true,
      },
      aiPreferences: {
        enableQueryEnhancement: true,
        enableDocumentAnalysis: true,
        enableStrategyGeneration: true,
        confidenceThreshold: 0.7,
      },
    };
  }

  static loadSettings(): Settings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...this.getDefaultSettings(), ...parsed };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    return this.getDefaultSettings();
  }

  static saveSettings(settings: Settings): void {
    try {
      // Don't save API keys to localStorage for security
      const settingsToSave = {
        ...settings,
        geminiApiKey: '', // Clear API key from saved settings
        elasticsearchPassword: '', // Clear password from saved settings
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settingsToSave));
      
      // Store API keys separately with encryption-like masking
      if (settings.geminiApiKey) {
        this.storeApiKey('gemini', settings.geminiApiKey);
      }
      if (settings.elasticsearchPassword) {
        this.storeApiKey('elasticsearch', settings.elasticsearchPassword);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  static getApiKey(type: 'gemini' | 'elasticsearch'): string {
    try {
      const key = localStorage.getItem(`${this.API_KEY_PREFIX}${type}`);
      return key ? this.decryptApiKey(key) : '';
    } catch (error) {
      console.error('Error retrieving API key:', error);
      return '';
    }
  }

  static storeApiKey(type: 'gemini' | 'elasticsearch', key: string): void {
    try {
      const encrypted = this.encryptApiKey(key);
      localStorage.setItem(`${this.API_KEY_PREFIX}${type}`, encrypted);
    } catch (error) {
      console.error('Error storing API key:', error);
    }
  }

  static clearApiKey(type: 'gemini' | 'elasticsearch'): void {
    localStorage.removeItem(`${this.API_KEY_PREFIX}${type}`);
  }

  static async checkApiKeyStatus(): Promise<ApiKeyStatus> {
    const status: ApiKeyStatus = {
      gemini: { configured: false, valid: false },
      elasticsearch: { configured: false, connected: false },
      supabase: { configured: false, connected: false },
    };

    // Check Gemini API key
    const geminiKey = this.getApiKey('gemini');
    if (geminiKey) {
      status.gemini.configured = true;
      try {
        // Simple validation - check if key looks like a valid Gemini key
        status.gemini.valid = geminiKey.length > 20 && geminiKey.startsWith('AI');
        status.gemini.lastChecked = new Date();
      } catch (error) {
        status.gemini.valid = false;
      }
    }

    // Check Elasticsearch connection
    const elasticsearchUrl = this.loadSettings().elasticsearchUrl;
    if (elasticsearchUrl) {
      status.elasticsearch.configured = true;
      try {
        const response = await fetch(`${elasticsearchUrl}/_cluster/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        status.elasticsearch.connected = response.ok;
        status.elasticsearch.lastChecked = new Date();
      } catch (error) {
        status.elasticsearch.connected = false;
      }
    }

    // Check Supabase connection
    const settings = this.loadSettings();
    if (settings.supabaseUrl && settings.supabaseAnonKey) {
      status.supabase.configured = true;
      try {
        // Simple validation - check if URL and key look valid
        status.supabase.connected = settings.supabaseUrl.includes('supabase') && 
                                   settings.supabaseAnonKey.length > 20;
        status.supabase.lastChecked = new Date();
      } catch (error) {
        status.supabase.connected = false;
      }
    }

    return status;
  }

  private static encryptApiKey(key: string): string {
    // Simple obfuscation - in production, use proper encryption
    return btoa(key.split('').reverse().join(''));
  }

  private static decryptApiKey(encrypted: string): string {
    // Simple deobfuscation - in production, use proper decryption
    return atob(encrypted).split('').reverse().join('');
  }

  static maskApiKey(key: string): string {
    if (!key || key.length < 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  }

  static validateGeminiApiKey(key: string): boolean {
    return key.length > 20 && key.startsWith('AI');
  }

  static validateElasticsearchUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  static validateSupabaseUrl(url: string): boolean {
    try {
      new URL(url);
      return url.includes('supabase');
    } catch {
      return false;
    }
  }
}

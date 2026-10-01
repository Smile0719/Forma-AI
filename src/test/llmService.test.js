import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildProviderChain } = require('../../llmService.cjs');

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('buildProviderChain', () => {
  it('does not treat template credentials as a configured provider', () => {
    vi.stubEnv('OPENAI_API_KEY', 'your_openai_api_key');
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    vi.stubEnv('OLLAMA_BASE_URL', '');

    expect(buildProviderChain()).toEqual([]);
  });

  it('uses the configured OpenAI model and base URL', () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test-placeholder');
    vi.stubEnv('OPENAI_MODEL', 'gpt-test');
    vi.stubEnv('OPENAI_BASE_URL', 'https://example.test/v1');
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    vi.stubEnv('OLLAMA_BASE_URL', '');

    const [provider] = buildProviderChain();

    expect(provider.name).toBe('openai:gpt-test');
    expect(provider.model.model).toBe('gpt-test');
    expect(provider.model.clientConfig.baseURL).toBe('https://example.test/v1');
  });
});

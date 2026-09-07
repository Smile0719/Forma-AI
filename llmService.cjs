const { ChatOpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic');
const { PromptTemplate } = require('@langchain/core/prompts');
const { JsonOutputParser } = require('@langchain/core/output_parsers');

/**
 * Build the ordered list of LLM providers to try.
 * Primary: GPT-4o, then Anthropic Claude 3.5 Sonnet, then local Ollama Llama 3.
 * Each entry is skipped when its credentials are not configured.
 */
const buildProviderChain = () => {
  const providers = [];

  if (process.env.OPENAI_API_KEY) {
    providers.push({
      name: 'openai:gpt-4o',
      model: new ChatOpenAI({
        modelName: 'gpt-4o',
        temperature: 0,
        timeout: 30000,
        openAIApiKey: process.env.OPENAI_API_KEY
      })
    });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    providers.push({
      name: 'anthropic:claude-3-5-sonnet',
      model: new ChatAnthropic({
        model: 'claude-3-5-sonnet-latest',
        temperature: 0,
        timeout: 30000,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY
      })
    });
  }

  if (process.env.OLLAMA_BASE_URL) {
    providers.push({
      name: 'ollama:llama3',
      model: new ChatOpenAI({
        modelName: process.env.OLLAMA_MODEL || 'llama3',
        temperature: 0,
        timeout: 60000,
        configuration: { baseURL: `${process.env.OLLAMA_BASE_URL.replace(/\/$/, '')}/v1` },
        openAIApiKey: 'ollama'
      })
    });
  }

  return providers;
};

/**
 * Extracts structured key-value pairs matching a dynamic form schema
 * from an unstructured user narrative, with multi-provider fallback.
 */
const extractFormData = async (userStory, formSchema) => {
  const providers = buildProviderChain();
  if (!providers.length) {
    throw new Error('No LLM provider configured.');
  }

  const parser = new JsonOutputParser();

  // Extract expected target keys and options to guide the LLM
  const expectedFields = formSchema.fields.map((f) => ({
    key: f.name,
    label: f.label,
    type: f.type,
    options: f.options ? f.options.map((o) => o.value) : undefined
  }));

  const prompt = new PromptTemplate({
    template: `    You are an expert multilingual dynamic data extraction engine.
    Analyze the user's narrative, regardless of language, and extract matching field values for the form.
    Translate meaning internally when needed, but always return the schema keys and select option values exactly as provided in English.

FORM SCHEMA SPECIFICATION:
{expectedFields}

USER NARRATIVE:
"{userStory}"

  INSTRUCTIONS:
1. Extract values strictly corresponding to the key names in the schema.
2. For "select" fields, match the extracted value to one of the provided option values.
3. If a field is not explicitly mentioned in the narrative, omit it from the JSON output.
  4. Return a top-level "values" object containing the extracted fields.
  5. Return a top-level "confidence" object with a 0-100 number for every extracted field.
  6. Base confidence on how explicitly and unambiguously the narrative supports the value.
  7. Output ONLY valid JSON without markdown code fences.

{formatInstructions}`,
    inputVariables: ['userStory', 'expectedFields'],
    partialVariables: { formatInstructions: parser.getFormatInstructions() }
  });

  const chainFor = (model) => prompt.pipe(model).pipe(parser);

  let lastError;
  for (const provider of providers) {
    try {
      const response = await chainFor(provider.model).invoke({
        userStory,
        expectedFields: JSON.stringify(expectedFields, null, 2)
      });
    const rawValues = response?.values && typeof response.values === 'object'
      ? response.values
      : response;
    const confidence = response?.confidence && typeof response.confidence === 'object'
      ? response.confidence
      : {};

    if (!rawValues || typeof rawValues !== 'object' || Array.isArray(rawValues)) {
      throw new Error('The model returned an invalid extraction shape.');
    }

    const allowedFields = new Map(formSchema.fields.map((field) => [field.name, field]));
    const values = Object.fromEntries(
      Object.entries(rawValues).filter(([key, value]) => {
        const field = allowedFields.get(key);
        if (!field || value === null || value === undefined) return false;
        if (field.type === 'select') {
          return field.options?.some((option) => option.value === value) || false;
        }
        if (field.type === 'checkbox') return typeof value === 'boolean';
        if (field.type === 'number') return Number.isFinite(Number(value));
        return typeof value === 'string' || typeof value === 'number';
      })
    );

      return {
        provider: provider.name,
        values,
        confidence: Object.fromEntries(
          Object.keys(values).map((key) => {
            const score = Number(confidence[key]);
            return [key, Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0];
          })
        )
      };
    } catch (error) {
      console.warn(`Provider ${provider.name} failed, trying next:`, error.message);
      lastError = error;
    }
  }

  console.error('All LLM providers failed:', lastError);
  throw new Error('Failed to parse unstructured text into structured JSON.');
};

/**
 * Transcribe an audio buffer using OpenAI Whisper (when configured).
 * Returns { text, provider } or throws so the caller can fall back to the Web Speech API.
 */
const transcribeAudio = async (buffer, filename = 'audio.webm') => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Whisper transcription is not configured.');
  }
  const form = new FormData();
  form.append('file', new Blob([buffer]), filename);
  form.append('model', 'whisper-1');
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Whisper API error: ${response.status} ${detail.slice(0, 200)}`);
  }
  const data = await response.json();
  return { text: data.text, provider: 'openai:whisper-1' };
};

module.exports = { extractFormData, transcribeAudio, buildProviderChain };
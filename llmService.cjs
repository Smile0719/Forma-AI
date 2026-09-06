const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { JsonOutputParser } = require('@langchain/core/output_parsers');

/**
 * Extracts structured key-value pairs matching a dynamic form schema
 * from an unstructured user narrative using OpenAI & LangChain.
 */
const extractFormData = async (userStory, formSchema) => {
  // Initialize LLM with deterministic temperature
  const model = new ChatOpenAI({
    modelName: 'gpt-4o',
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY
  });

  const parser = new JsonOutputParser();

  // Extract expected target keys and options to guide the LLM
  const expectedFields = formSchema.fields.map((f) => ({
    key: f.name,
    label: f.label,
    type: f.type,
    options: f.options ? f.options.map((o) => o.value) : undefined
  }));

  const prompt = new PromptTemplate({
    template: `You are an expert dynamic data extraction engine.
Analyze the user's natural language narrative and extract matching field values for the form.

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

  const chain = prompt.pipe(model).pipe(parser);

  try {
    const response = await chain.invoke({
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

    const allowedKeys = new Set(formSchema.fields.map((field) => field.name));
    const values = Object.fromEntries(
      Object.entries(rawValues).filter(([key]) => allowedKeys.has(key))
    );

    return {
      values,
      confidence: Object.fromEntries(
        Object.keys(values).map((key) => {
          const score = Number(confidence[key]);
          return [key, Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0];
        })
      )
    };
  } catch (error) {
    console.error('LangChain Extraction Error:', error);
    throw new Error('Failed to parse unstructured text into structured JSON.');
  }
};

module.exports = { extractFormData };
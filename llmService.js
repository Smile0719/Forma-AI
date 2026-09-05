const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { JsonOutputParser } = require('@langchain/core/output_parsers');

/**
 * Extracts structured key-value pairs matching a target form schema 
 * from an unstructured narrative text using OpenAI & LangChain.
 */
const extractFormData = async (userStory, formSchema) => {
  // Initialize the LLM with deterministic temperature
  const model = new ChatOpenAI({
    modelName: 'gpt-4o',
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY
  });

  const parser = new JsonOutputParser();

  // Extract relevant field labels & keys to instruct the model
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
4. Output ONLY valid JSON matching the key-value schema format without markdown code fences.

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
    return response;
  } catch (error) {
    console.error('LangChain Extraction Error:', error);
    throw new Error('Failed to parse unstructured text into structured JSON.');
  }
};

module.exports = { extractFormData };
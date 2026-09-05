const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { JsonOutputParser } = require('@langchain/core/output_parsers');

const extractFormData = async (userStory, formSchema) => {
  const model = new ChatOpenAI({
    model: 'gpt-4o',
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY
  });
  const parser = new JsonOutputParser();
  const expectedFields = formSchema.fields.map((field) => ({
    key: field.name,
    label: field.label,
    type: field.type,
    options: field.options?.map((option) => option.value)
  }));
  const prompt = new PromptTemplate({
    template: `You extract structured form values from a user narrative.
Return only valid JSON. Use only keys from the schema. Omit fields not mentioned.
For select fields, use one of the provided option values.

FORM SCHEMA:
{expectedFields}

USER NARRATIVE:
{userStory}

{formatInstructions}`,
    inputVariables: ['userStory', 'expectedFields'],
    partialVariables: { formatInstructions: parser.getFormatInstructions() }
  });

  return prompt.pipe(model).pipe(parser).invoke({
    userStory,
    expectedFields: JSON.stringify(expectedFields, null, 2)
  });
};

module.exports = { extractFormData };

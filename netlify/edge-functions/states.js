export default async (request) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server missing OpenAI API key' }), { status: 500 });
  }
  try {
    const { input } = await request.json();
    if (!input) {
      return new Response(JSON.stringify({ error: 'Missing input' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    // Instructions for the states lens.
    const instructions = `Take the following input, and approach it from each of the 4 states of consciousness of Ken Wilber's integral theory (Gross, Subtle, Causal, Nondual). Give no preamble like \"in this state...\" or \"from this perspective...\". Instead, just approach it as if that state is the only important lens, and explain it from that perspective, as if from someone who is currently experiencing that state of consciousness. Use language inherent to that state.\n\nFrom each state, write a short paragraph of around 100 words, followed by 3 bullet points that are concise \"doorways\" to experiencing the input through this state of awareness (10 words max per example).\n\nReturn a JSON in this exact format:\n{\n  \"Gross\": {\"paragraph\": \"\", \"bullets\": [\"\", \"\", \"\"]},\n  \"Subtle\": {\"paragraph\": \"\", \"bullets\": [\"\", \"\", \"\"]},\n  \"Causal\": {\"paragraph\": \"\", \"bullets\": [\"\", \"\", \"\"]},\n  \"Nondual\": {\"paragraph\": \"\", \"bullets\": [\"\", \"\", \"\"]}\n}`;
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5',
        instructions,
        input,
        temperature: 0.7,
        max_output_tokens: 2000,
      }),
    });
    const data = await response.json();
    const outputText = data.output_text;
    return new Response(outputText, { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const config = { path: '/.netlify/functions/states' };
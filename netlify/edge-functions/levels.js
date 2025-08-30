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
    // Instructions for the levels lens.
    const instructions = `Take the following input, and approach it from each of the 6 levels of Ken Wilber's integral theory (Magenta, Red, Amber, Orange, Green, Teal). Give no preamble like "in this level..." or "from this perspective...". Instead, just approach it as if that level is the only important lens, and explain it from that perspective. Use language inherent to that level.\n\nFrom each level, write a short paragraph of around 100 words, followed by 5 bullet points that are examples of the \"input\" at that stage of development (10 words max per example).\n\nReturn a JSON in this exact format:\n{\n  \"Magenta\": {\"paragraph\": \"\", \"bullets\": [\"\", \"\", \"\", \"\", \"\"]},\n  \"Red\": {\"paragraph\": \"\", \"bullets\": [\"\", \"\", \"\", \"\", \"\"]},\n  \"Amber\": {\"paragraph\": \"\", \"bullets\": [\"\", \"\", \"\", \"\", \"\"]},\n  \"Orange\": {\"paragraph\": \"\", \"bullets\": [\"\", \"\", \"\", \"\", \"\"]},\n  \"Green\": {\"paragraph\": \"\", \"bullets\": [\"\", \"\", \"\", \"\", \"\"]},\n  \"Teal\": {\"paragraph\": \"\", \"bullets\": [\"\", \"\", \"\", \"\", \"\"]}\n}`;
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
        max_output_tokens: 2500,
      }),
    });
    const data = await response.json();
    const outputText = data.output_text;
    return new Response(outputText, { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const config = { path: '/.netlify/functions/levels' };
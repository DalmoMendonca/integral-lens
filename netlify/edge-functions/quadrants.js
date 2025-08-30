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
    // Instructions for the quadrants lens.  See the README for details.
    const instructions = `Take the following input, and approach it from each of the 4 quadrants of Ken Wilber's integral theory (UL, UR, LL, LR). Give no preamble like "in this quadrant..." or "from this perspective...". Instead, just approach it as if that quadrant is the only important lens, and explain it from that perspective. Use language inherent to that quadrant (e.g. use "I" in the UL, "we" in the LL, objective language in UR, systems language in LR, etc.).\n\nFrom each perspective, you will write a short paragraph of around 200 words, followed by 3 bullet points of around 10 words each to approach the input.\n\nYour response will be parsed by a code, so it's vital that your ONLY output should ALWAYS be a JSON in this exact format:\n{\n  \"UL\": {\"paragraph\": \"\", \"bullets\": [\"\", \"\", \"\"]},\n  \"UR\": {\"paragraph\": \"\", \"bullets\": [\"\", \"\", \"\"]},\n  \"LL\": {\"paragraph\": \"\", \"bullets\": [\"\", \"\", \"\"]},\n  \"LR\": {\"paragraph\": \"\", \"bullets\": [\"\", \"\", \"\"]}\n}`;
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

export const config = { path: '/.netlify/functions/quadrants' };
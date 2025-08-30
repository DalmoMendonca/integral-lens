// Use the global fetch available in Node 18+; no polyfill required.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { input } = JSON.parse(event.body || '{}');
    if (!input) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing input' }),
      };
    }
    // Compose the instructions for the four states of consciousness.  These
    // instructions will be sent as the `instructions` field of the OpenAI
    // Responses API call.  The actual user input will be passed separately via
    // the `input` field, so we do not interpolate it here.
    const instructions = `Take the following input, and approach it from each of the 4 states of consciousness of Ken Wilber's integral theory (Gross, Subtle, Causal, Nondual). Give no preamble like \"in this state...\" or \"from this perspective...\". Instead, just approach it as if that state is the only important lens, and explain it from that perspective, as if from someone who is currently experiencing that state of consciousness. Use language inherent to that state.\n\nFrom each state, write a short paragraph of around 100 words, followed by 3 bullet points that are concise \"doorways\" to experiencing the input through this state of awareness (10 words max per example).\n\nReturn a JSON in this exact format:\n{\n  \"Gross\": {\"paragraph\": \"\", \"bullets\": [\"\", \"\", \"\"]},\n  \"Subtle\": {\"paragraph\": \"\", \"bullets\": [\"\", \"\", \"\"]},\n  \"Causal\": {\"paragraph\": \"\", \"bullets\": [\"\", \"\", \"\"]},\n  \"Nondual\": {\"paragraph\": \"\", \"bullets\": [\"\", \"\", \"\"]}\n}`;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server missing OpenAI API key' }),
      };
    }
    const https = require('https');
    // Prepare the payload for the Responses API.  We send the generic
    // instructions separately from the user input.  The API will return
    // structured text in the `output_text` property.
    const postData = JSON.stringify({
      model: 'gpt-5',
      instructions,
      input,
      temperature: 0.7,
      max_output_tokens: 2000,
    });
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/responses',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    };
    const data = await new Promise((resolve, reject) => {
      const req = https.request(options, res => {
        let body = '';
        res.on('data', chunk => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
    const content = data.output_text;
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: content,
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
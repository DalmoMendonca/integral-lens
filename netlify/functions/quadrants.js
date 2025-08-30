// Use the global fetch available in Node 18+; no polyfill required.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }
  try {
    const { input } = JSON.parse(event.body || '{}');
    if (!input) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing input' }),
      };
    }
    // Compose the instructions for the quadrants.  These instructions live in the
    // `instructions` field of the OpenAI Responses API call.  They describe how
    // the model should behave when crafting the response.  The actual user
    // input will be passed separately via the `input` field so we don't need
    // to interpolate it here.
    const instructions = `Take the following input, and approach it from each of the 4 quadrants of Ken Wilber's integral theory (UL, UR, LL, LR). Give no preamble like "in this quadrant..." or "from this perspective...". Instead, just approach it as if that quadrant is the only important lens, and explain it from that perspective. Use language inherent to that quadrant (e.g. use "I" in the UL, "we" in the LL, objective language in UR, systems language in LR, etc.).\n\nFrom each perspective, you will write a short paragraph of around 200 words, followed by 3 bullet points of around 10 words each to approach the input.\n\nYour response will be parsed by a code, so it's vital that your ONLY output should ALWAYS be a JSON in this exact format:\n{\n  "UL": {"paragraph": "", "bullets": ["", "", ""]},\n  "UR": {"paragraph": "", "bullets": ["", "", ""]},\n  "LL": {"paragraph": "", "bullets": ["", "", ""]},\n  "LR": {"paragraph": "", "bullets": ["", "", ""]}\n}`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server missing OpenAI API key' }),
      };
    }
    // Perform the API call using Node's https module.  We call the
    // /v1/responses endpoint, passing the instructions in the
    // `instructions` field and the user-provided input in the `input` field.
    const https = require('https');
    const postData = JSON.stringify({
      model: 'gpt-5',
      instructions,
      input,
      // Control output variability.  Higher values introduce more creativity.
      temperature: 0.7,
      // Limit the total number of tokens in the response to keep costs in
      // check and ensure we receive a reasonably sized JSON object.
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
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
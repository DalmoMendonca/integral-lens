// Use the global fetch available in Node 18+; no polyfill required.

exports.handler = async (event) => {
  // Only accept POST requests.
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
    // Compose the instructions for the four quadrants. These instructions are
    // sent in the `instructions` field to the Responses API. The input is
    // passed separately via the `input` field.
    const instructions = `Take the following input, and approach it from each of the 4 quadrants of Ken Wilber's integral theory (UL, UR, LL, LR). Give no preamble like "in this quadrant..." or "from this perspective...". Instead, just approach it as if that quadrant is the only important lens, and explain it from that perspective. Use language inherent to that quadrant (e.g. use "I" in the UL, "we" in the LL, objective language in UR, systems language in LR, etc.).\n\nFrom each perspective, you will write a short paragraph of around 200 words, followed by 3 bullet points of around 10 words each to give examples of how the input might show up in that quadrant.\n\nYour response will be parsed by a code, so it's vital that your ONLY output should ALWAYS be a JSON in this exact format:\n{\n  "UL": {"paragraph": "", "bullets": ["", "", ""]},\n  "UR": {"paragraph": "", "bullets": ["", "", ""]},\n  "LL": {"paragraph": "", "bullets": ["", "", ""]},\n  "LR": {"paragraph": "", "bullets": ["", "", ""]}\n}`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server missing OpenAI API key' }),
      };
    }

    const https = require('https');
    const postData = JSON.stringify({
      model: 'gpt-4.1-nano',
      instructions,
      input,
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
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            return resolve({ error: `OpenAI API error (${res.statusCode}): ${body}` });
          }
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

    // Surface API-level errors.
    if (data.error) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: data.error }),
      };
    }

    // Extract the generated JSON string from the nested structure.
    let outputText = null;
    if (Array.isArray(data.output)) {
      for (const entry of data.output) {
        if (entry.type === 'message' && Array.isArray(entry.content)) {
          const textNode = entry.content.find(
            (c) => c && c.type === 'output_text' && typeof c.text === 'string',
          );
          if (textNode) {
            outputText = textNode.text;
            break;
          }
        }
      }
    }

    if (!outputText) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing output_text in OpenAI response' }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: outputText,
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

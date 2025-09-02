// Use the global fetch available in Node 18+; no polyfill required.

exports.handler = async (event) => {
  // Ensure only POST requests are processed.
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
    // Compose the instructions for the four states of consciousness. These are
    // passed in the `instructions` field to the Responses API.  Input is
    // separate and not interpolated into the instructions string.
    const instructions = `Take the following input, and approach it from each of the 4 states of consciousness of Ken Wilber's integral theory (Gross, Subtle, Causal, Nondual). Give no preamble like "in this state..." or "from this perspective...". Instead, just approach it as if that state is the only important lens, and explain it from that perspective, as if from someone who is currently experiencing that state of consciousness. Use language inherent to that state.\n\nFrom each state, write a short paragraph of around 100 words, followed by 3 bullet points that are concise "doorways" to experiencing the input through this state of awareness (10 words max per example).\n\nReturn a JSON in this exact format:\n{\n  "Gross": {"paragraph": "", "bullets": ["", "", ""]},\n  "Subtle": {"paragraph": "", "bullets": ["", "", ""]},\n  "Causal": {"paragraph": "", "bullets": ["", "", ""]},\n  "Nondual": {"paragraph": "", "bullets": ["", "", ""]}\n}`;

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

    // Propagate errors from the API call.
    if (data.error) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: data.error }),
      };
    }

    // Navigate the nested structure to find the generated JSON string.
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

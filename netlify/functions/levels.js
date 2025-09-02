// Use the global fetch available in Node 18+; no polyfill required.

exports.handler = async (event) => {
  // Reject any non‑POST requests early.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    // Parse the input payload; ensure a string exists.
    const { input } = JSON.parse(event.body || '{}');
    if (!input) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing input' }),
      };
    }
    // Compose the instructions for the six developmental levels.  These
    // instructions will be sent as the `instructions` field of the OpenAI
    // Responses API call.  The actual user input will be passed separately via
    // the `input` field, so we do not interpolate the input here.  It's
    // essential to keep the formatting exactly as requested, because the API
    // should return a JSON matching this schema.
    const instructions = `Take the following input, and approach it from each of the 6 levels of Ken Wilber's integral theory (Magenta, Red, Amber, Orange, Green, Teal). Give no preamble like "in this level..." or "from this perspective...". Instead, just approach it as if that level is the only important lens, and explain it from that perspective. Use language inherent to that level of deveolpment.\n\nWrite as if you were a person whose center of gravity is in that level, NOT as a detached observer who is aware of the level's core characteristics and able to easily name them. Embody that persona to approach the input with their worldview and values. Remember that the characteristics of these levels are different depending on whether we're talking about individuals or businesses or whole societies; someone whose center of gravity in Red today (like a gang maember) will not necessarily act like or speak like someone from a whole red society from 6000 years ago (jungle warlords), so take the input into consideration and be nuanced. From each level, write a short paragraph of around 100 words. Then... write 5 bullet points that are EXAMPLES of the "input" at that stage of development (10 words max per example). for isntance, if the input is "board games", a good bullet for orange would be "chess" and for red would be "hungry hungry hippos" and for green would be "pandemic". The bullets are meant to show concrete and identifiable instances of how the input shows up for each level, or what kinds of the input each level most gravitates toward. \n\nReturn a JSON in this exact format:\n{\n  "Magenta": {"paragraph": "", "bullets": ["", "", "", "", ""]},\n  "Red": {"paragraph": "", "bullets": ["", "", "", "", ""]},\n  "Amber": {"paragraph": "", "bullets": ["", "", "", "", ""]},\n  "Orange": {"paragraph": "", "bullets": ["", "", "", "", ""]},\n  "Green": {"paragraph": "", "bullets": ["", "", "", "", ""]},\n  "Teal": {"paragraph": "", "bullets": ["", "", "", "", ""]}\n}`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server missing OpenAI API key' }),
      };
    }

    const https = require('https');
    // Prepare the payload for the Responses API.  We send the generic
    // instructions separately from the user input.  The API will return a
    // structured response we must traverse below.
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
          // If the API returns an error status (e.g. 401, 429), resolve with an error instead of parsing JSON.
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

    // If the API returned an error, propagate it back as a 502.
    if (data.error) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: data.error }),
      };
    }

    // Traverse the Responses API structure to extract the generated JSON string.
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

    // If we didn't find the output text, return an error to the client.
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

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/comps', async (req, res) => {
  const { address } = req.body;
  
  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('No API key found');
    return res.status(500).json({ error: 'API key not configured' });
  }

  console.log('API key found, length:', apiKey.length);
  console.log('Searching comps for:', address);

  try {
    const requestBody = {
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: `You are a real estate comp analyst. Search for the 3 most recently sold comparable homes near the given address from 2024-2025. Return ONLY a raw JSON object with no markdown, no backticks, no explanation. Must start with { and end with }. Use this exact structure: {"comps":[{"address":"123 Main St, City, ST","sold_price":250000,"beds":3,"baths":2,"sqft":1400,"price_per_sqft":179,"sold_date":"March 2025"}],"suggested_arv":255000,"arv_note":"Based on avg $179/sqft across 3 recent sales"}`,
      messages: [{ 
        role: 'user', 
        content: `Find the 3 most recently sold comparable homes near: ${address}. Return ONLY raw JSON.` 
      }]
    };

    console.log('Calling Anthropic API...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Anthropic response status:', response.status);
    
    const data = await response.json();
    console.log('Anthropic response:', JSON.stringify(data).substring(0, 500));
    
    if (data.error) {
      console.error('Anthropic error:', data.error);
      return res.status(500).json({ error: data.error.message });
    }

    const textBlock = data.content && data.content.find(b => b.type === 'text');
    const raw = textBlock ? textBlock.text : '';
    
    console.log('Raw text:', raw.substring(0, 200));
    
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
      return res.status(500).json({ error: 'Could not parse comps data' });
    }
    
    const cleaned = raw.substring(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(cleaned);
    
    res.json(parsed);
  } catch (err) {
    console.error('Caught error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'Victoria Homes API is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

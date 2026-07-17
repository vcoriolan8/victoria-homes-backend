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
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: `You are a real estate comp analyst. When given a property address, search Zillow, Redfin, or Realtor.com for the 3 most recently sold comparable homes within a 1 mile radius. Only include sales from 2024 or 2025. Return ONLY a raw JSON object. No markdown, no backticks, no explanation. Must start with { and end with }. Use this exact structure: {"comps":[{"address":"123 Main St, City, ST","sold_price":250000,"beds":3,"baths":2,"sqft":1400,"price_per_sqft":179,"sold_date":"March 2025"}],"suggested_arv":255000,"arv_note":"Based on avg $179/sqft across 3 recent sales"}`,
        messages: [{ 
          role: 'user', 
          content: `Find the 3 most recently sold comparable homes near: ${address}. Return ONLY raw JSON.` 
        }]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const textBlock = data.content && data.content.find(b => b.type === 'text');
    const raw = textBlock ? textBlock.text : '';
    
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
      return res.status(500).json({ error: 'Could not parse comps data' });
    }
    
    const cleaned = raw.substring(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(cleaned);
    
    res.json(parsed);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'Victoria Homes API is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

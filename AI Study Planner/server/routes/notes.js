const express = require('express');
const router = express.Router();
const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
const GROQ_MODEL = 'llama-3.1-8b-instant';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function callGroq(prompt) {
  const response = await axios.post(
    GROQ_URL,
    {
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    },
    {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data.choices[0].message.content;
}

router.post('/', async (req, res) => {
  const { topic } = req.body;

  if (!topic || topic.trim() === '') {
    return res.status(400).json({ error: 'Missing or empty topic' });
  }

  const prompt = `
    You are an expert AI tutor. A student has requested detailed study notes for the following topic:
    "${topic}"

    Generate a comprehensive, well-structured study note covering this topic in approximately 200 words.
    Use clear markdown formatting: bold key terms (**term**), use bullet points (•) for lists.
    Make it engaging, accurate, and highly scannable for exam preparation.
    Focus on definitions, key concepts, formulas if applicable, and exam tips.
    Return the response as a JSON object with a single key "content".
  `;

  try {
    let text = await callGroq(prompt);
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    res.json(JSON.parse(text));
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.error('Groq Notes API Error:', errMsg);
    res.status(500).json({ error: `Groq API Error: ${errMsg}` });
  }
});

module.exports = router;

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
      temperature: 0.2,
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
  const { subject, testData } = req.body;

  if (!testData || !Array.isArray(testData) || testData.length === 0) {
    return res.status(400).json({ error: 'Missing or empty testData array' });
  }

  const prompt = `
    You are an expert AI professor for the subject: ${subject || 'General Knowledge'}.
    A student has submitted a mock test. Evaluate each answer and score it out of the given maxMarks.
    
    Student submission:
    ${JSON.stringify(testData, null, 2)}

    Grading rules:
    - Empty answer = 0 marks
    - Partially correct = partial marks
    - Excellent/complete = full marks

    Return ONLY valid JSON (no markdown, no backticks):
    {
      "totalScore": 0,
      "maxPossibleScore": 0,
      "evaluations": [
        {
          "id": "match the id from testData",
          "awardedMarks": 0,
          "maxMarks": 0,
          "feedback": "1-2 sentences of constructive feedback."
        }
      ]
    }
  `;

  try {
    let text = await callGroq(prompt);
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    let result = JSON.parse(text);
    
    // Safety check: force real math instead of trusting the LLM's addition
    result.maxPossibleScore = testData.reduce((acc, q) => acc + (Number(q.maxMarks) || 0), 0);
    result.totalScore = (result.evaluations || []).reduce((acc, ev) => acc + (Number(ev.awardedMarks) || 0), 0);
    
    res.json(result);
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.error('Groq Grading Error:', errMsg);
    res.status(500).json({ error: `Groq API Error: ${errMsg}` });
  }
});

module.exports = router;

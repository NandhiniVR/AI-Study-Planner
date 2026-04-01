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
  const { topic, notes, difficulty, structure, totalMarks } = req.body;

  if (!topic || !structure || !difficulty || !totalMarks) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const prompt = `
Generate a mock test based on the given topic or notes.

User Inputs:
- Topic/Notes: ${topic}\n${notes}
- Difficulty Level: ${difficulty}
- Total Marks: ${totalMarks}
- Mark Structure:
  ${JSON.stringify(structure, null, 2)}

Instructions:
- Strictly follow the given mark structure
- Ensure total marks match the user-defined total
- Generate exactly the specified number of questions per section
- DO NOT generate a section if it is not requested in the mark structure
- Cover all key concepts from the topic
- Maintain the selected difficulty level
- Avoid repetition
- Questions should be clear and exam-oriented

For MCQs:
- Provide exactly 4 options
- Include correct answer
- Include explanation

For descriptive questions:
- Provide concise model answers
- Include key points for evaluation

Output format (STRICT JSON ONLY):
{
  "test": {
    "topic": "",
    "difficulty": "",
    "total_marks": "",
    "sections": [
      {
        "type": "MCQ",
        "marks_each": 1,
        "questions": [
          {
            "question": "",
            "options": ["", "", "", ""],
            "answer": "",
            "explanation": ""
          }
        ]
      },
      {
        "type": "Short Answer",
        "marks_each": 3,
        "questions": [
          {
            "question": "",
            "answer": "",
            "key_points": []
          }
        ]
      },
      {
        "type": "Long Answer",
        "marks_each": 10,
        "questions": [
          {
            "question": "",
            "answer": "",
            "key_points": []
          }
        ]
      }
    ]
  }
}

Return ONLY valid JSON. No extra text, no markdown backticks.
`;

  try {
    let text = await callGroq(prompt);
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    res.json(JSON.parse(text));
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.error('Groq Test Generation Error:', errMsg);
    res.status(500).json({ error: `Groq API Error: ${errMsg}` });
  }
});

module.exports = router;

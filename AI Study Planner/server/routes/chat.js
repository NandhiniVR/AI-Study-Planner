const express = require('express');
const router = express.Router();
const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
const GROQ_MODEL = 'llama-3.1-8b-instant';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const systemPrompt = `You are an **AI Study Assistant Chatbot** integrated into a student learning platform. Your goal is to help users understand concepts, generate study materials, and visualize information effectively.

# 🎯 CORE RESPONSIBILITIES
1. Answer student doubts clearly and accurately
2. Generate exam-oriented explanations
3. Create flashcards for revision
4. Generate structured data for mind maps
5. Generate flowcharts in renderable format

# 🧠 INSTRUCTIONS
* Always prioritize the provided context/notes
* If context is insufficient, answer logically but stay relevant
* Keep answers: Clear, Concise, Structured, Exam-oriented

# 📝 RESPONSE MODES

## 1. 📖 DOUBT SOLVING MODE (DEFAULT)
When user asks a question, output:
* Direct Answer
* Explanation
* Key Points (bullet list)
* Example (if applicable)
* ⭐ Exam Tip

## 2. 🧠 FLASHCARD GENERATION MODE
If user asks for flashcards, output 5–10 items formatted precisely as:
Q1:
A1:

Q2:
A2:

## 3. 🌳 MIND MAP GENERATION MODE
If user asks for a mind map, YOU MUST OUTPUT EXCLUSIVELY VALID JSON AND NOTHING ELSE! No markdown backticks, no text. Just raw JSON in this structure:
{
"title": "Main Topic",
"children": [
{
"title": "Subtopic 1",
"children": [
{ "title": "Point 1", "children": [] },
{ "title": "Point 2", "children": [] }
]
},
{
"title": "Subtopic 2",
"children": []
}
]
}

## 4. 🔄 FLOWCHART GENERATION MODE
If user asks for a flowchart, YOU MUST OUTPUT EXCLUSIVELY MERMAID CODE AND NOTHING ELSE! No markdown code blocks, no text. Just raw Mermaid:
flowchart TD
A[Start] --> B{Condition}
B -->|Yes| C[Process]
B -->|No| D[End]

# ⭐ ADDITIONAL FEATURES
* Highlight important keywords using **bold text**
* Break complex topics into smaller parts

# 🚫 DO NOT
* Do not generate irrelevant content
* Do not mix formats (JSON + text together)
* Do not output explanations in mind map/flowchart modes
`;

router.post('/', async (req, res) => {
  const { question, customContext } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Missing question' });
  }

  // Construct message format dynamically based on provided context
  const contextString = customContext ? `\n\n[USER NOTES / SYLLABUS / EXTRACTED CONTENT]\n${customContext}\n` : '';
  const finalQuestion = `[USER REQUEST]\n${question}`;
  
  const userContent = `${contextString}\n${finalQuestion}`;

  try {
    const response = await axios.post(
      GROQ_URL,
      {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.6
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let text = response.data.choices[0].message.content;
    
    // Safety cleanups for specific modes
    let modeType = 'default';
    let cleanText = text.trim();
    
    if (/```mermaid|flowchart\s+[A-Z]{2}|graph\s+[A-Z]{2}/i.test(cleanText)) {
      modeType = 'flowchart';
      const m = cleanText.match(/```mermaid([\s\S]*?)```/i);
      if (m) {
        text = m[1].trim();
      } else {
        const flowM = cleanText.match(/(?:flowchart|graph)\s+[A-Z]{2}[\s\S]*?(?=\n\n|$)/i);
        if (flowM) {
          text = flowM[0].trim();
        } else {
          text = cleanText.trim();
        }
      }
    } else if (cleanText.includes('```json') || cleanText.includes('"children"')) {
      modeType = 'mindmap';
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         text = jsonMatch[0];
      }
    } else if (cleanText.includes('Q1:') && cleanText.includes('A1:')) {
      modeType = 'flashcard';
    }

    res.json({ text, modeType });
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.error('Groq Chat Error:', errMsg);
    res.status(500).json({ error: `Groq API Error: ${errMsg}` });
  }
});

module.exports = router;

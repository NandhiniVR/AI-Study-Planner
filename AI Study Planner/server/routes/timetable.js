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
      temperature: 0.4,
      response_format: { type: 'json_object' }
    },
    {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    }
  );
  return response.data.choices[0].message.content;
}

router.post('/', async (req, res) => {
  const {
    subjects,        // [{ name, targetMark, prevMark }]
    examDate,
    studyHoursPerDay,
    preferredTime,   // 'Morning' | 'Afternoon' | 'Evening'
    breakDuration,   // e.g. '10-15 minutes'
    daysAvailable,   // e.g. 'Monday-Saturday'
    sessionLength    // e.g. '1 hour'
  } = req.body;

  if (!subjects || !Array.isArray(subjects) || subjects.length < 2) {
    return res.status(400).json({
      error: 'Timetable requires more than 1 subject. Please add multiple subjects.'
    });
  }

  if (!examDate) {
    return res.status(400).json({ error: 'Exam date is required.' });
  }

  // Calculate days until exam
  const today = new Date();
  const exam = new Date(examDate);
  const daysLeft = Math.max(1, Math.ceil((exam - today) / (1000 * 60 * 60 * 24)));

  // Build subject context with weakness priority
  const subjectContext = subjects.map(s => {
    const gap = s.prevMark !== null && s.prevMark !== undefined
      ? s.targetMark - s.prevMark
      : null
    const priority = gap !== null
      ? (gap >= 30 ? 'HIGH' : gap >= 15 ? 'MEDIUM' : 'LOW')
      : 'MEDIUM'
    return `- ${s.name}: Target ${s.targetMark}%${s.prevMark != null ? `, Previous ${s.prevMark}%` : ''}, Priority: ${priority}`
  }).join('\n')

  const prompt = `
You are an expert academic study planner. Generate a realistic, personalized, day-wise timetable for a student.

STUDENT PROFILE:
${subjectContext}

SCHEDULE PARAMETERS:
- Days until exam: ${daysLeft} days
- Exam date: ${examDate}
- Study hours per day: ${studyHoursPerDay || 4} hours
- Preferred study time: ${preferredTime || 'Morning'}
- Break duration: ${breakDuration || '10-15 minutes'}
- Session length per subject: ${sessionLength || '1 hour'}
- Days available: ${daysAvailable || 'Monday-Saturday'}

RULES (STRICTLY FOLLOW):
1. Distribute all subjects, giving MORE sessions to higher-priority (weaker) subjects
2. Rotate subjects daily — do NOT repeat the same subject twice in a day unless urgent
3. Include a short break (${breakDuration || '10-15 mins'}) between every session
4. Add "📖 Revision Session" every 3rd day covering previously studied topics
5. Add a "🎯 Mock Test Practice" slot 2-3 days before exam date
6. Do NOT exceed ${studyHoursPerDay || 4} study hours per day (breaks excluded)
7. Generate a realistic schedule for ALL ${daysLeft} days (max 14 days in output if more)
8. Start times based on preferred study time: Morning=8:00, Afternoon=13:00, Evening=17:00

OUTPUT FORMAT (strict JSON, no text outside):
{
  "summary": {
    "totalDays": 0,
    "subjectCoverage": [{ "subject": "Math", "sessions": 3, "totalHours": 3 }],
    "strategy": "Brief note on the strategy used e.g. 'Physics gets extra sessions due to lower previous marks'"
  },
  "timetable": [
    {
      "day": 1,
      "dayLabel": "Day 1 — Monday",
      "date": "e.g. Apr 2",
      "sessions": [
        { "time": "9:00 – 10:00", "activity": "Mathematics", "type": "study", "icon": "📐" },
        { "time": "10:00 – 10:15", "activity": "Break", "type": "break", "icon": "☕" },
        { "time": "10:15 – 11:15", "activity": "Physics", "type": "study", "icon": "⚡" }
      ]
    }
  ]
}

Session types: "study" | "break" | "revision" | "mock_test"
Icons: Use relevant emoji per subject (📐 Math, ⚡ Physics, 🧬 Biology, 📜 History, 💻 CS, 📊 Economics, 🔬 Chemistry, 📖 English, 🌍 Geography)
`

  try {
    let text = await callGroq(prompt);
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.error('Timetable generation error:', errMsg);
    return res.status(500).json({ error: `Timetable generation failed: ${errMsg}` });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const officeParser = require('officeparser');
const os = require('os');
const path = require('path');
const fs = require('fs');

const upload = multer({ storage: multer.memoryStorage() });

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
const GROQ_MODEL = 'llama-3.1-8b-instant';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ─── Groq API call ────────────────────────────────────────────────────────────
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
      },
      timeout: 60000
    }
  );
  return response.data.choices[0].message.content;
}

// ─── YouTube Transcript (ESM package — must use dynamic import) ────────────────
async function fetchYoutubeTranscript(url) {
  try {
    // youtube-transcript is an ESM-only package, use dynamic import
    const { YoutubeTranscript } = await import('youtube-transcript');
    const transcriptList = await YoutubeTranscript.fetchTranscript(url);
    if (!transcriptList || transcriptList.length === 0) return null;
    return transcriptList.map(t => t.text).join(' ').substring(0, 8000);
  } catch (err) {
    console.error('YouTube transcript error:', err.message);
    return null;
  }
}

// ─── PPT Extraction (officeparser v6 async API) ───────────────────────────────
async function extractPPT(buffer, filename) {
  const tmpFile = path.join(os.tmpdir(), `ppt_${Date.now()}_${filename}`);
  try {
    fs.writeFileSync(tmpFile, buffer);
    // parseOfficeAsync returns a Promise<string> in officeparser v4+
    const text = await officeParser.parseOfficeAsync(tmpFile);
    return (text || '').trim() || '[PPT: no readable text found in slides]';
  } catch (err) {
    console.error('PPT parse error:', err.message);
    return `[PPT file "${filename}" could not be read - generate notes based on provided subject]`;
  } finally {
    try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (_) {}
  }
}

// ─── Image OCR (Tesseract.js v5+ createWorker API) ────────────────────────────
async function extractImage(buffer) {
  let worker = null;
  try {
    const { createWorker } = require('tesseract.js');
    worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(buffer);
    return (text || '').trim() || '[Image: no text detected]';
  } catch (err) {
    console.error('Image OCR error:', err.message);
    return '[Image: OCR extraction failed]';
  } finally {
    if (worker) {
      try { await worker.terminate(); } catch (_) {}
    }
  }
}

// ─── Main Route ───────────────────────────────────────────────────────────────
router.post('/', upload.array('files'), async (req, res) => {
  const {
    subject, topics, targetMarks, youtubeUrl,
    studyHoursPerDay, preferredStudyTime, breakDuration
  } = req.body;

  const hasFiles = req.files && req.files.length > 0;

  // Require subject + targetMarks + at least one content source
  if (!subject || !targetMarks || (!topics && !youtubeUrl && !hasFiles)) {
    return res.status(400).json({
      error: 'Please provide: Subject, Target Marks, and at least one content source (text, YouTube URL, or file).'
    });
  }

  let finalTopics = topics ? `[MANUAL TEXT INPUT]\n${topics}\n` : '';
  const extractionLog = [];

  // ── YouTube ─────────────────────────────────────────────────────────────────
  if (youtubeUrl && youtubeUrl.trim()) {
    console.log('Fetching YouTube transcript for:', youtubeUrl);
    const transcript = await fetchYoutubeTranscript(youtubeUrl.trim());
    if (transcript) {
      finalTopics += `\n\n[YOUTUBE VIDEO TRANSCRIPT]\n${transcript}\n`;
      extractionLog.push('✅ YouTube transcript extracted');
    } else {
      // Fallback: still proceed, AI will generate based on subject + URL context
      finalTopics += `\n\n[NOTE: YouTube video provided (${youtubeUrl}) - transcript unavailable. Generate comprehensive notes based on the subject.]\n`;
      extractionLog.push('⚠️ YouTube transcript unavailable - using subject context');
    }
  }

  // ── Files ───────────────────────────────────────────────────────────────────
  if (hasFiles) {
    for (const file of req.files) {
      console.log(`Processing file: ${file.originalname} (${file.mimetype})`);
      finalTopics += `\n\n[EXTRACTED FILE: ${file.originalname}]\n`;

      try {
        if (file.mimetype === 'application/pdf') {
          const pdfData = await pdfParse(file.buffer);
          const extracted = (pdfData.text || '').trim();
          finalTopics += extracted || '[PDF: no text content found]';
          extractionLog.push(`✅ PDF extracted: ${file.originalname}`);

        } else if (
          file.originalname.endsWith('.pptx') ||
          file.originalname.endsWith('.ppt') ||
          file.mimetype === 'application/vnd.ms-powerpoint' ||
          file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ) {
          const text = await extractPPT(file.buffer, file.originalname);
          finalTopics += text;
          extractionLog.push(`✅ PPT extracted: ${file.originalname}`);

        } else if (
          file.originalname.endsWith('.docx') ||
          file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
          const docxData = await mammoth.extractRawText({ buffer: file.buffer });
          finalTopics += (docxData.value || '').trim() || '[DOCX: no text found]';
          extractionLog.push(`✅ DOCX extracted: ${file.originalname}`);

        } else if (file.mimetype.startsWith('image/')) {
          console.log('Running OCR on image:', file.originalname);
          const text = await extractImage(file.buffer);
          finalTopics += text;
          extractionLog.push(`✅ Image OCR: ${file.originalname}`);

        } else {
          finalTopics += `[Unsupported file type: ${file.mimetype}]`;
          extractionLog.push(`⚠️ Unsupported: ${file.originalname}`);
        }
      } catch (e) {
        console.error(`Error parsing ${file.originalname}:`, e.message);
        finalTopics += `[Error reading file: ${e.message}]`;
        extractionLog.push(`❌ Failed: ${file.originalname}`);
      }
    }
  }

  // Safety: if finalTopics is empty, gracefully fall back to subject
  if (!finalTopics.trim()) {
    finalTopics = `Generate comprehensive study notes for subject: ${subject}`;
  }

  console.log('Extraction log:', extractionLog);
  console.log('Final content length:', finalTopics.length, 'chars');

  const baseSubjectParam = subject || 'General Study';
  const multiSubjectCondition =
    baseSubjectParam.includes(',') ||
    baseSubjectParam.includes(' and ') ||
    baseSubjectParam.split(' ').length > 3;
  const timeConstraints = `Total Hours: ${studyHoursPerDay || 'As needed'}, Preferred Time: ${preferredStudyTime || 'Any time'}, Break Duration: ${breakDuration || '15 mins'}`;

  const prompt = `
    You are an AI Smart Study Planner. Analyze the following study materials and generate a comprehensive learning package.

    INPUT MATERIAL:
    Subject: ${subject}
    Target Marks: ${targetMarks}%
    Content:
    ${finalTopics.substring(0, 12000)}

    Generate the output EXACTLY in this STRICT JSON format ONLY. Do NOT output any standard text, only a valid JSON object.
    You MUST generate ALL fields below regardless of the input type (whether it is text, file, or YouTube transcript).

    {
      "studyNotes": "Extremely detailed and comprehensive notes formatted in Markdown. Include definitions, explanations, examples, step-by-step breakdowns. Use # Main Title, ## Subheadings, bullet points, and **bold text**. Minimum 300 words.",
      "keywords": [
        { "term": "Keyword", "definition": "Clear and concise definition" }
      ],
      "flashcards": [
        { "front": "Question?", "back": "Answer" }
      ],
      "mindmap": [
        {
          "title": "Main Topic",
          "children": [
            { "title": "Subtopic", "children": [] }
          ]
        }
      ],
      "flowchart": "\`\`\`mermaid\\ngraph TD;\\nA-->B;\\n\`\`\`",
      "timeTable": ${multiSubjectCondition ? `[
        { "day": "Day 1", "task": "Study Topic", "hours": "2" }
      ]` : `[]`},
      "questions": {
        "marks2": ["Short question 1?", "Short question 2?"],
        "marks5": ["Medium question 1?", "Medium question 2?"],
        "marks10": ["Long question 1?", "Long question 2?"]
      }
    }

    Rules:
    - studyNotes MUST be detailed and in proper Markdown.
    - flashcards: MUST include exactly 5-10 flashcards.
    - mindmap: MUST follow the exact recursive { title, children[] } format.
    - flowchart: MUST generate a valid Mermaid.js diagram starting with "\`\`\`mermaid" and ending with "\`\`\`". Use graph TD or similar.
    - questions: MUST generate 2-mark, 5-mark, and 10-mark practice questions. Do not leave the questions object empty.
    - keywords: MUST include 6-12 key terms with definitions.
    ${multiSubjectCondition
      ? `- Generate a timetable with subject rotation. Constraints: ${timeConstraints}`
      : `- Return empty array [] for timeTable (single subject).`}
  `;

  try {
    let text = await callGroq(prompt);
    // Strip any markdown code fences if present
    text = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.error('Groq API Error:', errMsg);
    return res.status(500).json({ error: `Generation failed: ${errMsg}` });
  }
});

module.exports = router;

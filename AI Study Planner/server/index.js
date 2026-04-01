require('dotenv').config();
const express = require('express');
const cors = require('cors');
const generateRoute = require('./routes/generate');
const generateTestRoute = require('./routes/generate-test');
const gradeRoute = require('./routes/grade');
const notesRoute = require('./routes/notes');
const chatRoute = require('./routes/chat');
const timetableRoute = require('./routes/timetable');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/generate', generateRoute);
app.use('/generate-test', generateTestRoute);
app.use('/grade', gradeRoute);
app.use('/notes', notesRoute);
app.use('/chat', chatRoute);
app.use('/timetable', timetableRoute);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

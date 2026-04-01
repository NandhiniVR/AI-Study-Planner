// Dummy data used across the app

export const subjects = ['Mathematics', 'Physics', 'Chemistry', 'English', 'History']

export const studyPlan = [
  {
    day: 'Monday',
    date: 'Mar 31',
    isToday: true,
    tasks: [
      { id: 1, name: 'Calculus — Derivatives', time: '9:00 – 10:30 AM', duration: '1.5h', done: false },
      { id: 2, name: 'Physics — Laws of Motion', time: '11:00 AM – 12:00 PM', duration: '1h', done: false },
      { id: 3, name: 'English — Essay Writing', time: '3:00 – 4:00 PM', duration: '1h', done: true },
    ],
  },
  {
    day: 'Tuesday',
    date: 'Apr 1',
    isToday: false,
    tasks: [
      { id: 4, name: 'Chemistry — Organic Reactions', time: '9:00 – 11:00 AM', duration: '2h', done: false },
      { id: 5, name: 'Mathematics — Integration', time: '12:00 – 1:30 PM', duration: '1.5h', done: false },
    ],
  },
  {
    day: 'Wednesday',
    date: 'Apr 2',
    isToday: false,
    tasks: [
      { id: 6, name: 'History — World War II', time: '10:00 – 11:30 AM', duration: '1.5h', done: false },
      { id: 7, name: 'Physics — Electromagnetism', time: '2:00 – 3:30 PM', duration: '1.5h', done: false },
      { id: 8, name: 'Revision — All Subjects', time: '5:00 – 6:00 PM', duration: '1h', done: false },
    ],
  },
  {
    day: 'Thursday',
    date: 'Apr 3',
    isToday: false,
    tasks: [
      { id: 9, name: 'Chemistry — Periodic Table', time: '9:00 – 10:00 AM', duration: '1h', done: false },
      { id: 10, name: 'Mathematics — Trigonometry', time: '11:00 AM – 1:00 PM', duration: '2h', done: false },
    ],
  },
  {
    day: 'Friday',
    date: 'Apr 4',
    isToday: false,
    tasks: [
      { id: 11, name: 'Mock Test — Physics', time: '9:00 – 11:00 AM', duration: '2h', done: false },
      { id: 12, name: 'English — Grammar Review', time: '12:00 – 1:00 PM', duration: '1h', done: false },
    ],
  },
]

export const analyticsData = {
  subjectProgress: [
    { subject: 'Mathematics', percentage: 72, color: '#6C5CE7' },
    { subject: 'Physics', percentage: 58, color: '#00cec9' },
    { subject: 'Chemistry', percentage: 45, color: '#fdcb6e' },
    { subject: 'English', percentage: 85, color: '#00b894' },
    { subject: 'History', percentage: 63, color: '#e17055' },
  ],
  weeklyHours: [4, 5.5, 3, 6, 4.5, 2, 0],
  weekDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  totalHours: 25,
  streak: 7,
  tasksCompleted: 18,
  examDaysLeft: 42,
}

export const sampleNotes = [
  {
    id: 1,
    topic: 'Newton\'s Laws of Motion',
    content:
      '1st Law: An object at rest stays at rest unless acted upon by a net external force.\n2nd Law: F = ma — Force equals mass times acceleration.\n3rd Law: For every action, there is an equal and opposite reaction.',
    timestamp: '30 Mar 2026, 10:00 AM',
  },
  {
    id: 2,
    topic: 'Derivatives in Calculus',
    content:
      'A derivative represents the rate of change of a function. Key rules: Power rule — d/dx(xⁿ) = nxⁿ⁻¹. Chain rule — d/dx[f(g(x))] = f\'(g(x))·g\'(x). Product rule — d/dx[uv] = u\'v + uv\'.',
  },
]

export const smartLearningMockData = {
  studyNotes: `The core principle here relies on understanding the fundamental mechanics of the subject matter. Start by defining the basics, then move on to the complex interactions.
  
1. **Foundation:** Establishing a clear baseline.
2. **Expansion:** Applying the baseline to varied scenarios.
3. **Synthesis:** Combining multiple concepts to form a comprehensive understanding.

Remember, consistent practice and spaced repetition are your best strategies for long-term retention.`,
  keywords: [
    { term: 'Baseline', definition: 'The initial starting point or fundamental level.' },
    { term: 'Synthesis', definition: 'The combination of ideas to form a theory or system.' },
    { term: 'Spaced Repetition', definition: 'A learning technique that incorporates increasing intervals of time between subsequent review of previously learned material.' }
  ],
  diagram: `
+----------------+      +-----------------+      +----------------+
|                |      |                 |      |                |
|  Initial Data  | ---> | Processing Unit | ---> | Final Output   |
|                |      |                 |      |                |
+----------------+      +-----------------+      +----------------+
         ^                       |
         |                       v
         +-----------------------+
              Feedback Loop
  `,
  mindmap: [
    {
      title: 'Main Topic',
      children: [
        {
          title: 'Subtopic A',
          children: [{ title: 'Detail A1' }, { title: 'Detail A2' }]
        },
        {
          title: 'Subtopic B',
          children: [{ title: 'Detail B1' }]
        }
      ]
    }
  ],
  questions: {
    marks2: [
      'Define the baseline in this context.',
      'What is the primary function of the processing unit?'
    ],
    marks5: [
      'Explain the process of synthesis with an example.',
      'Describe how the feedback loop influences the initial data.'
    ],
    marks10: [
      'Discuss the overall architecture shown in the diagram, explaining the role of each component.',
      'Evaluate the effectiveness of spaced repetition compared to traditional cramming.'
    ]
  }
}

export const mockTestQuestionsData = [
  { id: 1, text: 'Define the baseline in this context.', marks: 2, type: 'short' },
  { id: 2, text: 'Explain the process of synthesis with an example.', marks: 5, type: 'medium' },
  { id: 3, text: 'Evaluate the effectiveness of spaced repetition compared to traditional cramming.', marks: 10, type: 'long' }
]

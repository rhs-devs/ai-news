import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());

// Middleware to set JSON:API content type
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/vnd.api+json');
  next();
});

// Mock long news report
const sampleNewsReport = `
In a historic development that marks a significant milestone in clean energy innovation, researchers at the International Institute for Sustainable Technology (IIST) have unveiled a revolutionary method for producing affordable and efficient hydrogen fuel. Announced at a global energy summit in Geneva, the breakthrough is expected to accelerate the transition away from fossil fuels and reduce global carbon emissions over the next decade.

According to Dr. Lillian Carter, the lead scientist on the project, the new technique utilizes sunlight and seawater through a novel photocatalytic process that significantly lowers production costs while maintaining energy output. "We’ve long known the potential of hydrogen fuel, but until now, scalability and affordability have held us back," said Dr. Carter. "This discovery changes everything."

The technology has been under development for over six years and was funded through a collaboration between multiple governments, private sector innovators, and environmental non-profits. Industry experts believe mass adoption could begin as early as 2027, as testing and pilot programs are fast-tracked globally.

Already, major automotive companies and public transportation authorities have expressed strong interest in adopting hydrogen-powered alternatives. Shares in renewable energy firms surged following the announcement, with investors anticipating a major shift in global energy markets.

Environmental advocacy groups have praised the discovery, calling it a major step forward in the battle against climate change. "If implemented responsibly and equitably, this could be the single biggest thing to happen in decades," said Ava Nguyen, director of the Green Future Coalition.

As the world looks for sustainable solutions in the face of worsening climate impacts, this development brings hope for a cleaner, safer, and more energy-secure future.
`.trim();

app.post('/v1/actions/generate-news-report', (_req, res) => {
  res.status(200).json({
    data: {
      type: 'news-report',
      attributes: {
        content: sampleNewsReport
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ Mock API server is running at http://localhost:${PORT}`);
});
import express from 'express';
import { handler } from '../dist/src/index.mjs';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

const buildLambdaEvent = (req) => {
  return {
    version: '2.0',
    routeKey: `${req.method} ${req.path}`,
    rawPath: req.path,
    rawQueryString: req.originalUrl.split('?')[1] || '',
    headers: req.headers,
    requestContext: {
      http: {
        method: req.method,
        path: req.path,
      },
    },
    body: req.body ? JSON.stringify(req.body) : null,
    isBase64Encoded: false,
  };
};

const buildLambdaContext = () => {
  return {
    functionName: 'mockLambdaFunction',
    functionVersion: 'LATEST',
    invokedFunctionArn: 'arn:aws:lambda:local:0:function:mockLambdaFunction',
    memoryLimitInMB: '128',
    awsRequestId: 'mock-request-id',
    logGroupName: '/aws/lambda/mockLambdaFunction',
    logStreamName: 'mock-log-stream',
    getRemainingTimeInMillis: () => 30000,
  };
};


// Catch-all route to simulate Lambda
app.use(async (req, res) => {
  const event = buildLambdaEvent(req);
  const context = buildLambdaContext();

  try {
    const lambdaResponse = await handler(event, context);

    res.status(lambdaResponse.statusCode || 200);

    // Set headers
    if (lambdaResponse.headers) {
      for (const [key, value] of Object.entries(lambdaResponse.headers)) {
        res.setHeader(key, value);
      }
    }

    // Send response
    res.send(lambdaResponse.body);
  } catch (err) {
    console.error('Error invoking Lambda handler:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.listen(PORT, () => {
  const localUrl = `http://localhost:${PORT}`;
  console.log(`🚀 Mock Lambda server is running at ${localUrl}`);
  console.log(`👉 Test it by making POST requests to: ${localUrl}/`);
});
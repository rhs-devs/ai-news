build-backend:
	cd back-end; npm i;
	npx tsc -p back-end

start-backend-mock:
	node ./back-end/dist/mocks/mock-server.mjs

run-lambda-mock:
	cd back-end/mocks; node ./lambda-server.mjs;

run-mocks-for-backend:
	cd back-end/mocks; node ./brave_and_open_ai_mocks.mjs;

start-frontend:
	cd ./frontend/ai-news-frontend/; npm run dev;

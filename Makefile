.PHONY: start
start:
	@make build-backend
	@echo "Starting all services: lambda mock, backend mocks, frontend..."
	@bash -c '\
		trap "echo Ctrl+C caught! Shutting down...; kill 0" SIGINT; \
		make run-lambda-mock     2>&1 | sed "s/^/[lambda-mock] /" & \
		make run-mocks-for-backend 2>&1 | sed "s/^/[backend-mocks] /" & \
		make start-frontend      2>&1 | sed "s/^/[frontend] /" & \
		wait; \
	'

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

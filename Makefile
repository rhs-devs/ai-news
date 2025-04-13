build-backend:
	cd back-end; npm i;
	npx tsc -p back-end

start-backend-mock:
	node ./back-end/dist/mocks/mock-server.mjs
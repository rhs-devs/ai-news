### Mock Backend: Setup & Run

This project includes a mock backend server with a sample JSON:API endpoint at:

```
GET /v1/actions/generate-news-report
```

#### Build the Backend

This installs dependencies and compiles TypeScript files in `back-end/`:

```
make build-backend
```

(Equivalent to:)

```
cd back-end;
npm install;
cd ..;
npx tsc -p back-end;
```

#### Start the Mock Server

To run the mock backend locally:

```
make start-backend-mock
```

This runs the compiled server at:

```
http://localhost:3000/v1/actions/generate-news-report
```

You can test it with:

```
curl -X POST -H "Accept: application/vnd.api+json" http://localhost:3000/v1/actions/generate-news-report
```
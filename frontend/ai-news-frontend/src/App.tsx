import { useEffect, useState } from 'react'
import './App.css'

function App() {
    const [newsReport, setNewsReport] = useState<string>();
    const url = 'http://localhost:3000/v1/actions/generate-news-report';
    useEffect(() => {
        const fetchNewsReport = async () => {
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/vnd.api+json',
                    },
                });
                if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                }

                const json = await response.json();
                const report = json.data.attributes.content;
                setNewsReport(report);
                console.log(json);

            } catch (error) {
                if (typeof error === "object" && error && "message" in error && typeof 
                    error.message === "string") {
                    console.error(error.message);
                }
            }
        }
        fetchNewsReport();
    }, []);


    return (
        <>
            <div>
                <pre>
                    {newsReport}
                </pre>
            </div>
        </>
    );
}

export default App

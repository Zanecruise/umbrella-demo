import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { performance } from 'perf_hooks'; // Import performance
import { analyzeWithGemini } from './services/geminiService';
import { analyzeWithNvidia } from './services/nvidiaService';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

app.post('/analyze', upload.single('file'), async (req, res) => {
    const { model, riskProfile } = req.body;
    const file = req.file;

    if (!file) {
        return res.status(400).send({ error: 'No file uploaded.' });
    }

    const startTime = performance.now(); // Start timer

    try {
        let analysisResult;
        if (model === 'gemini') {
            analysisResult = await analyzeWithGemini(file, riskProfile);
        } else if (model === 'nvidia') {
            analysisResult = await analyzeWithNvidia(file, riskProfile);
        } else {
            return res.status(400).send({ error: 'Invalid model selected.' });
        }

        const endTime = performance.now(); // End timer
        const duration = ((endTime - startTime) / 1000).toFixed(2); // Calculate duration in seconds

        // Structure the new response
        const response = {
            analysis: analysisResult,
            kpis: {
                duration: `${duration}s`,
                server: model,
            }
        };

        res.send(response);

    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).send({ error: `Failed to analyze portfolio: ${errorMessage}` });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { performance } from 'perf_hooks';
import { analyzeWithGemini } from '../server/src/services/geminiService';
import { analyzeWithNvidia } from '../server/src/services/nvidiaService';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());

app.post('/', upload.single('file'), async (req, res) => {
    const { model, riskProfile } = req.body;
    const file = req.file;

    if (!file) {
        return res.status(400).send({ error: 'No file uploaded.' });
    }

    const startTime = performance.now();

    try {
        let analysisResult;

        if (model === 'gemini') {
            analysisResult = await analyzeWithGemini(file, riskProfile);
        } else if (model === 'nvidia') {
            analysisResult = await analyzeWithNvidia(file, riskProfile);
        } else {
            return res.status(400).send({ error: 'Invalid model selected.' });
        }

        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        const response = {
            analysis: analysisResult,
            kpis: {
                duration: `${duration}s`,
                server: model,
            },
        };

        res.send(response);
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).send({ error: `Failed to analyze portfolio: ${errorMessage}` });
    }
});

export const config = {
    api: {
        bodyParser: false,
    },
};

export default app;

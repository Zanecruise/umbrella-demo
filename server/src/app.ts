import fs from 'fs';
import path from 'path';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { performance } from 'perf_hooks';
import { analyzeWithGemini } from './services/geminiService';
import { analyzeWithNvidia } from './services/nvidiaService';

// Load environment variables when running outside managed platforms like Vercel
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config();
}

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });
const uploadSingleFile = upload.single('file');

export const analyzeRequestHandler = async (req: Request, res: Response) => {
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
};

app.post('/analyze', uploadSingleFile, analyzeRequestHandler);

export default app;
export { uploadSingleFile };

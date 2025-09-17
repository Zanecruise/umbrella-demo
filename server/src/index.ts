import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { analyzeWithGemini } from './services/geminiService';
import { analyzeWithNvidia } from './services/nvidiaService';

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

    try {
        let result;
        if (model === 'gemini') {
            result = await analyzeWithGemini(file, riskProfile);
        } else if (model === 'nvidia') {
            result = await analyzeWithNvidia(file, riskProfile);
        } else {
            return res.status(400).send({ error: 'Invalid model selected.' });
        }
        res.send(result);
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Failed to analyze portfolio.' });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

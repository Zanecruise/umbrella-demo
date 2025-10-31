import cors from 'cors';
import express from 'express';
import { analyzeRequestHandler, uploadSingleFile } from '../server/src/app';

const handler = express();

handler.use(cors());
handler.post('/', uploadSingleFile, analyzeRequestHandler);

export const config = {
    api: {
        bodyParser: false,
    },
};

export default handler;

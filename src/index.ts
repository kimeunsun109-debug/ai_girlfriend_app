import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { pushRouter } from './routes/push.routes.js';
import { userRouter } from './routes/user.routes.js';
import { photosRouter } from './routes/photos.routes.js';
import { livingRouter } from './routes/living.routes.js';
import { relationshipRouter } from './routes/relationship.routes.js';
import { personalityRouter } from './routes/personality.routes.js';
import { conversationRouter } from './routes/conversation.routes.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/assets', express.static(path.join(__dirname, '../assets')));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'pickmetalk-photo-push' });
});

app.use('/api/users', userRouter);
app.use('/api/photos', photosRouter);
app.use('/api/living', livingRouter);
app.use('/api', relationshipRouter);
app.use('/api', personalityRouter);
app.use('/api/conversation', conversationRouter);
app.use('/api/push', pushRouter);

app.listen(PORT, () => {
  console.log(`PickMeTalk Photo Push API running on port ${PORT}`);
});

export default app;

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pushRouter } from './routes/push.routes.js';
import { userRouter } from './routes/user.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'pickmetalk-photo-push' });
});

app.use('/api/users', userRouter);
app.use('/api/push', pushRouter);

app.listen(PORT, () => {
  console.log(`PickMeTalk Photo Push API running on port ${PORT}`);
});

export default app;

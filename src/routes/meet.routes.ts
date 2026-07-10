import { Router, Request, Response } from 'express';
import { meetService } from '../services/meet.service.js';

export const meetRouter = Router();

/** 캐릭터 만나기 홈 — Hero pick, 상태, 마지막 대화 */
meetRouter.get('/home', async (req: Request, res: Response) => {
  const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
  try {
    const home = await meetService.getHome(userId);
    res.json(home);
  } catch (err) {
    console.error('meet/home', err);
    res.status(500).json({ error: 'Failed to load meet home' });
  }
});

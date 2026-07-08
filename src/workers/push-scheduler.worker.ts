/**
 * PickMeTalk 사진 푸시 스케줄러 워커
 *
 * 실행 주기:
 * - 매 5분: 예정된 푸시 실행 + 후속 반응 실행
 * - 매일 00:30 (각 timezone): 다음 날 스케줄 생성
 */
import dotenv from 'dotenv';
import { pushSchedulerService } from '../services/scheduler.service.js';
import { followUpService } from '../services/followup.service.js';
import { analyticsService } from '../services/analytics.service.js';
import { prisma } from '../lib/prisma.js';
import { PUSH_CONFIG } from '../config/push.config.js';

dotenv.config();

const INTERVAL_MS = PUSH_CONFIG.SCHEDULER_INTERVAL_MINUTES * 60 * 1000;

async function runSchedulerCycle() {
  console.log(`[${new Date().toISOString()}] Running scheduler cycle...`);

  try {
    await pushSchedulerService.executePendingPushes();
    await followUpService.executePendingFollowUps();
  } catch (err) {
    console.error('Scheduler cycle error:', err);
  }
}

let lastDailyPlanningDate: string | null = null;

async function runDailyPlanning() {
  const now = new Date();
  const hour = now.getUTCHours();
  // UTC 15:xx = KST 00:xx — run once per UTC day during the planning hour
  if (hour === 15) {
    const todayKey = now.toISOString().slice(0, 10);
    if (lastDailyPlanningDate === todayKey) return;
    lastDailyPlanningDate = todayKey;

    console.log(`[${now.toISOString()}] Running daily schedule planning...`);
    try {
      await pushSchedulerService.planDailySchedules();
    } catch (err) {
      console.error('Daily planning error:', err);
    }
  }
}

async function runWeeklyAnalytics() {
  const now = new Date();
  if (now.getUTCDay() === 1 && now.getUTCHours() === 2) {
    console.log(`[${new Date().toISOString()}] Running weekly analytics...`);
    const users = await prisma.user.findMany({ select: { id: true } });
    for (const user of users) {
      await analyticsService.createRetentionSnapshot(user.id, 7);
      await analyticsService.createRetentionSnapshot(user.id, 30);
    }
  }
}

console.log('PickMeTalk Push Scheduler Worker started');
console.log(`Interval: every ${PUSH_CONFIG.SCHEDULER_INTERVAL_MINUTES} minutes`);

runSchedulerCycle();
setInterval(runSchedulerCycle, INTERVAL_MS);
setInterval(runDailyPlanning, 60 * 60 * 1000);
setInterval(runWeeklyAnalytics, 60 * 60 * 1000);

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

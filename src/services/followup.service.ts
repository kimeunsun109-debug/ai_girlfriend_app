import { PrismaClient, FollowUpStage, FollowUpStatus, PhotoCategory } from '@prisma/client';
import { PHOTO_MESSAGE_TEMPLATES } from '../data/photo-message-templates.js';
import { pushDeliveryService } from './push-delivery.service.js';
import {
  memoryReminderEngine,
  emotionStateManager,
  relationshipEventEngine,
  messageVariation,
} from '../lib/living-ai/index.js';
import {
  memoryEventEngine,
  dynamicConversationService,
} from '../lib/relationship-journey/index.js';
import { adaptivePersonalityEngine } from '../lib/adaptive-personality/index.js';
import { naturalConversationEngine, polishCharacterMessage } from '../lib/natural-conversation/index.js';
import {
  randomPick,
  personalizeMessage,
  classifyReply,
  addMinutes,
  hasEmoji,
} from '../utils/push.utils.js';

const prisma = new PrismaClient();

export class FollowUpService {
  /** 사진 푸시 후 후속 반응 시나리오 스케줄 */
  async scheduleFollowUps(pushLogId: string, category: PhotoCategory): Promise<void> {
    const template = PHOTO_MESSAGE_TEMPLATES.find((t) => t.category === category);
    if (!template || template.followUpScenarios.length === 0) return;

    const pushLog = await prisma.pushLog.findUnique({
      where: { id: pushLogId },
      include: { user: true, character: true },
    });
    if (!pushLog) return;

    const now = new Date();

    for (const scenario of template.followUpScenarios) {
      if (scenario.condition !== 'no_reply') continue;

      const scheduledAt = addMinutes(now, scenario.delayMinutes);
      const raw = randomPick(scenario.messages);
      const message = polishCharacterMessage(
        personalizeMessage(raw, pushLog.user.name, true),
        { userName: pushLog.user.name, characterSlug: pushLog.character.slug ?? 'yuna' }
      );

      await prisma.followUpScenario.create({
        data: {
          pushLogId,
          stage: scenario.stage,
          message,
          scheduledAt,
          triggerCondition: scenario.condition,
        },
      });
    }
  }

  /** 예정된 후속 메시지 실행 */
  async executePendingFollowUps(): Promise<void> {
    const now = new Date();

    const pending = await prisma.followUpScenario.findMany({
      where: {
        status: FollowUpStatus.PENDING,
        scheduledAt: { lte: now },
      },
      include: {
        pushLog: {
          include: {
            user: { include: { deviceTokens: true } },
            character: true,
          },
        },
      },
      take: 50,
    });

    for (const followUp of pending) {
      const pushLog = followUp.pushLog;

      // 답장이 이미 있으면 no_reply 시나리오 취소
      if (followUp.triggerCondition === 'no_reply' && pushLog.replied) {
        await prisma.followUpScenario.update({
          where: { id: followUp.id },
          data: { status: FollowUpStatus.CANCELLED },
        });
        continue;
      }

      // 답장 속도에 따른 시나리오 조정
      if (followUp.stage === FollowUpStage.AFTER_2_HOURS && pushLog.replied) {
        await prisma.followUpScenario.update({
          where: { id: followUp.id },
          data: { status: FollowUpStatus.CANCELLED },
        });
        continue;
      }

      await this.sendFollowUp(followUp);
    }
  }

  private async sendFollowUp(followUp: {
    id: string;
    message: string;
    pushLog: {
      id: string;
      userId: string;
      characterId: string;
      user: { deviceTokens: Array<{ token: string }> };
    };
  }) {
    await pushDeliveryService.sendToUser({
      userId: followUp.pushLog.userId,
      title: '',
      body: followUp.message,
      data: {
        type: 'follow_up',
        pushLogId: followUp.pushLog.id,
        characterId: followUp.pushLog.characterId,
        message: followUp.message,
        deepLink: `/chat/${followUp.pushLog.characterId}?pushLogId=${followUp.pushLog.id}`,
      },
    });

    await prisma.followUpScenario.update({
      where: { id: followUp.id },
      data: { status: FollowUpStatus.SENT, sentAt: new Date() },
    });

    // 캐릭터 채팅 메시지로도 기록
    const userCharacter = await prisma.userCharacter.findFirst({
      where: {
        userId: followUp.pushLog.userId,
        characterId: followUp.pushLog.characterId,
      },
    });

    if (userCharacter) {
      await prisma.chatMessage.create({
        data: {
          userCharacterId: userCharacter.id,
          pushLogId: followUp.pushLog.id,
          sender: 'CHARACTER',
          content: followUp.message,
          hasEmoji: hasEmoji(followUp.message),
        },
      });
    }
  }

  /** 사용자 답장 처리 → 후속 시나리오 트리거 */
  async handleUserReply(
    pushLogId: string,
    userCharacterId: string,
    content: string
  ): Promise<void> {
    const pushLog = await prisma.pushLog.findUnique({
      where: { id: pushLogId },
      include: { user: true },
    });
    if (!pushLog) return;

    const now = new Date();
    const replyLatencyMs = now.getTime() - pushLog.sentAt.getTime();
    const sentiment = classifyReply(content);
    const isLateReply = replyLatencyMs > 2 * 60 * 60 * 1000; // 2시간 이상

    // Ensure userCharacterId belongs to the pushLog (defense-in-depth; route also validates)
    const userCharacter = await prisma.userCharacter.findUnique({
      where: { id: userCharacterId },
      select: { userId: true, characterId: true, relationshipLevel: true, character: { select: { name: true, slug: true } } },
    });
    if (!userCharacter) return;
    if (userCharacter.userId !== pushLog.userId || userCharacter.characterId !== pushLog.characterId) return;

    // 푸시 로그 업데이트
    await prisma.pushLog.update({
      where: { id: pushLogId },
      data: {
        replied: true,
        repliedAt: now,
        replyLatencyMs,
        emojiUsed: hasEmoji(content),
        conversationStarted: true,
        conversationLength: { increment: 1 },
      },
    });

    // no_reply 후속 시나리오 모두 취소
    await prisma.followUpScenario.updateMany({
      where: {
        pushLogId,
        status: FollowUpStatus.PENDING,
        triggerCondition: 'no_reply',
      },
      data: { status: FollowUpStatus.CANCELLED },
    });

    // 답장 기록
    await prisma.chatMessage.create({
      data: {
        userCharacterId,
        pushLogId,
        sender: 'USER',
        content,
        hasEmoji: hasEmoji(content),
      },
    });

    // Living AI: 기억 + 호감도 + 감정
    await memoryReminderEngine.processUserMessage(userCharacterId, content);
    await relationshipEventEngine.onUserReply(userCharacterId, sentiment, hasEmoji(content));
    await emotionStateManager.applyTransition({
      userCharacterId,
      replySentiment: sentiment,
    });

    // ─── Adaptive Personality (deduped): at most one DNA rule per reply ───
    // Priority: comforting > compliment/photo_compliment > playful > late_reply
    const isCompliment = /(고마워|예뻐|좋아|멋져|최고|사랑)/.test(content);
    const isPlayful = /(ㅋㅋㅋ|ㅋㅋ|장난|놀려)/.test(content);
    const isComforting = /(힘내|괜찮아|위로)/.test(content);
    const isPhotoContext = pushLog.photoId != null || pushLog.photoCategory != null;

    if (isComforting) {
      await adaptivePersonalityEngine.updateFromSignal(userCharacterId, {
        type: 'comforting_user',
        reason: '사용자 위로',
        value: content,
        specialEvent: true,
      });
    } else if (sentiment === 'positive' && isCompliment && isPhotoContext) {
      await adaptivePersonalityEngine.updateFromSignal(userCharacterId, {
        type: 'photo_compliment',
        reason: '사진 칭찬',
        value: content,
      });
    } else if (isCompliment) {
      await adaptivePersonalityEngine.updateFromSignal(userCharacterId, {
        type: 'compliment',
        reason: '사용자 칭찬',
        value: content,
      });
    } else if (isPlayful) {
      await adaptivePersonalityEngine.updateFromSignal(userCharacterId, {
        type: 'playful_user',
        reason: '사용자 장난 반응',
        value: content,
      });
    } else if (isLateReply) {
      await adaptivePersonalityEngine.updateFromSignal(userCharacterId, {
        type: 'late_reply',
        reason: '답장이 늦었어',
        value: content,
      });
    }

    if (sentiment === 'negative') {
      await memoryEventEngine.onFirstEvent(
        userCharacterId,
        'FIRST_FIGHT',
        '첫 다툼',
        content.slice(0, 80)
      );
    }
    if (sentiment === 'positive' && content.includes('예뻐')) {
      await memoryEventEngine.onSpecialChat(
        userCharacterId,
        userCharacter.character.name ?? '',
        content,
        0.85
      );
    }

    // 감정 기반 후속 응답
  const category = pushLog.photoCategory;
    if (!category) return;

    const template = PHOTO_MESSAGE_TEMPLATES.find((t) => t.category === category);
    if (!template) return;

    let condition: 'positive_reply' | 'negative_reply' | 'late_reply' | null = null;
    if (sentiment === 'positive') condition = 'positive_reply';
    else if (sentiment === 'negative') condition = 'negative_reply';
    else if (isLateReply) condition = 'late_reply';

    if (!condition) return;

    if (!condition) {
      const reaction = naturalConversationEngine.reactToUserMessage(content, {
        userName: pushLog.user.name,
        characterSlug: userCharacter.character.slug ?? 'yuna',
        stageLevel: userCharacter.relationshipLevel,
        useName: true,
      });
      await prisma.chatMessage.create({
        data: {
          userCharacterId,
          pushLogId,
          sender: 'CHARACTER',
          content: reaction,
          hasEmoji: hasEmoji(reaction),
        },
      });
      return;
    }

    const scenario = template.followUpScenarios.find((s) => s.condition === condition);
    if (!scenario) return;

    const characterSlug = userCharacter.character.slug ?? 'yuna';
    const responseMessage = messageVariation.finalize(
      dynamicConversationService.styleByStage(
        personalizeMessage(randomPick(scenario.messages), pushLog.user.name, true),
        userCharacter.relationshipLevel ?? 1,
        pushLog.user.name,
        characterSlug
      ),
      pushLog.user.name,
      true,
      characterSlug
    );

    // 캐릭터 응답 메시지 생성
    await prisma.chatMessage.create({
      data: {
        userCharacterId,
        pushLogId,
        sender: 'CHARACTER',
        content: responseMessage,
        hasEmoji: hasEmoji(responseMessage),
      },
    });

    await prisma.pushLog.update({
      where: { id: pushLogId },
      data: { conversationLength: { increment: 1 } },
    });
  }
}

export const followUpService = new FollowUpService();

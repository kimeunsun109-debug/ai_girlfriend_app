/**
 * Canonical Master Dataset shot specs — 10–20 images per character.
 * Midjourney produces ONLY these. Mass production uses local RTX.
 */
export interface MasterShotSpec {
  id: string;
  angle: 'front' | 'left45' | 'right45' | 'left_profile' | 'right_profile';
  expression: 'neutral' | 'smile' | 'laugh';
  lighting: 'indoor' | 'outdoor';
  hair: 'down' | 'up';
  style: 'casual' | 'daily' | 'natural_selfie';
  priority: number;
}

/** 16 master shots covering required angles / expressions / lighting / hair / style */
export const MASTER_SHOT_SPECS: MasterShotSpec[] = [
  { id: 'm01_front_neutral_indoor_down_casual', angle: 'front', expression: 'neutral', lighting: 'indoor', hair: 'down', style: 'casual', priority: 1 },
  { id: 'm02_front_smile_indoor_down_selfie', angle: 'front', expression: 'smile', lighting: 'indoor', hair: 'down', style: 'natural_selfie', priority: 1 },
  { id: 'm03_front_laugh_outdoor_down_daily', angle: 'front', expression: 'laugh', lighting: 'outdoor', hair: 'down', style: 'daily', priority: 1 },
  { id: 'm04_front_smile_outdoor_up_casual', angle: 'front', expression: 'smile', lighting: 'outdoor', hair: 'up', style: 'casual', priority: 2 },
  { id: 'm05_left45_neutral_indoor_down_daily', angle: 'left45', expression: 'neutral', lighting: 'indoor', hair: 'down', style: 'daily', priority: 1 },
  { id: 'm06_left45_smile_outdoor_down_selfie', angle: 'left45', expression: 'smile', lighting: 'outdoor', hair: 'down', style: 'natural_selfie', priority: 1 },
  { id: 'm07_right45_neutral_indoor_down_casual', angle: 'right45', expression: 'neutral', lighting: 'indoor', hair: 'down', style: 'casual', priority: 1 },
  { id: 'm08_right45_smile_outdoor_up_daily', angle: 'right45', expression: 'smile', lighting: 'outdoor', hair: 'up', style: 'daily', priority: 2 },
  { id: 'm09_left_profile_neutral_indoor_down_casual', angle: 'left_profile', expression: 'neutral', lighting: 'indoor', hair: 'down', style: 'casual', priority: 1 },
  { id: 'm10_right_profile_neutral_outdoor_down_daily', angle: 'right_profile', expression: 'neutral', lighting: 'outdoor', hair: 'down', style: 'daily', priority: 1 },
  { id: 'm11_front_neutral_outdoor_up_selfie', angle: 'front', expression: 'neutral', lighting: 'outdoor', hair: 'up', style: 'natural_selfie', priority: 2 },
  { id: 'm12_front_laugh_indoor_up_casual', angle: 'front', expression: 'laugh', lighting: 'indoor', hair: 'up', style: 'casual', priority: 2 },
  { id: 'm13_left45_laugh_indoor_down_daily', angle: 'left45', expression: 'laugh', lighting: 'indoor', hair: 'down', style: 'daily', priority: 2 },
  { id: 'm14_right45_neutral_outdoor_down_selfie', angle: 'right45', expression: 'neutral', lighting: 'outdoor', hair: 'down', style: 'natural_selfie', priority: 2 },
  { id: 'm15_front_smile_indoor_up_daily', angle: 'front', expression: 'smile', lighting: 'indoor', hair: 'up', style: 'daily', priority: 1 },
  { id: 'm16_front_neutral_outdoor_down_casual', angle: 'front', expression: 'neutral', lighting: 'outdoor', hair: 'down', style: 'casual', priority: 1 },
];

const ANGLE_PROMPT: Record<MasterShotSpec['angle'], string> = {
  front: 'front-facing portrait, looking at camera',
  left45: 'three-quarter view from left, face turned 45 degrees',
  right45: 'three-quarter view from right, face turned 45 degrees',
  left_profile: 'left side profile portrait, clear silhouette of nose and jaw',
  right_profile: 'right side profile portrait, clear silhouette of nose and jaw',
};

const EXPR_PROMPT: Record<MasterShotSpec['expression'], string> = {
  neutral: 'neutral calm expression, closed mouth',
  smile: 'gentle natural smile, soft eyes',
  laugh: 'laughing candidly, joyful expression',
};

const LIGHT_PROMPT: Record<MasterShotSpec['lighting'], string> = {
  indoor: 'soft indoor lighting, natural window light',
  outdoor: 'natural outdoor daylight',
};

const HAIR_PROMPT: Record<MasterShotSpec['hair'], string> = {
  down: 'hair down, natural length',
  up: 'hair up in ponytail or bun',
};

const STYLE_PROMPT: Record<MasterShotSpec['style'], string> = {
  casual: 'casual everyday outfit',
  daily: 'daily Korean street style look',
  natural_selfie: 'natural smartphone selfie framing, slight arm perspective',
};

export function masterShotScenePrompt(spec: MasterShotSpec): string {
  return [
    ANGLE_PROMPT[spec.angle],
    EXPR_PROMPT[spec.expression],
    LIGHT_PROMPT[spec.lighting],
    HAIR_PROMPT[spec.hair],
    STYLE_PROMPT[spec.style],
    'clean background, face fully visible, no occlusion, photorealistic',
  ].join(', ');
}

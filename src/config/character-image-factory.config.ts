/**
 * PickMeTalk Character Image Factory — MASTER PROMPT constants
 * Goal: photos that look like real smartphone shots, not AI model portraits.
 */

export const IMAGE_FACTORY_GOAL =
  'Generate photos that feel like a real person took them on a smartphone — never like an AI model photoshoot.';

/** Never-change identity fields (enforced in every prompt). */
export const IDENTITY_LOCK_FIELDS = [
  'face shape',
  'eyes',
  'nose',
  'mouth',
  'skin tone',
  'age',
  'vibe',
  'body type',
  'hairstyle (ponytail/bun allowed by situation)',
] as const;

export const QUALITY_POSITIVE = [
  'Ultra realistic',
  'Photorealistic',
  'Natural smartphone photo',
  'Casual daily life',
  'No AI look',
  'No CGI',
  'No plastic skin',
  'No over beauty filter',
  'Natural skin texture',
  'Tiny imperfections',
  'Real pores',
  'Natural hair',
  'Natural lighting',
  'Natural exposure',
  'Natural shadow',
  'High dynamic range',
  'Shot on iPhone 16 Pro',
  '50mm lens look',
  'Very realistic Korean woman',
] as const;

export const QUALITY_NEGATIVE = [
  'AI beauty',
  'model photoshoot',
  'studio lighting',
  'plastic skin',
  'doll face',
  'over retouched',
  'CGI',
  'uncanny valley',
  'same pose repeated',
  'same outfit repeated',
  'same background repeated',
  'professional photography',
  'fashion editorial',
] as const;

export const SHOT_RULES = [
  'Not a professional shoot — everyday casual capture',
  'Slight hand shake is OK',
  'Slightly off focus is OK',
  'Imperfect lighting is OK — too perfect looks AI',
] as const;

export const EXPRESSION_POOL = [
  'natural subtle smile',
  'blank relaxed face',
  'sleepy drowsy look',
  'playful teasing expression',
  'pouty sulky face',
  'shy embarrassed blush',
  'smiling eyes',
  'mid-laugh candid moment',
  'looking at phone then glancing up',
  'turning head because a friend called',
] as const;

export const CAMERA_POOL = [
  'iPhone front selfie',
  'mirror selfie',
  'friend took the photo',
  'phone on small tripod',
  'cafe CCTV-like casual angle',
  'photo on table pointing up',
  'inside car passenger seat',
  'elevator mirror reflection',
  'glass window reflection',
] as const;

export const TIME_POOL = [
  'dawn',
  'morning',
  'late morning',
  'lunch',
  'afternoon',
  'golden hour sunset',
  'evening',
  'night',
  'rainy night',
  'snowy morning',
] as const;

export const LOCATION_POOL = [
  'home bedroom',
  'home kitchen',
  'living room',
  'balcony',
  'bathroom mirror',
  'cafe',
  'office desk',
  'park',
  'convenience store',
  'supermarket',
  'subway',
  'bus',
  'taxi back seat',
  'gym',
  'pilates studio',
  'neighborhood walk',
  'riverside',
  'cherry blossom street',
  'beach',
  'travel hotel',
  'camping site',
  'amusement park',
  'movie theater lobby',
  'library',
  'restaurant',
  'night market',
  'car during drive',
] as const;

export const WEATHER_POOL = [
  'clear sky',
  'cloudy',
  'rain',
  'snow',
  'monsoon drizzle',
  'windy',
  'cherry blossom season',
  'autumn leaves',
  'midsummer heat',
  'deep winter cold',
] as const;

export const OUTFIT_POOL = [
  'hoodie',
  'sweatshirt',
  'knit sweater',
  'casual dress',
  'jeans',
  'shorts',
  'tracksuit',
  'pajamas',
  'coat',
  'puffer jacket',
  'shirt',
  'cardigan',
  'workout clothes',
  'school-uniform vibe casual',
  'travel casual outfit',
] as const;

export const EMOTION_POOL = [
  'happy',
  'missing you',
  'lonely',
  'playful',
  'shy',
  'fluttering crush',
  'sleepy',
  'tired',
  'excited',
  'touched',
  'comforting',
  'cheering',
  'bored',
  'sulky',
  'anticipating',
] as const;

export const ACTION_POOL = [
  'drinking coffee',
  'looking out the window',
  'on laptop',
  'scrolling phone',
  'taking selfie',
  'laughing',
  'yawning',
  'tying hair',
  'tying shoelaces',
  'eating food',
  'watching a puppy',
  'petting a cat',
  'reading a book',
  'driving',
  'walking',
  'exercising',
  'dancing lightly',
  'cooking',
  'doing laundry',
  'cleaning',
  'gaming',
  'at hair salon',
] as const;

/** Character DNA labels (persona, not visual identity). */
export const CHARACTER_DNA_LABELS: Record<string, string> = {
  yuna: 'comfortable everyday girlfriend — warm, cozy daily-life vibe',
  narin: 'tsundere girlfriend — cool outside, caring inside',
  yunseo: 'indecision solver — calm, thoughtful, quietly reliable',
  eunha: 'unique perspective — quirky, aesthetic, unpredictable angles',
  jiyu: 'high-energy trendy girlfriend — playful, hype, friend-like',
};

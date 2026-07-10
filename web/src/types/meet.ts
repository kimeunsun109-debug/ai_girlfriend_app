export interface MeetStatus {
  emoji: string;
  label: string;
}

export interface MeetLastMessage {
  text: string;
  relativeTime: string;
}

export interface MeetCharacter {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  mood: string;
  photoUrl: string;
  ambientPhotoUrl?: string;
  gradient: string;
  accent: string;
  status: MeetStatus;
  emotionalState: MeetStatus;
  lastMessage: MeetLastMessage;
  userCharacterId: string | null;
  linked: boolean;
}

export interface MeetHome {
  greeting: string;
  greetingSub: string;
  timeOfDay: string;
  todaysPickSlug: string;
  characters: MeetCharacter[];
  userId: string;
}

export interface ConversationReactResponse {
  reaction: string;
  intent: string | null;
}

export type QuestKind = 'pet' | 'throw' | 'feed' | 'visit' | 'walk';

export type QuestState = {
  id: string;
  kind: QuestKind;
  label: string;
  goal: number;
  progress: number;
  biome?: string;
};

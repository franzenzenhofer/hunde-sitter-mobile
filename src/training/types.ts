import type { Dog } from '../entities/dog';
import type { Player } from '../entities/player';

export type NodeId = string;
export type CellId = number;
export type Value = number;

export type NodeCategory = 'action' | 'control' | 'sense' | 'memory';

export type NodeResult = {
  value?: Value;
  success: boolean;
};

export type WorldContext = {
  dog: Dog;
  player: Player;
  ballVisible(): boolean;
  recentGestures(): Array<{ id: string; t: number }>;
  recentBehaviors(): Array<{ id: string; t: number }>;
  now(): number;
};

export type ExecutionContext = {
  ctx: WorldContext;
  memory: Map<CellId, Value>;
  args: Record<string, Value>;
  childCount: number;
  evalChild(index: number): Promise<NodeResult | null>;
  abort: AbortSignal;
};

export type Primitive = {
  id: NodeId;
  name: string;
  description: string;
  category: NodeCategory;
  childCount: 'none' | 'variable' | { exact: number };
  defaultArgs?: Record<string, Value>;
  execute(ec: ExecutionContext): Promise<NodeResult>;
};

export type Program = {
  nodeId: NodeId;
  args?: Record<string, Value>;
  children?: Program[];
};

export type Trick = {
  id: string;
  name: string;
  cueGestureId?: string;
  program: Program;
  mastery: number;
  attempts: number;
  successes: number;
  reinforcements: number;
  authoredBy: 'system' | 'player';
  createdAt: number;
};

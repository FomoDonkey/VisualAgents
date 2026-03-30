export type BuildingType = 'think-tank' | 'search-station' | 'file-library' | 'code-workshop' | 'terminal-tower' | 'deploy-dock';

export type AgentState = 'idle' | 'walking' | 'arriving' | 'working' | 'thinking' | 'done' | 'error';

export type TaskType = 'read' | 'search' | 'write' | 'bash' | 'think' | 'deploy';

export interface Position {
  x: number;
  y: number;
}

export interface TilePos {
  x: number;
  y: number;
}

export interface BuildingDef {
  type: BuildingType;
  name: string;
  shortName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  entranceTile: TilePos;
  color: number;
  roofColor: number;
  icon: string;
}

export interface Task {
  id: string;
  type: TaskType;
  building: BuildingType;
  description: string;
  duration: number;
  itemIcon?: string;
  relatedFile?: string;
}

export interface ProjectTemplate {
  name: string;
  tasks: Omit<Task, 'id'>[];
}

export interface AgentDef {
  id: string;
  name: string;
  color: string;
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  pantsColor: string;
}

export interface WorldStats {
  tasksCompleted: number;
  tasksFailed: number;
  filesEdited: number;
  testsRun: number;
  searchesDone: number;
  deploysCompleted: number;
}

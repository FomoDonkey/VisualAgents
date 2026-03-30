import { AgentState } from '../types';

export interface StateCallbacks {
  onEnter: (state: AgentState, prevState: AgentState) => void;
  onUpdate: (state: AgentState, delta: number) => void;
  onExit: (state: AgentState, nextState: AgentState) => void;
}

export class AgentStateMachine {
  private currentState: AgentState = 'idle';
  private stateTimer = 0;
  private callbacks: StateCallbacks;

  constructor(callbacks: StateCallbacks) {
    this.callbacks = callbacks;
  }

  get state(): AgentState {
    return this.currentState;
  }

  get timer(): number {
    return this.stateTimer;
  }

  transition(newState: AgentState): void {
    if (newState === this.currentState) return;
    const prev = this.currentState;
    this.callbacks.onExit(this.currentState, newState);
    this.currentState = newState;
    this.stateTimer = 0;
    this.callbacks.onEnter(newState, prev);
  }

  update(delta: number): void {
    this.stateTimer += delta;
    this.callbacks.onUpdate(this.currentState, delta);
  }
}

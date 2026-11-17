import { Task } from '../entities/Task.js';
import type { Pipeline } from '../entities/Pipeline.js';

export interface ITaskRepository {
  save(task: Task): Promise<void>;
  findById(id: string): Promise<Task | null>;
  findAll(filter?: { status?: string; type?: string; priority?: string }): Promise<Task[]>;
  updateStatus(id: string, status: string): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IPipelineRepository {
  save(pipeline: Pipeline): Promise<void>;
  findById(id: string): Promise<Pipeline | null>;
  findAll(): Promise<Pipeline[]>;
  delete(id: string): Promise<void>;
}

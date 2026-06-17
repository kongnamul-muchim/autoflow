import { Task } from '../entities/Task';
import { TaskStatus, TaskFilter } from '../valueObjects/Types';
import type { Pipeline } from '../entities/Pipeline';

export interface ITaskRepository {
  save(task: Task): Promise<void>;
  findById(id: string): Promise<Task | null>;
  findAll(filter?: TaskFilter): Promise<Task[]>;
  updateStatus(id: string, status: TaskStatus): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IPipelineRepository {
  save(pipeline: Pipeline): Promise<void>;
  findById(id: string): Promise<Pipeline | null>;
  findAll(): Promise<Pipeline[]>;
  delete(id: string): Promise<void>;
}

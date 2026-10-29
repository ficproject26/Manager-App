/**
 * Abstract Task Repository Contract
 */
import { Priority, Task, TaskStatus } from '../../types';

export interface CompleteTaskPayload {
  notes?: string;
  beforePhotoUrl?: string;
  beforePhotoTimestamp?: string;
  beforePhotoLocation?: string;
  afterPhotoUrl?: string;
  afterPhotoTimestamp?: string;
  afterPhotoLocation?: string;
  voiceNoteUrl?: string;
  voiceNoteDuration?: number;
}

export interface ITaskRepository {
  getTasks(assignedManagerId: string, status?: TaskStatus, priority?: Priority): Promise<Task[]>;
  getTaskById(id: string): Promise<Task | null>;
  acceptTask(taskId: string): Promise<Task>;
  startTask(taskId: string): Promise<Task>;
  blockTask(taskId: string, notes?: string): Promise<Task>;
  resumeTask(taskId: string): Promise<Task>;
  rejectTask(taskId: string, reason: string): Promise<Task>;
  updateTaskStatus(taskId: string, status: TaskStatus, payload?: Partial<Task> | string): Promise<Task>;
  completeTask(taskId: string, payload?: CompleteTaskPayload | string): Promise<Task>;
  resolveHighPriorityTask(taskId: string, resolutionNotes: string, payload?: CompleteTaskPayload): Promise<Task>;
}

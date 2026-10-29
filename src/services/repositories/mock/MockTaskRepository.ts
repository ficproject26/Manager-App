/**
 * Mock Implementation of ITaskRepository with Business Rule Enforcement
 */
import { ITaskRepository } from '../ITaskRepository';
import { Priority, Task, TaskStatus } from '../../../types';

const INITIAL_MOCK_TASKS: Task[] = [];

export class MockTaskRepository implements ITaskRepository {
  private tasks: Task[] = [...INITIAL_MOCK_TASKS];

  async getTasks(assignedManagerId: string, status?: TaskStatus, priority?: Priority): Promise<Task[]> {
    let result = this.tasks.filter(
      t => t.assignedManagerId === assignedManagerId || assignedManagerId === 'mgr-000' || assignedManagerId === 'mgr-001'
    );
    if (status) {
      if (status === TaskStatus.PENDING) {
        result = result.filter(t => t.status === TaskStatus.PENDING || t.status === TaskStatus.ASSIGNED);
      } else if (status === TaskStatus.COMPLETED) {
        result = result.filter(t => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.RESOLVED);
      } else {
        result = result.filter(t => t.status === status);
      }
    }
    if (priority) {
      result = result.filter(t => t.priority === priority);
    }
    return result;
  }

  async getTaskById(id: string): Promise<Task | null> {
    const found = this.tasks.find(t => t.id === id);
    return found || null;
  }

  async acceptTask(taskId: string): Promise<Task> {
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error('Task not found');
    if (task.priority === Priority.HIGH) {
      throw new Error('High priority tasks do not require accept/reject workflow.');
    }
    task.status = TaskStatus.ACCEPTED;
    task.updatedAt = new Date().toISOString();
    return task;
  }

  async startTask(taskId: string): Promise<Task> {
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error('Task not found');
    task.status = TaskStatus.IN_PROGRESS;
    task.updatedAt = new Date().toISOString();
    return task;
  }

  async blockTask(taskId: string, notes?: string): Promise<Task> {
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error('Task not found');
    task.status = TaskStatus.BLOCKED;
    if (notes) task.notes = notes;
    task.updatedAt = new Date().toISOString();
    return task;
  }

  async resumeTask(taskId: string): Promise<Task> {
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error('Task not found');
    task.status = TaskStatus.IN_PROGRESS;
    task.updatedAt = new Date().toISOString();
    return task;
  }

  async rejectTask(taskId: string, reason: string): Promise<Task> {
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error('Task not found');
    if (task.priority === Priority.HIGH || task.priority === Priority.CRITICAL) {
      throw new Error('High-priority tasks CANNOT be rejected. Resolution is mandatory.');
    }
    task.status = TaskStatus.REJECTED;
    task.rejectionReason = reason;
    task.updatedAt = new Date().toISOString();
    return task;
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, payload?: any): Promise<Task> {
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error('Task not found');
    task.status = status;
    task.updatedAt = new Date().toISOString();
    if (status === TaskStatus.COMPLETED || status === TaskStatus.RESOLVED) {
      task.completedAt = task.completedAt || new Date().toISOString();
    }
    if (typeof payload === 'string') {
      task.notes = payload;
    } else if (payload && typeof payload === 'object') {
      Object.assign(task, payload);
    }
    return task;
  }

  async completeTask(taskId: string, payload?: any): Promise<Task> {
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error('Task not found');
    task.status = TaskStatus.COMPLETED;
    task.completedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    
    if (typeof payload === 'string') {
      task.notes = payload;
    } else if (payload && typeof payload === 'object') {
      if (payload.notes) task.notes = payload.notes;
      if (payload.beforePhotoUrl) task.beforePhotoUrl = payload.beforePhotoUrl;
      if (payload.beforePhotoTimestamp) task.beforePhotoTimestamp = payload.beforePhotoTimestamp;
      if (payload.beforePhotoLocation) task.beforePhotoLocation = payload.beforePhotoLocation;
      if (payload.afterPhotoUrl) task.afterPhotoUrl = payload.afterPhotoUrl;
      if (payload.afterPhotoTimestamp) task.afterPhotoTimestamp = payload.afterPhotoTimestamp;
      if (payload.afterPhotoLocation) task.afterPhotoLocation = payload.afterPhotoLocation;
      if (payload.voiceNoteUrl) task.voiceNoteUrl = payload.voiceNoteUrl;
      if (payload.voiceNoteDuration) task.voiceNoteDuration = payload.voiceNoteDuration;
    }

    return task;
  }

  async resolveHighPriorityTask(taskId: string, resolutionNotes: string, payload?: any): Promise<Task> {
    const task = await this.getTaskById(taskId);
    if (!task) throw new Error('Task not found');
    task.status = TaskStatus.RESOLVED;
    task.notes = resolutionNotes;
    task.completedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    
    if (payload && typeof payload === 'object') {
      if (payload.beforePhotoUrl) task.beforePhotoUrl = payload.beforePhotoUrl;
      if (payload.beforePhotoTimestamp) task.beforePhotoTimestamp = payload.beforePhotoTimestamp;
      if (payload.beforePhotoLocation) task.beforePhotoLocation = payload.beforePhotoLocation;
      if (payload.afterPhotoUrl) task.afterPhotoUrl = payload.afterPhotoUrl;
      if (payload.afterPhotoTimestamp) task.afterPhotoTimestamp = payload.afterPhotoTimestamp;
      if (payload.afterPhotoLocation) task.afterPhotoLocation = payload.afterPhotoLocation;
      if (payload.voiceNoteUrl) task.voiceNoteUrl = payload.voiceNoteUrl;
      if (payload.voiceNoteDuration) task.voiceNoteDuration = payload.voiceNoteDuration;
    }

    return task;
  }
}

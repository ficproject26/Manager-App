/**
 * HTTP Implementation of ITaskRepository
 */
import { ITaskRepository } from '../ITaskRepository';
import { Priority, Task, TaskStatus } from '../../../types';
import { apiClient } from '../../api/ApiClient';
import { services } from '../../index';

export class HttpTaskRepository implements ITaskRepository {
  private async getToken(): Promise<string | null> {
    return services.storageService.getAuthToken();
  }

  async getTasks(assignedManagerId: string, status?: TaskStatus, priority?: Priority): Promise<Task[]> {
    const token = await this.getToken();
    const params: Record<string, string | number | boolean> = { managerId: assignedManagerId };
    if (status) params.status = status;
    if (priority) params.priority = priority;

    const response = await apiClient.get<Task[]>('/qc-tasks/tasks', { token, params });
    const list = Array.isArray(response.data) ? response.data : (Array.isArray((response as any).tasks) ? (response as any).tasks : []);
    return list;
  }

  async getTaskById(id: string): Promise<Task | null> {
    const token = await this.getToken();
    try {
      const response = await apiClient.get<Task>(`/qc-tasks/tasks/${id}`, { token });
      return response.data || null;
    } catch {
      return null;
    }
  }

  async acceptTask(taskId: string): Promise<Task> {
    const token = await this.getToken();
    const response = await apiClient.patch<Task>(`/qc-tasks/tasks/${taskId}/status`, { status: TaskStatus.IN_PROGRESS }, { token });
    return response.data;
  }

  async startTask(taskId: string): Promise<Task> {
    const token = await this.getToken();
    const response = await apiClient.patch<Task>(`/qc-tasks/tasks/${taskId}/status`, { status: TaskStatus.IN_PROGRESS }, { token });
    return response.data;
  }

  async blockTask(taskId: string, notes?: string): Promise<Task> {
    const token = await this.getToken();
    const response = await apiClient.patch<Task>(`/qc-tasks/tasks/${taskId}/status`, { status: TaskStatus.BLOCKED, notes }, { token });
    return response.data;
  }

  async resumeTask(taskId: string): Promise<Task> {
    const token = await this.getToken();
    const response = await apiClient.patch<Task>(`/qc-tasks/tasks/${taskId}/status`, { status: TaskStatus.IN_PROGRESS }, { token });
    return response.data;
  }

  async rejectTask(taskId: string, reason: string): Promise<Task> {
    const token = await this.getToken();
    const response = await apiClient.patch<Task>(`/qc-tasks/tasks/${taskId}/status`, { status: TaskStatus.REJECTED, rejectionReason: reason }, { token });
    return response.data;
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, payload?: any): Promise<Task> {
    const token = await this.getToken();
    const body = typeof payload === 'string' ? { status, notes: payload } : { status, ...payload };
    const response = await apiClient.patch<Task>(`/qc-tasks/tasks/${taskId}/status`, body, { token });
    return response.data;
  }

  async completeTask(taskId: string, payload?: any): Promise<Task> {
    const token = await this.getToken();
    const body = typeof payload === 'string' ? { status: TaskStatus.COMPLETED, notes: payload } : { status: TaskStatus.COMPLETED, ...payload };
    const response = await apiClient.patch<Task>(`/qc-tasks/tasks/${taskId}/status`, body, { token });
    return response.data;
  }

  async resolveHighPriorityTask(taskId: string, resolutionNotes: string, payload?: any): Promise<Task> {
    const token = await this.getToken();
    const body = { status: TaskStatus.COMPLETED, notes: resolutionNotes, ...payload };
    const response = await apiClient.patch<Task>(`/qc-tasks/tasks/${taskId}/status`, body, { token });
    return response.data;
  }
}

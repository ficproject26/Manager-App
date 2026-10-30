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

  private mapStatus(rawStatus: any): TaskStatus {
    const s = String(rawStatus || '').toUpperCase().trim();
    if (s === 'COMPLETED' || s === 'CLOSED') return TaskStatus.COMPLETED;
    if (s === 'RESOLVED') return TaskStatus.RESOLVED;
    if (s.includes('IN PROGRESS') || s.includes('IN_PROGRESS') || s === 'ACCEPTED') return TaskStatus.IN_PROGRESS;
    if (s === 'BLOCKED' || s === 'SUSPENDED') return TaskStatus.BLOCKED;
    if (s === 'REJECTED' || s === 'CANCELLED') return TaskStatus.REJECTED;
    if (s.includes('PENDING') || s === 'OPEN' || s === 'ASSIGNED') return TaskStatus.PENDING;
    return TaskStatus.PENDING;
  }

  private mapPriority(rawPriority: any): Priority {
    const p = String(rawPriority || '').toUpperCase().trim();
    if (p === 'HIGH' || p === 'URGENT' || p === 'CRITICAL') return Priority.HIGH;
    if (p === 'LOW') return Priority.LOW;
    return Priority.MEDIUM;
  }

  private normalizeTask(raw: any): Task {
    if (!raw) {
      throw new Error('Task record is missing or invalid');
    }

    const id = String(raw.id || raw._id || raw.taskNumber || '');
    const title = raw.title || (raw.taskNumber ? `Task ${raw.taskNumber}` : 'Field Inspection Task');
    const description = raw.description || raw.remarks || raw.notes || '';
    const status = this.mapStatus(raw.status || raw.executionStatus || raw.assignmentStatus);
    const priority = this.mapPriority(raw.priority);

    // Resolve human-readable territory text
    const territoryParts = [
      raw.location,
      raw.pincode,
      raw.division,
      raw.district,
      raw.state,
    ].filter(Boolean);
    const territory = territoryParts.length > 0 ? territoryParts[0] : (raw.assignedState || 'Assigned Territory');

    // Completion photos / voice notes from nested structures
    const completionDetails = raw.completionDetails || {};
    const beforePhoto = raw.beforePhotoUrl || (Array.isArray(raw.photos) && raw.photos[0]) || undefined;
    const afterPhoto = raw.afterPhotoUrl || completionDetails.completionPhoto || (Array.isArray(completionDetails.completionPhotos) && completionDetails.completionPhotos[0]) || undefined;
    const voiceNote = raw.voiceNoteUrl || completionDetails.voiceNote || raw.voiceNote || undefined;

    return {
      id,
      title,
      description,
      priority,
      status,
      assignedManagerId: String(raw.assignedManagerId || raw.assignedTo || raw.userId || ''),
      contactName: raw.contactName || raw.vendor || raw.shopName || raw.merchantName || raw.createdByName || '',
      contactPhone: raw.contactPhone || raw.phone || raw.mobile || '',
      address: raw.address || raw.location || '',
      pincodeId: raw.pincodeId || raw.pincode || '',
      divisionId: raw.divisionId || raw.division || '',
      districtId: raw.districtId || raw.district || '',
      stateId: raw.stateId || raw.state || '',
      dueSla: raw.dueDate || raw.dueSla || raw.createdAt || new Date().toISOString(),
      dueDate: raw.dueDate || raw.dueSla,
      assignedBy: raw.assignedBy || raw.createdByAdminName || raw.createdByName || 'Sub Admin',
      createdByAdminName: raw.createdByAdminName || raw.assignedBy || raw.createdByName || 'Sub Admin',
      createdByAdminRole: raw.createdByAdminRole || 'Sub Admin',
      assignmentStatus: raw.assignmentStatus,
      executionStatus: raw.executionStatus,
      progress: typeof raw.progress === 'number' ? raw.progress : undefined,
      territory,
      notes: raw.notes || raw.remarks || '',
      voiceNoteUrl: voiceNote,
      voiceNoteDuration: raw.voiceNoteDuration || 0,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
      completedAt: raw.completedAt || (status === TaskStatus.COMPLETED ? raw.updatedAt : undefined),
      beforePhotoUrl: beforePhoto,
      afterPhotoUrl: afterPhoto,
    };
  }

  async getTasks(assignedManagerId: string, status?: TaskStatus, priority?: Priority): Promise<Task[]> {
    const token = await this.getToken();
    const params: Record<string, string | number | boolean> = {};
    if (assignedManagerId) params.managerId = assignedManagerId;
    if (status) params.status = status;
    if (priority) params.priority = priority;

    const response = await apiClient.get<any>('/qc-tasks/tasks', {
      token,
      params,
      timeoutMs: 30000,
    });

    const rawList = Array.isArray(response.data)
      ? response.data
      : (Array.isArray((response as any).tasks) ? (response as any).tasks : []);

    return rawList.map((item: any) => this.normalizeTask(item));
  }

  async getTaskById(id: string): Promise<Task | null> {
    const token = await this.getToken();
    try {
      const response = await apiClient.get<any>(`/qc-tasks/tasks/${id}`, {
        token,
        timeoutMs: 30000,
      });
      const data = response.data || (response as any).task;
      return data ? this.normalizeTask(data) : null;
    } catch {
      return null;
    }
  }

  async acceptTask(taskId: string): Promise<Task> {
    const token = await this.getToken();
    const response = await apiClient.patch<any>(`/qc-tasks/tasks/${taskId}/status`, { action: 'accept', status: 'Accepted' }, { token });
    return this.normalizeTask(response.data);
  }

  async startTask(taskId: string): Promise<Task> {
    const token = await this.getToken();
    const response = await apiClient.patch<any>(`/qc-tasks/tasks/${taskId}/status`, { action: 'start', status: 'In Progress' }, { token });
    return this.normalizeTask(response.data);
  }

  async blockTask(taskId: string, notes?: string): Promise<Task> {
    const token = await this.getToken();
    const response = await apiClient.patch<any>(`/qc-tasks/tasks/${taskId}/status`, { status: 'Blocked', notes }, { token });
    return this.normalizeTask(response.data);
  }

  async resumeTask(taskId: string): Promise<Task> {
    const token = await this.getToken();
    const response = await apiClient.patch<any>(`/qc-tasks/tasks/${taskId}/status`, { action: 'start', status: 'In Progress' }, { token });
    return this.normalizeTask(response.data);
  }

  async rejectTask(taskId: string, reason: string): Promise<Task> {
    const token = await this.getToken();
    const response = await apiClient.patch<any>(`/qc-tasks/tasks/${taskId}/status`, { action: 'reject', status: 'Rejected', reason, rejectionReason: reason }, { token });
    return this.normalizeTask(response.data);
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, payload?: any): Promise<Task> {
    const token = await this.getToken();
    const backendStatus = status === TaskStatus.COMPLETED ? 'Completed' : status === TaskStatus.IN_PROGRESS ? 'In Progress' : status === TaskStatus.BLOCKED ? 'Blocked' : String(status);
    const body = typeof payload === 'string' ? { status: backendStatus, notes: payload } : { status: backendStatus, ...payload };
    const response = await apiClient.patch<any>(`/qc-tasks/tasks/${taskId}/status`, body, { token });
    return this.normalizeTask(response.data);
  }

  async completeTask(taskId: string, payload?: any): Promise<Task> {
    const token = await this.getToken();
    const body = typeof payload === 'string' ? { action: 'complete', status: 'Completed', notes: payload } : { action: 'complete', status: 'Completed', ...payload };
    const response = await apiClient.patch<any>(`/qc-tasks/tasks/${taskId}/status`, body, { token });
    return this.normalizeTask(response.data);
  }

  async resolveHighPriorityTask(taskId: string, resolutionNotes: string, payload?: any): Promise<Task> {
    const token = await this.getToken();
    const body = { action: 'complete', status: 'Completed', notes: resolutionNotes, ...payload };
    const response = await apiClient.patch<any>(`/qc-tasks/tasks/${taskId}/status`, body, { token });
    return this.normalizeTask(response.data);
  }
}

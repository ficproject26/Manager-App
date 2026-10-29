/**
 * Tasks Workflow and Business Rule Enforcement Test Suite
 */
import { services } from '../src/services';
import { Priority, TaskStatus } from '../src/types';

describe('Tasks Workflow & Business Rule Enforcement', () => {
  it('1. Fetches all assigned tasks for manager', async () => {
    const tasks = await services.taskRepository.getTasks('mgr-001');
    expect(tasks).toBeDefined();
    expect(tasks.length).toBeGreaterThanOrEqual(3);
  });

  it('2. Filters tasks by priority and status', async () => {
    const highTasks = await services.taskRepository.getTasks('mgr-001', undefined, Priority.HIGH);
    expect(highTasks.every(t => t.priority === Priority.HIGH)).toBe(true);

    const inProgressTasks = await services.taskRepository.getTasks('mgr-001', TaskStatus.IN_PROGRESS);
    expect(inProgressTasks.every(t => t.status === TaskStatus.IN_PROGRESS)).toBe(true);
  });

  it('3. Low/Medium Priority Task allows Accept workflow', async () => {
    const acceptedTask = await services.taskRepository.acceptTask('t-301');
    expect(acceptedTask.status).toBe(TaskStatus.ACCEPTED);
    expect(acceptedTask.updatedAt).toBeDefined();
  });

  it('4. Low/Medium Priority Task allows Completion workflow', async () => {
    const completedTask = await services.taskRepository.completeTask('t-301');
    expect(completedTask.status).toBe(TaskStatus.COMPLETED);
    expect(completedTask.completedAt).toBeDefined();
  });

  it('5. High Priority Task blocks rejection per business rules', async () => {
    await expect(services.taskRepository.rejectTask('t-302', 'Cannot attend today')).rejects.toThrow(
      'High-priority tasks CANNOT be rejected. Resolution is mandatory.'
    );
  });

  it('6. High Priority Task blocks standard accept workflow', async () => {
    await expect(services.taskRepository.acceptTask('t-302')).rejects.toThrow(
      'High priority tasks do not require accept/reject workflow.'
    );
  });

  it('7. High Priority Task resolution succeeds with resolution notes', async () => {
    const resolvedTask = await services.taskRepository.resolveHighPriorityTask(
      't-302',
      'Escalated to accounts team and issued credit adjustment.'
    );
    expect(resolvedTask.status).toBe(TaskStatus.RESOLVED);
    expect(resolvedTask.completedAt).toBeDefined();
  });
});

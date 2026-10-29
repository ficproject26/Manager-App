/**
 * Field Managers Feature & Repository Test Suite
 */
import { services } from '../src/services';

describe('Field Managers Feature & Repository', () => {
  it('1. Returns managers within authorized territory scope for authenticated manager', async () => {
    const managers = await services.managerRepository.getManagersInScope('mgr-001');
    expect(managers).toBeDefined();
    expect(managers.length).toBeGreaterThan(0);
    expect(managers[0].stateId).toBe('st-mp-01');
  });

  it('2. Searches managers by name', async () => {
    const results = await services.managerRepository.getManagersInScope('mgr-001', 'Priya');
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Priya Sharma');
  });

  it('3. Searches managers by employee ID', async () => {
    const results = await services.managerRepository.getManagersInScope('mgr-001', 'FM1024');
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Arun Kumar');
    expect(results[0].employeeId).toBe('FM1024');
  });

  it('4. Searches managers by territory name', async () => {
    const results = await services.managerRepository.getManagersInScope('mgr-001', 'Indore East');
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Vikram Singh');
  });

  it('5. Filters managers by status (ACTIVE / INACTIVE)', async () => {
    const activeManagers = await services.managerRepository.getManagersInScope('mgr-001', undefined, 'ACTIVE');
    const inactiveManagers = await services.managerRepository.getManagersInScope('mgr-001', undefined, 'INACTIVE');

    expect(activeManagers.every(m => m.status === 'ACTIVE')).toBe(true);
    expect(inactiveManagers.every(m => m.status === 'INACTIVE')).toBe(true);
    expect(inactiveManagers.length).toBeGreaterThan(0);
  });

  it('6. Handles non-matching search gracefully', async () => {
    const results = await services.managerRepository.getManagersInScope('mgr-001', 'NonExistentManagerQuery');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  it('7. Fetches single manager profile by ID', async () => {
    const manager = await services.managerRepository.getManagerById('mgr-001');
    expect(manager).toBeDefined();
    expect(manager?.name).toBe('Rajesh Kumar');
  });
});

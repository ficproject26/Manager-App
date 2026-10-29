import { pushNotificationService } from '../src/services/push/PushNotificationService';
const server = require('../../backend/server');
import http from 'http';

function makeRequest(serverInstance: any, method: string, path: string, payload?: any): Promise<{ statusCode: number; body: any }> {
  return new Promise((resolve, reject) => {
    const address = serverInstance.address();
    const port = typeof address === 'object' && address !== null ? address.port : 3000;

    const postData = payload ? JSON.stringify(payload) : '';
    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ statusCode: res.statusCode || 200, body: parsed });
          } catch (e) {
            resolve({ statusCode: res.statusCode || 200, body: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

describe('Real-Time FCM Push Notifications & Express/Node Backend Workflow', () => {
  let activeServer: any;

  beforeAll(done => {
    activeServer = server.listen(0, () => {
      done();
    });
  });

  afterAll(done => {
    if (activeServer) {
      activeServer.close(done);
    } else {
      done();
    }
  });

  describe('1. FCM Device Token Lifecycle & Backend Token Endpoints', () => {
    it('generates a valid FCM token and registers it on the Backend', async () => {
      jest.spyOn(pushNotificationService, 'requestNotificationPermission').mockResolvedValue('granted');
      const token = await pushNotificationService.getFCMToken();
      expect(token).toBeTruthy();
      expect(token).toContain('fcm_token_fic_');

      const res = await makeRequest(activeServer, 'POST', '/api/v1/notifications/register-token', {
        managerId: 'mgr-district-tn',
        fcmToken: token,
        role: 'DISTRICT_MANAGER',
        territory: { state: 'Tamil Nadu', district: 'Salem' },
        platform: 'android',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.success).toBe(true);
    });

    it('deactivates FCM device token on user logout', async () => {
      const token = await pushNotificationService.getFCMToken();
      const res = await makeRequest(activeServer, 'POST', '/api/v1/notifications/unregister-token', {
        managerId: 'mgr-district-tn',
        fcmToken: token,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.success).toBe(true);
    });
  });

  describe('2. Territory Scoping & Real-Time Backend Event Triggering', () => {
    beforeEach(async () => {
      // Register District Manager token
      await makeRequest(activeServer, 'POST', '/api/v1/notifications/register-token', {
        managerId: 'mgr-salem',
        fcmToken: 'token_salem_123',
        role: 'DISTRICT_MANAGER',
        territory: { state: 'Tamil Nadu', district: 'Salem' },
      });

      // Register Pincode Manager token outside Salem
      await makeRequest(activeServer, 'POST', '/api/v1/notifications/register-token', {
        managerId: 'mgr-chennai',
        fcmToken: 'token_chennai_456',
        role: 'PINCODE_MANAGER',
        territory: { state: 'Tamil Nadu', district: 'Chennai', pincode: '600001' },
      });
    });

    it('dispatches task notification strictly to matching territory manager', async () => {
      const res = await makeRequest(activeServer, 'POST', '/api/v1/notifications/send', {
        type: 'TASK_ASSIGNED',
        title: 'New Directive Assigned',
        body: 'Onboard 5 new Kirana stores in Salem district.',
        territoryScope: { state: 'Tamil Nadu', district: 'Salem' },
        entityId: 'tsk-999',
        entityType: 'TASK',
        route: 'TaskDetail',
        priority: 'HIGH',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.deliveredCount).toBe(1);
      expect(res.body.data.targets[0].managerId).toBe('mgr-salem');
    });

    it('sanitizes sensitive fields (PAN, GSTIN, Bank Accounts) from lock-screen text', async () => {
      const sensitiveBody = 'Vendor GSTIN: 33ABCDE1234F1Z5, PAN: ABCDE1234F, Bank Account: 987654321012 updated.';
      const res = await makeRequest(activeServer, 'POST', '/api/v1/notifications/send', {
        type: 'VENDOR_UPDATE',
        title: 'Vendor Verification Updated',
        body: sensitiveBody,
        targetManagerId: 'mgr-salem',
        route: 'VendorDetail',
        entityId: 'ven-101',
      });

      expect(res.statusCode).toBe(200);

      const inboxRes = await makeRequest(activeServer, 'GET', '/api/v1/notifications?managerId=mgr-salem');
      const latestNotif = inboxRes.body.data[0];
      expect(latestNotif.body).not.toContain('33ABCDE1234F1Z5');
      expect(latestNotif.body).toContain('[GSTIN MASKED]');
      expect(latestNotif.body).toContain('[PAN MASKED]');
      expect(latestNotif.body).toContain('[ACCOUNT MASKED]');
    });
  });

  describe('3. Navigation Routing on Notification Tap', () => {
    it('resolves Task detail deep link route correctly', () => {
      const routeInfo = pushNotificationService.resolveNavigationRoute({
        type: 'TASK_ASSIGNED',
        entityId: 'task-555',
        route: 'TaskDetail',
      });
      expect(routeInfo.routeName).toBe('TaskDetail');
      expect(routeInfo.params).toEqual({ id: 'task-555' });
    });

    it('resolves Issue detail deep link route correctly', () => {
      const routeInfo = pushNotificationService.resolveNavigationRoute({
        type: 'ISSUE_ESCALATED',
        entityId: 'issue-888',
        route: 'IssueDetail',
      });
      expect(routeInfo.routeName).toBe('IssueDetail');
      expect(routeInfo.params).toEqual({ id: 'issue-888' });
    });
  });
});

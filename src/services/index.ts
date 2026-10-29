/**
 * Central Service Registry & Dependency Injector Abstraction
 */
import { IVendorRepository } from './repositories/IVendorRepository';
import { ITaskRepository } from './repositories/ITaskRepository';
import { IIssueRepository } from './repositories/IIssueRepository';
import { IActivityRepository } from './repositories/IActivityRepository';
import { IManagerRepository } from './repositories/IManagerRepository';
import { IDashboardRepository } from './repositories/IDashboardRepository';
import { ILeaderboardRepository } from './repositories/ILeaderboardRepository';
import { IDailyReportRepository } from './repositories/IDailyReportRepository';
import { INotificationRepository } from './repositories/INotificationRepository';
import { ISecureStorageService } from './storage/ISecureStorageService';
import { IAudioRecorderService } from './audio/IAudioRecorderService';
import { IMediaUploadService } from './uploads/IMediaUploadService';

import { MockVendorRepository } from './repositories/mock/MockVendorRepository';
import { MockTaskRepository } from './repositories/mock/MockTaskRepository';
import { MockIssueRepository } from './repositories/mock/MockIssueRepository';
import { MockActivityRepository } from './repositories/mock/MockActivityRepository';
import { MockManagerRepository } from './repositories/mock/MockManagerRepository';
import { MockDashboardRepository } from './repositories/mock/MockDashboardRepository';
import { MockLeaderboardRepository } from './repositories/mock/MockLeaderboardRepository';
import { MockDailyReportRepository } from './repositories/mock/MockDailyReportRepository';
import { MockNotificationRepository } from './repositories/mock/MockNotificationRepository';
import { MockSecureStorageService } from './storage/MockSecureStorageService';
import { MockAudioRecorderService } from './audio/MockAudioRecorderService';
import { MockMediaUploadService } from './uploads/MockMediaUploadService';

import { IAgentRepository } from './repositories/IAgentRepository';
import { IOfflineQueueService, offlineQueueService } from './storage/OfflineQueueService';
import { MockAgentRepository } from './repositories/mock/MockAgentRepository';

export interface ServiceContainer {
  vendorRepository: IVendorRepository;
  taskRepository: ITaskRepository;
  issueRepository: IIssueRepository;
  activityRepository: IActivityRepository;
  managerRepository: IManagerRepository;
  agentRepository: IAgentRepository;
  dashboardRepository: IDashboardRepository;
  leaderboardRepository: ILeaderboardRepository;
  dailyReportRepository: IDailyReportRepository;
  notificationRepository: INotificationRepository;
  storageService: ISecureStorageService;
  audioRecorderService: IAudioRecorderService;
  mediaUploadService: IMediaUploadService;
  offlineQueueService: IOfflineQueueService;
  fieldVisitService: FieldVisitService;
}

import { ENV } from '../constants/env';
import { FieldVisitService, fieldVisitService } from './reports/FieldVisitService';

import { HttpVendorRepository } from './repositories/http/HttpVendorRepository';
import { HttpTaskRepository } from './repositories/http/HttpTaskRepository';
import { HttpIssueRepository } from './repositories/http/HttpIssueRepository';
import { HttpActivityRepository } from './repositories/http/HttpActivityRepository';
import { HttpManagerRepository } from './repositories/http/HttpManagerRepository';
import { HttpAgentRepository } from './repositories/http/HttpAgentRepository';
import { HttpDashboardRepository } from './repositories/http/HttpDashboardRepository';
import { HttpLeaderboardRepository } from './repositories/http/HttpLeaderboardRepository';
import { HttpDailyReportRepository } from './repositories/http/HttpDailyReportRepository';
import { HttpNotificationRepository } from './repositories/http/HttpNotificationRepository';
import { HttpMediaUploadService } from './uploads/HttpMediaUploadService';

export const services: ServiceContainer = {
  vendorRepository: ENV.useMockData ? new MockVendorRepository() : new HttpVendorRepository(),
  taskRepository: ENV.useMockData ? new MockTaskRepository() : new HttpTaskRepository(),
  issueRepository: ENV.useMockData ? new MockIssueRepository() : new HttpIssueRepository(),
  activityRepository: ENV.useMockData ? new MockActivityRepository() : new HttpActivityRepository(),
  managerRepository: ENV.useMockData ? new MockManagerRepository() : new HttpManagerRepository(),
  agentRepository: ENV.useMockData ? new MockAgentRepository() : new HttpAgentRepository(),
  dashboardRepository: ENV.useMockData ? new MockDashboardRepository() : new HttpDashboardRepository(),
  leaderboardRepository: ENV.useMockData ? new MockLeaderboardRepository() : new HttpLeaderboardRepository(),
  dailyReportRepository: ENV.useMockData ? new MockDailyReportRepository() : new HttpDailyReportRepository(),
  notificationRepository: ENV.useMockData ? new MockNotificationRepository() : new HttpNotificationRepository(),
  storageService: new MockSecureStorageService(),
  audioRecorderService: new MockAudioRecorderService(),
  mediaUploadService: ENV.useMockData ? new MockMediaUploadService() : new HttpMediaUploadService(),
  offlineQueueService: offlineQueueService,
  fieldVisitService: fieldVisitService,
};

fieldVisitService.setVendorRepository(services.vendorRepository);

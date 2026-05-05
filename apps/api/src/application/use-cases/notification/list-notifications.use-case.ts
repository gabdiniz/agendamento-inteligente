import type {
  INotificationRepository,
  ListNotificationsParams,
  PaginatedNotifications,
} from '../../../domain/repositories/notification.repository.js'

export class ListNotificationsUseCase {
  constructor(private readonly notificationRepo: INotificationRepository) {}

  async execute(params: ListNotificationsParams): Promise<PaginatedNotifications> {
    return this.notificationRepo.list(params)
  }
}

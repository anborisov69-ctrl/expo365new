'use client'

import { 
  TenderNotification, 
  TenderWinnerSelection, 
  ExtendedBidData,
  NOTIFICATION_MESSAGES 
} from '@/types/buyer-cabinet'

/**
 * Сервис для управления уведомлениями в системе тендеров
 * Обрабатывает отправку уведомлений при выборе победителя тендера
 */
export class TenderNotificationService {
  
  /**
   * Отправляет уведомления при выборе победителя тендера
   * @param selection - Данные о выборе победителя
   * @param allBids - Все отклики на тендер
   */
  static async sendWinnerSelectionNotifications(
    selection: TenderWinnerSelection,
    allBids: ExtendedBidData[]
  ): Promise<void> {
    try {
      const notifications: TenderNotification[] = []

      // Уведомление для победителя
      const winnerBid = allBids.find(bid => bid.exhibitorId === selection.winnerId)
      if (winnerBid) {
        notifications.push({
          id: `winner_${selection.tenderId}_${Date.now()}`,
          tenderId: selection.tenderId,
          recipientId: selection.winnerId,
          recipientType: 'exhibitor',
          type: 'bid_accepted',
          title: 'Поздравляем! Ваше предложение принято',
          message: NOTIFICATION_MESSAGES.BID_ACCEPTED,
          isRead: false,
          createdAt: new Date()
        })
      }

      // Уведомления для отклоненных участников
      const rejectedBids = allBids.filter(bid => 
        bid.exhibitorId !== selection.winnerId && 
        bid.status === 'pending'
      )

      for (const rejectedBid of rejectedBids) {
        notifications.push({
          id: `rejected_${selection.tenderId}_${rejectedBid.exhibitorId}_${Date.now()}`,
          tenderId: selection.tenderId,
          recipientId: rejectedBid.exhibitorId,
          recipientType: 'exhibitor',
          type: 'tender_closed',
          title: 'Тендер завершен',
          message: NOTIFICATION_MESSAGES.TENDER_CLOSED,
          isRead: false,
          createdAt: new Date()
        })
      }

      // Отправка уведомлений (здесь может быть интеграция с Supabase или email сервисом)
      await Promise.all([
        this.sendEmailNotifications(notifications),
        this.saveToDatabaseNotifications(notifications),
        this.sendPushNotifications(notifications)
      ])

      console.log(`Отправлено ${notifications.length} уведомлений по тендеру ${selection.tenderId}`)
      
    } catch (error) {
      console.error('Ошибка при отправке уведомлений:', error)
      throw new Error('Не удалось отправить уведомления участникам')
    }
  }

  /**
   * Отправляет email уведомления
   */
  private static async sendEmailNotifications(notifications: TenderNotification[]): Promise<void> {
    // TODO: Интеграция с email сервисом (SendGrid, NodeMailer или аналогичный)
    for (const notification of notifications) {
      try {
        // Преобразуем уведомление в email формат
        const emailData = {
          to: await this.getRecipientEmail(notification.recipientId, notification.recipientType),
          subject: notification.title,
          html: this.generateEmailHtml(notification),
          text: notification.message
        }

        // Здесь должна быть отправка через API email сервиса
        console.log('Email уведомление:', emailData)
        
      } catch (error) {
        console.error(`Ошибка отправки email для ${notification.recipientId}:`, error)
      }
    }
  }

  /**
   * Сохраняет уведомления в базу данных
   */
  private static async saveToDatabaseNotifications(notifications: TenderNotification[]): Promise<void> {
    // TODO: Интеграция с Supabase для сохранения уведомлений
    try {
      // Здесь должна быть вставка в таблицу notifications
      const notificationData = notifications.map(notification => ({
        id: notification.id,
        tender_id: notification.tenderId,
        recipient_id: notification.recipientId,
        recipient_type: notification.recipientType,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        is_read: notification.isRead,
        created_at: notification.createdAt.toISOString()
      }))

      console.log('Сохранение в БД:', notificationData)
      
    } catch (error) {
      console.error('Ошибка сохранения уведомлений в БД:', error)
    }
  }

  /**
   * Отправляет push уведомления
   */
  private static async sendPushNotifications(notifications: TenderNotification[]): Promise<void> {
    // TODO: Интеграция с Push службой (Firebase Cloud Messaging или аналогичный)
    for (const notification of notifications) {
      try {
        const pushData = {
          title: notification.title,
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          data: {
            tenderId: notification.tenderId,
            type: notification.type,
            url: `/horeca/buyer/dashboard/tenders/${notification.tenderId}`
          }
        }

        console.log('Push уведомление:', pushData)
        
      } catch (error) {
        console.error(`Ошибка отправки push для ${notification.recipientId}:`, error)
      }
    }
  }

  /**
   * Получает email адрес получателя
   */
  private static async getRecipientEmail(recipientId: string, recipientType: 'buyer' | 'exhibitor'): Promise<string> {
    // TODO: Запрос к БД для получения email
    // Временная заглушка
    return `${recipientType}_${recipientId}@expo365.com`
  }

  /**
   * Генерирует HTML для email уведомления
   */
  private static generateEmailHtml(notification: TenderNotification): string {
    const isWinner = notification.type === 'bid_accepted'
    const primaryColor = '#0B2B5E'
    const actionColor = '#F26522'

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; }
          .header { background: ${primaryColor}; color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; background: ${actionColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .success { color: #10b981; font-weight: bold; }
          .info { color: ${primaryColor}; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>EXPO 365</h1>
            <h2>${notification.title}</h2>
          </div>
          <div class="content">
            <p class="${isWinner ? 'success' : 'info'}">${notification.message}</p>
            
            ${isWinner ? `
              <p>Следующие шаги:</p>
              <ul>
                <li>Проверьте детали заказа в вашем кабинете</li>
                <li>Свяжитесь с покупателем для уточнения деталей</li>
                <li>Подготовьте смарт-контракт для подписания</li>
              </ul>
              
              <a href="/horeca/exhibitor/contracts/new?tenderId=${notification.tenderId}" class="button">
                Оформить договор
              </a>
            ` : `
              <p>Не расстраивайтесь! У нас есть множество других возможностей для сотрудничества.</p>
              
              <a href="/horeca/marketplace" class="button">
                Смотреть новые тендеры
              </a>
            `}
          </div>
          <div class="footer">
            <p>© 2024 EXPO 365 - Глобальная B2B экосистема для HoReCa индустрии</p>
            <p>Это автоматическое уведомление. Не отвечайте на это письмо.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Отправляет уведомления при явном закрытии тендера покупателем.
   * Все участники со статусом 'pending' получают нейтральное системное уведомление.
   * Причина закрытия намеренно не передаётся — исключает субъективную обратную связь.
   *
   * @param tenderId    - ID тендера
   * @param tenderTitle - Название тендера (для тела уведомления)
   * @param allBids     - Все отклики на тендер
   */
  static async sendTenderClosureNotifications(
    tenderId: string,
    tenderTitle: string,
    allBids: ExtendedBidData[]
  ): Promise<void> {
    try {
      const pendingBids = allBids.filter(bid => bid.status === 'pending')
      if (pendingBids.length === 0) return

      const notifications: TenderNotification[] = pendingBids.map(bid => ({
        id: `closed_${tenderId}_${bid.exhibitorId}_${Date.now()}`,
        tenderId,
        recipientId:   bid.exhibitorId,
        recipientType: 'exhibitor' as const,
        type:          'tender_closed' as const,
        title:         'Тендер завершён заказчиком',
        message:       `Тендер «${tenderTitle}» был завершен заказчиком. Прием предложений прекращен.`,
        isRead:    false,
        createdAt: new Date(),
      }))

      await Promise.all([
        this.sendEmailNotifications(notifications),
        this.saveToDatabaseNotifications(notifications),
        this.sendPushNotifications(notifications),
      ])

      console.log(
        `[TenderNotificationService] Отправлено ${notifications.length} уведомлений о закрытии тендера ${tenderId}`
      )

    } catch (error) {
      console.error('[TenderNotificationService] Ошибка при отправке уведомлений о закрытии:', error)
      throw new Error('Не удалось отправить уведомления участникам')
    }
  }

  /**
   * Отправляет уведомление о новом отклике на тендер
   */
  static async sendNewBidNotification(
    tenderId: string,
    buyerId: string,
    exhibitorName: string
  ): Promise<void> {
    try {
      const notification: TenderNotification = {
        id: `new_bid_${tenderId}_${Date.now()}`,
        tenderId,
        recipientId: buyerId,
        recipientType: 'buyer',
        type: 'new_bid',
        title: 'Новый отклик на тендер',
        message: `${exhibitorName} откликнулся на ваш тендер. ${NOTIFICATION_MESSAGES.NEW_BID}`,
        isRead: false,
        createdAt: new Date()
      }

      await Promise.all([
        this.sendEmailNotifications([notification]),
        this.saveToDatabaseNotifications([notification]),
        this.sendPushNotifications([notification])
      ])

    } catch (error) {
      console.error('Ошибка отправки уведомления о новом отклике:', error)
    }
  }

  /**
   * Получает все уведомления для пользователя
   */
  static async getUserNotifications(
    userId: string, 
    userType: 'buyer' | 'exhibitor',
    limit: number = 50
  ): Promise<TenderNotification[]> {
    try {
      // TODO: Запрос к БД для получения уведомлений пользователя
      console.log(`Запрос уведомлений для ${userType} ${userId}`)
      
      // Временная заглушка
      return []
      
    } catch (error) {
      console.error('Ошибка получения уведомлений:', error)
      return []
    }
  }

  /**
   * Отмечает уведомление как прочитанное
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      // TODO: Обновление статуса в БД
      console.log(`Уведомление ${notificationId} отмечено как прочитанное`)
      
    } catch (error) {
      console.error('Ошибка обновления статуса уведомления:', error)
    }
  }

  /**
   * Получает количество непрочитанных уведомлений
   */
  static async getUnreadCount(
    userId: string, 
    userType: 'buyer' | 'exhibitor'
  ): Promise<number> {
    try {
      // TODO: Запрос к БД для подсчета непрочитанных
      console.log(`Запрос количества непрочитанных для ${userType} ${userId}`)
      
      // Временная заглушка
      return 0
      
    } catch (error) {
      console.error('Ошибка получения количества непрочитанных:', error)
      return 0
    }
  }
}
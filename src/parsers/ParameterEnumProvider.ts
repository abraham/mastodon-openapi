/**
 * Provides enum values for specific API parameters that should have constraints
 */
export class ParameterEnumProvider {
  /**
   * Get notification type enum values
   */
  static getNotificationTypeEnums(): string[] {
    return [
      'mention',
      'status',
      'reblog',
      'follow',
      'follow_request',
      'favourite',
      'poll',
      'update',
      'admin.sign_up',
      'admin.report',
      'severed_relationships',
      'moderation_warning',
    ];
  }

  /**
   * Check if a parameter should have notification type enum constraints
   */
  static shouldHaveNotificationTypeEnum(parameterName: string): boolean {
    const notificationTypeParams = ['types', 'exclude_types', 'grouped_types'];
    return notificationTypeParams.includes(parameterName);
  }
}

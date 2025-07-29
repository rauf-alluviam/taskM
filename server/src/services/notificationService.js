import Notification from '../models/Notification.js';

/**
 * Create a notification and emit it to the user and/or organization in real time via Socket.IO
 * @param {Object} params - Notification params
 * @param {string} params.user - User ID to notify
 * @param {string} [params.organization] - Organization ID to notify (optional)
 * @param {string} params.message - Notification message
 * @param {string} [params.type] - Notification type (optional)
 * @param {Object} [params.data] - Extra data (optional)
 * @param {Object} io - Socket.IO server instance
 */
export async function createAndEmitNotification({ user, organization, message, type = 'general', data = {} }, io) {
  // Create notification in DB for the user
  const notification = await Notification.create({ user, message, type, data });
  io.to(`user:${user}`).emit('notification:new', notification);

  // Emit a generic org notification (not user-specific) to the org room
  if (organization) {
    io.to(`organization:${organization}`).emit('notification:new', {
      message,
      type,
      data,
      organization,
      isOrgBroadcast: true
    });
  }
  return notification;
}

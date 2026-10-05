import { Notification } from 'electron';

export interface NotificationOptions {

  title: string;
  body: string;
  silent?: boolean;
}

export function showNotification(options: NotificationOptions): boolean {
  try {
    if (!Notification.isSupported()) {
      return false;
    }

    const notification = new Notification({
      title: options.title,
      body: options.body,
      silent: options.silent ?? false,
    });

    notification.show();
    return true;
  } catch {
    return false;
  }
}

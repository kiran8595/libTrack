import type { Borrow } from './database';
import { getEffectiveDueDate } from './utils';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function scheduleDueReminder(borrow: Borrow) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!borrow.id) return;

  const effectiveDue = getEffectiveDueDate(borrow);
  const reminderTime = new Date(effectiveDue.getTime() - 2 * 24 * 60 * 60 * 1000);
  const now = new Date();

  if (reminderTime <= now) return;

  const delay = reminderTime.getTime() - now.getTime();
  const key = `borrow-reminder-${borrow.id}`;

  // Clear existing timeout if any
  const existingTimeout = (window as any)[key];
  if (existingTimeout) clearTimeout(existingTimeout);

  // Schedule notification (works while page is open)
  (window as any)[key] = setTimeout(() => {
    new Notification('Book Due Soon', {
      body: `Your borrowed book should be returned in the next 2 days.`,
      icon: '/icon-192.png',
    });
  }, delay);
}

export function cancelReminder(borrowId: number) {
  const key = `borrow-reminder-${borrowId}`;
  const timeout = (window as any)[key];
  if (timeout) {
    clearTimeout(timeout);
    delete (window as any)[key];
  }
}

// Register service worker for background notifications
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
}

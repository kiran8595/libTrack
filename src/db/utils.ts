import type { Borrow } from './database';

export function getEffectiveDueDate(borrow: Borrow): Date {
  if (borrow.isReturned) return borrow.dueDate;
  let currentDue = new Date(borrow.dueDate);
  const now = new Date();
  let renewals = 0;

  while (renewals < borrow.maxRenewals && now > currentDue) {
    currentDue = new Date(currentDue.getTime() + 21 * 24 * 60 * 60 * 1000);
    renewals++;
  }
  return currentDue;
}

export function getExtensionsUsed(borrow: Borrow): number {
  if (borrow.isReturned) return 0;
  let currentDue = new Date(borrow.dueDate);
  const now = new Date();
  let extensions = 0;

  while (extensions < borrow.maxRenewals && now > currentDue) {
    extensions++;
    currentDue = new Date(currentDue.getTime() + 21 * 24 * 60 * 60 * 1000);
  }
  return extensions;
}

export function getDaysUntilDue(borrow: Borrow): number {
  const effectiveDue = getEffectiveDueDate(borrow);
  const now = new Date();
  return Math.ceil((effectiveDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function isOverdue(borrow: Borrow): boolean {
  if (borrow.isReturned) return false;
  return getEffectiveDueDate(borrow) < new Date();
}

export function getWeeksOnHold(holdDate: Date): number {
  const days = Math.floor((new Date().getTime() - new Date(holdDate).getTime()) / (1000 * 60 * 60 * 24));
  return Math.floor(days / 7);
}

export function getDaysOnHold(holdDate: Date): number {
  return Math.floor((new Date().getTime() - new Date(holdDate).getTime()) / (1000 * 60 * 60 * 24));
}

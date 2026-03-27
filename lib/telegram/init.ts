'use client'

import { init, isTMA, retrieveLaunchParams } from '@telegram-apps/sdk'

/**
 * Initializes the Telegram Mini App SDK.
 * Must be called on the client side only.
 *
 * @returns true if running inside a Telegram Mini App, false otherwise
 */
export function initTelegram(): boolean {
  if (typeof window === 'undefined') return false

  try {
    init()
    // isTMA() may return a CancelablePromise in some versions; coerce to boolean sync check
    const result = isTMA() as any
    return typeof result === 'boolean' ? result : true
  } catch {
    return false
  }
}

/**
 * Returns the Telegram user object from launch params, or null if unavailable.
 * Safe to call even outside Telegram context.
 */
export function getTelegramUser() {
  try {
    const { initData } = retrieveLaunchParams()
    return initData?.user ?? null
  } catch {
    return null
  }
}

/**
 * Returns the raw initData string (for server-side verification).
 */
export function getTelegramInitDataRaw(): string | null {
  try {
    const { initDataRaw } = retrieveLaunchParams()
    return initDataRaw ?? null
  } catch {
    return null
  }
}

/**
 * Expands the Telegram Mini App to full height.
 * No-ops outside of Telegram context.
 */
export function expandTelegramApp(): void {
  if (typeof window === 'undefined') return
  try {
    // Access the raw window.Telegram object if SDK expand is not available
    const tg = (window as typeof window & { Telegram?: { WebApp?: { expand?: () => void } } })
      .Telegram
    if (tg?.WebApp?.expand) {
      tg.WebApp.expand()
    }
  } catch {
    // Not in Telegram, safe to ignore
  }
}

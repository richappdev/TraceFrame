"use client";

import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  getAnalytics,
  isSupported,
  logEvent,
  type Analytics,
} from "firebase/analytics";

export const ANALYTICS_CONSENT_KEY = "anipins-analytics-consent";
const LEGACY_ANALYTICS_CONSENT_KEY = "traceframe-analytics-consent";

export type AnalyticsEventName =
  | "anitabi_map_click"
  | "curated_trip_impression"
  | "curated_trip_view"
  | "trip_copy_started"
  | "trip_create_started"
  | "trip_saved"
  | "trip_shared"
  | "trip_view";

export type AnalyticsParameters = Record<string, string | number | boolean>;

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

let analyticsPromise: Promise<Analytics | null> | null = null;
let pendingEvents: Array<{
  eventName: AnalyticsEventName;
  parameters: AnalyticsParameters;
}> = [];

export function hasAnalyticsConfig(config: FirebaseOptions = firebaseConfig): boolean {
  return Boolean(config.apiKey && config.appId && config.measurementId && config.projectId);
}

function readAnalyticsConsent(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ANALYTICS_CONSENT_KEY)
    ?? window.localStorage.getItem(LEGACY_ANALYTICS_CONSENT_KEY);
}

export function hasAnalyticsConsent(): boolean {
  return readAnalyticsConsent() === "granted";
}

/** True when the visitor already chose grant or deny (including legacy key). */
export function hasAnalyticsConsentDecision(): boolean {
  return readAnalyticsConsent() != null;
}

async function initializeAnalytics(): Promise<Analytics | null> {
  if (!hasAnalyticsConfig() || !hasAnalyticsConsent() || !(await isSupported())) {
    return null;
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getAnalytics(app);
}

export function getBrowserAnalytics(): Promise<Analytics | null> {
  analyticsPromise ??= initializeAnalytics().catch((error: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Firebase Analytics could not be initialized", error);
    }
    return null;
  });
  return analyticsPromise;
}

export function resetAnalyticsInitialization(): void {
  analyticsPromise = null;
}

export function setAnalyticsConsent(value: "granted" | "denied"): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  window.localStorage.removeItem(LEGACY_ANALYTICS_CONSENT_KEY);
  resetAnalyticsInitialization();

  if (value === "denied") {
    pendingEvents = [];
    return;
  }

  const events = pendingEvents;
  pendingEvents = [];
  for (const event of events) trackEvent(event.eventName, event.parameters);
}

export function trackEvent(
  eventName: AnalyticsEventName,
  parameters: AnalyticsParameters = {},
): void {
  if (!hasAnalyticsConfig() || typeof window === "undefined") return;
  const consent = readAnalyticsConsent();
  if (consent === "denied") return;
  if (consent !== "granted") {
    pendingEvents = [...pendingEvents.slice(-49), { eventName, parameters }];
    return;
  }
  void getBrowserAnalytics().then((analytics) => {
    if (analytics) logEvent(analytics, eventName, parameters);
  });
}

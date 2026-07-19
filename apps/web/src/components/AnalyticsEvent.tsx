"use client";

import { useEffect, type ReactNode } from "react";
import {
  trackEvent,
  type AnalyticsEventName,
  type AnalyticsParameters,
} from "@/lib/analytics";

export function AnalyticsEvent({
  name,
  parameters,
}: {
  name: AnalyticsEventName;
  parameters?: AnalyticsParameters;
}) {
  const serialized = JSON.stringify(parameters ?? {});
  useEffect(() => {
    trackEvent(name, JSON.parse(serialized) as AnalyticsParameters);
  }, [name, serialized]);
  return null;
}

export function AnalyticsLink({
  eventName,
  eventParameters,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  eventName: AnalyticsEventName;
  eventParameters?: AnalyticsParameters;
  children: ReactNode;
}) {
  return (
    <a
      {...props}
      onClick={(event) => {
        trackEvent(eventName, eventParameters);
        props.onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}

export function TrackedTripForm({ children }: { children: ReactNode }) {
  return (
    <form
      className="trip-form"
      action="/api/trips"
      method="post"
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        trackEvent("trip_create_started", {
          day_count: Number(data.get("dayCount") ?? 0),
          subject_count: data.getAll("subjectId").length,
        });
      }}
    >
      {children}
    </form>
  );
}

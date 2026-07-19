"use client";

import { useEffect, useRef, type ReactNode } from "react";
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

export function TrackedTripForm({
  children,
  templateId,
}: {
  children: ReactNode;
  templateId?: string;
}) {
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
          ...(templateId ? { template_id: templateId } : {}),
        });
      }}
    >
      {children}
    </form>
  );
}

export function AnalyticsImpression({
  name,
  parameters,
  className,
  children,
}: {
  name: AnalyticsEventName;
  parameters?: AnalyticsParameters;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const tracked = useRef(false);
  const serialized = JSON.stringify(parameters ?? {});

  useEffect(() => {
    const element = ref.current;
    if (!element || tracked.current) return;
    const send = () => {
      if (tracked.current) return;
      tracked.current = true;
      trackEvent(name, JSON.parse(serialized) as AnalyticsParameters);
    };
    if (!("IntersectionObserver" in window)) {
      send();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          send();
          observer.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [name, serialized]);

  return <div ref={ref} className={className}>{children}</div>;
}

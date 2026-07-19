"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { trackEvent } from "@/lib/analytics";
import {
  moveTitle,
  swapDays,
  type EditableDay,
} from "@/lib/trip-edit";
import type { HydratedTrip } from "@/lib/trips";
import { getCopy, localePath, localizedTitle, localizeCity, type Locale } from "@/lib/i18n";

export function TripEditor({
  trip,
  locale,
  justCreated = false,
}: {
  trip: HydratedTrip;
  locale: Locale;
  justCreated?: boolean;
}) {
  const c = getCopy(locale);
  const [title, setTitle] = useState(trip.title);
  const [days, setDays] = useState<EditableDay[]>(trip.days);
  const [shareToken, setShareToken] = useState(trip.shareToken);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sharePath = shareToken ? localePath(locale, `/t/${shareToken}`) : null;

  useEffect(() => {
    trackEvent("trip_view", {
      trip_id: trip.id,
      view_type: "owner",
      duration_days: trip.days.length,
      subject_count: trip.subjectIds.length,
    });
    if (justCreated) {
      trackEvent("trip_saved", {
        trip_id: trip.id,
        duration_days: trip.days.length,
        subject_count: trip.subjectIds.length,
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("created");
      window.history.replaceState(window.history.state, "", url);
    }
  }, [justCreated, trip.days.length, trip.id, trip.subjectIds.length]);

  function updateShare(shareAction: "rotate" | "revoke") {
    startTransition(async () => {
      setStatus(null);
      try {
        const res = await fetch(`/api/trips/${trip.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ shareAction }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          trip?: HydratedTrip;
        };
        if (!res.ok || !body.trip) {
          setStatus(body.error ?? `${c.editor.shareFailed} (${res.status})`);
          return;
        }
        setShareToken(body.trip.shareToken);
        setStatus(shareAction === "revoke" ? c.editor.revoked : c.editor.generated);
        if (shareAction === "rotate") {
          trackEvent("trip_shared", { trip_id: trip.id, share_action: "link_created" });
        }
      } catch {
        setStatus(c.editor.network);
      }
    });
  }

  function save(nextTitle: string, nextDays: EditableDay[]) {
    startTransition(async () => {
      setStatus(null);
      try {
        const res = await fetch(`/api/trips/${trip.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            title: nextTitle,
            days: nextDays.map((d, i) => ({
              day: i + 1,
              city: d.city,
              subjectIds: d.titles.map((t) => t.subjectId),
            })),
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setStatus(body.error ?? `${c.editor.saveFailed} (${res.status})`);
          return;
        }
        const body = (await res.json()) as { trip: HydratedTrip };
        setTitle(body.trip.title);
        setDays(body.trip.days);
        setStatus(c.editor.saved);
        trackEvent("trip_saved", {
          trip_id: trip.id,
          duration_days: body.trip.days.length,
          subject_count: body.trip.subjectIds.length,
        });
      } catch {
        setStatus(c.editor.network);
      }
    });
  }

  return (
    <section>
      <div className="hero" style={{ marginBottom: "1.5rem" }}>
        <h1>{c.editor.title}</h1>
        <p>
          {days.length} {c.common.days} · {days.reduce((n, d) => n + d.titles.length, 0)} {c.common.works} · {c.editor.instruction}
        </p>
        <div className="cta-row">
          <Link className="btn" href={localePath(locale, "/trips")}>
            {c.editor.myTrips}
          </Link>
          <Link className="btn" href={localePath(locale, "/trips/new")}>
            {c.editor.another}
          </Link>
          {sharePath ? (
            <Link
              className="btn"
              href={sharePath}
              target="_blank"
              onClick={() => trackEvent("trip_shared", { trip_id: trip.id, share_action: "open_link" })}
            >
              {c.editor.openShare}
            </Link>
          ) : null}
        </div>
      </div>

      {sharePath ? (
        <div className="share-box">
          {c.editor.readonly}: <Link href={sharePath}>{sharePath}</Link>
          <div className="cta-row" style={{ marginTop: "0.75rem" }}>
            <button
              className="btn btn-tiny"
              type="button"
              disabled={pending}
              onClick={() => updateShare("rotate")}
            >
              {c.editor.rotate}
            </button>
            <button
              className="btn btn-tiny"
              type="button"
              disabled={pending}
              onClick={() => updateShare("revoke")}
            >
              {c.editor.revoke}
            </button>
          </div>
        </div>
      ) : (
        <div className="share-box">
          {c.editor.private}
          <button
            className="btn btn-tiny"
            style={{ marginLeft: "0.75rem" }}
            type="button"
            disabled={pending}
            onClick={() => updateShare("rotate")}
          >
            {c.editor.createShare}
          </button>
        </div>
      )}

      <div className="trip-form" style={{ marginBottom: "1.5rem" }}>
        <label className="field">
          {c.editor.tripTitle}
          <input
            type="text"
            value={title}
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div className="cta-row">
          <button
            className="btn btn-primary"
            type="button"
            disabled={pending}
            onClick={() => save(title.trim() || c.editor.defaultTitle, days)}
          >
            {pending ? c.editor.saving : c.editor.save}
          </button>
          {status ? <span className="empty">{status}</span> : null}
        </div>
      </div>

      {days.map((day, dayIndex) => (
        <div key={`day-${day.day}-${dayIndex}`} className="trip-day">
          <div className="trip-day-head">
            <h3>
              Day {dayIndex + 1} · {localizeCity(day.city, locale) || c.common.unmappedCity}
            </h3>
            <div className="reorder-actions">
              <button
                className="btn btn-tiny"
                type="button"
                disabled={dayIndex === 0 || pending}
                onClick={() => setDays(swapDays(days, dayIndex, dayIndex - 1))}
              >
                {c.editor.upDay}
              </button>
              <button
                className="btn btn-tiny"
                type="button"
                disabled={dayIndex >= days.length - 1 || pending}
                onClick={() => setDays(swapDays(days, dayIndex, dayIndex + 1))}
              >
                {c.editor.downDay}
              </button>
            </div>
          </div>
          <ul className="lib-list">
            {day.titles.map((t, titleIndex) => (
              <li key={t.subjectId} className="lib-item">
                <div>
                  <strong>{localizedTitle({ ...t, subjectId: t.subjectId }, locale)}</strong>
                  <div className="meta">
                    {localizeCity(t.city || "", locale) || "—"} · {t.pointsLength} {c.common.points}
                  </div>
                </div>
                <div className="lib-actions">
                  <div className="reorder-actions">
                    <button
                      className="btn btn-tiny"
                      type="button"
                      disabled={(dayIndex === 0 && titleIndex === 0) || pending}
                      onClick={() => {
                        if (titleIndex > 0) {
                          setDays(
                            moveTitle(days, dayIndex, titleIndex, dayIndex, titleIndex - 1),
                          );
                        } else {
                          setDays(
                            moveTitle(
                              days,
                              dayIndex,
                              titleIndex,
                              dayIndex - 1,
                              days[dayIndex - 1]!.titles.length,
                            ),
                          );
                        }
                      }}
                    >
                      ↑
                    </button>
                    <button
                      className="btn btn-tiny"
                      type="button"
                      disabled={
                        (dayIndex === days.length - 1 &&
                          titleIndex === day.titles.length - 1) ||
                        pending
                      }
                      onClick={() => {
                        if (titleIndex < day.titles.length - 1) {
                          setDays(
                            moveTitle(days, dayIndex, titleIndex, dayIndex, titleIndex + 1),
                          );
                        } else {
                          setDays(moveTitle(days, dayIndex, titleIndex, dayIndex + 1, 0));
                        }
                      }}
                    >
                      ↓
                    </button>
                  </div>
                  <a
                    href={t.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent("anitabi_map_click", {
                      trip_id: trip.id,
                      subject_id: String(t.subjectId),
                      source: "trip_editor",
                    })}
                  >
                    {c.common.map}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

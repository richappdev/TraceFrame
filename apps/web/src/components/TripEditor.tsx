"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  moveTitle,
  swapDays,
  type EditableDay,
} from "@/lib/trip-edit";
import type { HydratedTrip } from "@/lib/trips";

export function TripEditor({ trip }: { trip: HydratedTrip }) {
  const [title, setTitle] = useState(trip.title);
  const [days, setDays] = useState<EditableDay[]>(trip.days);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sharePath = trip.shareToken ? `/t/${trip.shareToken}` : null;

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
          setStatus(body.error ?? `保存失败 (${res.status})`);
          return;
        }
        const body = (await res.json()) as { trip: HydratedTrip };
        setTitle(body.trip.title);
        setDays(body.trip.days);
        setStatus("已保存");
      } catch {
        setStatus("网络错误，请重试");
      }
    });
  }

  return (
    <section>
      <div className="hero" style={{ marginBottom: "1.5rem" }}>
        <h1>编辑行程</h1>
        <p>
          {days.length} 天 · {days.reduce((n, d) => n + d.titles.length, 0)} 部作品 ·
          调整顺序后点保存
        </p>
        <div className="cta-row">
          <Link className="btn" href="/trips">
            我的行程
          </Link>
          <Link className="btn" href="/trips/new">
            再规划一份
          </Link>
          {sharePath ? (
            <Link className="btn" href={sharePath} target="_blank">
              打开分享页
            </Link>
          ) : null}
        </div>
      </div>

      {sharePath ? (
        <div className="share-box">
          只读分享： <Link href={sharePath}>{sharePath}</Link>
        </div>
      ) : null}

      <div className="trip-form" style={{ marginBottom: "1.5rem" }}>
        <label className="field">
          行程标题
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
            onClick={() => save(title.trim() || "我的巡礼行程", days)}
          >
            {pending ? "保存中…" : "保存修改"}
          </button>
          {status ? <span className="empty">{status}</span> : null}
        </div>
      </div>

      {days.map((day, dayIndex) => (
        <div key={`day-${day.day}-${dayIndex}`} className="trip-day">
          <div className="trip-day-head">
            <h3>
              Day {dayIndex + 1} · {day.city || "未标注城市"}
            </h3>
            <div className="reorder-actions">
              <button
                className="btn btn-tiny"
                type="button"
                disabled={dayIndex === 0 || pending}
                onClick={() => setDays(swapDays(days, dayIndex, dayIndex - 1))}
              >
                上移天
              </button>
              <button
                className="btn btn-tiny"
                type="button"
                disabled={dayIndex >= days.length - 1 || pending}
                onClick={() => setDays(swapDays(days, dayIndex, dayIndex + 1))}
              >
                下移天
              </button>
            </div>
          </div>
          <ul className="lib-list">
            {day.titles.map((t, titleIndex) => (
              <li key={t.subjectId} className="lib-item">
                <div>
                  <strong>{t.titleCn || t.title || `#${t.subjectId}`}</strong>
                  <div className="meta">
                    {t.city || "—"} · {t.pointsLength} points
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
                  <a href={t.mapUrl} target="_blank" rel="noopener noreferrer">
                    Anitabi 地图
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

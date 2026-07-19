import Link from "next/link";
import { notFound } from "next/navigation";
import { TripEditor } from "@/components/TripEditor";
import { getSession } from "@/lib/auth";
import { openAppStore } from "@/lib/db";
import { hydrateTrip } from "@/lib/trips";
import { getCopy, localePath } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function TripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const locale = await getLocale();
  const c = getCopy(locale);
  const session = await getSession();
  const store = openAppStore();
  const trip = await store.getTrip(id);
  await store.close();

  if (!trip) notFound();
  if (!session?.user || session.user.id !== trip.ownerId) {
    if (trip.shareToken) {
      return (
        <section className="hero">
          <h1>{c.access.title}</h1>
          <p>{c.access.body}</p>
          <div className="cta-row">
            <Link className="btn btn-primary" href={localePath(locale, `/t/${trip.shareToken}`)}>
              {c.access.open}
            </Link>
            <Link className="btn" href={`/api/auth/bangumi?locale=${locale}`}>
              {c.access.login}
            </Link>
          </div>
        </section>
      );
    }
    notFound();
  }

  return <TripEditor trip={hydrateTrip(trip)} locale={locale} justCreated={created === "1"} />;
}

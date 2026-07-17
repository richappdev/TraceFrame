import Link from "next/link";
import { notFound } from "next/navigation";
import { TripEditor } from "@/components/TripEditor";
import { getSession } from "@/lib/auth";
import { openAppStore } from "@/lib/db";
import { hydrateTrip } from "@/lib/trips";

export const dynamic = "force-dynamic";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const store = openAppStore();
  const trip = store.getTrip(id);
  store.close();

  if (!trip) notFound();
  if (!session?.user || session.user.id !== trip.ownerId) {
    if (trip.shareToken) {
      return (
        <section className="hero">
          <h1>需要访问权限</h1>
          <p>此行程仅所有者可编辑。若你有分享链接，请打开只读分享页。</p>
          <div className="cta-row">
            <Link className="btn btn-primary" href={`/t/${trip.shareToken}`}>
              打开分享页
            </Link>
            <Link className="btn" href="/api/auth/bangumi">
              登录
            </Link>
          </div>
        </section>
      );
    }
    notFound();
  }

  return <TripEditor trip={hydrateTrip(trip)} />;
}

import type { Metadata } from "next";
import { getCopy } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const c = getCopy(locale).policyPage;
  return buildPageMetadata({
    locale,
    path: "/data-policy",
    title: c.title,
    description: c.p1,
  });
}

export default async function DataPolicyPage() {
  const c = getCopy(await getLocale()).policyPage;
  return (
    <section className="hero">
      <h1>{c.title}</h1>
      <p>{c.p1}</p>
      <p>{c.p2}</p>
      <p>{c.p3}</p>
    </section>
  );
}

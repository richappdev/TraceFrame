import { getCopy } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

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

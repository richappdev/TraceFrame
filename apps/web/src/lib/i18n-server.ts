import { headers } from "next/headers";
import { defaultLocale, isLocale, type Locale } from "./i18n";

export async function getLocale(): Promise<Locale> {
  const value = (await headers()).get("x-traceframe-locale");
  return isLocale(value) ? value : defaultLocale;
}

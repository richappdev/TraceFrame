import path from "node:path";
import { AppStore } from "./app-store";

export function getAppDbPath(): string {
  if (process.env.APP_DB) return process.env.APP_DB;
  return path.resolve(process.cwd(), "../../data/app.sqlite");
}

export function openAppStore(): AppStore {
  return new AppStore(getAppDbPath());
}

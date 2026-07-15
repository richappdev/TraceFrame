import path from "node:path";
import { AppStore } from "./app-store";
import { getDataDir } from "./paths";

export function getAppDbPath(): string {
  if (process.env.APP_DB) return process.env.APP_DB;
  return path.join(getDataDir(), "app.sqlite");
}

export function openAppStore(): AppStore {
  return new AppStore(getAppDbPath());
}

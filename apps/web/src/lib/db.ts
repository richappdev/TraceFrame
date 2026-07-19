import path from "node:path";
import { AppStore } from "./app-store";
import type { AppStoreBackend } from "./app-store-backend";
import { FirestoreAppStore } from "./firestore-app-store";
import { getDataDir } from "./paths";

export function getAppDbPath(): string {
  if (process.env.APP_DB) return process.env.APP_DB;
  return path.join(getDataDir(), "app.sqlite");
}

class SqliteAppStoreAdapter implements AppStoreBackend {
  constructor(private readonly store: AppStore) {}

  async healthCheck() { this.store.getUser("__health__"); }

  async upsertUser(...args: Parameters<AppStore["upsertUser"]>) { this.store.upsertUser(...args); }
  async getUser(...args: Parameters<AppStore["getUser"]>) { return this.store.getUser(...args); }
  async replaceLibrary(...args: Parameters<AppStore["replaceLibrary"]>) { this.store.replaceLibrary(...args); }
  async listLibrary(...args: Parameters<AppStore["listLibrary"]>) { return this.store.listLibrary(...args); }
  async createTrip(...args: Parameters<AppStore["createTrip"]>) { this.store.createTrip(...args); }
  async getTrip(...args: Parameters<AppStore["getTrip"]>) { return this.store.getTrip(...args); }
  async getTripByShareToken(...args: Parameters<AppStore["getTripByShareToken"]>) { return this.store.getTripByShareToken(...args); }
  async listTrips(...args: Parameters<AppStore["listTrips"]>) { return this.store.listTrips(...args); }
  async updateTrip(...args: Parameters<AppStore["updateTrip"]>) { return this.store.updateTrip(...args); }
  async deleteUserData(...args: Parameters<AppStore["deleteUserData"]>) { this.store.deleteUserData(...args); }
  close() { this.store.close(); }
}

export function openAppStore(): AppStoreBackend {
  if (process.env.APP_STORE === "firestore") return new FirestoreAppStore();
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_STORE=firestore is required in production; SQLite is ephemeral");
  }
  return new SqliteAppStoreAdapter(new AppStore(getAppDbPath()));
}

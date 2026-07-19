import type { LibraryItemRow, TripRow, UserRow } from "./app-store";

export interface TripPatch {
  title?: string;
  daysJson?: string;
  subjectIdsJson?: string;
  shareToken?: string | null;
  updatedAt: string;
}

export interface AppStoreBackend {
  healthCheck(): Promise<void>;
  upsertUser(user: UserRow): Promise<void>;
  getUser(id: string): Promise<UserRow | null>;
  replaceLibrary(userId: string, items: LibraryItemRow[]): Promise<void>;
  listLibrary(userId: string): Promise<LibraryItemRow[]>;
  createTrip(trip: TripRow): Promise<void>;
  getTrip(id: string): Promise<TripRow | null>;
  getTripByShareToken(token: string): Promise<TripRow | null>;
  listTrips(ownerId: string): Promise<TripRow[]>;
  updateTrip(id: string, patch: TripPatch): Promise<boolean>;
  deleteUserData(userId: string): Promise<void>;
  close(): void | Promise<void>;
}

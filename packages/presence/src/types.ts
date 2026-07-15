export interface PresenceRecord {
  subjectId: number;
  title: string;
  titleCn: string;
  city: string;
  lat: number | null;
  lng: number | null;
  pointsLength: number;
  imagesLength: number;
  coverUrl: string | null;
  color: string | null;
  verifiedAt: string;
  sourceRun: string | null;
  httpStatus: number | null;
  notes: string | null;
}

export interface PresenceCsvRow {
  id: string;
  cn?: string;
  title?: string;
  city?: string;
  pointsLength?: string;
  imagesLength?: string;
  probeNode?: string;
  firstSeenAt?: string;
  lastVerifiedAt?: string;
  sourceRun?: string;
  httpStatus?: string;
  notes?: string;
  coverUrl?: string;
  color?: string;
  lat?: string;
  lng?: string;
}

export interface CityCoverageStat {
  city: string;
  titleCount: number;
  totalPoints: number;
  subjectIds: number[];
}

export interface CoverageReport {
  generatedAt: string;
  seedCount: number;
  mappedSeedCount: number;
  bangumiTopN: number;
  bangumiTopFetched: number;
  mappedInTopN: number;
  mappedPctOfTopN: number;
  topCities: CityCoverageStat[];
  mappedSeedIds: number[];
  unmappedTopIds: number[];
  overlapIds: number[];
}

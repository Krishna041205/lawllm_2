import { CourtSource } from "./CourtSource.js";
import { SCIDailySource } from "./sources/SCIDailySource.js";
import { DHCCommercialSource } from "./sources/DHCCommercialSource.js";
import { BHCCommercialSource } from "./sources/BHCCommercialSource.js";
import { AWSOpenDataSource } from "./sources/AWSOpenDataSource.js";

export class CourtSourceRegistry {
  private sources: Map<string, CourtSource> = new Map();

  constructor() {
    this.register(new SCIDailySource());
    this.register(new DHCCommercialSource());
    this.register(new BHCCommercialSource());
    this.register(new AWSOpenDataSource());
  }

  register(source: CourtSource): void {
    this.sources.set(source.id, source);
  }

  getSource(id: string): CourtSource | undefined {
    return this.sources.get(id);
  }

  getAllSources(): CourtSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * Find sources matching a given court identifier (e.g. "SCI", "DHC", "ALL")
   */
  getSourcesForCourt(court: string): CourtSource[] {
    const cleanCourt = (court || "ALL").toUpperCase();
    if (cleanCourt === "ALL") {
      return this.getAllSources();
    }
    return this.getAllSources().filter((s) => s.supports(cleanCourt));
  }
}

export const defaultCourtSourceRegistry = new CourtSourceRegistry();

export type LifeModule = "work" | "life" | "study" | "outfit" | "review";
export type TaskPriority = "high" | "medium" | "low";
export type WorkProjectStatus = "active" | "completed" | "archived";
export type TravelStatus = "wishlist" | "planning" | "traveling" | "completed";

export interface WorkProject {
  id: string;
  name: string;
  status: WorkProjectStatus;
  startDate: string;
  endDate: string;
  goal: string;
  notes: string;
}

export interface WorkSkill {
  id: string;
  name: string;
  category: string;
  currentLevel: number;
  targetLevel: number;
  nextAction: string;
  linkedProjectId: string;
}

export interface TravelTrip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: TravelStatus;
  budget: number | null;
  notes: string;
  packingItemIds: string[];
}

export interface TravelItineraryEntry {
  id: string;
  tripId: string;
  date: string;
  time: string;
  title: string;
  location: string;
  notes: string;
  done: boolean;
}

export interface OutfitTemplate {
  id: string;
  name: string;
  itemIds: string[];
  season: string;
  occasion: string;
  notes: string;
  createdAt: string;
}

export interface OutfitLog {
  id: string;
  date: string;
  templateId: string;
  itemIds: string[];
  occasion: string;
  weather: string;
  notes: string;
  createdAt: string;
}

export interface LifeTask {
  id: string;
  title: string;
  module: LifeModule;
  date: string;
  dueDate: string;
  priority: TaskPriority;
  progress: number;
  time: string;
  location: string;
  important: boolean;
  done: boolean;
  projectId: string;
}

export interface LifeEvent {
  id: string;
  title: string;
  module: LifeModule;
  date: string;
  time: string;
  location: string;
}

export interface DailyRecord {
  id: string;
  title: string;
  module: LifeModule;
  date: string;
  time: string;
  durationMinutes: number | null;
  content: string;
  linkedTaskId: string;
  linkedEventId: string;
  linkedTripId: string;
  mood: string;
  location: string;
  tags: string[];
  createdAt: string;
}

export interface ReviewEntry {
  id: string;
  period: string;
  highlight: string;
  reflection: string;
  nextFocus: string;
  createdAt: string;
}

export interface LifeSystemSnapshot {
  version: 1;
  tasks: LifeTask[];
  events: LifeEvent[];
  records: DailyRecord[];
  reviews: ReviewEntry[];
  projects: WorkProject[];
  skills: WorkSkill[];
  trips: TravelTrip[];
  itineraries: TravelItineraryEntry[];
  outfitTemplates: OutfitTemplate[];
  outfitLogs: OutfitLog[];
}

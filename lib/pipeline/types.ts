export type PhaseStatus = "working" | "awaiting_input" | "revising" | "complete";

export interface ProfilingColumn {
  name: string;
  type: string;
  category: string;
  nullPct: number;
  unique: number | null;
  sample: string;
}

export interface ProfilingFinding {
  type: string;
  message: string;
  severity: "high" | "medium" | "low";
}

export interface Profiling {
  columns: ProfilingColumn[];
  progress: number;
  findings: ProfilingFinding[];
}

export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  description: string;
}

export interface Schema {
  proposed: SchemaColumn[];
  reasoning: string;
}

export interface ValidationCheck {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export type ValidationSampleRow = Record<string, string | number | boolean>;

export interface Validation {
  sampleSize: number;
  totalRows: number;
  sample: ValidationSampleRow[];
  checks: ValidationCheck[];
}

export interface VerificationQuery {
  title: string;
  sql: string;
  result: Record<string, unknown> | Array<Record<string, unknown>>;
  status: "pass" | "fail";
}

export interface Verification {
  queries: VerificationQuery[];
}

export interface PipelineFile {
  name: string;
  type: "sql" | "python" | "md";
  content: string;
  active?: boolean;
}

export interface Workstream {
  id: string;
  title: string;
  source: string;
  target: string;
  phaseIndex: number;
  phaseStatus: PhaseStatus;
  created: string;
  description: string;
  files: PipelineFile[];
  profiling?: Profiling;
  schema?: Schema;
  validation?: Validation;
  verification?: Verification;
}

export type FeedItemType =
  | "schema_approval"
  | "validation_approval"
  | "pii_detection"
  | "verification_complete"
  | "context_question";

export interface FeedItem {
  id: string;
  workstreamId: string;
  wsTitle: string;
  type: FeedItemType;
  critical: boolean;
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  autoProceeds?: boolean;
  autoTimer?: string;
  options?: string[];
}

export interface PipelineItem {
  id: string;
  name: string;
  schedule: string;
  lastRun: string;
  lastStatus: "success" | "failed";
  nextRun: string;
  rows: number;
  wsId: string | null;
  freshness: string;
}

export interface QueryResult {
  columns: string[];
  rows: (string | number)[][];
  rowCount: number;
  elapsed: string;
}

export interface AgentMessage {
  role: "user" | "agent";
  text: string;
}

export interface ModalState {
  title: string;
  required: boolean;
  submitLabel: string;
  submitColor?: string;
  onSubmit: (text: string) => void;
}

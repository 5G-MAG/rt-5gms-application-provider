export interface ReceptionReport {
  contentURI: string;
  clientID?: string;
  qoeReports?: QoeReport[]; // Zero or more QoE reports
}

export interface QoeReport {
  periodID: string;
  reportTime: Date; // Assuming you want to use JavaScript Date objects
  reportPeriod: number;
  qoeMetrics: QoeMetric[]; // One or more QoE metrics
}

export type QoeMetric = HttpList | RepSwitchList | AvgThroughput[] | number | BufferLevel | PlayList | MpdInformation[] ;

export interface HttpList {
  httpListEntries?: HttpListEntry[];
}

export interface HttpListEntry {
  tcpid?: number;
  type?: ExtensibleHttpEntryResourceType;
  url: string;
  actualUrl?: string;
  range?: string;
  trequest: Date;
  tresponse: Date;
  responsecode?: number;
  interval?: number;
  traces?: HttpThroughputTrace[];
}

export interface HttpThroughputTrace {
  s: Date;
  d: number;
  b: number[]; 
}

export interface RepSwitchList {
  repSwitchEvents?: RepSwitchEvent[];
}

export interface RepSwitchEvent {
  to: string;
  mt?: number;
  t?: Date;
}

export interface AvgThroughput {
  numBytes: number;
  activityTime: number;
  t: Date;
  duration: number;
  accessbearer?: string;
  inactivityType?: InactivityType;
}

export interface BufferLevel {
  bufferLevelEntries?: BufferLevelEntry[];
}

export interface BufferLevelEntry {
  t: Date;
  level: number;
}

export interface PlayList {
  traces?: PlayListEntry[];
}

export interface PlayListEntry {
  start: Date;
  mstart: number;
  startType: StartType;
  traceEntries?: PlayListTraceEntry[];
}

export interface PlayListTraceEntry {
  representationId?: string;
  subrepLevel?: number;
  start: Date;
  mstart: number;
  duration: number;
  playbackSpeed?: number;
  stopReason?: StopReasonType;
  stopReasonOther?: string;
}

export interface MpdInformation {
  representationId: string;
  subrepLevel?: number;
  mpdinfos?: Representation[];
}

export interface Representation {
  codecs: string;
  bandwidth: number;
  qualityRanking?: number;
  frameRate?: number;
  width?: number;
  height?: number;
  mimeType: string;
}

export enum HttpEntryResourceType {
  MPD = "MPD",
  MPDDeltaFile = "MPDDeltaFile",
  XLinkExpansion = "XLinkExpansion",
  InitializationSegment = "InitializationSegment",
  IndexSegment = "IndexSegment",
  MediaSegment = "MediaSegment"
}

export type ExtensibleHttpEntryResourceType = HttpEntryResourceType | `x:${string}`;
export enum InactivityType {
  Pause = "Pause",
  BufferControl = "BufferControl",
  Error = "Error"
}

export enum StartType {
  NewPlayoutRequest = "NewPlayoutRequest",
  Resume = "Resume",
  OtherUserRequest = "OtherUserRequest",
  StartOfMetricsCollectionPeriod = "StartOfMetricsCollectionPeriod"
}

export enum StopReasonType {
  RepresentationSwitch = "RepresentationSwitch",
  Rebuffering = "Rebuffering",
  UserRequest = "UserRequest",
  EndOfPeriod = "EndOfPeriod",
  EndOfContent = "EndOfContent",
  EndOfMetricsCollectionPeriod = "EndOfMetricsCollectionPeriod",
  Failure = "Failure",
  Other = "Other"
}

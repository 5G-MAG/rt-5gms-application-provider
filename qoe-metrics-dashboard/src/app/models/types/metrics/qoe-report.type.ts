export interface QoeMetric {
    BufferLevel?: BufferLevel;
    HttpList?: HttpList;
    MPDInformation?: MPDInformation[];
    RepSwitchList?: RepSwitchList;
}

export interface RepSwitchList {
    RepSwitchEvent: RepSwitchEvent[];
}

export interface RepSwitchEvent {
    mt: string;
    t: string;
    to: string;
}

export interface MPDInformation {
    representationId: string;
    Mpdinfo: Mpdinfo;
}

export interface Mpdinfo {
    bandwidth: string;
    codecs: string;
    mimeType: string;
    frameRate?: string;
    height?: string;
    width?: string;
}

export interface HttpList {
    HttpListEntry: HttpListEntry[];
}

export interface HttpListEntry {
    actualurl: string;
    interval: string;
    range: string;
    responsecode: string;
    trequest: string;
    tresponse: string;
    type: string;
    url: string;
    Trace: Trace;
}

export interface Trace {
    b: string;
    d: string;
    s: string;
}

export interface BufferLevel {
    BufferLevelEntry: BufferLevelEntry[];
}

export interface BufferLevelEntry {
    level: string;
    t: string;
}

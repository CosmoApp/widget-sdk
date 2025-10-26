export interface CalendarSource {
  title: string;
  identifier: string;
}

export interface CalendarInfo {
  title: string;
  identifier: string;
  source: CalendarSource;
  allowsModifications: boolean;
  colorHex: string;
  type: string; // EKCalendarType string: local, calDAV, exchange, etc.
}
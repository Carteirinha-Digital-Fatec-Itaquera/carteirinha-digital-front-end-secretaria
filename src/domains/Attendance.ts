import type { CheckpointType } from './Checkpoint';
import type { IsoDateTime, Uuid } from './Event';

export type AttendanceStatus = 'CHECKED_IN' | 'CONFIRMED';

export interface AttendanceScanRequest {
  qrToken: string;
}

export interface AttendanceScanSuccess {
  success: true;
  type: CheckpointType;
  eventTitle: string;
  timestamp: IsoDateTime;
  status: AttendanceStatus;
  message: string;
}

export interface AttendanceScanDuplicate {
  success: false;
  code: 'ALREADY_CHECKED_IN' | 'ALREADY_CHECKED_OUT';
  message: string;
  timestamp: IsoDateTime;
}

export type AttendanceScanResponse =
  | AttendanceScanSuccess
  | AttendanceScanDuplicate;

export interface AttendanceView {
  id: Uuid;
  eventId: Uuid;
  eventTitle: string;
  studentRa: string;
  studentName: string;
  studentCourse: string;
  checkInAt: IsoDateTime | null;
  checkOutAt: IsoDateTime | null;
  status: AttendanceStatus;
}

export interface MyAttendanceView {
  id: Uuid;
  eventId: Uuid;
  eventTitle: string;
  checkInAt: IsoDateTime | null;
  checkOutAt: IsoDateTime | null;
  status: AttendanceStatus;
}

export interface AttendanceSummary {
  checkedInCount: number;
  checkedOutCount: number;
  confirmedCount: number;
}

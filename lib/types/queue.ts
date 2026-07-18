// Queue & QueueEntry & GuestBook types

export interface Queue {
  id: string;
  tenant_id: string;
  name: string;
  display_name: string | null;
  service_code: string | null;
  color_code: string;
  is_active: boolean;
  max_capacity: number;
  estimated_service_time_minutes: number;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type QueueStatus = 'waiting' | 'serving' | 'completed' | 'no_show' | 'cancelled';

export interface QueueEntry {
  id: string;
  queue_id: string;
  tenant_id: string;
  ticket_number: string;
  customer_name: string | null;
  status: QueueStatus;
  service_window: number | null;
  priority: number;
  entered_at: string;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
}

export interface GuestBook {
  id: string;
  tenant_id: string;
  name: string;
  institution: string;
  purpose: string;
  phone: string;
  photo_url: string | null;
  created_at: string;
}

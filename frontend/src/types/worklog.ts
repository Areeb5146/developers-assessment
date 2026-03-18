export interface TimeEntryResponse {
  id: string
  date: string
  hours: number
  description: string
  hourly_rate: number
  subtotal: number
}

export interface WorkLogListItem {
  id: string
  freelancer_name: string
  task_title: string
  total_hours: number
  total_amount: number
  status: string
  created_at: string
}

export interface WorkLogListResponse {
  data: WorkLogListItem[]
  count: number
}

export interface WorkLogDetailResponse {
  id: string
  freelancer_name: string
  task_title: string
  total_hours: number
  total_amount: number
  status: string
  created_at: string
  time_entries: TimeEntryResponse[]
}

export interface PaymentCreateRequest {
  worklog_ids: string[]
  excluded_freelancer_ids?: string[]
}

export interface PaymentCreateResponse {
  id: string
  status: string
  total_amount: number
  worklog_count: number
  created_at: string
}

export interface PaymentWorkLogItem {
  worklog_id: string
  freelancer_name: string
  task_title: string
  total_hours: number
  amount: number
}

export interface FreelancerPaymentGroup {
  freelancer_name: string
  freelancer_id: string
  worklogs: PaymentWorkLogItem[]
  subtotal: number
}

export interface PaymentDetailResponse {
  id: string
  status: string
  total_amount: number
  created_at: string
  freelancer_groups: FreelancerPaymentGroup[]
}

export interface PaymentConfirmResponse {
  id: string
  status: string
  total_amount: number
  created_at: string
}

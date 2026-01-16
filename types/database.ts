// types/database.ts
export interface ExpenseApproval {
  id: string;
  project_id: string;
  classification: '시공' | '자재' | '직영' | '외주';
  work_category?: string;
  work_subcategory?: string;
  amount: number;
  vat_included: boolean;
  account_number?: string;
  payment_date?: string;
  status: 'pending' | 'approved' | 'paid';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkLog {
  id: string;
  project_id: string;
  work_date: string;
  work_category?: string;
  work_subcategory?: string;
  worker_count?: number;
  payment_completed?: boolean;
  expense_approval_id?: string;
  notes?: string;
  created_at?: string;
}

export type Project = {
  id: string
  project_name: string
  client_name: string
  status: 'estimate' | 'in_progress' | 'completed' | 'cancelled'
}

export type WorkCategory = {
  id: string
  category_name: string
  description: string | null
}

export type WorkerType = '직영' | '외주'

export interface Worker {
  id: string
  name: string
  default_cost: number
  is_active: boolean
  worker_type: WorkerType
  created_at?: string
  updated_at?: string
}

export interface SitePhoto {
  id: string;
  project_id: string;
  photo_date: string;
  photo_url: string;
  comment?: string;
  visibility: 'internal' | 'client';
  created_by?: string;
  created_at?: string;
}

export interface SitePhotoWithProject extends SitePhoto {
  projects?: {
    project_name: string;
    client_name: string;
  };
}

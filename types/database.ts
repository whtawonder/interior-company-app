export type WorkLog = {
  id: string
  project_id: string
  work_date: string
  work_content: string
  cost: number
  work_cate1: string
  worker_name: string
  notes: string | null  // ← 추가
  created_at: string
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

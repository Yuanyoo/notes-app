export interface UserProfile {
  cognito_sub: string;
  email: string;
  display_name: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  is_default: boolean;
  created_at: string;
}

export interface Note {
  id: string;
  category_id: string | null;
  title: string;
  data: NoteData;
  created_at: string;
  updated_at: string;
}

export interface NoteListItem {
  id: string;
  category_id: string | null;
  title: string;
  data: NoteData;
  created_at: string;
  updated_at: string;
}

export interface NoteData {
  content?: object;
  tags?: string[];
  pinned?: boolean;
}

export interface DragItem {
    type: string
    id: string
    top: number|null
    left: number|null
    emoji: string
    title: string
    language?: string;
}

export interface Box {
    left: number;
    top: number;
    title: string;
    emoji: string;
    loading?: boolean;
    language?: string;
  }

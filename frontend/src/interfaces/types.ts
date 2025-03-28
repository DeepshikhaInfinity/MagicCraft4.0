// src/interfaces/types.ts
export interface MultilingualTitle {
    english: string;
    hindi: string;
    tamil: string;
  }
  
  export interface Resource {
    title: MultilingualTitle;
    emoji: string;
  }
  
  export interface Box {
    title: string;
    emoji: string;
    left: number;
    top: number;
    loading?: boolean;
  }
  
  export interface DragItem {
    type: string;
    id: string;
    top: number|null;
    left: number|null;
    emoji: string;
    title: string;
  }
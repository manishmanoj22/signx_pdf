
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  SIGN_DOC = 'SIGN_DOC',
  VIEW_DOC = 'VIEW_DOC',
  IMAGE_TO_PDF = 'IMAGE_TO_PDF',
  MERGE_PDF = 'MERGE_PDF',
  TOOL_SUCCESS = 'TOOL_SUCCESS',
  COMPRESS_PDF = 'COMPRESS_PDF',
  CREATE_RECEIPT = 'CREATE_RECEIPT'
}

export type ElementType = 'SIGNATURE' | 'TEXT';

export interface PlacedElement {
  id: string;
  type: ElementType;
  dataUrl?: string; // For signatures
  text?: string;    // For text boxes
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  w?: number; // width percentage
  h?: number; // height percentage
  pageNumber: number; // The 1-based page index
}

// Keeping PlacedSignature alias for backward compatibility
export type PlacedSignature = PlacedElement;

export interface UserSignature {
  id: string;
  dataUrl: string;
  label: string;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  name: string;
  type: 'PDF' | 'IMAGE';
  status: 'SIGNED' | 'PENDING';
  date: string;
  fileData?: string; // base64 data
  placedSignatures?: PlacedElement[];
}

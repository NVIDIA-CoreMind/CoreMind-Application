export interface TabItem {
  id: string;
  filePath: string;
  fileName: string;
  language: string;
  isDirty: boolean;
  content: string;
  savedContent: string;
}

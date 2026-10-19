export interface PanelChecklistStep {
  id: string;
  label: string;
  done: boolean;
  tab: string;
}

export interface PanelNavItem {
  id: string;
  label: string;
  badge?: number;
}

import type { ReactNode } from 'react';

interface PanelPageProps {
  children: ReactNode;
  className?: string;
}

export default function PanelPage({ children, className = '' }: PanelPageProps) {
  return <div className={`space-y-6 ${className}`}>{children}</div>;
}

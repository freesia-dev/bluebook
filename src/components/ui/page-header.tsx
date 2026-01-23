import React, { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">{title}</h1>
        {description && (
          <p className="mt-2 text-muted-foreground text-sm md:text-base">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
};

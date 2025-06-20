import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home, FolderOpen, Layout } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav className="flex items-center space-x-1 text-xs text-gray-500">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight className="w-3 h-3 text-gray-400" />}
          
          {item.href ? (
            <Link
              to={item.href}
              className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
            >
              {item.icon && React.cloneElement(item.icon as React.ReactElement, { className: "w-3 h-3" })}
              <span>{item.label}</span>
            </Link>
          ) : (
            <span className="flex items-center space-x-1 text-gray-700 font-medium">
              {item.icon && React.cloneElement(item.icon as React.ReactElement, { className: "w-3 h-3" })}
              <span>{item.label}</span>
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumb;

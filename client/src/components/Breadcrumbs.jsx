import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS = {
  customer: 'Customer Portal',
  home: 'Home',
  shop: 'Shop',
  orders: 'My Orders',
  payments: 'My Payments',
  invoices: 'My Invoices',
  spending: 'My Spending & Allowance',
  ai: 'AI Shopping Assistant',
  checkout: 'Checkout & Payment',
  settings: 'Settings',
  owner: 'Owner Workspace',
  overview: 'Business Overview',
  products: 'Products & Inventory',
  transactions: 'Transactions',
  customers: 'Customers',
  'cash-flow': 'Cash Flow & Runway',
  analytics: 'Analytics & Reports',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length <= 1) return null;

  return (
    <nav className="flex items-center space-x-1.5 text-xs text-slate-500 mb-4 select-none">
      <Link
        to={pathnames[0] === 'customer' ? '/customer/home' : '/owner/overview'}
        className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
      >
        <Home className="w-3.5 h-3.5 text-slate-400" />
        <span className="capitalize">{pathnames[0] === 'customer' ? 'Customer' : 'Owner'}</span>
      </Link>

      {pathnames.slice(1).map((segment, index) => {
        const routeTo = `/${pathnames.slice(0, index + 2).join('/')}`;
        const isLast = index === pathnames.slice(1).length - 1;
        const label = ROUTE_LABELS[segment] || segment.replace(/-/g, ' ');

        return (
          <React.Fragment key={routeTo}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-800 capitalize truncate max-w-xs">{label}</span>
            ) : (
              <Link to={routeTo} className="hover:text-blue-600 transition-colors capitalize">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

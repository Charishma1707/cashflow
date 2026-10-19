import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const PRESET_CUSTOMERS = [
  { name: 'Sarah Jenkins', email: 'sarah.j@gmail.com', company: 'Jenkins Household', role: 'customer' },
  { name: 'Oak & Bean Artisan Cafe', email: 'orders@oakbeancafe.com', company: 'Oak & Bean Cafe', role: 'customer' },
  { name: 'GreenBite Healthy Kitchens', email: 'purchasing@greenbite.com', company: 'GreenBite Kitchens', role: 'customer' },
];

export const OWNER_PROFILE = {
  name: 'Marcus Vance',
  email: 'billing@freshcartgroceries.com',
  businessName: 'FreshCart Groceries & Mart',
  role: 'owner',
};

export function AuthProvider({ children }) {
  const [role, setRole] = useState(() => {
    return localStorage.getItem('cashflow_role') || null;
  });

  const [currentCustomer, setCurrentCustomer] = useState(() => {
    const saved = localStorage.getItem('cashflow_customer');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return PRESET_CUSTOMERS[0];
      }
    }
    return PRESET_CUSTOMERS[0];
  });

  useEffect(() => {
    if (role) {
      localStorage.setItem('cashflow_role', role);
    } else {
      localStorage.removeItem('cashflow_role');
    }
  }, [role]);

  useEffect(() => {
    if (currentCustomer) {
      localStorage.setItem('cashflow_customer', JSON.stringify(currentCustomer));
    }
  }, [currentCustomer]);

  const selectRole = (newRole) => {
    setRole(newRole);
  };

  const switchCustomer = (customer) => {
    setCurrentCustomer(customer);
  };

  const logout = () => {
    setRole(null);
    localStorage.removeItem('cashflow_role');
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        isOwner: role === 'owner',
        isCustomer: role === 'customer',
        currentCustomer,
        ownerProfile: OWNER_PROFILE,
        selectRole,
        switchCustomer,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

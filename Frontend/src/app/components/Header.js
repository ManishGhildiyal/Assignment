'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { tenantsAPI } from '../utils/api';
import { Building2, LogOut, Crown, User, Settings, CheckCircle } from 'lucide-react';

const Header = ({ onUpgradeSuccess }) => {
  const { user, logout, isAdmin } = useAuth();
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  const handleUpgrade = async () => {
    if (!isAdmin()) {
      alert('Only admins can upgrade the subscription');
      return;
    }

    try {
      setUpgrading(true);
      await tenantsAPI.upgrade(user.tenant.slug);
      setUpgradeSuccess(true);
      setTimeout(() => setUpgradeSuccess(false), 3000);
      if (onUpgradeSuccess) {
        onUpgradeSuccess();
      }
      // Refresh page to update user context
      window.location.reload();
    } catch (error) {
      console.error('Upgrade error:', error);
      alert(error.response?.data?.error || 'Failed to upgrade subscription');
    } finally {
      setUpgrading(false);
    }
  };

  const isPro = user?.tenant?.plan === 'pro';

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-primary-600 mr-3" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Notes SaaS</h1>
              <p className="text-xs text-gray-500">{user?.tenant?.name}</p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Plan Badge */}
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isPro 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {isPro ? (
                <>
                  <Crown className="w-4 h-4 mr-1" />
                  PRO
                </>
              ) : (
                'FREE'
              )}
            </div>

            {/* Upgrade Button */}
            {!isPro && isAdmin() && (
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  upgradeSuccess 
                    ? 'bg-green-600 text-white' 
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {upgrading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : upgradeSuccess ? (
                  <CheckCircle className="w-4 h-4 mr-2" />
                ) : (
                  <Crown className="w-4 h-4 mr-2" />
                )}
                {upgradeSuccess ? 'Upgraded!' : upgrading ? 'Upgrading...' : 'Upgrade to Pro'}
              </button>
            )}

            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center text-sm">
                <User className="w-4 h-4 text-gray-500 mr-2" />
                <div>
                  <div className="font-medium text-gray-900">{user?.email}</div>
                  <div className="text-gray-500 text-xs">{user?.role}</div>
                </div>
              </div>
              
              <button
                onClick={logout}
                className="inline-flex items-center px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
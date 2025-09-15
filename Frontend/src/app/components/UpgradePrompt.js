'use client';

import { Crown, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const UpgradePrompt = ({ noteStats }) => {
  const { isAdmin } = useAuth();
  
  if (!noteStats || noteStats.unlimited) return null;

  const isAtLimit = noteStats.remaining === 0;
  const isNearLimit = noteStats.remaining <= 1;

  return (
    <div className={`rounded-lg border p-4 ${
      isAtLimit 
        ? 'bg-red-50 border-red-200' 
        : 'bg-yellow-50 border-yellow-200'
    }`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {isAtLimit ? (
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
          ) : (
            <Crown className="h-5 w-5 text-yellow-400 mt-0.5" />
          )}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${
            isAtLimit ? 'text-red-800' : 'text-yellow-800'
          }`}>
            {isAtLimit ? 'Note Limit Reached' : 'Approaching Note Limit'}
          </h3>
          <div className={`mt-2 text-sm ${
            isAtLimit ? 'text-red-700' : 'text-yellow-700'
          }`}>
            <p>
              {isAtLimit 
                ? "You've reached your 3-note limit on the Free plan. Upgrade to Pro for unlimited notes!"
                : `You have ${noteStats.remaining} note${noteStats.remaining === 1 ? '' : 's'} remaining on the Free plan.`
              }
            </p>
          </div>
          
          {isAdmin() && (
            <div className="mt-3">
              <div className={`text-xs ${
                isAtLimit ? 'text-red-600' : 'text-yellow-600'
              } mb-2`}>
                As an admin, you can upgrade your organization to Pro:
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="bg-white rounded-lg p-3 border border-gray-200 flex-1">
                  <div className="text-sm font-medium text-gray-900">Free Plan</div>
                  <div className="text-xs text-gray-500">• Up to 3 notes</div>
                  <div className="text-xs text-gray-500">• Basic features</div>
                </div>
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-lg p-3 flex-1">
                  <div className="text-sm font-medium">Pro Plan</div>
                  <div className="text-xs opacity-90">• Unlimited notes</div>
                  <div className="text-xs opacity-90">• All features</div>
                  <div className="flex items-center mt-1">
                    <Crown className="w-3 h-3 mr-1" />
                    <span className="text-xs">Recommended</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Use the "Upgrade to Pro" button in the header to upgrade instantly.
              </p>
            </div>
          )}
          
          {!isAdmin() && (
            <div className="mt-3">
              <p className={`text-xs ${
                isAtLimit ? 'text-red-600' : 'text-yellow-600'
              }`}>
                Contact your admin to upgrade to Pro for unlimited notes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;
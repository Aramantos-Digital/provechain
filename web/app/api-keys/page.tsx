'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  status: string;
}

export default function ApiKeysPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [userTier, setUserTier] = useState<string>('free');
  const [canCreateKeys, setCanCreateKeys] = useState(false);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createExpiry, setCreateExpiry] = useState<number>(0); // 0 = never expires
  const [creating, setCreating] = useState(false);

  // New key display
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(true);

  useEffect(() => {
    loadApiKeys();
  }, []);

  async function loadApiKeys() {
    try {
      const supabase = createClient();

      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push('/login?redirect=/api-keys');
        return;
      }

      // Get user's subscription tier
      const subRes = await fetch('/api/subscription');
      let tier = 'free';
      if (subRes.ok) {
        const subData = await subRes.json();
        tier = subData.subscription?.tier || 'free';
      }
      setUserTier(tier);

      // Check if user can create API keys
      const allowedTiers = ['business', 'custom'];
      setCanCreateKeys(allowedTiers.includes(tier));

      if (!allowedTiers.includes(tier)) {
        setLoading(false);
        return;
      }

      // Load API keys
      const response = await fetch('/api/api-keys');
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.apiKeys || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      setLoading(false);
    }
  }

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: createName,
          expiresInDays: createExpiry > 0 ? createExpiry : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create API key');
      }

      setNewKey(data.apiKey.key);
      setShowNewKey(true);
      toast.success('API key created successfully');
      setCreateName('');
      setCreateExpiry(0);
      setShowCreateModal(false);
      loadApiKeys(); // Reload list
    } catch (error: any) {
      toast.error(error.message || 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevokeKey(keyId: string, keyName: string) {
    if (!confirm(`Are you sure you want to revoke "${keyName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/api-keys?id=${keyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke API key');
      }

      toast.success('API key revoked successfully');
      loadApiKeys();
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke API key');
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  }

  function maskKey(prefix: string) {
    return `${prefix}••••••••••••••••`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">Loading API keys...</p>
        </div>
      </div>
    );
  }

  if (!canCreateKeys) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Key className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              API Keys Require Business or Enterprise Tier
            </h1>
            <p className="text-slate-600 mb-6">
              Upgrade your subscription to access programmatic API access with API keys.
            </p>
            <Link
              href="/pricing"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              View Pricing Plans
            </Link>
            <div className="mt-6">
              <Link
                href="/dashboard"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                API Keys
              </h1>
              <p className="text-slate-600">
                Manage your API keys for programmatic access
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              Create API Key
            </button>
          </div>
        </div>

        {/* New Key Alert */}
        {newKey && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-900">
                  API Key Created Successfully
                </h3>
              </div>
              <button
                onClick={() => setNewKey(null)}
                className="text-green-600 hover:text-green-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-green-700 mb-3">
              Make sure to copy your API key now. You won't be able to see it again!
            </p>
            <div className="flex items-center gap-2 bg-white border border-green-300 rounded-lg p-3">
              <code className="flex-1 text-sm font-mono text-slate-900">
                {showNewKey ? newKey : '••••••••••••••••••••••••••••••••'}
              </code>
              <button
                onClick={() => setShowNewKey(!showNewKey)}
                className="p-2 text-slate-600 hover:text-slate-900 transition"
              >
                {showNewKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={() => copyToClipboard(newKey)}
                className="p-2 text-green-600 hover:text-green-700 transition"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* API Keys List */}
        {apiKeys.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Key className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              No API Keys Yet
            </h2>
            <p className="text-slate-600 mb-6">
              Create your first API key to access ProveChain programmatically.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              Create Your First API Key
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">
                      Name
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">
                      Key
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">
                      Created
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">
                      Last Used
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-slate-900">
                      Status
                    </th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-slate-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {apiKeys.map((key) => (
                    <tr key={key.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{key.name}</p>
                        {key.expires_at && (
                          <p className="text-xs text-slate-500">
                            Expires {new Date(key.expires_at).toLocaleDateString('en-IE')}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-sm font-mono text-slate-600">
                          {maskKey(key.key_prefix)}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(key.created_at).toLocaleDateString('en-IE')}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {key.last_used_at
                          ? new Date(key.last_used_at).toLocaleDateString('en-IE')
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                            key.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {key.status.charAt(0).toUpperCase() + key.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {key.status === 'active' && (
                          <button
                            onClick={() => handleRevokeKey(key.id, key.name)}
                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 transition text-sm font-medium"
                          >
                            <Trash2 className="w-4 h-4" />
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">
              API Key Security
            </h3>
            <p className="text-sm text-blue-700">
              Keep your API keys secure and never commit them to version control.
              Revoke any keys that may have been compromised.
            </p>
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Create API Key</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateKey}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Key Name
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Production API Key"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  A descriptive name to identify this key
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Expiration
                </label>
                <select
                  value={createExpiry}
                  onChange={(e) => setCreateExpiry(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Never expires</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={365}>1 year</option>
                </select>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> The API key will only be shown once upon creation.
                  Make sure to copy it and store it securely.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create API Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

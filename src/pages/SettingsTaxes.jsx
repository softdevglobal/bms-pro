import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, Percent, Receipt } from 'lucide-react';
import { getUserSettings, updateUserSettings } from '../services/settingsService';

export default function SettingsTaxes() {
  const { getToken, userSettings: contextSettings, refreshSettings } = useAuth();
  const [form, setForm] = useState({ taxRate: 10 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const token = getToken();
        const settings = await getUserSettings(token);
        setForm({
          taxRate: Number.isFinite(Number(settings.taxRate)) ? Number(settings.taxRate) : 10
        });
      } catch (err) {
        // Fallback to context defaults
        setForm({
          taxRate: Number.isFinite(Number(contextSettings?.taxRate)) ? Number(contextSettings?.taxRate) : 10
        });
        setMessage({ type: 'error', text: 'Could not load current GST settings. Using defaults.' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });

      // Validate
      const rate = Number(form.taxRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        setMessage({ type: 'error', text: 'GST rate must be a number between 0 and 100.' });
        return;
      }

      const token = getToken();
      await updateUserSettings(token, { taxRate: rate });
      await refreshSettings();
      setMessage({ type: 'success', text: 'GST settings saved.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2500);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save GST settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading GST settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-xl p-6 border border-emerald-100">
        <div className="relative flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-emerald-500 to-cyan-600 rounded-xl shadow-lg w-fit">
            <Receipt className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-700 to-cyan-700 bg-clip-text text-transparent">Taxes (GST)</h1>
            <p className="text-gray-600 font-medium text-sm mt-1">Set your GST rate for the system.</p>
          </div>
        </div>
      </section>

      {message.text && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : message.type === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : null}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>GST Configuration</CardTitle>
          <CardDescription>Default for new accounts is 10%. You can change it here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>GST Rate (%)</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.taxRate}
                  onChange={(e) => setForm((p) => ({ ...p, taxRate: e.target.value }))}
                  placeholder="10"
                />
                <Percent className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save GST Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
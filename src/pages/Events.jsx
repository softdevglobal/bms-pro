import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { fetchEventTypes, updateEventTypes } from "@/services/userService";
import { Calendar, Plus, Save, X } from "lucide-react";

export default function Events() {
  const { token } = useAuth();
  const [eventTypes, setEventTypes] = useState([]);
  const [newType, setNewType] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const saved = await fetchEventTypes(token);
        setEventTypes(saved || []);
      } catch (e) {
        console.error(e);
        setError(e.message || "Failed to load event types");
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token]);

  const addType = () => {
    const val = (newType || "").trim();
    if (!val) return;
    setEventTypes(prev => Array.from(new Set([...(prev || []), val])));
    setNewType("");
  };

  const removeType = (type) => {
    setEventTypes(prev => (prev || []).filter(t => t !== type));
  };

  const saveTypes = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const saved = await updateEventTypes(eventTypes || [], token);
      setEventTypes(saved || []);
      setSuccess("Saved event types");
      setTimeout(() => setSuccess(null), 2500);
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to save event types");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="space-y-6">
      <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-700" />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Events</h1>
              </div>
              <p className="mt-1 text-sm sm:text-base text-gray-700">Add and manage Event Types for this hall owner.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-red-800 text-sm">{error}</CardContent>
        </Card>
      )}
      {success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-green-800 text-sm">{success}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Event Types</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-3">
          {loading ? (
            <div className="text-sm text-gray-600">Loading event types…</div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {(eventTypes || []).length === 0 ? (
                  <span className="text-xs text-gray-500">No event types yet</span>
                ) : (
                  (eventTypes || []).map((t) => (
                    <div key={t} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-2 py-1 text-xs">
                      <span className="px-0.5">{t}</span>
                      <button
                        type="button"
                        className="hover:text-blue-900"
                        onClick={() => removeType(t)}
                        aria-label={`Remove ${t}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center gap-2 max-w-md">
                <Input
                  placeholder="Add an event type (e.g., Wedding, Conference)"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addType();
                  }}
                />
                <Button variant="outline" onClick={addType}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
                <Button onClick={saveTypes} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

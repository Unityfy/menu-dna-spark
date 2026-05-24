import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SyncState {
  last_synced_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  pos_provider: string | null;
}

const formatRelative = (iso: string | null) => {
  if (!iso) return "Never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const PosSyncSection = () => {
  const { user } = useAuth();
  const [state, setState] = useState<SyncState | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    if (!user) return;
    // Use RPC to get the user's restaurant, then fetch sync state
    const { data: restaurantId } = await supabase.rpc("get_user_restaurant_id", { _user_id: user.id });
    if (!restaurantId) return;
    const { data } = await supabase
      .from("restaurants")
      .select("last_synced_at, last_sync_status, last_sync_error, pos_provider")
      .eq("id", restaurantId)
      .maybeSingle();
    if (data) setState(data as SyncState);
  };

  useEffect(() => {
    load();
  }, [user]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-pos-sales", {
        body: {},
      });
      if (error) throw error;
      const firstResult = (data?.results?.[0] ?? {}) as { inserted?: number; error?: string };
      if (firstResult.error) {
        toast.error(`Sync failed: ${firstResult.error}`);
      } else {
        toast.success(`Sync complete — ${firstResult.inserted ?? 0} new orders imported`);
      }
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  };

  const status = state?.last_sync_status;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between py-2.5 border-b border-border/50">
        <span className="text-sm text-muted-foreground">POS Provider</span>
        <span className="text-sm font-medium text-foreground">
          {state?.pos_provider ?? "Not connected"}
        </span>
      </div>
      <div className="flex items-center justify-between py-2.5 border-b border-border/50">
        <span className="text-sm text-muted-foreground">Last Sync</span>
        <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
          {status === "success" && <CheckCircle className="h-3.5 w-3.5 text-opportunity" />}
          {status === "error" && <AlertCircle className="h-3.5 w-3.5 text-warning" />}
          {formatRelative(state?.last_synced_at ?? null)}
        </span>
      </div>
      {state?.last_sync_error && (
        <p className="text-xs text-warning">Last error: {state.last_sync_error}</p>
      )}
      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
        Auto-syncs daily at 2:00 AM local time
      </p>
      <button
        onClick={handleSync}
        disabled={syncing}
        className="w-full rounded-md border border-foreground/20 bg-foreground/5 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-foreground/10 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing…" : "Sync Now"}
      </button>
    </div>
  );
};

export default PosSyncSection;

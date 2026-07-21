import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!authorizationId) {
      setError("Missing authorization_id");
      return;
    }
    if (!user) {
      const next = window.location.pathname + window.location.search;
      navigate(`/auth?next=${encodeURIComponent(next)}`, { replace: true });
      return;
    }
    (async () => {
      const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (error) return setError(error.message);
      const anyData = data as any;
      if (anyData && "redirect_url" in anyData && !("client" in anyData)) {
        window.location.href = anyData.redirect_url;
        return;
      }
      setDetails(anyData);
    })();
  }, [authorizationId, user, loading, navigate]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
      : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = (data as any)?.redirect_url;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen grid place-items-center p-6 bg-background">
        <Card className="max-w-md w-full p-6">
          <h1 className="text-lg font-semibold mb-2">Authorization error</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </Card>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const clientName = details.client?.name ?? "an app";
  const scopes: string[] = (details.scopes ?? details.scope?.split(" ") ?? []).filter(Boolean);

  return (
    <main className="min-h-screen grid place-items-center p-6 bg-background">
      <Card className="max-w-md w-full p-6 space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Authorize access</p>
          <h1 className="text-xl font-semibold">Connect {clientName} to NORTHVEIZ</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {clientName} will be able to use NORTHVEIZ tools while you are signed in as {user?.email}.
          </p>
        </div>
        {scopes.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-2">Requested access</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              {scopes.map((s) => (
                <li key={s}>• {s}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          This does not bypass NORTHVEIZ permissions or backend policies.
        </p>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
          </Button>
        </div>
      </Card>
    </main>
  );
}

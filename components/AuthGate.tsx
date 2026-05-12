"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!hasSupabaseEnv) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasSupabaseEnv) return;
    setPending(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const signUp = await supabase.auth.signUp({ email, password });
      if (signUp.error) {
        toast({
          title: "Login failed",
          description: signUp.error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account created",
          description: "Check email confirmation if your Supabase project requires it.",
        });
      }
    }

    setPending(false);
  }

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!hasSupabaseEnv) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 flex items-center justify-center">
        <div className="w-full max-w-sm bg-card border border-border rounded-xl p-5 shadow-sm space-y-2">
          <h1 className="text-xl font-bold">Supabase setup required</h1>
          <p className="text-sm text-muted-foreground">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local.
          </p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 flex items-center justify-center">
        <form onSubmit={submit} className="w-full max-w-sm bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h1 className="text-xl font-bold">Shoe Shop Register</h1>
            <p className="text-sm text-muted-foreground">Sign in to your shop ledger</p>
          </div>
          <Input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12"
          />
          <Input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-12"
          />
          <Button type="submit" disabled={pending} className="w-full h-12">
            {pending ? "Please wait..." : "Sign in / Create account"}
          </Button>
        </form>
      </main>
    );
  }

  return children;
}

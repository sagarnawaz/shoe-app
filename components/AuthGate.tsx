"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  getCurrentLocalUserId,
  isValidPhoneNumber,
  loginOrCreateAppUser,
  LOGOUT_EVENT,
  normalizePhoneNumber,
  saveLocalUserSession,
} from "@/lib/local-auth";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setAuthenticated(Boolean(getCurrentLocalUserId()));
    setLoading(false);

    function handleLogout() {
      setAuthenticated(false);
      setPassword("");
    }

    window.addEventListener(LOGOUT_EVENT, handleLogout);
    return () => window.removeEventListener(LOGOUT_EVENT, handleLogout);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedPhone = normalizePhoneNumber(phone);

    if (!isValidPhoneNumber(normalizedPhone)) {
      toast({
        title: "درست فون نمبر درج کریں",
        description: "مثال: 03001234567 یا +923001234567",
        variant: "destructive",
      });
      return;
    }

    try {
      setPending(true);
      const user = await loginOrCreateAppUser(normalizedPhone, password);

      if (user.created) {
        toast({
          title: "اکاؤنٹ بن گیا",
          description: "اگلی بار اسی فون نمبر اور پاس ورڈ سے لاگ اِن کریں۔",
        });
      }

      saveLocalUserSession(user.id, normalizedPhone);
      setAuthenticated(true);
      setPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";

      toast({
        title: "لاگ اِن ناکام",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 flex items-center justify-center">
        <form onSubmit={submit} className="w-full max-w-sm bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h1 className="text-xl font-bold">شو شاپ رجسٹر</h1>
            <p className="text-sm text-muted-foreground">فون نمبر اور پاس ورڈ سے لاگ اِن کریں</p>
          </div>
          <Input
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="فون نمبر"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="h-12"
          />
          <Input
            type="password"
            required
            minLength={6}
            placeholder="پاس ورڈ"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-12"
          />
          <Button type="submit" disabled={pending} className="w-full h-12">
            {pending ? "انتظار کریں..." : "لاگ اِن / اکاؤنٹ بنائیں"}
          </Button>
        </form>
      </main>
    );
  }

  return children;
}

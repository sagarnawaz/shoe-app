"use client";

import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, Smartphone } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
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
      const rawMessage = error instanceof Error ? error.message : "Please try again.";
      const message = rawMessage.includes("Phone number or password is incorrect")
        ? "فون نمبر یا پاس ورڈ درست نہیں ہے۔"
        : rawMessage;

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
        <form
          onSubmit={submit}
          className="w-full max-w-sm min-h-[560px] bg-card border border-border rounded-[28px] p-5 shadow-lg shadow-black/5 flex flex-col justify-between"
        >
          <div className="space-y-7">
            <div className="pt-4 text-center space-y-4">
              <div className="mx-auto flex size-20 items-center justify-center rounded-[24px] bg-teal-700 text-white shadow-md">
                <Smartphone size={34} strokeWidth={2.4} />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold">شو شاپ رجسٹر</h1>
                <p className="text-sm text-muted-foreground">فون نمبر اور پاس ورڈ سے لاگ اِن کریں</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="phone">
                  فون نمبر
                </label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="03001234567"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="h-14 rounded-2xl text-base"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="password">
                  پاس ورڈ
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="current-password"
                    placeholder="پاس ورڈ"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-14 rounded-2xl pr-12 text-base"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "پاس ورڈ چھپائیں" : "پاس ورڈ دکھائیں"}
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pb-1">
            <Button type="submit" disabled={pending} className="w-full h-14 rounded-2xl text-base font-semibold">
              {pending ? "انتظار کریں..." : "لاگ اِن / اکاؤنٹ بنائیں"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">نیا فون نمبر خود بخود اکاؤنٹ بنا دے گا</p>
          </div>
        </form>
      </main>
    );
  }

  return children;
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
      router.replace("/");
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
      <main className="min-h-[100svh] bg-background px-4 py-5 flex items-center justify-center">
        <form
          onSubmit={submit}
          className="w-full max-w-[360px] bg-card border border-border rounded-3xl p-5 shadow-lg shadow-black/5"
        >
          <div className="flex flex-col items-center text-center">
            <Image src="/favicon.svg" alt="" width={80} height={80} className="rounded-3xl shadow-md" priority />
            <h1 className="mt-5 text-2xl font-black leading-tight">امین شوز ہاؤس</h1>
            <p className="mt-2 text-sm text-muted-foreground">فون نمبر اور پاس ورڈ سے لاگ اِن کریں</p>
          </div>

          <div className="mt-7 space-y-4">
            <div className="space-y-2">
              <label className="flex items-center justify-start gap-1.5 text-left text-sm font-medium text-foreground" htmlFor="phone">
                <span dir="ltr">Phone No /</span>
                <span dir="rtl">فون نمبر</span>
              </label>
              <Input
                id="phone"
                type="tel"
                required
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                placeholder="+923001234567"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="h-14 min-h-14 rounded-2xl px-4 text-left text-base tabular-nums"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-start gap-1.5 text-left text-sm font-medium text-foreground" htmlFor="password">
                <span dir="ltr">Password /</span>
                <span dir="rtl">پاس ورڈ</span>
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
                  className="h-14 min-h-14 rounded-2xl px-4 pr-12 text-base"
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

          <Button type="submit" disabled={pending} className="mt-7 h-14 min-h-14 w-full rounded-2xl text-base font-semibold">
            {pending ? "انتظار کریں..." : "لاگ اِن / اکاؤنٹ بنائیں"}
          </Button>

          <p className="mt-3 text-center text-xs text-muted-foreground">نیا فون نمبر خود بخود اکاؤنٹ بنا دے گا</p>
        </form>
      </main>
    );
  }

  return children;
}

"use client";

import { supabase } from "./supabase";

export const USERS_KEY = "shoe-app-local-users";
export const SESSION_KEY = "shoe-app-local-session";
export const LOGOUT_EVENT = "shoe-app-local-logout";

export type LocalUser = {
  userId: string;
};

export type LocalUsers = Record<string, LocalUser>;

export function normalizePhoneNumber(value: string) {
  const compact = value.replace(/[\s()-]/g, "");

  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  if (compact.startsWith("0")) return `+92${compact.slice(1)}`;
  if (compact.startsWith("92")) return `+${compact}`;

  return compact;
}

export function isValidPhoneNumber(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

export function readUsers(): LocalUsers {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "{}") as LocalUsers;
  } catch {
    return {};
  }
}

export function getLocalUserRecord(users: LocalUsers, phone: string): LocalUser | null {
  const record = users[phone];

  return record ?? null;
}

export function getCurrentLocalUserId() {
  if (typeof window === "undefined") return null;

  const userId = localStorage.getItem(SESSION_KEY);

  if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }

  return userId;
}

export function requireCurrentLocalUserId() {
  const userId = getCurrentLocalUserId();

  if (!userId) {
    throw new Error("Please sign in again.");
  }

  return userId;
}

export async function loginOrCreateAppUser(phone: string, password: string) {
  const { data, error } = await supabase.rpc("login_or_create_app_user", {
    user_phone: phone,
    user_password: password,
  });

  if (error) throw new Error(error.message);

  return (Array.isArray(data) ? data[0] : data) as {
    id: string;
    phone: string;
    created: boolean;
  };
}

export function saveLocalUserSession(userId: string, phone: string) {
  const users = readUsers();
  users[phone] = {
    userId,
  };
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(SESSION_KEY, userId);
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          setErr(error.message);
        } else if (!data.session) {
          // email confirmation is ON in this Supabase project
          setMsg(
            "Check your email for a confirmation link, then come back and sign in."
          );
        } else {
          router.push("/drills");
          router.refresh();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setErr(error.message);
        } else {
          router.push("/drills");
          router.refresh();
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="page-inner">
        <div className="page-top">
          <Link
            href="/"
            className="brand"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            VTO <b>/ ACCESS</b>
          </Link>
        </div>
        <div className="auth-wrap">
          <h1>{mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}</h1>
          <div className="row-toggle">
            <button
              type="button"
              className={mode === "signin" ? "on" : ""}
              onClick={() => {
                setMode("signin");
                setErr(null);
                setMsg(null);
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === "signup" ? "on" : ""}
              onClick={() => {
                setMode("signup");
                setErr(null);
                setMsg(null);
              }}
            >
              Sign up
            </button>
          </div>
          <form
            onSubmit={submit}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="auth-err">{err}</div>
            {msg && <div className="auth-msg">{msg}</div>}
            <button type="submit" className="go" disabled={busy}>
              {busy ? "…" : mode === "signin" ? "SIGN IN" : "SIGN UP"}
            </button>
          </form>
          <div className="hint">
            Drills need mic access · desktop Chrome or Edge
          </div>
        </div>
      </div>
    </div>
  );
}

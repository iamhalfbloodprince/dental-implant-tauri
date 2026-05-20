import { useAuth } from "@/context/AuthContext";
import { Button, Card, Input } from "@/components/ui/primitives";
import { useState } from "react";
import { Navigate } from "react-router-dom";

export function LoginPage() {
  const { status, login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (status?.authenticated) return <Navigate to="/" replace />;
  if (!status?.hasAccount) return <Navigate to="/setup" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      await login(password);
    } catch (err) {
      setError(String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md space-y-4">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="text-sm text-[oklch(0.45_0.02_260)]">
          Enter your local password to access patient data.
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            label="Password"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export function SetupPage() {
  const { status, setup } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (status?.hasAccount) return <Navigate to="/login" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      if (password.length < 8) {
        setError("Use at least 8 characters.");
        return;
      }
      await setup(password);
    } catch (err) {
      setError(String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md space-y-4">
        <h1 className="text-lg font-semibold">Welcome</h1>
        <p className="text-sm text-[oklch(0.45_0.02_260)]">
          Create a local password. All data stays on this computer.
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            label="Password (min 8 characters)"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Continue"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

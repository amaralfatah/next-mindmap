"use client";

import { useState } from "react";
import { Loader2Icon, LogInIcon, LogOutIcon } from "lucide-react";
import { toast } from "sonner";
import { useSession, signIn, signUp, signOut } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useT } from "@/components/i18n-provider";

/**
 * Google brand icon for OAuth button.
 */
function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...props}>
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

/**
 * Auth button and modal dialog for user authentication with Neon Auth. `cta` renders the
 * signed-out trigger as the page's primary action, for screens that need an account to continue.
 */
export function AuthButton({ className, cta, compact }: { className?: string; cta?: string; compact?: boolean }) {
  const t = useT();
  const { data: session, isPending } = useSession();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (mode === "sign-up") {
        const res = await signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0],
        });
        if (res.error) {
          setErrorMsg(res.error.message || t.auth.failedCreateAccount);
          return;
        }
        toast.success(t.auth.createSuccess);
      } else {
        const res = await signIn.email({
          email,
          password,
        });
        if (res.error) {
          setErrorMsg(res.error.message || t.auth.invalidCredentials);
          return;
        }
        toast.success(t.auth.signInSuccess);
      }

      setDialogOpen(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : t.auth.authFailed);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleAuth() {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await signIn.social({
        provider: "google",
        callbackURL: window.location.href,
      });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : t.auth.googleFailed);
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      toast.success(t.auth.signOutSuccess);
    } catch {
      toast.error(t.auth.signOutFailed);
    }
  }

  const [imageError, setImageError] = useState(false);

  if (isPending && !cta) {
    return (
      <div
        className={`size-8 rounded-full border border-border/80 bg-muted/60 ${className ?? ""}`}
        aria-hidden
      />
    );
  }

  if (session?.user) {
    const user = session.user;
    const initial = (user.name?.[0] || user.email[0] || "U").toUpperCase();

    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className={`relative size-8 overflow-hidden rounded-full p-0 border border-border/80 bg-muted/60 font-semibold text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring ${className ?? ""}`}
              aria-label={t.auth.userProfile}
            />
          }
        >
          {user.image && !imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name || t.auth.avatarAlt}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="size-full rounded-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
              {initial}
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-1.5">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center gap-2.5 px-2 py-2 font-normal">
              {user.image && !imageError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name || t.auth.avatarAlt}
                  referrerPolicy="no-referrer"
                  className="size-9 shrink-0 rounded-full object-cover border border-border/80"
                />
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
                  {initial}
                </span>
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sm text-foreground truncate">
                  {user.name || t.auth.userFallback}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOutIcon />
            <span>{t.auth.signOut}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      {cta ? (
        <Button
          size="lg"
          disabled={isPending}
          onClick={() => {
            setErrorMsg(null);
            setDialogOpen(true);
          }}
          className={`h-11 px-5 text-[15px] ${className ?? ""}`}
        >
          <LogInIcon data-icon="inline-start" />
          {cta}
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setErrorMsg(null);
            setDialogOpen(true);
          }}
          className={`shrink-0 gap-1.5 text-xs font-medium pointer-coarse:h-9 pointer-coarse:min-w-9 ${className ?? ""}`}
        >
          <LogInIcon className="size-3.5" />
          <span className={compact ? "max-sm:sr-only" : undefined}>{t.auth.signIn}</span>
        </Button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[380px] p-6">
          <DialogHeader className="text-center sm:text-center pb-2">
            <DialogTitle className="text-xl font-bold tracking-tight">
              {mode === "sign-in" ? t.auth.welcomeBack : t.auth.createAccount}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {mode === "sign-in" ? t.auth.signInDesc : t.auth.signUpDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={handleGoogleAuth}
              className="w-full gap-2.5 h-10 font-normal hover:bg-muted/80"
            >
              <GoogleIcon />
              <span>{t.auth.continueWithGoogle}</span>
            </Button>

            <div className="relative flex items-center justify-center">
              <span className="absolute inset-x-0 h-px bg-border" />
              <span className="relative bg-popover px-2 text-xs text-muted-foreground">
                {t.auth.orWithEmail}
              </span>
            </div>

            {errorMsg && (
              <div role="alert" className="rounded-md bg-destructive/15 p-2.5 text-xs text-destructive border border-destructive/20">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="grid gap-3">
              {mode === "sign-up" && (
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-foreground">
                    {t.auth.nameLabel}
                  </span>
                  <Input
                    type="text"
                    placeholder={t.auth.namePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                    required
                    autoComplete="name"
                  />
                </label>
              )}

              <label className="grid gap-1">
                <span className="text-xs font-medium text-foreground">
                  {t.auth.emailLabel}
                </span>
                <Input
                  type="email"
                  placeholder={t.auth.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  required
                  autoComplete="email"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-medium text-foreground">
                  {t.auth.passwordLabel}
                </span>
                <Input
                  type="password"
                  placeholder={t.auth.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  required
                  minLength={8}
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                />
              </label>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full mt-1 h-9 font-medium"
              >
                {submitting ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" aria-hidden />
                    <span className="sr-only">{mode === "sign-in" ? t.auth.signIn : t.auth.signUpAction}</span>
                  </>
                ) : mode === "sign-in" ? (
                  t.auth.signIn
                ) : (
                  t.auth.signUpAction
                )}
              </Button>
            </form>
          </div>

          <div className="text-center text-xs text-muted-foreground pt-1">
            {mode === "sign-in" ? (
              <span>
                {t.auth.dontHaveAccount}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setMode("sign-up");
                  }}
                  className="rounded-sm font-semibold text-ink underline underline-offset-2 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {t.auth.signUpAction}
                </button>
              </span>
            ) : (
              <span>
                {t.auth.alreadyHaveAccount}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setMode("sign-in");
                  }}
                  className="rounded-sm font-semibold text-ink underline underline-offset-2 outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {t.auth.signInAction}
                </button>
              </span>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2, Chrome } from "lucide-react";
import { createClient } from "@/lib/firebase/client";
import { notifications } from "@/components/ui/notification-provider";
import { ADMIN_DASHBOARD_PATH } from "@/lib/admin-routes";

export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const setError = (message: string) => message && notifications.error(message, "Sign in failed");
    const setNotice = (message: string) => message && notifications.success(message, "Email sent");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const firebase = createClient();
            const { error: authError } = await firebase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError(authError.message);
            } else {
                router.push(ADMIN_DASHBOARD_PATH);
                router.refresh();
            }
        } catch {
            setError("An unexpected error occurred. Please try again.");
        }

        setIsLoading(false);
    };

    const handleGoogleSignIn = async () => {
        setError("");
        setIsLoading(true);

        const firebase = createClient();
        const { error: authError } = await firebase.auth.signInWithGoogle();
        if (authError) {
            setError(authError.message);
            setIsLoading(false);
            return;
        }

        router.push(ADMIN_DASHBOARD_PATH);
        router.refresh();
    };

    const handlePasswordSetup = async () => {
        setError("");
        setNotice("");
        if (!email.trim()) {
            setError("Enter your invited email address first.");
            return;
        }
        setIsLoading(true);
        const { error: resetError } = await createClient().auth.sendPasswordSetup(email.trim());
        if (resetError) setError(resetError.message);
        else setNotice("If this email has an account, Firebase has sent a password setup link.");
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[var(--light)]">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Large geometric accent — top right */}
                <div
                    className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-[0.07]"
                    style={{
                        background:
                            "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
                    }}
                />
                {/* Small geometric accent — bottom left */}
                <div
                    className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full opacity-[0.05]"
                    style={{
                        background:
                            "radial-gradient(circle, var(--secondary) 0%, transparent 70%)",
                    }}
                />
                {/* Subtle pattern overlay */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2334708D' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />
            </div>

            {/* Login Card */}
            <div className="relative w-full max-w-md mx-4 animate-fadeInUp">
                {/* Gold accent bar at top */}
                <div className="h-1.5 bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--primary)] rounded-t-2xl" />

                <div className="bg-white rounded-b-2xl shadow-2xl shadow-black/10 px-8 py-10 md:px-10 md:py-12">
                    {/* Logo & Branding */}
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center gap-3 mb-5">
                            <Image
                                src="/images/logo.png"
                                alt="Al-QIsc Logo"
                                width={64}
                                height={64}
                                className="h-16 w-16 object-contain"
                            />
                        </div>
                        <h1 className="font-heading text-2xl md:text-3xl font-bold text-[var(--dark)] mb-1">
                            Admin Panel
                        </h1>
                        <p className="text-[var(--gray)] text-sm">
                            Al-Qur&apos;an &amp; Islamic Club — AIU
                        </p>
                    </div>

                    {/* Decorative Islamic geometric divider */}
                    <div className="flex items-center justify-center gap-2 mb-8">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--primary)]/20" />
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--secondary)]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--secondary)]" />
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--primary)]/20" />
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email Field */}
                        <div>
                            <label
                                htmlFor="admin-email"
                                className="block text-sm font-medium text-[var(--dark)] mb-2"
                            >
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gray)]">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <input
                                    id="admin-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="admin@alqisc.com"
                                    className="w-full pl-12 pr-4 py-3.5 bg-[var(--light)] border border-gray-200 rounded-xl text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)] transition-all duration-200"
                                />
                            </div>
                            <button type="button" onClick={() => void handlePasswordSetup()} disabled={isLoading} className="mt-2 text-xs font-semibold text-[var(--primary)] hover:underline disabled:opacity-60">
                                Set up or forgot your password?
                            </button>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label
                                htmlFor="admin-password"
                                className="block text-sm font-medium text-[var(--dark)] mb-2"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gray)]">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    id="admin-password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="Enter your password"
                                    className="w-full pl-12 pr-12 py-3.5 bg-[var(--light)] border border-gray-200 rounded-xl text-[var(--dark)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)] transition-all duration-200"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--gray)] hover:text-[var(--primary)] transition-colors"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Sign In Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[var(--primary)] text-white font-semibold rounded-xl hover:bg-[var(--primary-dark)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[var(--primary)]/20 hover:shadow-xl hover:shadow-[var(--primary)]/30 hover:-translate-y-0.5"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5" />
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>

                    <div className="flex items-center gap-3 my-6">
                        <div className="h-px flex-1 bg-gray-200" />
                        <span className="text-xs uppercase tracking-wider text-gray-400">or</span>
                        <div className="h-px flex-1 bg-gray-200" />
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 py-3.5 border border-gray-200 bg-white text-[var(--dark)] font-semibold rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <Chrome className="w-5 h-5" />
                        Continue with Google
                    </button>

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                        <p className="text-xs text-[var(--gray)]">
                            AlQISC Admin Panel © {new Date().getFullYear()}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Al-Qur&apos;an &amp; Islamic Club — Albukhary International
                            University
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

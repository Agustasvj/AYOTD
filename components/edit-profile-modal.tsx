"use client";

import { useState, useEffect } from "react";
import {
  X,
  User,
  Phone,
  MapPin,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck
} from "lucide-react";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
    name: string;
    phone: string;
    address?: string;
  };
  onSuccess: (updatedUser: {
    id: string;
    name: string;
    phone: string;
    address?: string;
  }) => void;
}

export function EditProfileModal({
  isOpen,
  onClose,
  currentUser,
  onSuccess
}: EditProfileModalProps) {
  const [name, setName] = useState(currentUser.name || "");
  const [phone, setPhone] = useState(currentUser.phone || "");
  const [address, setAddress] = useState(currentUser.address || "");

  // Optional password change
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name || "");
      setPhone(currentUser.phone || "");
      setAddress(currentUser.address || "");
      setError("");
      setSuccess("");
      setShowPasswordChange(false);
      setCurrentPassword("");
      setNewPassword("");
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload: any = {
        name,
        phone,
        address
      };

      if (showPasswordChange && newPassword) {
        if (!currentPassword) {
          throw new Error("Please enter your current password to set a new password.");
        }
        if (newPassword.length < 4) {
          throw new Error("New password must be at least 4 characters long.");
        }
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      setSuccess("Profile updated successfully!");
      onSuccess(data.user);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-red-400">
              Account Management
            </div>
            <h2 className="text-lg font-black text-white mt-0.5">
              Edit Your Profile
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-3 text-zinc-500" />
              <input
                required
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10 text-sm py-2.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Phone Number (for M-Pesa payments) *
            </label>
            <div className="relative">
              <Phone size={15} className="absolute left-3.5 top-3 text-zinc-500" />
              <input
                required
                type="tel"
                placeholder="0712345678 or 0112345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10 text-sm py-2.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Default Campus Delivery Address
            </label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3.5 top-3 text-zinc-500" />
              <input
                type="text"
                placeholder="e.g. Hall 4 (Moi), Room 218"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="pl-10 text-sm py-2.5"
              />
            </div>
          </div>

          {/* Password Accordion */}
          <div className="pt-2 border-t border-zinc-850">
            <button
              type="button"
              onClick={() => setShowPasswordChange(!showPasswordChange)}
              className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1.5"
            >
              <Lock size={13} />
              {showPasswordChange ? "Cancel Password Change" : "Change Password"}
            </button>

            {showPasswordChange && (
              <div className="mt-3 space-y-3 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="text-xs py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    New Password (Min 4 chars)
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="text-xs py-2"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-sm py-3 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving Changes...
                </>
              ) : (
                "Save Profile Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


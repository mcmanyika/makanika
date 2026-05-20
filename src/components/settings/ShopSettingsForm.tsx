"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { updateShop } from "@/lib/firebase/mutations";
import { Shop } from "@/types";

const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern (America/New_York)" },
  { value: "America/Chicago", label: "Central (America/Chicago)" },
  { value: "America/Denver", label: "Mountain (America/Denver)" },
  { value: "America/Phoenix", label: "Arizona (America/Phoenix)" },
  { value: "America/Los_Angeles", label: "Pacific (America/Los_Angeles)" },
  { value: "America/Anchorage", label: "Alaska (America/Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Pacific/Honolulu)" },
];

interface ShopSettingsFormProps {
  shop: Shop;
  canEdit: boolean;
}

export function ShopSettingsForm({ shop, canEdit }: ShopSettingsFormProps) {
  const [name, setName] = useState(shop.name);
  const [address, setAddress] = useState(shop.address);
  const [city, setCity] = useState(shop.city);
  const [state, setState] = useState(shop.state);
  const [zip, setZip] = useState(shop.zip);
  const [phone, setPhone] = useState(shop.phone);
  const [email, setEmail] = useState(shop.email);
  const [timezone, setTimezone] = useState(shop.timezone);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setName(shop.name);
    setAddress(shop.address);
    setCity(shop.city);
    setState(shop.state);
    setZip(shop.zip);
    setPhone(shop.phone);
    setEmail(shop.email);
    setTimezone(shop.timezone);
  }, [shop]);

  const inputClass =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-500";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      await updateShop(shop.id, {
        name,
        address,
        city,
        state,
        zip,
        phone,
        email,
        timezone,
      });
      setSuccess("Shop profile saved.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save shop profile."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shop profile</CardTitle>
        {!canEdit && (
          <p className="text-sm text-slate-500">
            Only shop admins can edit these settings.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormFeedback error={error} success={success} />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Shop name *
            </label>
            <input
              type="text"
              required
              disabled={!canEdit || submitting}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Street address *
            </label>
            <input
              type="text"
              required
              disabled={!canEdit || submitting}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                City *
              </label>
              <input
                type="text"
                required
                disabled={!canEdit || submitting}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                State *
              </label>
              <input
                type="text"
                required
                maxLength={2}
                disabled={!canEdit || submitting}
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                className={inputClass}
                placeholder="TX"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                ZIP code *
              </label>
              <input
                type="text"
                required
                disabled={!canEdit || submitting}
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Phone *
              </label>
              <input
                type="tel"
                required
                disabled={!canEdit || submitting}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email *
            </label>
            <input
              type="email"
              required
              disabled={!canEdit || submitting}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Timezone *
            </label>
            <select
              required
              disabled={!canEdit || submitting}
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className={inputClass}
            >
              {US_TIMEZONES.some((tz) => tz.value === timezone) ? null : (
                <option value={timezone}>{timezone}</option>
              )}
              {US_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {canEdit && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => {
                  setName(shop.name);
                  setAddress(shop.address);
                  setCity(shop.city);
                  setState(shop.state);
                  setZip(shop.zip);
                  setPhone(shop.phone);
                  setEmail(shop.email);
                  setTimezone(shop.timezone);
                  setError("");
                  setSuccess("");
                }}
              >
                Reset
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Home,
  Hotel,
  Loader2,
  MapPin,
  MapPinOff,
  Search,
  Users,
  X,
} from "lucide-react";
import { useZebQuick } from "@/context/ZebQuickContext";
import { useAuth } from "@/context/AuthContext";

export interface SavedZebQuickAddress {
  label: "Home" | "Work" | "Hotel" | "Other";
  name: string;
  phone: string;
  city: string;
  areaStreet: string;
  houseLine: string;
  buildingName?: string;
  landmark?: string;
  pincode: string;
}

interface CityItem {
  name: string;
  areaCount: number;
}

interface StreetSuggestion {
  title: string;
  subtitle: string;
  area_name: string;
  city: string;
  pincode: string;
  serviceable: boolean;
  source: "admin" | "osm";
}

export function ZebQuickAddressSheet({
  open,
  initialAddress,
  onClose,
  onSave,
}: {
  open: boolean;
  initialAddress: SavedZebQuickAddress | null;
  onClose: () => void;
  onSave: (addr: SavedZebQuickAddress) => Promise<void> | void;
}) {
  const { user } = useAuth();
  const { pincode, serviceability, detectGpsPincode, setPincode } = useZebQuick();

  const [cities, setCities] = useState<CityItem[]>([]);
  const [selectedCity, setSelectedCity] = useState(
    initialAddress?.city || serviceability.city || ""
  );
  const [selectedArea, setSelectedArea] = useState(
    initialAddress?.areaStreet || serviceability.areaName || ""
  );
  const [selectedPin, setSelectedPin] = useState(initialAddress?.pincode || pincode);
  const [completeAddress, setCompleteAddress] = useState(initialAddress?.houseLine || "");
  const [buildingName, setBuildingName] = useState(initialAddress?.buildingName || "");
  const [landmark, setLandmark] = useState(initialAddress?.landmark || "");
  const [contactFor, setContactFor] = useState<"myself" | "someone">("myself");
  const [receiverName, setReceiverName] = useState(
    initialAddress?.name || user?.user_metadata?.full_name || ""
  );
  const [receiverPhone, setReceiverPhone] = useState(
    initialAddress?.phone || user?.user_metadata?.phone || ""
  );
  const [label, setLabel] = useState<"Home" | "Work" | "Hotel" | "Other">(
    initialAddress?.label || "Home"
  );

  // Sub-modals: Select a city / Select an area, street
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [areaSearch, setAreaSearch] = useState("");
  const [streetResults, setStreetResults] = useState<StreetSuggestion[]>([]);
  const [searchingStreets, setSearchingStreets] = useState(false);

  const [gpsLoading, setGpsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Admin-configured cities & areas when sheet opens
  useEffect(() => {
    if (!open) return;
    fetch("/api/zeb-quick/locations")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.cities)) setCities(d.cities);
        if (Array.isArray(d.streetSuggestions)) setStreetResults(d.streetSuggestions);
      })
      .catch(() => {});
  }, [open]);

  // Live area/street search (Admin areas + OSM streets)
  useEffect(() => {
    if (!areaModalOpen) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      setSearchingStreets(true);
      try {
        const params = new URLSearchParams();
        if (areaSearch.trim()) params.set("q", areaSearch.trim());
        if (selectedCity.trim()) params.set("city", selectedCity.trim());
        const res = await fetch(`/api/zeb-quick/locations?${params.toString()}`);
        const data = await res.json();
        if (active && Array.isArray(data.streetSuggestions)) {
          setStreetResults(data.streetSuggestions);
        }
      } catch {
      } finally {
        if (active) setSearchingStreets(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [areaModalOpen, areaSearch, selectedCity]);

  if (!open) return null;

  const handleEnableGps = async () => {
    setGpsLoading(true);
    setError(null);
    const res = await detectGpsPincode();
    setGpsLoading(false);
    if (res.ok && res.pincode) {
      setSelectedPin(res.pincode);
      const checkRes = await fetch(`/api/zeb-quick/pincode-check?pincode=${res.pincode}`)
        .then((r) => r.json())
        .catch(() => null);
      if (checkRes?.serviceable) {
        setSelectedCity(checkRes.city || serviceability.city || "");
        setSelectedArea(checkRes.area_name || serviceability.areaName || "");
      } else {
        setError(`Detected Pincode ${res.pincode} is not serviceable yet. Please pick a live city & area below.`);
      }
    } else {
      setError(res.error || "Unable to detect GPS location. Please select your city & area manually.");
    }
  };

  const handleContactMode = (mode: "myself" | "someone") => {
    setContactFor(mode);
    if (mode === "myself") {
      setReceiverName(user?.user_metadata?.full_name || receiverName);
      setReceiverPhone(user?.user_metadata?.phone || receiverPhone);
    } else {
      setReceiverName("");
      setReceiverPhone("");
    }
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanPin = selectedPin.replace(/\D/g, "").slice(0, 6);
    const cleanPhone = receiverPhone.replace(/\D/g, "").slice(-10);

    if (!selectedCity.trim()) {
      setError("Please select a city.");
      return;
    }
    if (!selectedArea.trim() || cleanPin.length !== 6) {
      setError("Please select an area / street with a valid serviceable pincode.");
      return;
    }
    if (!completeAddress.trim()) {
      setError("Please enter House / Flat / Plot No.");
      return;
    }
    if (!landmark.trim()) {
      setError("Please enter a nearby Landmark.");
      return;
    }
    if (!receiverName.trim()) {
      setError("Please enter receiver's name.");
      return;
    }
    if (cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setSaving(true);
    try {
      await setPincode(cleanPin);
      await onSave({
        label,
        name: receiverName.trim(),
        phone: cleanPhone,
        city: selectedCity.trim(),
        areaStreet: selectedArea.trim(),
        houseLine: completeAddress.trim(),
        buildingName: buildingName.trim(),
        landmark: landmark.trim(),
        pincode: cleanPin,
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredCities = cities.filter((c) =>
    !citySearch.trim() ? true : c.name.toLowerCase().includes(citySearch.trim().toLowerCase())
  );
  const topCities = filteredCities.slice(0, 6);
  const otherCities = filteredCities.slice(6);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F4F6FB]">
      {/* Top Header */}
      <div className="border-b border-neutral-200 bg-white px-4 py-3.5">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100 cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-900" />
          </button>
          <h2 className="text-base font-black text-neutral-950">Add address details</h2>
        </div>
      </div>

      {/* Scrollable Form */}
      <form onSubmit={handleNext} className="flex-1 overflow-y-auto px-3.5 py-4 pb-28">
        <div className="mx-auto max-w-xl space-y-4">
          {/* GPS Auto-Fill Banner (Screenshot 1) */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50/70 px-3.5 py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-rose-600 shadow-xs shrink-0">
                <MapPinOff className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-neutral-900 leading-snug">
                  Adding address at your current location?
                </p>
                <p className="text-[11px] font-medium text-neutral-600">
                  Enable it to auto-fill the address
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={gpsLoading}
              onClick={handleEnableGps}
              className="rounded-xl bg-[#0C831F] px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-[#096b18] cursor-pointer shrink-0 disabled:opacity-60"
            >
              {gpsLoading ? "..." : "Enable"}
            </button>
          </div>

          {/* Address Details Card */}
          <div className="rounded-3xl border border-neutral-200/80 bg-white p-4 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-neutral-950">Address details</h3>

            {/* Select a city */}
            <div
              onClick={() => setCityModalOpen(true)}
              className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 p-3 hover:border-[#0C831F] cursor-pointer transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-neutral-900 truncate">
                    {selectedCity || "Select a city"}
                  </p>
                  {selectedCity && (
                    <p className="text-[10.5px] font-semibold text-emerald-700">Serviceable city</p>
                  )}
                </div>
              </div>
              <span className="rounded-xl border border-neutral-200 px-3 py-1 text-xs font-extrabold text-[#0C831F] shrink-0">
                {selectedCity ? "Change" : "Select"}
              </span>
            </div>

            {/* Select an area, street */}
            <div
              onClick={() => setAreaModalOpen(true)}
              className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 p-3 hover:border-[#0C831F] cursor-pointer transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-neutral-900 truncate">
                    {selectedArea ? `${selectedArea}` : "Select an area, street"}
                  </p>
                  {selectedPin && (
                    <p className="text-[10.5px] font-semibold text-neutral-500">
                      Pincode {selectedPin}
                    </p>
                  )}
                </div>
              </div>
              <span className="rounded-xl border border-neutral-200 px-3 py-1 text-xs font-extrabold text-[#0C831F] shrink-0">
                {selectedArea ? "Change" : "Select"}
              </span>
            </div>

            {/* Step-by-Step Address Boxes: House/Flat No., Building Name, Landmark */}
            <div className="space-y-2.5 pt-1">
              <div>
                <label className="block px-1 mb-1 text-[11px] font-bold text-neutral-600">
                  House / Flat / Plot No. *
                </label>
                <input
                  required
                  value={completeAddress}
                  onChange={(e) => setCompleteAddress(e.target.value)}
                  placeholder="e.g. Flat 3B, House No. 112"
                  className="w-full rounded-2xl border border-neutral-200 px-3.5 py-2.5 text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:border-[#0C831F] focus:outline-none"
                />
              </div>

              <div>
                <label className="block px-1 mb-1 text-[11px] font-bold text-neutral-600">
                  Building / Apartment / Floor Name
                </label>
                <input
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  placeholder="e.g. Shree Vihar Residency, 2nd Floor"
                  className="w-full rounded-2xl border border-neutral-200 px-3.5 py-2.5 text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:border-[#0C831F] focus:outline-none"
                />
              </div>

              <div>
                <label className="block px-1 mb-1 text-[11px] font-bold text-neutral-600">
                  Nearby Landmark *
                </label>
                <input
                  required
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder={`e.g. Near Station Road / Kali Mandir, ${selectedArea || "Chakdaha"}`}
                  className="w-full rounded-2xl border border-neutral-200 px-3.5 py-2.5 text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:border-[#0C831F] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="rounded-3xl border border-neutral-200/80 bg-white p-4 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-neutral-950">Contact details</h3>

            <div className="flex items-center gap-5">
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-900 cursor-pointer">
                <input
                  type="radio"
                  name="contactFor"
                  checked={contactFor === "myself"}
                  onChange={() => handleContactMode("myself")}
                  className="accent-[#0C831F] h-4 w-4"
                />
                Myself
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-900 cursor-pointer">
                <input
                  type="radio"
                  name="contactFor"
                  checked={contactFor === "someone"}
                  onChange={() => handleContactMode("someone")}
                  className="accent-[#0C831F] h-4 w-4"
                />
                Someone else
              </label>
            </div>

            <input
              required
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="Receiver's name*"
              className="w-full rounded-2xl border border-neutral-200 px-3.5 py-3 text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:border-[#0C831F] focus:outline-none"
            />

            <div className="flex items-center rounded-2xl border border-neutral-200 px-3.5 py-2.5 focus-within:border-[#0C831F]">
              <span className="mr-2 text-xs font-black text-neutral-700">+91</span>
              <input
                required
                type="tel"
                maxLength={10}
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="Receiver's phone number*"
                className="w-full text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
              />
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-xs font-bold text-neutral-500">Save address as</p>
              <div className="grid grid-cols-4 gap-2">
                {([
                  { key: "Home", Icon: Home },
                  { key: "Work", Icon: Building2 },
                  { key: "Hotel", Icon: Hotel },
                  { key: "Other", Icon: Users },
                ] as const).map(({ key, Icon }) => {
                  const active = label === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setLabel(key)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-extrabold transition cursor-pointer ${
                        active
                          ? "border-[#0C831F] bg-emerald-50 text-[#0C831F]"
                          : "border-neutral-200 bg-white text-neutral-700"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {key}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}
        </div>

        {/* Sticky Bottom Next CTA */}
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-white px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="mx-auto max-w-xl">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-[#0C831F] py-3.5 text-sm font-black text-white shadow-sm hover:bg-[#096b18] active:scale-[0.99] cursor-pointer disabled:opacity-60"
            >
              {saving ? "Saving..." : "Next"}
            </button>
          </div>
        </div>
      </form>

      {/* Sub-modal 1: Select a city (Screenshot 2) */}
      {cityModalOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/55 backdrop-blur-xs">
          <div className="mx-auto w-full max-w-xl">
            <div className="mb-3 flex justify-center">
              <button
                type="button"
                onClick={() => setCityModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[82vh] overflow-y-auto rounded-t-3xl bg-white p-5 space-y-4">
              <h3 className="text-base font-black text-neutral-950">Select a city</h3>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0C831F]" />
                <input
                  type="text"
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder="Search for a city"
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-4 text-sm font-medium text-neutral-900 focus:border-[#0C831F] focus:bg-white focus:outline-none"
                />
              </div>

              {topCities.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-xs font-extrabold text-neutral-500">Top cities (ZebQuick Live)</p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {topCities.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => {
                          setSelectedCity(c.name);
                          setSelectedArea("");
                          setSelectedPin("");
                          setCityModalOpen(false);
                          setAreaModalOpen(true);
                        }}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-center transition cursor-pointer ${
                          selectedCity === c.name
                            ? "border-[#0C831F] bg-emerald-50/60"
                            : "border-neutral-200 bg-white hover:border-[#0C831F]"
                        }`}
                      >
                        <Building2 className="h-7 w-7 text-neutral-700 stroke-[1.6]" />
                        <span className="text-xs font-extrabold text-neutral-900 leading-tight">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {otherCities.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-extrabold text-neutral-500">Other cities</p>
                  <div className="space-y-2">
                    {otherCities.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => {
                          setSelectedCity(c.name);
                          setSelectedArea("");
                          setSelectedPin("");
                          setCityModalOpen(false);
                          setAreaModalOpen(true);
                        }}
                        className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 px-4 py-3 text-left text-xs font-bold text-neutral-900 hover:border-[#0C831F] cursor-pointer"
                      >
                        <span>{c.name}</span>
                        <span className="text-[10.5px] font-semibold text-emerald-700">
                          {c.areaCount} areas
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredCities.length === 0 && (
                <p className="py-6 text-center text-xs font-semibold text-neutral-500">
                  No serviceable cities matched &ldquo;{citySearch}&rdquo;.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-modal 2: Select an area, street (Screenshot 3) */}
      {areaModalOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/55 backdrop-blur-xs">
          <div className="mx-auto w-full max-w-xl">
            <div className="mb-3 flex justify-center">
              <button
                type="button"
                onClick={() => setAreaModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="h-[78vh] flex flex-col rounded-t-3xl bg-white p-5 space-y-4">
              <h3 className="text-base font-black text-neutral-950">Select an area, street</h3>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0C831F]" />
                <input
                  type="text"
                  autoFocus
                  value={areaSearch}
                  onChange={(e) => setAreaSearch(e.target.value)}
                  placeholder={`Search area, street or pincode${selectedCity ? ` in ${selectedCity}` : ""}...`}
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-9 text-sm font-medium text-neutral-900 focus:border-[#0C831F] focus:bg-white focus:outline-none"
                />
                {areaSearch && (
                  <button
                    type="button"
                    onClick={() => setAreaSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5">
                {searchingStreets && (
                  <div className="flex items-center justify-center py-4 text-xs font-semibold text-neutral-500 gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#0C831F]" />
                    Searching areas &amp; streets...
                  </div>
                )}

                {streetResults.map((item, idx) => (
                  <button
                    key={`${item.title}-${item.pincode}-${idx}`}
                    type="button"
                    disabled={!item.serviceable}
                    onClick={() => {
                      if (!item.serviceable) return;
                      if (item.city) setSelectedCity(item.city);
                      setSelectedArea(item.area_name);
                      setSelectedPin(item.pincode);
                      setAreaModalOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                      item.serviceable
                        ? "border-neutral-200 bg-white hover:border-[#0C831F] cursor-pointer"
                        : "border-neutral-100 bg-neutral-50 opacity-65 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-extrabold text-neutral-950 truncate">{item.title}</p>
                        {item.serviceable ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9.5px] font-black text-emerald-700 shrink-0">
                            LIVE
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9.5px] font-black text-amber-700 shrink-0">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-neutral-500 line-clamp-2">{item.subtitle}</p>
                    </div>
                  </button>
                ))}

                {!searchingStreets && streetResults.length === 0 && (
                  <p className="py-6 text-center text-xs font-semibold text-neutral-500">
                    No matching areas found. Try another street or pincode.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

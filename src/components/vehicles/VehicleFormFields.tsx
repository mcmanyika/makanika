"use client";

const CURRENT_YEAR = new Date().getFullYear();

export interface VehicleFormValues {
  year: string;
  make: string;
  model: string;
  trim: string;
  licensePlate: string;
  vin: string;
  color: string;
  mileage: string;
}

export const emptyVehicleForm = (): VehicleFormValues => ({
  year: String(CURRENT_YEAR),
  make: "",
  model: "",
  trim: "",
  licensePlate: "",
  vin: "",
  color: "",
  mileage: "",
});

export function vehicleToFormValues(v: {
  year: number;
  make: string;
  model: string;
  trim?: string;
  licensePlate?: string;
  vin?: string;
  color?: string;
  mileage?: number;
}): VehicleFormValues {
  return {
    year: String(v.year),
    make: v.make,
    model: v.model,
    trim: v.trim ?? "",
    licensePlate: v.licensePlate ?? "",
    vin: v.vin ?? "",
    color: v.color ?? "",
    mileage: v.mileage != null ? String(v.mileage) : "",
  };
}

export function parseVehicleForm(values: VehicleFormValues): {
  year: number;
  make: string;
  model: string;
  trim?: string;
  licensePlate?: string;
  vin?: string;
  color?: string;
  mileage?: number;
  error?: string;
} {
  const yearNum = parseInt(values.year, 10);
  if (!values.make.trim() || !values.model.trim()) {
    return { year: 0, make: "", model: "", error: "Make and model are required." };
  }
  if (Number.isNaN(yearNum) || yearNum < 1900 || yearNum > CURRENT_YEAR + 1) {
    return {
      year: 0,
      make: "",
      model: "",
      error: `Enter a valid year (1900–${CURRENT_YEAR + 1}).`,
    };
  }
  const mileageNum = values.mileage
    ? parseInt(values.mileage.replace(/,/g, ""), 10)
    : undefined;
  if (values.mileage && (Number.isNaN(mileageNum!) || mileageNum! < 0)) {
    return { year: 0, make: "", model: "", error: "Enter a valid mileage." };
  }
  return {
    year: yearNum,
    make: values.make.trim(),
    model: values.model.trim(),
    trim: values.trim.trim() || undefined,
    licensePlate: values.licensePlate.trim() || undefined,
    vin: values.vin.trim() || undefined,
    color: values.color.trim() || undefined,
    mileage: mileageNum,
  };
}

interface VehicleFormFieldsProps {
  values: VehicleFormValues;
  onChange: (values: VehicleFormValues) => void;
  idPrefix?: string;
}

export function VehicleFormFields({
  values,
  onChange,
  idPrefix = "vehicle",
}: VehicleFormFieldsProps) {
  const set = (patch: Partial<VehicleFormValues>) =>
    onChange({ ...values, ...patch });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor={`${idPrefix}-year`}
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Year *
          </label>
          <input
            id={`${idPrefix}-year`}
            type="number"
            required
            min={1900}
            max={CURRENT_YEAR + 1}
            value={values.year}
            onChange={(e) => set({ year: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-make`}
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Make *
          </label>
          <input
            id={`${idPrefix}-make`}
            type="text"
            required
            value={values.make}
            onChange={(e) => set({ make: e.target.value })}
            placeholder="Honda"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-model`}
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Model *
          </label>
          <input
            id={`${idPrefix}-model`}
            type="text"
            required
            value={values.model}
            onChange={(e) => set({ model: e.target.value })}
            placeholder="Accord"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-trim`}
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Trim
          </label>
          <input
            id={`${idPrefix}-trim`}
            type="text"
            value={values.trim}
            onChange={(e) => set({ trim: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-color`}
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Color
          </label>
          <input
            id={`${idPrefix}-color`}
            type="text"
            value={values.color}
            onChange={(e) => set({ color: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-plate`}
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            License plate
          </label>
          <input
            id={`${idPrefix}-plate`}
            type="text"
            value={values.licensePlate}
            onChange={(e) => set({ licensePlate: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-mileage`}
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Mileage
          </label>
          <input
            id={`${idPrefix}-mileage`}
            type="text"
            inputMode="numeric"
            value={values.mileage}
            onChange={(e) => set({ mileage: e.target.value })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-vin`}
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          VIN
        </label>
        <input
          id={`${idPrefix}-vin`}
          type="text"
          value={values.vin}
          onChange={(e) => set({ vin: e.target.value })}
          maxLength={17}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
    </div>
  );
}

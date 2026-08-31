"use client";

import React, { useMemo } from "react";
import {
  PhoneInput as ReactPhoneInput,
  defaultCountries,
  parseCountry,
  CountryData,
} from "react-international-phone";
import "react-international-phone/style.css";

export type PhoneData = {
  countryCode: string; // e.g. "+91"
  dialCode: string; // e.g. "91"
  mobileNumber: string; // e.g. "9876543210"
  fullPhone: string; // e.g. "+919876543210"
  countryIso2: string; // e.g. "in"
  countryName: string; // e.g. "India"
  isValid: boolean;
  maxDigits: number;
};

export function getCountryMaxNationalDigits(iso2: string): number {
  const c = defaultCountries.find((x) => x[1] === iso2);
  if (!c) return 15;
  const parsed = parseCountry(c);
  let fmt = parsed.format;
  if (typeof fmt === "object" && fmt !== null) {
    fmt = (fmt as any).default || Object.values(fmt)[0] || "";
  }
  if (typeof fmt === "string") {
    const dots = (fmt.match(/\./g) || []).length;
    if (dots > 0) return dots;
  }
  return 15;
}

export function validatePhoneNumber(
  countryCode: string,
  mobileNumber: string,
  iso2?: string,
): { isValid: boolean; error?: string } {
  const digits = mobileNumber.replace(/\D/g, "");
  if (!digits) {
    return { isValid: false, error: "Mobile number is required." };
  }

  const cleanDialCode = countryCode.replace(/\D/g, "");
  const countryData = iso2
    ? defaultCountries.find((x) => x[1] === iso2)
    : defaultCountries.find((x) => parseCountry(x).dialCode === cleanDialCode);

  const targetIso2 = countryData ? parseCountry(countryData).iso2 : "in";
  const maxDigits = getCountryMaxNationalDigits(targetIso2);
  const countryName = countryData ? parseCountry(countryData).name : "Selected Country";
  const formattedCode = countryCode.startsWith("+") ? countryCode : `+${countryCode}`;

  if (digits.length < maxDigits) {
    return {
      isValid: false,
      error: `Phone number must be a valid ${maxDigits}-digit number for ${countryName} (${formattedCode}).`,
    };
  }

  if (digits.length > maxDigits) {
    return {
      isValid: false,
      error: `Phone number cannot exceed ${maxDigits} digits for ${countryName} (${formattedCode}).`,
    };
  }

  return { isValid: true };
}

interface PhoneInputProps {
  label?: string;
  value?: string; // Can be full phone "+919876543210" or national number "9876543210"
  countryCode?: string; // Optional dial code e.g. "+91"
  defaultCountry?: string; // iso2 e.g. "in"
  onChange?: (data: PhoneData) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  placeholder?: string;
  id?: string;
  className?: string;
}

export function PhoneInput({
  label,
  value = "",
  countryCode = "+91",
  defaultCountry = "in",
  onChange,
  error,
  disabled = false,
  required = false,
  name = "phone",
  placeholder,
  id,
  className = "",
}: PhoneInputProps) {
  // Construct full phone string for ReactPhoneInput
  const initialPhone = useMemo(() => {
    const trimmedVal = (value || "").trim();
    if (!trimmedVal) return countryCode ? `${countryCode}` : "+91";
    if (trimmedVal.startsWith("+")) return trimmedVal;
    
    // Clean country code prefix
    const cleanCode = countryCode.startsWith("+") ? countryCode : `+${countryCode}`;
    return `${cleanCode}${trimmedVal.replace(/\D/g, "")}`;
  }, [value, countryCode]);

  const handlePhoneChange = (phone: string, meta: { country: any; inputValue: string }) => {
    const country = meta.country || {};
    const iso2 = (country.iso2 || "in").toLowerCase();
    const dialCode = country.dialCode || "91";
    const codeWithPlus = `+${dialCode}`;
    const countryName = country.name || "Selected Country";

    // Extract national digits by stripping dial code
    let nationalRaw = phone;
    if (nationalRaw.startsWith("+")) {
      nationalRaw = nationalRaw.slice(1);
    }
    if (nationalRaw.startsWith(dialCode)) {
      nationalRaw = nationalRaw.slice(dialCode.length);
    }
    const mobileDigits = nationalRaw.replace(/\D/g, "");

    // Max digits restriction
    const maxDigits = getCountryMaxNationalDigits(iso2);
    const clampedDigits = mobileDigits.slice(0, maxDigits);

    const fullPhone = `${codeWithPlus}${clampedDigits}`;
    const validation = validatePhoneNumber(codeWithPlus, clampedDigits, iso2);

    onChange?.({
      countryCode: codeWithPlus,
      dialCode,
      mobileNumber: clampedDigits,
      fullPhone,
      countryIso2: iso2,
      countryName,
      isValid: validation.isValid,
      maxDigits,
    });
  };

  return (
    <div className={`grid w-full gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-bold text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div
        className={`custom-phone-container flex min-h-12 w-full items-center rounded-xl border bg-white text-sm transition-all focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 dark:bg-slate-900 ${
          error ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-200 dark:border-slate-800"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <ReactPhoneInput
          defaultCountry={defaultCountry}
          value={initialPhone}
          onChange={handlePhoneChange}
          disabled={disabled}
          forceDialCode
          preferredCountries={["in", "ae", "sa", "qa", "om", "kw", "bh", "us", "gb"]}
          className="w-full flex-1 border-0 bg-transparent"
          inputClassName="custom-phone-input flex-1 border-0 bg-transparent px-3 outline-none text-slate-900 dark:text-white font-medium focus:ring-0 placeholder:text-slate-400"
          countrySelectorStyleProps={{
            className: "custom-phone-country-wrapper h-full",
            buttonClassName:
              "custom-phone-country-btn flex h-full items-center gap-1.5 border-0 border-r border-slate-200 dark:border-slate-800 bg-transparent px-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors rounded-l-xl",
            buttonContentWrapperClassName: "flex items-center gap-1.5",
            dropdownStyleProps: {
              className:
                "z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 text-sm",
              listItemClassName:
                "px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors",
              listItemSelectedClassName: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold",
              listItemFocusedClassName: "bg-slate-100 dark:bg-slate-800",
            },
          }}
          inputProps={{
            id,
            name,
            inputMode: "tel",
            placeholder: placeholder || "Enter mobile number",
            autoComplete: "tel",
          }}
        />
      </div>

      {error && <p className="text-xs font-semibold text-rose-500">{error}</p>}

      <style jsx global>{`
        .custom-phone-container {
          width: 100% !important;
        }

        .custom-phone-container .react-international-phone-input-container {
          display: flex;
          align-items: center;
          width: 100% !important;
          height: 100%;
          border: 0;
          background: transparent;
        }

        .custom-phone-country-btn .react-international-phone-country-selector-button__dropdown-arrow {
          border-top-color: #94a3b8;
          margin-left: 2px;
        }

        .custom-phone-input.react-international-phone-input {
          width: 100% !important;
          min-width: 0 !important;
          flex: 1 1 0% !important;
          border: 0 !important;
          box-shadow: none !important;
          outline: none !important;
        }
      `}</style>
    </div>
  );
}

"use client";

import { useState } from "react";
import { provinces } from "@/lib/iran-locations";
import { FieldLabel, Select } from "@/components/ui/Input";

interface Props {
  initialProvince?: string;
  initialCity?: string;
}

export function ProvinceCitySelect({ initialProvince, initialCity }: Props) {
  const [selectedProvince, setSelectedProvince] = useState(initialProvince ?? "");
  const [selectedCity, setSelectedCity] = useState(initialCity ?? "");

  const currentProvince = provinces.find((p) => p.name === selectedProvince);
  const cities = currentProvince?.cities ?? [];

  return (
    <>
      <div>
        <FieldLabel htmlFor="p-province">استان</FieldLabel>
        <Select
          id="p-province"
          name="province"
          value={selectedProvince}
          onChange={(e) => {
            setSelectedProvince(e.target.value);
            setSelectedCity("");
          }}
        >
          <option value="">انتخاب استان</option>
          {provinces.map((p) => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </Select>
      </div>
      <div>
        <FieldLabel htmlFor="p-city">شهر</FieldLabel>
        <Select
          id="p-city"
          name="city"
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          disabled={!selectedProvince}
        >
          <option value="">انتخاب شهر</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </div>
    </>
  );
}

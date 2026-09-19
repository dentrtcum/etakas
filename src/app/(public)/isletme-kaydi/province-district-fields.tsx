"use client";

import { useState } from "react";
import { getDistrictsForProvince, TURKEY_PROVINCES } from "@/lib/turkey-locations";

export function ProvinceDistrictFields() {
  const [province, setProvince] = useState("");
  const districts = getDistrictsForProvince(province);

  return (
    <>
      <label>
        İl
        <select
          name="province"
          autoComplete="address-level1"
          value={province}
          onChange={(event) => setProvince(event.target.value)}
          required
        >
          <option value="">İl seçin</option>
          {TURKEY_PROVINCES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        İlçe
        <select
          key={province}
          name="district"
          autoComplete="address-level2"
          defaultValue=""
          disabled={!province}
          required
        >
          <option value="">{province ? "İlçe seçin" : "Önce il seçin"}</option>
          {districts.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

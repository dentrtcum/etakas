import { describe, expect, it } from "vitest";
import {
  getDistrictsForProvince,
  isValidProvinceDistrict,
  TURKEY_PROVINCES
} from "@/lib/turkey-locations";

describe("Türkiye il ve ilçe verisi", () => {
  it("contains all provinces and districts", () => {
    const districtCount = TURKEY_PROVINCES.reduce(
      (total, province) => total + getDistrictsForProvince(province).length,
      0
    );

    expect(TURKEY_PROVINCES).toHaveLength(81);
    expect(districtCount).toBe(973);
  });

  it("validates a district within its selected province", () => {
    expect(isValidProvinceDistrict("Kars", "Merkez")).toBe(true);
    expect(isValidProvinceDistrict("Kars", "Kadıköy")).toBe(false);
  });
});


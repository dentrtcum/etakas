import locationData from "@/data/turkey-locations.json";

export const TURKEY_PROVINCES = locationData.provinces.map(({ name }) => name);

const districtsByProvince = new Map(
  locationData.provinces.map(({ name, districts }) => [name, districts] as const)
);

export function getDistrictsForProvince(province: string) {
  return districtsByProvince.get(province) ?? [];
}

export function isValidProvinceDistrict(province: string, district: string) {
  return getDistrictsForProvince(province).includes(district);
}

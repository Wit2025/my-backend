import { ObjectId } from "mongodb";

export const ValidateDataCountry = async (data) => {
  const errors = [];

  for (const key in data) {
    if (data[key] === undefined || data[key] === null || data[key] === "") {
      errors.push(`${key} is required`);
    }
  }

  if (data.iso2 && data.iso2.length !== 2) {
    errors.push("iso2 must be 2 characters");
  }

  if (data.iso3 && data.iso3.length !== 3) {
    errors.push("iso3 must be 3 characters");
  }

  if (data.currency && data.currency.code && data.currency.code.length !== 3) {
    errors.push("currency code must be 3 characters");
  }

  return errors;
};
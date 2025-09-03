import { ObjectId } from "mongodb";
export const ValidateDataProvince = async (data) => {
  const errors = [];

  // ตรวจสอบ name
  if (!data.name) {
    errors.push("name is required");
  } else if (typeof data.name !== "string") {
    errors.push("name must be a string");
  } else if (data.name.trim().length === 0) {
    errors.push("name cannot be empty");
  } else if (data.name.length > 100) {
    errors.push("name must be less than 100 characters");
  }

  // ตรวจสอบ country_id
  if (!data.country_id) {
    errors.push("country_id is required");
  } else if (typeof data.country_id !== "string") {
    errors.push("country_id must be a string");
  } else if (!ObjectId.isValid(data.country_id)) {
    errors.push("country_id must be a valid ObjectId");
  }

  return errors;
};

export const ValidateUpdateProvince = async (data) => {
  const errors = [];

  if (data.name !== undefined) {
    if (typeof data.name !== "string") {
      errors.push("name must be a string");
    } else if (data.name.trim().length === 0) {
      errors.push("name cannot be empty");
    } else if (data.name.length > 100) {
      errors.push("name must be less than 100 characters");
    }
  }

  if (data.country_id !== undefined) {
    if (typeof data.country_id !== "string") {
      errors.push("country_id must be a string");
    } else if (!ObjectId.isValid(data.country_id)) {
      errors.push("country_id must be a valid ObjectId");
    }
  }

  return errors;
};
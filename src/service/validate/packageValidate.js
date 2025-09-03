import { ObjectId } from "mongodb";

// ตรวจสอบข้อมูลสร้าง package
export const ValidateDataPackage = async (data) => {
  const errors = [];

  // name
  if (!data.name) {
    errors.push("name is required");
  } else if (typeof data.name !== "string" || data.name.trim() === "") {
    errors.push("name must be a non-empty string");
  }

  // code
  if (!data.code) {
    errors.push("code is required");
  } else if (typeof data.code !== "string" || data.code.trim() === "") {
    errors.push("code must be a non-empty string");
  }

  // baseCurrency
  if (!data.baseCurrency) {
    errors.push("baseCurrency is required");
  } else if (typeof data.baseCurrency !== "string") {
    errors.push("baseCurrency must be a string");
  }

  // priceAdult
  if (data.priceAdult === undefined) {
    errors.push("priceAdult is required");
  } else if (typeof data.priceAdult !== "number") {
    errors.push("priceAdult must be a number");
  }

  // durationDays
  if (data.durationDays === undefined) {
    errors.push("durationDays is required");
  } else if (!Number.isInteger(data.durationDays)) {
    errors.push("durationDays must be an integer");
  }

  // isActive
  if (data.isActive === undefined) {
    errors.push("isActive is required");
  } else if (typeof data.isActive !== "boolean") {
    errors.push("isActive must be boolean");
  }

  return errors;
};

// ตรวจสอบข้อมูลอัปเดต package
export const ValidateUpdatePackage = async (data) => {
  const errors = [];

  if (data.name !== undefined) {
    if (typeof data.name !== "string" || data.name.trim() === "") {
      errors.push("name must be a non-empty string");
    }
  }

  if (data.code !== undefined) {
    if (typeof data.code !== "string" || data.code.trim() === "") {
      errors.push("code must be a non-empty string");
    }
  }

  if (data.baseCurrency !== undefined) {
    if (typeof data.baseCurrency !== "string") {
      errors.push("baseCurrency must be a string");
    }
  }

  if (data.priceAdult !== undefined) {
    if (typeof data.priceAdult !== "number") {
      errors.push("priceAdult must be a number");
    }
  }

  if (data.durationDays !== undefined) {
    if (!Number.isInteger(data.durationDays)) {
      errors.push("durationDays must be an integer");
    }
  }

  if (data.isActive !== undefined) {
    if (typeof data.isActive !== "boolean") {
      errors.push("isActive must be boolean");
    }
  }

  return errors;
};

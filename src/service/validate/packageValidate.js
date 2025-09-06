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

  // scheduledDepartures
  if (!data.scheduledDepartures || !Array.isArray(data.scheduledDepartures)) {
    errors.push("scheduledDepartures is required and must be an array");
  } else if (data.scheduledDepartures.length === 0) {
    errors.push("At least one scheduled departure is required");
  } else {
    data.scheduledDepartures.forEach((departure, index) => {
      if (!departure.departureDate) {
        errors.push(`departureDate is required for departure at index ${index}`);
      }
      if (!departure.returnDate) {
        errors.push(`returnDate is required for departure at index ${index}`);
      }
      if (departure.departureDate && departure.returnDate && 
          new Date(departure.departureDate) >= new Date(departure.returnDate)) {
        errors.push(`returnDate must be after departureDate for departure at index ${index}`);
      }
      if (!departure.availableSlots || departure.availableSlots <= 0) {
        errors.push(`availableSlots must be greater than 0 for departure at index ${index}`);
      }
    });
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

  if (data.scheduledDepartures !== undefined) {
    if (!Array.isArray(data.scheduledDepartures)) {
      errors.push("scheduledDepartures must be an array");
    } else {
      data.scheduledDepartures.forEach((departure, index) => {
        if (!departure.departureDate) {
          errors.push(`departureDate is required for departure at index ${index}`);
        }
        if (!departure.returnDate) {
          errors.push(`returnDate is required for departure at index ${index}`);
        }
        if (departure.departureDate && departure.returnDate && 
            new Date(departure.departureDate) >= new Date(departure.returnDate)) {
          errors.push(`returnDate must be after departureDate for departure at index ${index}`);
        }
        if (!departure.availableSlots || departure.availableSlots <= 0) {
          errors.push(`availableSlots must be greater than 0 for departure at index ${index}`);
        }
      });
    }
  }

  return errors;
};
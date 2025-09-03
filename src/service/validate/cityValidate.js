import { ObjectId } from "mongodb";

//=================City=================
export const ValidateDataCity = async (data) => {
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

  // ตรวจสอบ province_id
  if (!data.province_id) {
    errors.push("province_id is required");
  } else if (typeof data.province_id !== "string") {
    errors.push("province_id must be a string");
  } else if (!ObjectId.isValid(data.province_id)) {
    errors.push("province_id must be a valid ObjectId");
  }

  // ตรวจสอบ country_id
  if (!data.country_id) {
    errors.push("country_id is required");
  } else if (typeof data.country_id !== "string") {
    errors.push("country_id must be a string");
  } else if (!ObjectId.isValid(data.country_id)) {
    errors.push("country_id must be a valid ObjectId");
  }

  // ตรวจสอบ location (ถ้ามี)
  if (data.location) {
    if (typeof data.location !== "object") {
      errors.push("location must be an object");
    } else {
      if (data.location.type !== "Point") {
        errors.push("location.type must be 'Point'");
      }
      
      if (!Array.isArray(data.location.coordinates)) {
        errors.push("location.coordinates must be an array");
      } else if (data.location.coordinates.length !== 2) {
        errors.push("location.coordinates must have exactly 2 values [lng, lat]");
      } else {
        const [lng, lat] = data.location.coordinates;
        if (typeof lng !== "number" || typeof lat !== "number") {
          errors.push("location.coordinates must contain numbers only");
        }
        if (lng < -180 || lng > 180) {
          errors.push("longitude must be between -180 and 180");
        }
        if (lat < -90 || lat > 90) {
          errors.push("latitude must be between -90 and 90");
        }
      }
    }
  }

  return errors;
};

export const ValidateUpdateCity = async (data) => {
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

  if (data.province_id !== undefined) {
    if (typeof data.province_id !== "string") {
      errors.push("province_id must be a string");
    } else if (!ObjectId.isValid(data.province_id)) {
      errors.push("province_id must be a valid ObjectId");
    }
  }

  if (data.country_id !== undefined) {
    if (typeof data.country_id !== "string") {
      errors.push("country_id must be a string");
    } else if (!ObjectId.isValid(data.country_id)) {
      errors.push("country_id must be a valid ObjectId");
    }
  }

  if (data.location !== undefined) {
    if (typeof data.location !== "object") {
      errors.push("location must be an object");
    } else {
      if (data.location.type && data.location.type !== "Point") {
        errors.push("location.type must be 'Point'");
      }
      
      if (data.location.coordinates) {
        if (!Array.isArray(data.location.coordinates)) {
          errors.push("location.coordinates must be an array");
        } else if (data.location.coordinates.length !== 2) {
          errors.push("location.coordinates must have exactly 2 values [lng, lat]");
        } else {
          const [lng, lat] = data.location.coordinates;
          if (typeof lng !== "number" || typeof lat !== "number") {
            errors.push("location.coordinates must contain numbers only");
          }
          if (lng < -180 || lng > 180) {
            errors.push("longitude must be between -180 and 180");
          }
          if (lat < -90 || lat > 90) {
            errors.push("latitude must be between -90 and 90");
          }
        }
      }
    }
  }

  return errors;
};
import { ObjectId } from "mongodb";

//=================Attraction=================
export const ValidateDataAttraction = async (data) => {
  const errors = [];

  // ตรวจสอบ name
  if (!data.name) {
    errors.push("name is required");
  } else if (typeof data.name !== "string") {
    errors.push("name must be a string");
  } else if (data.name.trim().length === 0) {
    errors.push("name cannot be empty");
  } else if (data.name.length > 200) {
    errors.push("name must be less than 200 characters");
  }

  // ตรวจสอบ description (ถ้ามี)
  if (data.description !== undefined) {
    if (typeof data.description !== "string") {
      errors.push("description must be a string");
    } else if (data.description.length > 2000) {
      errors.push("description must be less than 2000 characters");
    }
  }

  // ตรวจสอบ city_id
  if (!data.city_id) {
    errors.push("city_id is required");
  } else if (typeof data.city_id !== "string") {
    errors.push("city_id must be a string");
  } else if (!ObjectId.isValid(data.city_id)) {
    errors.push("city_id must be a valid ObjectId");
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

  // ตรวจสอบ categories (ถ้ามี)
  if (data.categories !== undefined) {
    if (!Array.isArray(data.categories)) {
      errors.push("categories must be an array");
    } else {
      data.categories.forEach((category, index) => {
        if (typeof category !== "string") {
          errors.push(`categories[${index}] must be a string`);
        } else if (category.trim().length === 0) {
          errors.push(`categories[${index}] cannot be empty`);
        }
      });
    }
  }

  // ตรวจสอบ images (ถ้ามี)
  if (data.images !== undefined) {
    if (!Array.isArray(data.images)) {
      errors.push("images must be an array");
    } else {
      data.images.forEach((image, index) => {
        if (typeof image !== "string") {
          errors.push(`images[${index}] must be a string (URL)`);
        } else if (!isValidUrl(image)) {
          errors.push(`images[${index}] must be a valid URL`);
        }
      });
    }
  }

  // ตรวจสอบ ratingAvg (ถ้ามี)
  if (data.ratingAvg !== undefined) {
    if (typeof data.ratingAvg !== "number") {
      errors.push("ratingAvg must be a number");
    } else if (data.ratingAvg < 0 || data.ratingAvg > 5) {
      errors.push("ratingAvg must be between 0 and 5");
    }
  }

  // ตรวจสอบ ratingCount (ถ้ามี)
  if (data.ratingCount !== undefined) {
    if (!Number.isInteger(data.ratingCount)) {
      errors.push("ratingCount must be an integer");
    } else if (data.ratingCount < 0) {
      errors.push("ratingCount cannot be negative");
    }
  }

  // ตรวจสอบ isActive (ถ้ามี)
  if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
    errors.push("isActive must be a boolean");
  }

  return errors;
};

export const ValidateUpdateAttraction = async (data) => {
  const errors = [];

  if (data.name !== undefined) {
    if (typeof data.name !== "string") {
      errors.push("name must be a string");
    } else if (data.name.trim().length === 0) {
      errors.push("name cannot be empty");
    } else if (data.name.length > 200) {
      errors.push("name must be less than 200 characters");
    }
  }

  if (data.description !== undefined) {
    if (typeof data.description !== "string") {
      errors.push("description must be a string");
    } else if (data.description.length > 2000) {
      errors.push("description must be less than 2000 characters");
    }
  }

  if (data.city_id !== undefined) {
    if (typeof data.city_id !== "string") {
      errors.push("city_id must be a string");
    } else if (!ObjectId.isValid(data.city_id)) {
      errors.push("city_id must be a valid ObjectId");
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

  if (data.categories !== undefined) {
    if (!Array.isArray(data.categories)) {
      errors.push("categories must be an array");
    } else {
      data.categories.forEach((category, index) => {
        if (typeof category !== "string") {
          errors.push(`categories[${index}] must be a string`);
        } else if (category.trim().length === 0) {
          errors.push(`categories[${index}] cannot be empty`);
        }
      });
    }
  }

  if (data.images !== undefined) {
    if (!Array.isArray(data.images)) {
      errors.push("images must be an array");
    } else {
      data.images.forEach((image, index) => {
        if (typeof image !== "string") {
          errors.push(`images[${index}] must be a string (URL)`);
        } else if (!isValidUrl(image)) {
          errors.push(`images[${index}] must be a valid URL`);
        }
      });
    }
  }

  if (data.ratingAvg !== undefined) {
    if (typeof data.ratingAvg !== "number") {
      errors.push("ratingAvg must be a number");
    } else if (data.ratingAvg < 0 || data.ratingAvg > 5) {
      errors.push("ratingAvg must be between 0 and 5");
    }
  }

  if (data.ratingCount !== undefined) {
    if (!Number.isInteger(data.ratingCount)) {
      errors.push("ratingCount must be an integer");
    } else if (data.ratingCount < 0) {
      errors.push("ratingCount cannot be negative");
    }
  }

  if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
    errors.push("isActive must be a boolean");
  }

  return errors;
};

// Helper function สำหรับตรวจสอบ URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}
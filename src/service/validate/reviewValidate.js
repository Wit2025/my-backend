import { ObjectId } from "mongodb";

export const ValidateCreateReview = async (data) => {
  const errors = [];

  if (!data.user_id) errors.push("user_id is required");
  if (!ObjectId.isValid(data.user_id)) errors.push("user_id must be ObjectId");

  if (!data.rating) errors.push("rating is required");
  if (typeof data.rating !== "number") errors.push("rating must be number");
  if (data.rating < 1 || data.rating > 5) errors.push("rating must be between 1-5");

  if (data.comment && typeof data.comment !== "string") 
    errors.push("comment must be string");

  if (data.photos) {
    if (!Array.isArray(data.photos)) errors.push("photos must be array");
    else {
      data.photos.forEach((photo, idx) => {
        if (typeof photo !== "string") 
          errors.push(`photos[${idx}] must be string`);
      });
    }
  }

  if (!data.target) errors.push("target is required");
  else {
    if (!data.target.type) errors.push("target.type is required");
    if (!["package", "attraction"].includes(data.target.type)) 
      errors.push("target.type must be 'package' or 'attraction'");

    if (!data.target.id) errors.push("target.id is required");
    if (data.target.id && !ObjectId.isValid(data.target.id)) 
      errors.push("target.id must be ObjectId");
  }

  return errors;
};

export const ValidateUpdateReview = async (data) => {
  const errors = [];

  if (data.rating !== undefined) {
    if (typeof data.rating !== "number") errors.push("rating must be number");
    if (data.rating < 1 || data.rating > 5) errors.push("rating must be between 1-5");
  }

  if (data.comment !== undefined && typeof data.comment !== "string") 
    errors.push("comment must be string");

  if (data.photos !== undefined) {
    if (!Array.isArray(data.photos)) errors.push("photos must be array");
    else {
      data.photos.forEach((photo, idx) => {
        if (typeof photo !== "string") 
          errors.push(`photos[${idx}] must be string`);
      });
    }
  }

  if (data.target) {
    if (data.target.type && !["package", "attraction"].includes(data.target.type)) 
      errors.push("target.type must be 'package' or 'attraction'");

    if (data.target.id && !ObjectId.isValid(data.target.id)) 
      errors.push("target.id must be ObjectId");
  }

  return errors;
};
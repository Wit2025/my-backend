import { ObjectId } from "mongodb";

export const ValidateCreateBooking = async (data) => {
  const errors = [];

  
  if (!data.user_id) errors.push("user_id is required");
  if (!ObjectId.isValid(data.user_id)) errors.push("user_id must be ObjectId");
  if (!data.status) errors.push("status is required");

  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push("items is required (at least 1)");
  } else {
    data.items.forEach((item, idx) => {
      if (!item.package_id) errors.push(`items[${idx}].package_id is required`);
      if (item.package_id && !ObjectId.isValid(item.package_id))
        errors.push(`items[${idx}].package_id must be ObjectId`);
      if (!item.title) errors.push(`items[${idx}].title is required`);
      if (typeof item.qtyAdults !== "number")
        errors.push(`items[${idx}].qtyAdults must be number`);
      if (typeof item.priceAdult !== "number")
        errors.push(`items[${idx}].priceAdult must be number`);
    });
  }

  if (!data.currency) errors.push("currency is required");
  
  // แก้ไข validation ของ amounts ให้ยืดหยุ่นมากขึ้น
  if (!data.amounts) {
    errors.push("amounts is required");
  } else {
    // ตรวจสอบเฉพาะ field ที่มีค่าเท่านั้น
    if (data.amounts.itemsTotal !== undefined && typeof data.amounts.itemsTotal !== "number")
      errors.push("amounts.itemsTotal must be number");
    if (data.amounts.discount !== undefined && typeof data.amounts.discount !== "number")
      errors.push("amounts.discount must be number");
    if (data.amounts.tax !== undefined && typeof data.amounts.tax !== "number")
      errors.push("amounts.tax must be number");
    if (data.amounts.fee !== undefined && typeof data.amounts.fee !== "number")
      errors.push("amounts.fee must be number");
    if (data.amounts.grandTotal !== undefined && typeof data.amounts.grandTotal !== "number")
      errors.push("amounts.grandTotal must be number");
  }

  return errors;
};

export const ValidateUpdateBooking = async (data) => {
  const errors = [];
  if (data.user_id && !ObjectId.isValid(data.user_id))
    errors.push("user_id must be ObjectId");

  if (data.items) {
    if (!Array.isArray(data.items)) {
      errors.push("items must be array");
    } else {
      data.items.forEach((item, idx) => {
        if (item.package_id && !ObjectId.isValid(item.package_id))
          errors.push(`items[${idx}].package_id must be ObjectId`);
      });
    }
  }

  return errors;
};
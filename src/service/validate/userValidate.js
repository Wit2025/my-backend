// service/validate/registerValidate.js
export const ValidateRegisterData = async (data) => {
  const errors = [];

  if (data.name !== undefined && !data.name) {
    errors.push("name is required");
  }

  if (data.email !== undefined && !data.email) {
    errors.push("email is required");
  } else if (data.email && !/\S+@\S+\.\S+/.test(data.email)) {
    errors.push("email is invalid");
  }

  if (data.phone !== undefined && !data.phone) {
    errors.push("phone is required");
  }

  if (data.password !== undefined && !data.password) {
    errors.push("password is required");
  } else if (data.password && data.password.length < 6) {
    errors.push("password must be at least 6 characters");
  }

  if (data.role !== undefined && !data.role) {
    errors.push("role is required");
  } else if (data.role && !["customer", "admin", "staff"].includes(data.role)) {
    errors.push("role must be customer, admin, or staff");
  }

  return errors;
};

// service/validate/loginValidate.js
export const ValidateLoginData = async (data) => {
  const errors = [];

  if (data.email !== undefined && !data.email) {
    errors.push("email is required");
  } else if (data.email && !/\S+@\S+\.\S+/.test(data.email)) {
    errors.push("email is invalid");
  }

  if (data.password !== undefined && !data.password) {
    errors.push("password is required");
  }
  // ไม่ตรวจสอบความยาวรหัสผ่านตอนล็อกอิน

  return errors;
};

// service/validate/updateProfileValidate.js
export const ValidateUpdateProfileData = async (data) => {
  const errors = [];

  // ตรวจสอบ name (ถ้ามีการส่งมา)
  if (data.name !== undefined) {
    if (!data.name || data.name.trim() === "") {
      errors.push("name cannot be empty");
    } else if (data.name.trim().length < 2) {
      errors.push("name must be at least 2 characters");
    }
  }

  // ตรวจสอบ email (ถ้ามีการส่งมา)
  if (data.email !== undefined) {
    if (!data.email || data.email.trim() === "") {
      errors.push("email cannot be empty");
    } else if (!/\S+@\S+\.\S+/.test(data.email)) {
      errors.push("email is invalid");
    }
  }

  // ตรวจสอบ phone (ถ้ามีการส่งมา)
  if (data.phone !== undefined) {
    if (!data.phone || data.phone.trim() === "") {
      errors.push("phone cannot be empty");
    } else if (!/^[0-9]{10,15}$/.test(data.phone.replace(/\D/g, ""))) {
      errors.push("phone number is invalid");
    }
  }

  // ไม่ตรวจสอบ password และ role ในกรณีอัปเดตโปรไฟล์

  return errors;
};

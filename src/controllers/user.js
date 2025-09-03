import { ObjectId } from "mongodb";
import getDB from "../config/db_mydb.js";
import { EMessage, SMessage } from "../service/message.js";
import { SendCreate, SendError, SendSuccess } from "../service/response.js";
import { ValidateRegisterData, ValidateLoginData, ValidateUpdateProfileData } from "../service/validate/userValidate.js";
import {
  Encrypt,
  Decrypt,
  GenerateToken,
  VerifyRefreshToken,
} from "../service/service.js";
import { v4 as uuidv4 } from "uuid";

// usersCollection เป็น async function
const usersCollection = async () => (await getDB()).collection("users");

export default class UserController {
  static async Register(req, res) {
    try {
      const { name, email, phone, password, role } = req.body;
      const validate = await ValidateRegisterData({
        name,
        email,
        phone,
        password,
        role,
      });
      if (validate.length > 0)
        return SendError(res, 400, EMessage.BadRequest + validate.join(","));

      const passwordHash = await Encrypt(password);
      const uuid = uuidv4(); // สร้าง uuid
      const user = {
        _id: new ObjectId(),
        uuid, // เพิ่ม uuid field
        name,
        email,
        phone,
        role: role || "customer",
        passwordHash,
        passport: {},
        addresses: [],
        loyaltyPoints: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const collection = await usersCollection();
      const result = await collection.insertOne(user);
      if (!result.insertedId) return SendError(res, 500, EMessage.ErrInsert);

      delete user.passwordHash;
      return SendCreate(res, SMessage.Register, user);
    } catch (err) {
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  static async Login(req, res) {
    try {
      const { email, password } = req.body;
      const validate = await ValidateLoginData({ email, password });
      if (validate.length > 0)
        return SendError(res, 400, EMessage.BadRequest + validate.join(","));

      const collection = await usersCollection();
      const user = await collection.findOne({ email });
      if (!user) return SendError(res, 404, EMessage.NotFound);

      const decrypted = await Decrypt(user.passwordHash);
      if (password !== decrypted)
        return SendError(res, 404, EMessage.IsNotMatch);

      delete user.passwordHash;

      // ใช้ uuid ในการสร้าง token (ถ้าไม่มี uuid ให้ใช้ _id)
      const tokenId = user.uuid || user._id.toString();
      const token = await GenerateToken(tokenId);
      const data = { ...user, ...token };
      return SendSuccess(res, SMessage.Login, data);
    } catch (err) {
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  static async SelectAll(req, res) {
    try {
      const collection = await usersCollection();
      const users = await collection
        .find(
          {},
          {
            projection: { passwordHash: 0 }, // ไม่ส่ง passwordHash
          }
        )
        .toArray();
      if (!users || users.length === 0)
        return SendError(res, 404, EMessage.NotFound, "users");
      return SendSuccess(res, SMessage.SelectAll, users);
    } catch (err) {
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  static async SelectOne(req, res) {
    try {
      const userIdentifier = req.params.userID;
      const collection = await usersCollection();

      // ลองหาด้วย uuid ก่อน ถ้าไม่เจอค่อยหาด้วย _id
      let user = await collection.findOne({ userID: userIdentifier });
      if (!user && ObjectId.isValid(userIdentifier)) {
        user = await collection.findOne({ _id: new ObjectId(userIdentifier) });
      }

      if (!user) return SendError(res, 404, EMessage.NotFound, "user");

      delete user.passwordHash;
      return SendSuccess(res, SMessage.SelectOne, user);
    } catch (err) {
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  static async updateProfile(req, res) {
    try {
      const userIdentifier = req.params.userID;
      const { name, phone, email } = req.body;

      // ตรวจสอบเฉพาะ field ที่ส่งมา
      const validateFields = {};
      if (name !== undefined) validateFields.name = name;
      if (phone !== undefined) validateFields.phone = phone;
      if (email !== undefined) validateFields.email = email;

      const validate = await ValidateUpdateProfileData(validateFields);
      if (validate.length > 0)
        return SendError(res, 400, EMessage.BadRequest + validate.join(","));

      const collection = await usersCollection();

      // สร้าง filter สำหรับค้นหาผู้ใช้
      let filter;
      if (ObjectId.isValid(userIdentifier)) {
        filter = {
          $or: [
            { uuid: userIdentifier },
            { _id: new ObjectId(userIdentifier) },
          ],
        };
      } else {
        filter = { uuid: userIdentifier };
      }

      // ดึงข้อมูลผู้ใช้ปัจจุบัน
      const currentUser = await collection.findOne(filter);
      if (!currentUser) {
        return SendError(res, 404, EMessage.NotFound, "user");
      }

      // สร้าง object สำหรับอัปเดตเฉพาะ field ที่เปลี่ยนแปลง
      const updateData = { updatedAt: new Date() };
      let hasChanges = false;

      // ฟังก์ชันตรวจสอบว่าค่าแตกต่างและไม่ว่างเปล่า
      const hasValidChange = (newValue, oldValue) => {
        if (newValue === undefined || newValue === null) return false;
        if (typeof newValue === "string" && newValue.trim() === "")
          return false;
        return newValue !== oldValue;
      };

      // ตรวจสอบแต่ละ field ว่ามีการเปลี่ยนแปลงและ valid หรือไม่
      if (hasValidChange(name, currentUser.name)) {
        updateData.name = name;
        hasChanges = true;
      }

      if (hasValidChange(phone, currentUser.phone)) {
        updateData.phone = phone;
        hasChanges = true;
      }

      if (hasValidChange(email, currentUser.email)) {
        updateData.email = email;
        hasChanges = true;
      }

      // ถ้าไม่มี field ใดๆ ที่เปลี่ยนแปลง
      if (!hasChanges) {
        return SendError(res, 400, "No valid changes detected");
      }

      // ใช้ updateOne แทน findOneAndUpdate
      const updateResult = await collection.updateOne(filter, {
        $set: updateData,
      });

      // ตรวจสอบว่าอัปเดตสำเร็จหรือไม่
      if (updateResult.modifiedCount === 0) {
        return SendError(res, 404, EMessage.ErrUpdate);
      }

      // ดึงข้อมูลผู้ใช้ล่าสุด (ไม่รวม passwordHash)
      const updatedUser = await collection.findOne(filter, {
        projection: { passwordHash: 0 },
      });

      if (!updatedUser) {
        return SendError(res, 404, EMessage.NotFound, "user");
      }

      return SendSuccess(res, SMessage.Update, updatedUser);
    } catch (err) {
      console.error("Update profile error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  static async deleteUser(req, res) {
    try {
      const userIdentifier = req.params.userID;
      const collection = await usersCollection();

      // ลองหาด้วย uuid ก่อน ถ้าไม่เจอค่อยหาด้วย _id
      let filter = { uuid: userIdentifier };
      if (ObjectId.isValid(userIdentifier)) {
        filter = {
          $or: [
            { uuid: userIdentifier },
            { _id: new ObjectId(userIdentifier) },
          ],
        };
      }

      const user = await collection.findOne(filter);
      if (!user) return SendError(res, 404, EMessage.NotFound, "user");

      await collection.deleteOne(filter);
      return SendSuccess(res, SMessage.Delete);
    } catch (err) {
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  static async RefreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken)
        return SendError(res, 400, EMessage.BadRequest + "refreshToken");

      const result = await VerifyRefreshToken(refreshToken);
      if (!result) return SendError(res, 404, EMessage.NotFound);

      return SendSuccess(res, SMessage.Update, result);
    } catch (err) {
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }
}

import { ObjectId } from "mongodb";
import getDB from "../config/db_mydb.js";
import { EMessage, SMessage } from "../service/message.js";
import { SendCreate, SendError, SendSuccess } from "../service/response.js";
import {
  ValidateDataProvince,
  ValidateUpdateProvince,
} from "../service/validate/provinceValidate.js";

// provincesCollection async function
const provincesCollection = async () => (await getDB()).collection("provinces");
const countriesCollection = async () => (await getDB()).collection("countries");

export default class ProvinceController {
  // สร้างจังหวัดใหม่
  static async Create(req, res) {
    try {
      const { name, country_id } = req.body;

      const validate = await ValidateDataProvince({
        name,
        country_id,
      });

      if (validate.length > 0)
        return SendError(res, 400, EMessage.BadRequest + validate.join("/"));

      // ตรวจสอบว่าประเทศมีอยู่จริง
      const countryCollection = await countriesCollection();
      const country = await countryCollection.findOne({
        _id: new ObjectId(country_id),
      });

      if (!country) return SendError(res, 404, "Country not found");

      const province = {
        name,
        country_id: new ObjectId(country_id),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const collection = await provincesCollection();
      const result = await collection.insertOne(province);

      if (!result.insertedId) return SendError(res, 500, EMessage.ErrInsert);

      return SendCreate(res, SMessage.Create, province);
    } catch (err) {
      console.error("Create province error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ดึงข้อมูลทั้งหมดจังหวัด
  static async SelectAll(req, res) {
    try {
      const collection = await provincesCollection();
      const provinces = await collection.find({}).toArray();

      if (!provinces || provinces.length === 0)
        return SendError(res, 404, EMessage.NotFound, "provinces");

      return SendSuccess(res, SMessage.SelectAll, provinces);
    } catch (err) {
      console.error("SelectAll provinces error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ดึงข้อมูลจังหวัดโดยใช้ ID
  static async SelectOne(req, res) {
    try {
      const provinceId = req.params.provinceID;
      const collection = await provincesCollection();

      let province;
      if (ObjectId.isValid(provinceId)) {
        province = await collection.findOne({ _id: new ObjectId(provinceId) });
      }

      if (!province) return SendError(res, 404, EMessage.NotFound, "province");

      return SendSuccess(res, SMessage.SelectOne, province);
    } catch (err) {
      console.error("SelectOne province error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ดึงข้อมูลจังหวัดโดยประเทศ
  static async SelectByCountry(req, res) {
    try {
      const countryId = req.params.countryID;
      const collection = await provincesCollection();

      const provinces = await collection
        .find({
          country_id: new ObjectId(countryId),
        })
        .toArray();

      return SendSuccess(res, SMessage.SelectAll, provinces);
    } catch (err) {
      console.error("SelectByCountry provinces error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // อัปเดตข้อมูลจังหวัด
  static async Update(req, res) {
    try {
      const provinceId = req.params.provinceID;
      const { name, country_id } = req.body;

      // ตรวจสอบ validation เฉพาะ field ที่ส่งมา
      const validateData = {};
      if (name !== undefined) validateData.name = name;
      if (country_id !== undefined) validateData.country_id = country_id;

      const validate = await ValidateUpdateProvince(validateData);
      if (validate.length > 0)
        return SendError(res, 400, EMessage.BadRequest + validate.join("/"));

      const collection = await provincesCollection();

      // ดึงข้อมูลจังหวัดปัจจุบันจากฐานข้อมูล
      const currentProvince = await collection.findOne({
        _id: new ObjectId(provinceId),
      });

      if (!currentProvince) {
        return SendError(res, 404, EMessage.NotFound, "province");
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

      // ตรวจสอบ name ว่ามีการเปลี่ยนแปลงและ valid หรือไม่
      if (hasValidChange(name, currentProvince.name)) {
        updateData.name = name;
        hasChanges = true;
      }

      // ตรวจสอบ country_id ว่ามีการเปลี่ยนแปลงและ valid หรือไม่
      if (country_id !== undefined) {
        // ตรวจสอบว่าประเทศมีอยู่จริง
        const countryCollection = await countriesCollection();
        const country = await countryCollection.findOne({
          _id: new ObjectId(country_id),
        });

        if (!country) return SendError(res, 404, "Country not found");

        if (hasValidChange(country_id, currentProvince.country_id.toString())) {
          updateData.country_id = new ObjectId(country_id);
          hasChanges = true;
        }
      }

      // ถ้าไม่มี field ใดๆ ที่เปลี่ยนแปลง
      if (!hasChanges) {
        return SendError(res, 400, "No valid changes detected");
      }

      const updateResult = await collection.updateOne(
        { _id: new ObjectId(provinceId) },
        { $set: updateData }
      );

      if (updateResult.modifiedCount === 0) {
        return SendError(res, 404, EMessage.ErrUpdate);
      }

      // ดึงข้อมูลล่าสุดหลังอัปเดต
      const updatedProvince = await collection.findOne({
        _id: new ObjectId(provinceId),
      });

      return SendSuccess(res, SMessage.Update, updatedProvince);
    } catch (err) {
      console.error("Update province error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ลบจังหวัด
  static async Delete(req, res) {
    try {
      const provinceId = req.params.provinceID;
      const collection = await provincesCollection();

      const province = await collection.findOne({
        _id: new ObjectId(provinceId),
      });
      if (!province) return SendError(res, 404, EMessage.NotFound, "province");

      await collection.deleteOne({ _id: new ObjectId(provinceId) });
      return SendSuccess(res, SMessage.Delete);
    } catch (err) {
      console.error("Delete province error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ค้นหาจังหวัดโดยชื่อ
  static async Search(req, res) {
    try {
      const { name } = req.query;
      if (!name) return SendError(res, 400, "Name parameter is required");

      const collection = await provincesCollection();
      const provinces = await collection
        .find({
          name: { $regex: name, $options: "i" },
        })
        .toArray();

      return SendSuccess(res, SMessage.SelectAll, provinces);
    } catch (err) {
      console.error("Search provinces error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }
}

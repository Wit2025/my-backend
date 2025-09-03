import { ObjectId } from "mongodb";
import getDB from "../config/db_mydb.js";
import { EMessage, SMessage } from "../service/message.js";
import { SendCreate, SendError, SendSuccess } from "../service/response.js";
import { ValidateDataCountry } from "../service/validate/countryValidate.js";

// countriesCollection async function
const countriesCollection = async () => (await getDB()).collection("countries");

export default class CountryController {
  // สร้างประเทศใหม่
  static async Create(req, res) {
    try {
      const { name, iso2, iso3, phoneCode, currency } = req.body;

      const validate = await ValidateDataCountry({
        name,
        iso2,
        iso3,
        currency,
      });

      if (validate.length > 0)
        return SendError(res, 400, EMessage.BadRequest + validate.join("/"));

      const country = {
        name,
        iso2: iso2.toUpperCase(),
        iso3: iso3.toUpperCase(),
        phoneCode: phoneCode || "",
        currency: {
          code: currency.code,
          name: currency.name || "",
          symbol: currency.symbol || "",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const collection = await countriesCollection();
      const result = await collection.insertOne(country);

      if (!result.insertedId) return SendError(res, 500, EMessage.ErrInsert);

      return SendCreate(res, SMessage.Create, country);
    } catch (err) {
      console.error("Create country error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ดึงข้อมูลทั้งหมดประเทศ
  static async SelectAll(req, res) {
    try {
      const collection = await countriesCollection();
      const countries = await collection.find({}).toArray();

      if (!countries || countries.length === 0)
        return SendError(res, 404, EMessage.NotFound, "countries");

      return SendSuccess(res, SMessage.SelectAll, countries);
    } catch (err) {
      console.error("SelectAll countries error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ดึงข้อมูลประเทศโดยใช้ ID
  static async SelectOne(req, res) {
    try {
      const countryId = req.params.countryID;
      const collection = await countriesCollection();

      let country;
      if (ObjectId.isValid(countryId)) {
        country = await collection.findOne({ _id: new ObjectId(countryId) });
      }

      if (!country) return SendError(res, 404, EMessage.NotFound, "country");

      return SendSuccess(res, SMessage.SelectOne, country);
    } catch (err) {
      console.error("SelectOne country error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ดึงข้อมูลประเทศโดยใช้ ISO code
  static async SelectByISO(req, res) {
    try {
      const { iso } = req.params;
      const collection = await countriesCollection();

      let country;
      if (iso.length === 2) {
        country = await collection.findOne({ iso2: iso.toUpperCase() });
      } else if (iso.length === 3) {
        country = await collection.findOne({ iso3: iso.toUpperCase() });
      } else {
        return SendError(res, 400, "Invalid ISO code format");
      }

      if (!country) return SendError(res, 404, EMessage.NotFound, "country");

      return SendSuccess(res, SMessage.SelectOne, country);
    } catch (err) {
      console.error("SelectByISO country error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // อัปเดตข้อมูลประเทศ
  s; // อัปเดตข้อมูลประเทศ
  static async Update(req, res) {
    try {
      const countryId = req.params.countryID;
      const { name, phoneCode, currency } = req.body;

      const collection = await countriesCollection();

      // ดึงข้อมูลประเทศปัจจุบันจากฐานข้อมูล
      const currentCountry = await collection.findOne({
        _id: new ObjectId(countryId),
      });

      if (!currentCountry) {
        return SendError(res, 404, EMessage.NotFound, "country");
      }

      // สร้าง object สำหรับอัปเดตเฉพาะ field ที่เปลี่ยนแปลง
      const updateData = { updatedAt: new Date() };
      let hasChanges = false;

      // ฟังก์ชันตรวจสอบว่าค่าแตกต่างและไม่ว่างเปล่า
      const hasValidChange = (newValue, oldValue, fieldType = "string") => {
        if (newValue === undefined || newValue === null) return false;

        switch (fieldType) {
          case "string":
            if (typeof newValue !== "string" || newValue.trim() === "")
              return false;
            return newValue !== oldValue;

          case "object":
            if (typeof newValue !== "object" || newValue === null) return false;
            return JSON.stringify(newValue) !== JSON.stringify(oldValue);

          default:
            return newValue !== oldValue;
        }
      };

      // ตรวจสอบ name
      if (hasValidChange(name, currentCountry.name, "string")) {
        updateData.name = name;
        hasChanges = true;
      }

      // ตรวจสอบ phoneCode
      if (phoneCode !== undefined) {
        const newPhoneCode = phoneCode === null ? "" : phoneCode;
        const currentPhoneCode = currentCountry.phoneCode || "";

        if (hasValidChange(newPhoneCode, currentPhoneCode, "string")) {
          updateData.phoneCode = newPhoneCode;
          hasChanges = true;
        }
      }

      // ตรวจสอบ currency
      if (currency !== undefined) {
        const newCurrency = {
          code: currency?.code || "",
          name: currency?.name || "",
          symbol: currency?.symbol || "",
        };

        const currentCurrency = currentCountry.currency || {
          code: "",
          name: "",
          symbol: "",
        };

        if (hasValidChange(newCurrency, currentCurrency, "object")) {
          // ตรวจสอบ currency code ต้องมี 3 ตัวอักษรถ้ามีค่า
          if (newCurrency.code && newCurrency.code.length !== 3) {
            return SendError(res, 400, "currency code must be 3 characters");
          }

          updateData.currency = newCurrency;
          hasChanges = true;
        }
      }

      // ถ้าไม่มี field ใดๆ ที่เปลี่ยนแปลง
      if (!hasChanges) {
        return SendError(res, 400, "No valid changes detected");
      }

      // ใช้ updateOne
      const updateResult = await collection.updateOne(
        { _id: new ObjectId(countryId) },
        { $set: updateData }
      );

      // ตรวจสอบว่าอัปเดตสำเร็จหรือไม่
      if (updateResult.modifiedCount === 0) {
        return SendError(res, 404, EMessage.ErrUpdate);
      }

      // ดึงข้อมูลล่าสุดหลังอัปเดต
      const updatedCountry = await collection.findOne({
        _id: new ObjectId(countryId),
      });

      if (!updatedCountry) {
        return SendError(res, 404, EMessage.NotFound, "country");
      }

      return SendSuccess(res, SMessage.Update, updatedCountry);
    } catch (err) {
      console.error("Update country error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ลบประเทศ
  static async Delete(req, res) {
    try {
      const countryId = req.params.countryID;
      const collection = await countriesCollection();

      const country = await collection.findOne({
        _id: new ObjectId(countryId),
      });
      if (!country) return SendError(res, 404, EMessage.NotFound, "country");

      await collection.deleteOne({ _id: new ObjectId(countryId) });
      return SendSuccess(res, SMessage.Delete);
    } catch (err) {
      console.error("Delete country error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ค้นหาประเทศโดยชื่อ
  static async Search(req, res) {
    try {
      const { name } = req.query;
      if (!name) return SendError(res, 400, "Name parameter is required");

      const collection = await countriesCollection();
      const countries = await collection
        .find({
          name: { $regex: name, $options: "i" },
        })
        .toArray();

      return SendSuccess(res, SMessage.SelectAll, countries);
    } catch (err) {
      console.error("Search countries error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }
}

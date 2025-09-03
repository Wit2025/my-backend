import { ObjectId } from "mongodb";
import getDB from "../config/db_mydb.js";
import { EMessage, SMessage } from "../service/message.js";
import { SendCreate, SendError, SendSuccess } from "../service/response.js";
import {
  ValidateDataCity,
  ValidateUpdateCity,
} from "../service/validate/cityValidate.js";

// collections async functions
const citiesCollection = async () => (await getDB()).collection("cities");
const provincesCollection = async () => (await getDB()).collection("provinces");
const countriesCollection = async () => (await getDB()).collection("countries");

export default class CityController {
  // สร้างเมืองใหม่
  static async Create(req, res) {
    try {
      const { name, province_id, country_id, location } = req.body;

      const validate = await ValidateDataCity({
        name,
        province_id,
        country_id,
        location,
      });

      if (validate.length > 0)
        return SendError(res, 400, EMessage.BadRequest + validate.join("/"));

      // ตรวจสอบว่าจังหวัดมีอยู่จริง
      const provinceCollection = await provincesCollection();
      const province = await provinceCollection.findOne({
        _id: new ObjectId(province_id),
      });

      if (!province) return SendError(res, 404, "Province not found");

      // ตรวจสอบว่าประเทศมีอยู่จริง
      const countryCollection = await countriesCollection();
      const country = await countryCollection.findOne({
        _id: new ObjectId(country_id),
      });

      if (!country) return SendError(res, 404, "Country not found");

      const city = {
        name,
        province_id: new ObjectId(province_id),
        country_id: new ObjectId(country_id),
        location: location || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const collection = await citiesCollection();
      const result = await collection.insertOne(city);

      if (!result.insertedId) return SendError(res, 500, EMessage.ErrInsert);

      return SendCreate(res, SMessage.Create, city);
    } catch (err) {
      console.error("Create city error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ดึงข้อมูลทั้งหมดเมือง
  static async SelectAll(req, res) {
    try {
      const collection = await citiesCollection();
      const cities = await collection.find({}).toArray();

      if (!cities || cities.length === 0)
        return SendError(res, 404, EMessage.NotFound, "cities");

      return SendSuccess(res, SMessage.SelectAll, cities);
    } catch (err) {
      console.error("SelectAll cities error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ดึงข้อมูลเมืองโดยใช้ ID
  static async SelectOne(req, res) {
    try {
      const cityId = req.params.cityID;
      const collection = await citiesCollection();

      let city;
      if (ObjectId.isValid(cityId)) {
        city = await collection.findOne({ _id: new ObjectId(cityId) });
      }

      if (!city) return SendError(res, 404, EMessage.NotFound, "city");

      return SendSuccess(res, SMessage.SelectOne, city);
    } catch (err) {
      console.error("SelectOne city error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ดึงข้อมูลเมืองโดยจังหวัด
  static async SelectByProvince(req, res) {
    try {
      const provinceId = req.params.provinceID;
      const collection = await citiesCollection();

      const cities = await collection
        .find({
          province_id: new ObjectId(provinceId),
        })
        .toArray();

      return SendSuccess(res, SMessage.SelectAll, cities);
    } catch (err) {
      console.error("SelectByProvince cities error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ดึงข้อมูลเมืองโดยประเทศ
  static async SelectByCountry(req, res) {
    try {
      const countryId = req.params.countryID;
      const collection = await citiesCollection();

      const cities = await collection
        .find({
          country_id: new ObjectId(countryId),
        })
        .toArray();

      return SendSuccess(res, SMessage.SelectAll, cities);
    } catch (err) {
      console.error("SelectByCountry cities error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ค้นหาเมืองใกล้เคียงโดยใช้地理位置
  static async FindNearby(req, res) {
    try {
      const { lng, lat, maxDistance = 10000 } = req.query; // maxDistance in meters

      if (!lng || !lat) {
        return SendError(res, 400, "Longitude and latitude are required");
      }

      const longitude = parseFloat(lng);
      const latitude = parseFloat(lat);
      const maxDist = parseFloat(maxDistance);

      if (isNaN(longitude) || isNaN(latitude) || isNaN(maxDist)) {
        return SendError(res, 400, "Invalid coordinates or distance");
      }

      const collection = await citiesCollection();
      const cities = await collection
        .find({
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [longitude, latitude],
              },
              $maxDistance: maxDist,
            },
          },
        })
        .toArray();

      return SendSuccess(res, SMessage.SelectAll, cities);
    } catch (err) {
      console.error("FindNearby cities error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // อัปเดตข้อมูลเมือง
  // อัปเดตข้อมูลเมือง
  static async Update(req, res) {
    try {
      const cityId = req.params.cityID;
      const { name, province_id, country_id, location } = req.body;

      // ตรวจสอบ validation เฉพาะ field ที่ส่งมา
      const validateData = {};
      if (name !== undefined) validateData.name = name;
      if (province_id !== undefined) validateData.province_id = province_id;
      if (country_id !== undefined) validateData.country_id = country_id;
      if (location !== undefined) validateData.location = location;

      const validate = await ValidateUpdateCity(validateData);
      if (validate.length > 0)
        return SendError(res, 400, EMessage.BadRequest + validate.join("/"));

      const collection = await citiesCollection();

      // ดึงข้อมูลเมืองปัจจุบันจากฐานข้อมูล
      const currentCity = await collection.findOne({
        _id: new ObjectId(cityId),
      });

      if (!currentCity) {
        return SendError(res, 404, EMessage.NotFound, "city");
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
      if (hasValidChange(name, currentCity.name, "string")) {
        updateData.name = name;
        hasChanges = true;
      }

      // ตรวจสอบ province_id
      if (province_id !== undefined) {
        if (!ObjectId.isValid(province_id))
          return SendError(res, 400, "Invalid province_id");

        const provinceCollection = await provincesCollection();
        const province = await provinceCollection.findOne({
          _id: new ObjectId(province_id),
        });

        if (!province) return SendError(res, 404, "Province not found");

        const newProvinceIdStr = province_id;
        const currentProvinceIdStr = currentCity.province_id.toString();

        if (newProvinceIdStr !== currentProvinceIdStr) {
          updateData.province_id = new ObjectId(province_id);
          hasChanges = true;
        }
      }

      // ตรวจสอบ country_id
      if (country_id !== undefined) {
        if (!ObjectId.isValid(country_id))
          return SendError(res, 400, "Invalid country_id");

        const countryCollection = await countriesCollection();
        const country = await countryCollection.findOne({
          _id: new ObjectId(country_id),
        });

        if (!country) return SendError(res, 404, "Country not found");

        const newCountryIdStr = country_id;
        const currentCountryIdStr = currentCity.country_id.toString();

        if (newCountryIdStr !== currentCountryIdStr) {
          updateData.country_id = new ObjectId(country_id);
          hasChanges = true;
        }
      }

      // ตรวจสอบ location
      if (location !== undefined) {
        // ถ้า location เป็น null หรือ empty object ให้ตั้งค่าเป็น null
        const newLocation =
          location === null || Object.keys(location).length === 0
            ? null
            : location;

        const currentLocation = currentCity.location || null;

        if (hasValidChange(newLocation, currentLocation, "object")) {
          updateData.location = newLocation;
          hasChanges = true;
        }
      }

      // ถ้าไม่มี field ใดๆ ที่เปลี่ยนแปลง
      if (!hasChanges) {
        return SendError(res, 400, "No valid changes detected");
      }

      const updateResult = await collection.updateOne(
        { _id: new ObjectId(cityId) },
        { $set: updateData }
      );

      if (updateResult.modifiedCount === 0) {
        return SendError(res, 404, EMessage.ErrUpdate);
      }

      // ดึงข้อมูลล่าสุดหลังอัปเดต
      const updatedCity = await collection.findOne({
        _id: new ObjectId(cityId),
      });

      return SendSuccess(res, SMessage.Update, updatedCity);
    } catch (err) {
      console.error("Update city error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ลบเมือง
  static async Delete(req, res) {
    try {
      const cityId = req.params.cityID;
      const collection = await citiesCollection();

      const city = await collection.findOne({
        _id: new ObjectId(cityId),
      });
      if (!city) return SendError(res, 404, EMessage.NotFound, "city");

      await collection.deleteOne({ _id: new ObjectId(cityId) });
      return SendSuccess(res, SMessage.Delete);
    } catch (err) {
      console.error("Delete city error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ค้นหาเมืองโดยชื่อ
  static async Search(req, res) {
    try {
      const { name } = req.query;
      if (!name) return SendError(res, 400, "Name parameter is required");

      const collection = await citiesCollection();
      const cities = await collection
        .find({
          name: { $regex: name, $options: "i" },
        })
        .toArray();

      return SendSuccess(res, SMessage.SelectAll, cities);
    } catch (err) {
      console.error("Search cities error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }
}

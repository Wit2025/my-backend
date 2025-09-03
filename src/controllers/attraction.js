import { ObjectId } from "mongodb";
import getDB from "../config/db_mydb.js";
import { EMessage, SMessage } from "../service/message.js";
import { SendCreate, SendError, SendSuccess } from "../service/response.js";
import {
  ValidateDataAttraction,
  ValidateUpdateAttraction,
} from "../service/validate/attractionValidate.js";

// collections async functions
const attractionsCollection = async () =>
  (await getDB()).collection("attractions");
const citiesCollection = async () => (await getDB()).collection("cities");
const provincesCollection = async () => (await getDB()).collection("provinces");
const countriesCollection = async () => (await getDB()).collection("countries");

export default class AttractionController {
  // สร้างสถานที่ท่องเที่ยวใหม่
  static async Create(req, res) {
    try {
      const {
        name,
        description,
        city_id,
        province_id,
        country_id,
        location,
        categories,
        images,
        ratingAvg,
        ratingCount,
        isActive,
      } = req.body;

      const validate = await ValidateDataAttraction({
        name,
        description,
        city_id,
        province_id,
        country_id,
        location,
        categories,
        images,
        ratingAvg,
        ratingCount,
        isActive,
      });

      if (validate.length > 0)
        return SendError(res, 400, EMessage.BadRequest + validate.join("/"));

      // ตรวจสอบว่าเมืองมีอยู่จริง
      const cityCollection = await citiesCollection();
      const city = await cityCollection.findOne({
        _id: new ObjectId(city_id),
      });
      if (!city) return SendError(res, 404, "City not found");

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

      const attraction = {
        name,
        description: description || "",
        city_id: new ObjectId(city_id),
        province_id: new ObjectId(province_id),
        country_id: new ObjectId(country_id),
        location: location || null,
        categories: categories || [],
        images: images || [],
        ratingAvg: ratingAvg || 0,
        ratingCount: ratingCount || 0,
        isActive: isActive !== undefined ? isActive : true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const collection = await attractionsCollection();
      const result = await collection.insertOne(attraction);

      if (!result.insertedId) return SendError(res, 500, EMessage.ErrInsert);

      return SendCreate(res, SMessage.Create, attraction);
    } catch (err) {
      console.error("Create attraction error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ดึงข้อมูลทั้งหมดสถานที่ท่องเที่ยว
  static async SelectAll(req, res) {
    try {
      const { page = 1, limit = 10, activeOnly = true } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const collection = await attractionsCollection();
      let query = {};

      if (activeOnly === "true") {
        query.isActive = true;
      }

      const attractions = await collection
        .find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const total = await collection.countDocuments(query);

      if (!attractions || attractions.length === 0)
        return SendError(res, 404, EMessage.NotFound, "attractions");

      return SendSuccess(res, SMessage.SelectAll, {
        attractions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (err) {
      console.error("SelectAll attractions error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ดึงข้อมูลสถานที่ท่องเที่ยวโดยใช้ ID
  static async SelectOne(req, res) {
    try {
      const attractionId = req.params.attractionID;
      const collection = await attractionsCollection();

      let attraction;
      if (ObjectId.isValid(attractionId)) {
        attraction = await collection.findOne({
          _id: new ObjectId(attractionId),
        });
      }

      if (!attraction)
        return SendError(res, 404, EMessage.NotFound, "attraction");

      return SendSuccess(res, SMessage.SelectOne, attraction);
    } catch (err) {
      console.error("SelectOne attraction error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ดึงข้อมูลสถานที่ท่องเที่ยวโดยเมือง
  static async SelectByCity(req, res) {
    try {
      const cityId = req.params.cityID;
      const { page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const collection = await attractionsCollection();
      const attractions = await collection
        .find({
          city_id: new ObjectId(cityId),
          isActive: true,
        })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const total = await collection.countDocuments({
        city_id: new ObjectId(cityId),
        isActive: true,
      });

      return SendSuccess(res, SMessage.SelectAll, {
        attractions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (err) {
      console.error("SelectByCity attractions error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ดึงข้อมูลสถานที่ท่องเที่ยวโดยจังหวัด
  static async SelectByProvince(req, res) {
    try {
      const provinceId = req.params.provinceID;
      const { page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const collection = await attractionsCollection();
      const attractions = await collection
        .find({
          province_id: new ObjectId(provinceId),
          isActive: true,
        })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const total = await collection.countDocuments({
        province_id: new ObjectId(provinceId),
        isActive: true,
      });

      return SendSuccess(res, SMessage.SelectAll, {
        attractions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (err) {
      console.error("SelectByProvince attractions error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ดึงข้อมูลสถานที่ท่องเที่ยวโดยประเทศ
  static async SelectByCountry(req, res) {
    try {
      const countryId = req.params.countryID;
      const { page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const collection = await attractionsCollection();
      const attractions = await collection
        .find({
          country_id: new ObjectId(countryId),
          isActive: true,
        })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const total = await collection.countDocuments({
        country_id: new ObjectId(countryId),
        isActive: true,
      });

      return SendSuccess(res, SMessage.SelectAll, {
        attractions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (err) {
      console.error("SelectByCountry attractions error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ค้นหาสถานที่ท่องเที่ยวใกล้เคียงโดยใช้地理位置
  static async FindNearby(req, res) {
    try {
      const { lng, lat, maxDistance = 10000, limit = 10 } = req.query;

      if (!lng || !lat) {
        return SendError(res, 400, "Longitude and latitude are required");
      }

      const longitude = parseFloat(lng);
      const latitude = parseFloat(lat);
      const maxDist = parseFloat(maxDistance);

      if (isNaN(longitude) || isNaN(latitude) || isNaN(maxDist)) {
        return SendError(res, 400, "Invalid coordinates or distance");
      }

      const collection = await attractionsCollection();
      const attractions = await collection
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
          isActive: true,
        })
        .limit(parseInt(limit))
        .toArray();

      return SendSuccess(res, SMessage.SelectAll, attractions);
    } catch (err) {
      console.error("FindNearby attractions error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ค้นหาสถานที่ท่องเที่ยวโดย text search
  static async Search(req, res) {
    try {
      const { q, category, page = 1, limit = 10 } = req.query;

      if (!q && !category) {
        return SendError(res, 400, "Search query or category is required");
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const collection = await attractionsCollection();

      let query = { isActive: true };

      if (q) {
        query.$text = { $search: q };
      }

      if (category) {
        query.categories = { $in: [category] };
      }

      const attractions = await collection
        .find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const total = await collection.countDocuments(query);

      return SendSuccess(res, SMessage.SelectAll, {
        attractions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (err) {
      console.error("Search attractions error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // อัปเดตข้อมูลสถานที่ท่องเที่ยว
  // อัปเดตข้อมูลสถานที่ท่องเที่ยว
  static async Update(req, res) {
    try {
      const attractionId = req.params.attractionID;
      const updateData = req.body;

      // ตรวจสอบ validation เฉพาะ field ที่ส่งมา
      const validate = await ValidateUpdateAttraction(updateData);
      if (validate.length > 0)
        return SendError(res, 400, EMessage.BadRequest + validate.join("/"));

      const collection = await attractionsCollection();

      // ดึงข้อมูลสถานที่ท่องเที่ยวปัจจุบันจากฐานข้อมูล
      const currentAttraction = await collection.findOne({
        _id: new ObjectId(attractionId),
      });

      if (!currentAttraction) {
        return SendError(res, 404, EMessage.NotFound, "attraction");
      }

      // สร้าง object สำหรับอัปเดตเฉพาะ field ที่เปลี่ยนแปลง
      const finalUpdateData = { updatedAt: new Date() };
      let hasChanges = false;

      // ฟังก์ชันตรวจสอบว่าค่าแตกต่างและ valid
      const hasValidChange = (newValue, oldValue, fieldType = "string") => {
        if (newValue === undefined || newValue === null) return false;

        switch (fieldType) {
          case "string":
            if (typeof newValue !== "string" || newValue.trim() === "")
              return false;
            return newValue !== oldValue;

          case "number":
            if (typeof newValue !== "number") return false;
            return newValue !== oldValue;

          case "boolean":
            if (typeof newValue !== "boolean") return false;
            return newValue !== oldValue;

          case "array":
            if (!Array.isArray(newValue)) return false;
            return JSON.stringify(newValue) !== JSON.stringify(oldValue);

          case "object":
            if (typeof newValue !== "object" || newValue === null) return false;
            return JSON.stringify(newValue) !== JSON.stringify(oldValue);

          default:
            return newValue !== oldValue;
        }
      };

      // ตรวจสอบ field ธรรมดา
      const simpleFields = ["name", "description"];
      simpleFields.forEach((field) => {
        if (
          updateData[field] !== undefined &&
          hasValidChange(updateData[field], currentAttraction[field], "string")
        ) {
          finalUpdateData[field] = updateData[field];
          hasChanges = true;
        }
      });

      // ตรวจสอบ field ตัวเลข
      const numberFields = ["ratingAvg", "ratingCount"];
      numberFields.forEach((field) => {
        if (
          updateData[field] !== undefined &&
          hasValidChange(updateData[field], currentAttraction[field], "number")
        ) {
          finalUpdateData[field] = updateData[field];
          hasChanges = true;
        }
      });

      // ตรวจสอบ boolean field
      if (
        updateData.isActive !== undefined &&
        hasValidChange(
          updateData.isActive,
          currentAttraction.isActive,
          "boolean"
        )
      ) {
        finalUpdateData.isActive = updateData.isActive;
        hasChanges = true;
      }

      // ตรวจสอบ array fields
      const arrayFields = ["categories", "images"];
      arrayFields.forEach((field) => {
        if (
          updateData[field] !== undefined &&
          hasValidChange(
            updateData[field],
            currentAttraction[field] || [],
            "array"
          )
        ) {
          finalUpdateData[field] = updateData[field];
          hasChanges = true;
        }
      });

      // ตรวจสอบ location
      if (updateData.location !== undefined) {
        // ถ้า location เป็น null หรือ empty object ให้ตั้งค่าเป็น null
        const newLocation =
          updateData.location === null ||
          (typeof updateData.location === "object" &&
            Object.keys(updateData.location).length === 0)
            ? null
            : updateData.location;

        const currentLocation = currentAttraction.location || null;

        if (hasValidChange(newLocation, currentLocation, "object")) {
          finalUpdateData.location = newLocation;
          hasChanges = true;
        }
      }

      // ตรวจสอบ reference IDs (city_id, province_id, country_id)
      const referenceFields = ["city_id", "province_id", "country_id"];

      for (const field of referenceFields) {
        if (updateData[field] !== undefined) {
          if (!ObjectId.isValid(updateData[field])) {
            return SendError(res, 400, `Invalid ${field}`);
          }

          // ตรวจสอบว่ามีอยู่จริงในฐานข้อมูล
          const collectionName = field.replace("_id", "") + "sCollection";
          const refCollection = await {
            city_id: citiesCollection,
            province_id: provincesCollection,
            country_id: countriesCollection,
          }[field]();

          const refDoc = await refCollection.findOne({
            _id: new ObjectId(updateData[field]),
          });

          if (!refDoc)
            return SendError(res, 404, `${field.replace("_id", "")} not found`);

          const newIdStr = updateData[field];
          const currentIdStr = currentAttraction[field]?.toString() || "";

          if (newIdStr !== currentIdStr) {
            finalUpdateData[field] = new ObjectId(updateData[field]);
            hasChanges = true;
          }
        }
      }

      // ถ้าไม่มี field ใดๆ ที่เปลี่ยนแปลง
      if (!hasChanges) {
        return SendError(res, 400, "No valid changes detected");
      }

      const updateResult = await collection.updateOne(
        { _id: new ObjectId(attractionId) },
        { $set: finalUpdateData }
      );

      if (updateResult.modifiedCount === 0) {
        return SendError(res, 404, EMessage.ErrUpdate);
      }

      // ดึงข้อมูลล่าสุดหลังอัปเดต
      const updatedAttraction = await collection.findOne({
        _id: new ObjectId(attractionId),
      });

      return SendSuccess(res, SMessage.Update, updatedAttraction);
    } catch (err) {
      console.error("Update attraction error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ลบสถานที่ท่องเที่ยว
  static async Delete(req, res) {
    try {
      const attractionId = req.params.attractionID;
      const collection = await attractionsCollection();

      const attraction = await collection.findOne({
        _id: new ObjectId(attractionId),
      });
      if (!attraction)
        return SendError(res, 404, EMessage.NotFound, "attraction");

      await collection.deleteOne({ _id: new ObjectId(attractionId) });
      return SendSuccess(res, SMessage.Delete);
    } catch (err) {
      console.error("Delete attraction error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // อัปเดต rating
  static async UpdateRating(req, res) {
    try {
      const attractionId = req.params.attractionID;
      const { rating } = req.body;

      if (rating === undefined || typeof rating !== "number") {
        return SendError(res, 400, "Rating is required and must be a number");
      }

      if (rating < 0 || rating > 5) {
        return SendError(res, 400, "Rating must be between 0 and 5");
      }

      const collection = await attractionsCollection();

      // ดึงข้อมูลปัจจุบันเพื่อคำนวณ rating ใหม่
      const attraction = await collection.findOne({
        _id: new ObjectId(attractionId),
      });

      if (!attraction)
        return SendError(res, 404, EMessage.NotFound, "attraction");

      const newRatingCount = attraction.ratingCount + 1;
      const newRatingAvg =
        (attraction.ratingAvg * attraction.ratingCount + rating) /
        newRatingCount;

      const updateResult = await collection.updateOne(
        { _id: new ObjectId(attractionId) },
        {
          $set: {
            ratingAvg: newRatingAvg,
            ratingCount: newRatingCount,
            updatedAt: new Date(),
          },
        }
      );

      if (updateResult.modifiedCount === 0) {
        return SendError(res, 404, EMessage.ErrUpdate);
      }

      // ดึงข้อมูลล่าสุดหลังอัปเดต
      const updatedAttraction = await collection.findOne({
        _id: new ObjectId(attractionId),
      });

      return SendSuccess(res, "Rating updated successfully", updatedAttraction);
    } catch (err) {
      console.error("Update rating error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }
}

import { ObjectId } from "mongodb";
import getDB from "../config/db_mydb.js";
import { EMessage, SMessage } from "../service/message.js";
import { SendCreate, SendError, SendSuccess } from "../service/response.js";
import {
  ValidateDataPackage,
  ValidateUpdatePackage,
} from "../service/validate/packageValidate.js";

const packagesCollection = async () => (await getDB()).collection("packages");

export default class PackageController {
  // =========================== create package====================================
  static async Create(req, res) {
    try {
      const validate = await ValidateDataPackage(req.body);
      if (validate.length > 0)
        return SendError(res, 400, EMessage.BadRequest + validate.join("/"));

      const { startCity_id, country_id, scheduledDepartures = [] } = req.body;

      const db = await getDB();

      // ตรวจสอบเมืองเริ่มต้น
      const startCity = await db
        .collection("cities")
        .findOne({ _id: new ObjectId(startCity_id) });
      if (!startCity) return SendError(res, 400, "startCity_id not found");

      // ตรวจสอบประเทศ
      const country = await db
        .collection("countries")
        .findOne({ _id: new ObjectId(country_id) });
      if (!country) return SendError(res, 400, "country_id not found");

      // ตรวจสอบ scheduledDepartures
      if (scheduledDepartures.length === 0) {
        return SendError(res, 400, "At least one scheduled departure is required");
      }

      for (const departure of scheduledDepartures) {
        if (!departure.departureDate || !departure.returnDate) {
          return SendError(res, 400, "Departure and return dates are required for each scheduled departure");
        }
        if (departure.departureDate >= departure.returnDate) {
          return SendError(res, 400, "Return date must be after departure date");
        }
        if (!departure.availableSlots || departure.availableSlots <= 0) {
          return SendError(res, 400, "Available slots must be greater than 0");
        }
      }

      // ถ้าผ่านทั้งหมด ก็ insert
      const pkg = {
        ...req.body,
        startCity_id: new ObjectId(req.body.startCity_id),
        country_id: new ObjectId(req.body.country_id),
        scheduledDepartures: req.body.scheduledDepartures.map(departure => ({
          ...departure,
          departureDate: new Date(departure.departureDate),
          returnDate: new Date(departure.returnDate),
          bookedSlots: departure.bookedSlots || 0,
          status: departure.status || "available"
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const collection = await packagesCollection();
      const result = await collection.insertOne(pkg);

      if (!result.insertedId) return SendError(res, 500, EMessage.ErrInsert);
      return SendCreate(res, SMessage.Create, pkg);
    } catch (err) {
      console.error("Create package error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  
  // =========================== ดึงข้อมูลทั้งหมด ====================================
  static async SelectAll(req, res) {
    try {
      const collection = await packagesCollection();
      const packages = await collection.find({}).toArray();

      if (!packages || packages.length === 0)
        return SendError(res, 404, EMessage.NotFound, "packages");
      
      // คำนวณ availability สำหรับแต่ละ departure
      const packagesWithAvailability = packages.map(pkg => ({
        ...pkg,
        scheduledDepartures: pkg.scheduledDepartures.map(departure => ({
          ...departure,
          availableSlots: departure.availableSlots - departure.bookedSlots,
          isAvailable: (departure.availableSlots - departure.bookedSlots) > 0 && 
                      departure.status === "available" &&
                      new Date(departure.departureDate) > new Date()
        }))
      }));

      return SendSuccess(res, SMessage.SelectAll, packagesWithAvailability);
    } catch (err) {
      console.error("SelectAll packages error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  
  // =========================== ดึงข้อมูลแพ็กเกจโดย ID ====================================
  static async SelectOne(req, res) {
    try {
      const pkgId = req.params.packageID;
      if (!ObjectId.isValid(pkgId))
        return SendError(res, 400, "Invalid packageID");

      const collection = await packagesCollection();
      const pkg = await collection.findOne({ _id: new ObjectId(pkgId) });

      if (!pkg) return SendError(res, 404, EMessage.NotFound, "package");

      // คำนวณ availability สำหรับแต่ละ departure
      const packageWithAvailability = {
        ...pkg,
        scheduledDepartures: pkg.scheduledDepartures.map(departure => ({
          ...departure,
          availableSlots: departure.availableSlots - departure.bookedSlots,
          isAvailable: (departure.availableSlots - departure.bookedSlots) > 0 && 
                      departure.status === "available" &&
                      new Date(departure.departureDate) > new Date()
        }))
      };

      return SendSuccess(res, SMessage.SelectOne, packageWithAvailability);
    } catch (err) {
      console.error("SelectOne package error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // =========================== อัปเดตแพ็กเกจ ====================================
  static async Update(req, res) {
    try {
      const pkgId = req.params.packageID;
      if (!ObjectId.isValid(pkgId))
        return SendError(res, 400, "Invalid packageID");

      const validate = await ValidateUpdatePackage(req.body);
      if (validate.length > 0)
        return SendError(res, 400, EMessage.BadRequest + validate.join("/"));

      const collection = await packagesCollection();
      const db = await getDB();

      // ดึงข้อมูลแพ็กเกจปัจจุบันจากฐานข้อมูล
      const currentPackage = await collection.findOne({
        _id: new ObjectId(pkgId),
      });
      if (!currentPackage) {
        return SendError(res, 404, EMessage.NotFound, "package");
      }

      // สร้าง object สำหรับอัปเดตเฉพาะ field ที่เปลี่ยนแปลง
      const updateData = { updatedAt: new Date() };
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

          case "date":
            if (!(newValue instanceof Date)) return false;
            return newValue.getTime() !== oldValue.getTime();

          default:
            return newValue !== oldValue;
        }
      };

      // ตรวจสอบ field ธรรมดา
      const simpleFields = [
        "name",
        "code",
        "description",
        "baseCurrency",
        "inclusions",
        "exclusions",
        "requirements",
      ];

      simpleFields.forEach((field) => {
        if (
          req.body[field] !== undefined &&
          hasValidChange(req.body[field], currentPackage[field], "string")
        ) {
          updateData[field] = req.body[field];
          hasChanges = true;
        }
      });

      // ตรวจสอบ field ตัวเลข
      const numberFields = [
        "durationDays",
        "minTravelers",
        "maxTravelers",
      ];

      numberFields.forEach((field) => {
        if (
          req.body[field] !== undefined &&
          hasValidChange(req.body[field], currentPackage[field], "number")
        ) {
          updateData[field] = req.body[field];
          hasChanges = true;
        }
      });

      // ตรวจสอบ boolean field
      if (
        req.body.isActive !== undefined &&
        hasValidChange(req.body.isActive, currentPackage.isActive, "boolean")
      ) {
        updateData.isActive = req.body.isActive;
        hasChanges = true;
      }

      // ตรวจสอบ startCity_id
      if (req.body.startCity_id !== undefined) {
        if (!ObjectId.isValid(req.body.startCity_id))
          return SendError(res, 400, "Invalid startCity_id");

        const city = await db
          .collection("cities")
          .findOne({ _id: new ObjectId(req.body.startCity_id) });
        if (!city) return SendError(res, 404, "startCity not found");

        const newCityIdStr = req.body.startCity_id;
        const currentCityIdStr = currentPackage.startCity_id.toString();

        if (newCityIdStr !== currentCityIdStr) {
          updateData.startCity_id = new ObjectId(newCityIdStr);
          hasChanges = true;
        }
      }

      // ตรวจสอบ country_id
      if (req.body.country_id !== undefined) {
        if (!ObjectId.isValid(req.body.country_id))
          return SendError(res, 400, "Invalid country_id");

        const country = await db
          .collection("countries")
          .findOne({ _id: new ObjectId(req.body.country_id) });
        if (!country) return SendError(res, 404, "Country not found");

        const newCountryIdStr = req.body.country_id;
        const currentCountryIdStr = currentPackage.country_id.toString();

        if (newCountryIdStr !== currentCountryIdStr) {
          updateData.country_id = new ObjectId(newCountryIdStr);
          hasChanges = true;
        }
      }

      // ตรวจสอบ scheduledDepartures
      if (req.body.scheduledDepartures !== undefined) {
        if (!Array.isArray(req.body.scheduledDepartures))
          return SendError(res, 400, "scheduledDepartures must be an array");

        // ตรวจสอบทุก departure
        for (let i = 0; i < req.body.scheduledDepartures.length; i++) {
          const departure = req.body.scheduledDepartures[i];
          
          if (!departure.departureDate || !departure.returnDate) {
            return SendError(res, 400, `Departure and return dates are required for departure at index ${i}`);
          }
          
          if (new Date(departure.departureDate) >= new Date(departure.returnDate)) {
            return SendError(res, 400, `Return date must be after departure date at index ${i}`);
          }
          
          if (!departure.availableSlots || departure.availableSlots <= 0) {
            return SendError(res, 400, `Available slots must be greater than 0 at index ${i}`);
          }
        }

        // แปลง dates และตั้งค่า default values
        const newDepartures = req.body.scheduledDepartures.map(departure => ({
          ...departure,
          departureDate: new Date(departure.departureDate),
          returnDate: new Date(departure.returnDate),
          bookedSlots: departure.bookedSlots || 0,
          status: departure.status || "available",
          priceAdult: departure.priceAdult || currentPackage.priceAdult,
          priceChild: departure.priceChild || currentPackage.priceChild
        }));

        const currentDepartures = currentPackage.scheduledDepartures || [];

        if (JSON.stringify(newDepartures) !== JSON.stringify(currentDepartures)) {
          updateData.scheduledDepartures = newDepartures;
          hasChanges = true;
        }
      }

      // ถ้าไม่มี field ใดๆ ที่เปลี่ยนแปลง
      if (!hasChanges) {
        return SendError(res, 400, "No valid changes detected");
      }

      const result = await collection.updateOne(
        { _id: new ObjectId(pkgId) },
        { $set: updateData }
      );

      if (result.modifiedCount === 0)
        return SendError(res, 404, EMessage.ErrUpdate);

      const updatedPkg = await collection.findOne({ _id: new ObjectId(pkgId) });
      return SendSuccess(res, SMessage.Update, updatedPkg);
    } catch (err) {
      console.error("Update package error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // =========================== ลบแพ็กเกจ ====================================
  static async Delete(req, res) {
    try {
      const pkgId = req.params.packageID;
      if (!ObjectId.isValid(pkgId))
        return SendError(res, 400, "Invalid packageID");

      const collection = await packagesCollection();
      const pkg = await collection.findOne({ _id: new ObjectId(pkgId) });
      if (!pkg) return SendError(res, 404, EMessage.NotFound, "package");

      await collection.deleteOne({ _id: new ObjectId(pkgId) });
      return SendSuccess(res, SMessage.Delete);
    } catch (err) {
      console.error("Delete package error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  
  // =========================== ค้นหาแพ็กเกจ ====================================
  static async Search(req, res) {
    try {
      const { keyword } = req.query;
      if (!keyword) return SendError(res, 400, "Keyword is required");

      const collection = await packagesCollection();
      const packages = await collection
        .find({ $text: { $search: keyword } })
        .toArray();

      return SendSuccess(res, SMessage.SelectAll, packages);
    } catch (err) {
      console.error("Search package error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // =========================== ดึงแพ็กเกจยอดนิยม ====================================
  static async MostPopular(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const collection = await packagesCollection();
      const packages = await collection
        .find({})
        .sort({ ratingCount: -1, ratingAvg: -1 })
        .limit(limit)
        .toArray();

      return SendSuccess(res, "Most popular packages", packages);
    } catch (err) {
      console.error("MostPopular packages error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // =========================== ดึงแพ็กเกจไม่นิยมที่สุด ====================================
  static async LeastPopular(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const collection = await packagesCollection();
      const packages = await collection
        .find({})
        .sort({ ratingCount: 1, ratingAvg: 1 })
        .limit(limit)
        .toArray();

      return SendSuccess(res, "Least popular packages", packages);
    } catch (err) {
      console.error("LeastPopular packages error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // =========================== ดึงแพ็กเกจที่ active ====================================
  static async ActivePackages(req, res) {
    try {
      const collection = await packagesCollection();
      const packages = await collection.find({ isActive: true }).toArray();
      return SendSuccess(res, "Active packages", packages);
    } catch (err) {
      console.error("ActivePackages error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // =========================== ดึงแพ็กเกจตามประเทศ ====================================
  static async PackagesByCountry(req, res) {
    try {
      const countryId = req.params.countryID;
      if (!ObjectId.isValid(countryId))
        return SendError(res, 400, "Invalid countryID");

      const collection = await packagesCollection();
      const packages = await collection
        .find({ country_id: new ObjectId(countryId) })
        .toArray();

      return SendSuccess(res, `Packages in country ${countryId}`, packages);
    } catch (err) {
      console.error("PackagesByCountry error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // =========================== ดึงแพ็กเกจตามวันที่เดินทาง ====================================
  static async PackagesByDepartureDate(req, res) {
    try {
      const { date } = req.query;
      if (!date) return SendError(res, 400, "Date parameter is required");

      const targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return SendError(res, 400, "Invalid date format");
      }

      const collection = await packagesCollection();
      const packages = await collection
        .find({
          "scheduledDepartures.departureDate": targetDate,
          "scheduledDepartures.status": "available",
          isActive: true
        })
        .toArray();

      return SendSuccess(res, `Packages departing on ${date}`, packages);
    } catch (err) {
      console.error("PackagesByDepartureDate error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }
}
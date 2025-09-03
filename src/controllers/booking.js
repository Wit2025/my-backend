import { ObjectId } from "mongodb";
import getDB from "../config/db_mydb.js";
import { EMessage, SMessage } from "../service/message.js";
import { SendCreate, SendError, SendSuccess } from "../service/response.js";
import {
  ValidateCreateBooking,
  ValidateUpdateBooking,
} from "../service/validate/bookingValidate.js";

// collection async function
const bookingsCollection = async () => (await getDB()).collection("bookings");
// const usersCollection = async () => (await getDB()).collection("users");
// const packagesCollection = async () => (await getDB()).collection("packages");

export default class BookingController {

  
  // ============================สร้าง Booking ใหม่================================================
  static async Create(req, res) {
    try {
      // Generate booking number ก่อนทำ validation
      const bookingNo = `BK${Date.now()}${Math.random()
        .toString(36)
        .substr(2, 5)
        .toUpperCase()}`;

      // สร้าง object สำหรับ validation โดยรวม bookingNo เข้าไป
      const validationData = {
        ...req.body,
        bookingNo,
      };

      const validate = await ValidateCreateBooking(validationData);
      if (validate.length > 0) {
        return SendError(res, 400, EMessage.BadRequest + validate.join("/"));
      }

      // ==================== ตรวจสอบ Sold Out ====================
      const packagesCollection = await (await getDB()).collection("packages");
      const bookingsCollection = await (await getDB()).collection("bookings");

      // ตรวจสอบทุก package ใน items
      for (const item of req.body.items) {
        const packageId = item.package_id;

        // ดึงข้อมูล package
        const packageData = await packagesCollection.findOne({
          _id: new ObjectId(packageId),
        });

        if (!packageData) {
          return SendError(res, 404, `Package not found: ${packageId}`);
        }

        // ตรวจสอบว่า package มี field maxTravelers หรือไม่
        if (!packageData.maxTravelers) {
          continue; // ถ้าไม่มี maxTravelers ให้ข้ามไป
        }

        // นับ booking ที่ active สำหรับ package นี้
        const activeBookings = await bookingsCollection.countDocuments({
          "items.package_id": new ObjectId(packageId),
          status: { $in: ["confirmed", "paid", "completed"] },
        });

        // ตรวจสอบจำนวน travelers ที่ต้องการจอง
        const requestedTravelers =
          (item.qtyAdults || 0) + (item.qtyChildren || 0);
        const availableSlots = packageData.maxTravelers - activeBookings;

        // ตรวจสอบว่าเหลือที่พอหรือไม่
        if (availableSlots <= 0) {
          return SendError(res, 400, `Package "${packageData.name}" is sold out`);
        }

        if (requestedTravelers > availableSlots) {
          return SendError(
            res,
            400,
            `Only ${availableSlots} slots available for "${packageData.name}". 
           You requested ${requestedTravelers} travelers.`
          );
        }
      }
      // ==================== จบการตรวจสอบ Sold Out ====================

      // สร้าง helper functions สำหรับคำนวณภายใน method นี้
      const calculateItemSubtotal = (item) => {
        const adultTotal = (item.qtyAdults || 0) * (item.priceAdult || 0);
        const childTotal = (item.qtyChildren || 0) * (item.priceChild || 0);
        const optionsTotal = (item.options || []).reduce(
          (sum, option) => sum + (option.price || 0),
          0
        );

        return adultTotal + childTotal + optionsTotal;
      };

      const calculateAmounts = (items, existingAmounts = {}) => {
        const itemsTotal = items.reduce(
          (sum, item) => sum + calculateItemSubtotal(item),
          0
        );

        return {
          itemsTotal,
          discount: existingAmounts.discount || 0,
          tax: existingAmounts.tax || 0,
          fee: existingAmounts.fee || 0,
          grandTotal:
            itemsTotal -
            (existingAmounts.discount || 0) +
            (existingAmounts.tax || 0) +
            (existingAmounts.fee || 0),
        };
      };

      // ฟังก์ชันสำหรับแปลง string เป็น Date object
      const parseDateFields = (obj) => {
        if (!obj) return obj;

        const result = { ...obj };

        // แปลง field ที่เป็น date string เป็น Date object
        if (result.travelWindow) {
          result.travelWindow = {
            startDate: new Date(result.travelWindow.startDate),
            endDate: new Date(result.travelWindow.endDate),
          };
        }

        if (result.travelers && Array.isArray(result.travelers)) {
          result.travelers = result.travelers.map((traveler) => ({
            ...traveler,
            dob: traveler.dob ? new Date(traveler.dob) : undefined,
          }));
        }

        return result;
      };

      const processedData = parseDateFields(req.body);

      const booking = {
        ...processedData,
        bookingNo,
        user_id: new ObjectId(processedData.user_id),
        items: processedData.items.map((item) => ({
          ...item,
          package_id: new ObjectId(item.package_id),
          subtotal: calculateItemSubtotal(item),
        })),
        amounts: calculateAmounts(processedData.items, processedData.amounts),
        payment: {
          method: processedData.payment?.method || "",
          status: "unpaid",
          transactions: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const collection = await bookingsCollection();
      const result = await collection.insertOne(booking);

      if (!result.insertedId) return SendError(res, 500, EMessage.ErrInsert);

      return SendCreate(res, SMessage.Create, booking);
    } catch (err) {
      console.error("Create booking error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ============================ดึง Booking ทั้งหมด================================================
  static async SelectAll(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const collection = await bookingsCollection();
      const filter = status ? { status } : {};

      const [bookings, total] = await Promise.all([
        collection
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray(),
        collection.countDocuments(filter),
      ]);

      if (!bookings || bookings.length === 0)
        return SendError(res, 404, EMessage.NotFound, "bookings");

      return SendSuccess(res, SMessage.SelectAll, {
        bookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (err) {
      console.error("SelectAll bookings error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ============================ดึง Booking ตาม ID================================================
  static async SelectOne(req, res) {
    try {
      const bookingId = req.params.bookingID;
      if (!ObjectId.isValid(bookingId))
        return SendError(res, 400, "Invalid bookingID");

      const collection = await bookingsCollection();
      const booking = await collection.findOne({
        _id: new ObjectId(bookingId),
      });

      if (!booking) return SendError(res, 404, EMessage.NotFound, "booking");

      return SendSuccess(res, SMessage.SelectOne, booking);
    } catch (err) {
      console.error("SelectOne booking error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ============================ดึง Booking ตาม User ID================================================
  static async SelectByUser(req, res) {
    try {
      const userId = req.params.userID;
      if (!ObjectId.isValid(userId))
        return SendError(res, 400, "Invalid userID");

      const { page = 1, limit = 10, status } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const collection = await bookingsCollection();
      const filter = { user_id: new ObjectId(userId) };
      if (status) filter.status = status;

      const [bookings, total] = await Promise.all([
        collection
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray(),
        collection.countDocuments(filter),
      ]);

      if (!bookings || bookings.length === 0)
        return SendError(res, 404, EMessage.NotFound, "bookings for this user");

      return SendSuccess(res, SMessage.SelectAll, {
        bookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (err) {
      console.error("SelectByUser booking error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ============================ດຶງຂໍ້ມູນການຈອງ================================================
  static async GetBookingSummary(req, res) {
    try {
      const {
        packageID,
        startDate,
        endDate,
        status = ["confirmed", "paid", "completed"],
        groupBy = "package", // package, day, month, status
      } = req.query;

      const collection = await bookingsCollection();

      // สร้าง filter
      let filter = {};

      // Filter by package
      if (packageID && ObjectId.isValid(packageID)) {
        filter["items.package_id"] = new ObjectId(packageID);
      }

      // Filter by status
      if (status) {
        if (Array.isArray(status)) {
          filter.status = { $in: status };
        } else {
          filter.status = { $in: [status] };
        }
      }

      // Filter by date range (ใช้ createdAt สำหรับ summary)
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      // Aggregate pipeline
      const pipeline = [
        { $match: filter },
        { $unwind: "$items" },
        // ตรวจสอบ package_id มีค่า
        { $match: { "items.package_id": { $exists: true, $ne: null } } },
      ];

      // Grouping ตามที่เลือก
      let groupStage;
      let additionalFields = {};

      switch (groupBy) {
        case "day":
          groupStage = {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              package: "$items.package_id",
            },
          };
          additionalFields = { date: "$_id.date" };
          break;

        case "month":
          groupStage = {
            _id: {
              month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
              package: "$items.package_id",
            },
          };
          additionalFields = { month: "$_id.month" };
          break;

        case "status":
          groupStage = {
            _id: {
              status: "$status",
              package: "$items.package_id",
            },
          };
          additionalFields = { status: "$_id.status" };
          break;

        case "package":
        default:
          groupStage = {
            _id: "$items.package_id",
          };
      }

      pipeline.push({
        $group: {
          ...groupStage,
          totalBookings: { $sum: 1 },
          totalAdults: { $sum: { $ifNull: ["$items.qtyAdults", 0] } },
          totalChildren: { $sum: { $ifNull: ["$items.qtyChildren", 0] } },
          totalRevenue: { $sum: { $ifNull: ["$amounts.grandTotal", 0] } },
          avgRevenue: { $avg: { $ifNull: ["$amounts.grandTotal", 0] } },
        },
      });

      // Lookup package details
      pipeline.push({
        $lookup: {
          from: "packages",
          localField: "_id.package" || "_id",
          foreignField: "_id",
          as: "packageDetails",
        },
      });

      pipeline.push({
        $unwind: {
          path: "$packageDetails",
          preserveNullAndEmptyArrays: true,
        },
      });

      // Add additional fields
      if (Object.keys(additionalFields).length > 0) {
        pipeline.push({ $addFields: additionalFields });
      }

      pipeline.push({
        $project: {
          package: {
            _id: "$packageDetails._id",
            name: "$packageDetails.name",
            code: "$packageDetails.code",
            maxTravelers: "$packageDetails.maxTravelers",
          },
          totalBookings: 1,
          totalAdults: 1,
          totalChildren: 1,
          totalTravelers: { $add: ["$totalAdults", "$totalChildren"] },
          totalRevenue: 1,
          avgRevenue: { $round: ["$avgRevenue", 2] },
          // dynamic fields ตาม groupBy
          ...(groupBy === "day" && { date: 1 }),
          ...(groupBy === "month" && { month: 1 }),
          ...(groupBy === "status" && { status: 1 }),
        },
      });

      // Sort โดย default
      pipeline.push({ $sort: { totalRevenue: -1 } });

      const summary = await collection.aggregate(pipeline).toArray();

      return SendSuccess(res, "Booking summary retrieved", {
        summary,
        filters: {
          packageID: packageID || "all",
          startDate: startDate || "all",
          endDate: endDate || "all",
          status: status,
          groupBy: groupBy,
        },
        totalResults: summary.length,
      });
    } catch (err) {
      console.error("Get booking summary error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ============================อัปเดต Booking แบบรวมทั้งหมด================================================
  static async Update(req, res) {
    try {
      const bookingId = req.params.bookingID;
      if (!ObjectId.isValid(bookingId))
        return SendError(res, 400, "Invalid bookingID");

      const validate = await ValidateUpdateBooking(req.body);
      if (validate.length > 0)
        return SendError(res, 400, EMessage.BadRequest + validate.join("/"));

      // สร้าง helper functions
      const calculateItemSubtotal = (item) => {
        const adultTotal = (item.qtyAdults || 0) * (item.priceAdult || 0);
        const childTotal = (item.qtyChildren || 0) * (item.priceChild || 0);
        const optionsTotal = (item.options || []).reduce(
          (sum, option) => sum + (option.price || 0),
          0
        );
        return adultTotal + childTotal + optionsTotal;
      };

      const calculateAmounts = (items, existingAmounts = {}) => {
        const itemsTotal = items.reduce(
          (sum, item) => sum + calculateItemSubtotal(item),
          0
        );
        return {
          itemsTotal,
          discount: existingAmounts.discount || 0,
          tax: existingAmounts.tax || 0,
          fee: existingAmounts.fee || 0,
          grandTotal:
            itemsTotal -
            (existingAmounts.discount || 0) +
            (existingAmounts.tax || 0) +
            (existingAmounts.fee || 0),
        };
      };

      const parseDateFields = (obj) => {
        if (!obj) return obj;
        const result = { ...obj };

        if (result.travelWindow) {
          result.travelWindow = {
            startDate: new Date(result.travelWindow.startDate),
            endDate: new Date(result.travelWindow.endDate),
          };
        }

        if (result.travelers && Array.isArray(result.travelers)) {
          result.travelers = result.travelers.map((traveler) => ({
            ...traveler,
            dob: traveler.dob ? new Date(traveler.dob) : undefined,
          }));
        }

        return result;
      };

      // ดึงข้อมูล booking ปัจจุบันเพื่อเปรียบเทียบ
      const collection = await bookingsCollection();
      const currentBooking = await collection.findOne({
        _id: new ObjectId(bookingId),
      });

      if (!currentBooking) {
        return SendError(res, 404, EMessage.NotFound, "booking");
      }

      const processedData = parseDateFields(req.body);
      const updateData = { updatedAt: new Date() };

      // ตรวจสอบและเพิ่มเฉพาะ field ที่มีการเปลี่ยนแปลง
      if (processedData.user_id !== undefined) {
        updateData.user_id = new ObjectId(processedData.user_id);
      }

      if (
        processedData.status !== undefined &&
        processedData.status !== currentBooking.status
      ) {
        updateData.status = processedData.status;
      }

      if (
        processedData.currency !== undefined &&
        processedData.currency !== currentBooking.currency
      ) {
        updateData.currency = processedData.currency;
      }

      if (processedData.travelWindow !== undefined) {
        updateData.travelWindow = processedData.travelWindow;
      }

      if (processedData.travelers !== undefined) {
        updateData.travelers = processedData.travelers;
      }

      if (
        processedData.notes !== undefined &&
        processedData.notes !== currentBooking.notes
      ) {
        updateData.notes = processedData.notes;
      }

      // อัปเดต items และ amounts ถ้ามีการเปลี่ยนแปลง
      if (processedData.items !== undefined) {
        const updatedItems = processedData.items.map((item) => ({
          ...item,
          package_id: new ObjectId(item.package_id),
          subtotal: calculateItemSubtotal(item),
        }));

        updateData.items = updatedItems;
        updateData.amounts = calculateAmounts(
          updatedItems,
          processedData.amounts || currentBooking.amounts
        );
      } else if (processedData.amounts !== undefined) {
        // อัปเดตเฉพาะ amounts ถ้า items ไม่เปลี่ยนแปลง
        const currentItems = currentBooking.items || [];
        updateData.amounts = calculateAmounts(
          currentItems,
          processedData.amounts
        );
      }

      // อัปเดต payment data ถ้ามี
      if (processedData.payment !== undefined) {
        updateData.payment = {
          ...currentBooking.payment,
          ...processedData.payment,
        };

        // จัดการ transaction พิเศษสำหรับการชำระเงิน
        if (
          processedData.payment.status === "paid" &&
          processedData.payment.amount
        ) {
          updateData.payment.paidAt = new Date();
          if (!updateData.payment.transactions) {
            updateData.payment.transactions = [];
          }
          updateData.payment.transactions.push({
            ref: processedData.payment.ref || `TX${Date.now()}`,
            amount: parseFloat(processedData.payment.amount),
            at: new Date(),
          });
        }
      }

      // ถ้าไม่มี field ใดๆ ที่เปลี่ยนแปลง
      if (Object.keys(updateData).length === 1) {
        // มีแค่ updatedAt
        return SendError(res, 400, "No changes detected");
      }

      const result = await collection.updateOne(
        { _id: new ObjectId(bookingId) },
        { $set: updateData }
      );

      if (result.modifiedCount === 0) {
        return SendError(res, 404, EMessage.ErrUpdate);
      }

      const updatedBooking = await collection.findOne({
        _id: new ObjectId(bookingId),
      });

      return SendSuccess(res, SMessage.Update, updatedBooking);
    } catch (err) {
      console.error("Update booking error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ============================อัปเดต Booking แบบรวมทั้งหมด================================================
  static async Delete(req, res) {
    try {
      const bookingId = req.params.bookingID;
      if (!ObjectId.isValid(bookingId))
        return SendError(res, 400, "Invalid bookingID");

      const collection = await bookingsCollection();
      const booking = await collection.findOne({
        _id: new ObjectId(bookingId),
      });

      if (!booking) return SendError(res, 404, EMessage.NotFound, "booking");

      await collection.deleteOne({ _id: new ObjectId(bookingId) });
      return SendSuccess(res, SMessage.Delete);
    } catch (err) {
      console.error("Delete booking error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }
}

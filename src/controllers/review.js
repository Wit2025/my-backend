import { ObjectId } from "mongodb";
import getDB from "../config/db_mydb.js";
import { EMessage, SMessage } from "../service/message.js";
import { SendCreate, SendError, SendSuccess } from "../service/response.js";
import {
  ValidateCreateReview,
  ValidateUpdateReview,
} from "../service/validate/reviewValidate.js";

// collection async function
const reviewsCollection = async () => (await getDB()).collection("reviews");
const usersCollection = async () => (await getDB()).collection("users");
const packagesCollection = async () => (await getDB()).collection("packages");
const attractionsCollection = async () =>
  (await getDB()).collection("attractions");

export default class ReviewController {
  // สร้าง Review ใหม่
  static async Create(req, res) {
    try {
      const validate = await ValidateCreateReview(req.body);
      if (validate.length > 0) {
        return SendError(res, 400, EMessage.BadRequest + validate.join("/"));
      }

      // ตรวจสอบว่า user มีอยู่จริง
      const users = await usersCollection();
      const user = await users.findOne({ _id: new ObjectId(req.body.user_id) });
      if (!user) return SendError(res, 404, "User not found");

      // ตรวจสอบว่า target มีอยู่จริง
      let targetExists = false;
      if (req.body.target.type === "package") {
        const packages = await packagesCollection();
        const packageDoc = await packages.findOne({
          _id: new ObjectId(req.body.target.id),
        });
        targetExists = !!packageDoc;
      } else if (req.body.target.type === "attraction") {
        const attractions = await attractionsCollection();
        const attraction = await attractions.findOne({
          _id: new ObjectId(req.body.target.id),
        });
        targetExists = !!attraction;
      }

      if (!targetExists) return SendError(res, 404, "Target not found");

      const review = {
        user_id: new ObjectId(req.body.user_id),
        rating: req.body.rating,
        comment: req.body.comment || "",
        photos: req.body.photos || [],
        target: {
          type: req.body.target.type,
          id: new ObjectId(req.body.target.id),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const collection = await reviewsCollection();
      const result = await collection.insertOne(review);

      if (!result.insertedId) return SendError(res, 500, EMessage.ErrInsert);

      return SendCreate(res, SMessage.Create, review);
    } catch (err) {
      console.error("Create review error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ดึง Review ทั้งหมด
  static async SelectAll(req, res) {
    try {
      const { page = 1, limit = 10, targetType, targetId } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const collection = await reviewsCollection();
      const filter = {};

      if (targetType) filter["target.type"] = targetType;
      if (targetId && ObjectId.isValid(targetId))
        filter["target.id"] = new ObjectId(targetId);

      const [reviews, total] = await Promise.all([
        collection
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray(),
        collection.countDocuments(filter),
      ]);

      if (!reviews || reviews.length === 0)
        return SendError(res, 404, EMessage.NotFound, "reviews");

      return SendSuccess(res, SMessage.SelectAll, {
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (err) {
      console.error("SelectAll reviews error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ดึง Review ตาม ID
  static async SelectOne(req, res) {
    try {
      const reviewId = req.params.reviewID;
      if (!ObjectId.isValid(reviewId))
        return SendError(res, 400, "Invalid reviewID");

      const collection = await reviewsCollection();
      const review = await collection.findOne({
        _id: new ObjectId(reviewId),
      });

      if (!review) return SendError(res, 404, EMessage.NotFound, "review");

      return SendSuccess(res, SMessage.SelectOne, review);
    } catch (err) {
      console.error("SelectOne review error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ดึง Review ตาม User ID
  static async SelectByUser(req, res) {
    try {
      const userId = req.params.userID;
      if (!ObjectId.isValid(userId))
        return SendError(res, 400, "Invalid userID");

      const { page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const collection = await reviewsCollection();
      const filter = { user_id: new ObjectId(userId) };

      const [reviews, total] = await Promise.all([
        collection
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray(),
        collection.countDocuments(filter),
      ]);

      if (!reviews || reviews.length === 0)
        return SendError(res, 404, EMessage.NotFound, "reviews for this user");

      return SendSuccess(res, SMessage.SelectAll, {
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (err) {
      console.error("SelectByUser review error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // อัปเดต Review
  static async Update(req, res) {
    try {
      const reviewId = req.params.reviewID;
      if (!ObjectId.isValid(reviewId))
        return SendError(res, 400, "Invalid reviewID");

      const validate = await ValidateUpdateReview(req.body);
      if (validate.length > 0)
        return SendError(res, 400, EMessage.BadRequest + validate.join("/"));

      // ดึงข้อมูล review ปัจจุบันจากฐานข้อมูล
      const collection = await reviewsCollection();
      const currentReview = await collection.findOne({
        _id: new ObjectId(reviewId),
      });

      if (!currentReview) {
        return SendError(res, 404, EMessage.NotFound, "review");
      }

      // ฟังก์ชันสำหรับตรวจสอบว่าค่าแตกต่างและไม่ว่างเปล่า
      const hasValidChange = (newValue, oldValue) => {
        if (newValue === undefined || newValue === null) return false;
        if (typeof newValue === "string" && newValue.trim() === "")
          return false;
        if (Array.isArray(newValue) && newValue.length === 0) return false;
        if (typeof newValue === "object" && Object.keys(newValue).length === 0)
          return false;

        return JSON.stringify(newValue) !== JSON.stringify(oldValue);
      };

      // ฟังก์ชันสำหรับแปลง field ที่เป็น ObjectId
      const processField = (fieldName, value) => {
        if (fieldName === "user_id" && value) {
          return new ObjectId(value);
        }
        if (fieldName === "target" && value && value.id) {
          return {
            ...value,
            id: new ObjectId(value.id),
          };
        }
        return value;
      };

      // สร้าง object สำหรับอัปเดตเฉพาะ field ที่เปลี่ยนแปลง
      const updateData = { updatedAt: new Date() };
      let hasChanges = false;

      // ตรวจสอบแต่ละ field ว่ามีการเปลี่ยนแปลงและ valid หรือไม่
      const fieldsToCheck = [
        "rating",
        "comment",
        "photos",
        "user_id",
        "target",
      ];

      fieldsToCheck.forEach((field) => {
        if (req.body[field] !== undefined) {
          const processedValue = processField(field, req.body[field]);

          if (hasValidChange(processedValue, currentReview[field])) {
            updateData[field] = processedValue;
            hasChanges = true;
          }
        }
      });

      // ถ้าไม่มี field ใดๆ ที่เปลี่ยนแปลง
      if (!hasChanges) {
        return SendError(res, 400, "No valid changes detected");
      }

      const result = await collection.updateOne(
        { _id: new ObjectId(reviewId) },
        { $set: updateData }
      );

      if (result.modifiedCount === 0) {
        return SendError(res, 404, EMessage.ErrUpdate);
      }

      const updatedReview = await collection.findOne({
        _id: new ObjectId(reviewId),
      });

      return SendSuccess(res, SMessage.Update, updatedReview);
    } catch (err) {
      console.error("Update review error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ลบ Review
  static async Delete(req, res) {
    try {
      const reviewId = req.params.reviewID;
      if (!ObjectId.isValid(reviewId))
        return SendError(res, 400, "Invalid reviewID");

      const collection = await reviewsCollection();
      const review = await collection.findOne({
        _id: new ObjectId(reviewId),
      });

      if (!review) return SendError(res, 404, EMessage.NotFound, "review");

      await collection.deleteOne({ _id: new ObjectId(reviewId) });
      return SendSuccess(res, SMessage.Delete);
    } catch (err) {
      console.error("Delete review error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }

  // ดึงคะแนนเฉลี่ยตาม target
  static async GetAverageRating(req, res) {
    try {
      const { targetType, targetId } = req.query;

      if (!targetType || !targetId || !ObjectId.isValid(targetId)) {
        return SendError(
          res,
          400,
          "targetType and valid targetId are required"
        );
      }

      const collection = await reviewsCollection();
      const filter = {
        "target.type": targetType,
        "target.id": new ObjectId(targetId),
      };

      const result = await collection
        .aggregate([
          { $match: filter },
          {
            $group: {
              _id: null,
              averageRating: { $avg: "$rating" },
              totalReviews: { $sum: 1 },
              ratingDistribution: {
                $push: "$rating",
              },
            },
          },
        ])
        .toArray();

      const stats = result[0] || {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: [],
      };

      // คำนวณการกระจายของ rating
      const distribution = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };

      stats.ratingDistribution.forEach((rating) => {
        if (distribution[rating] !== undefined) {
          distribution[rating]++;
        }
      });

      return SendSuccess(res, SMessage.SelectOne, {
        averageRating: Math.round(stats.averageRating * 10) / 10 || 0,
        totalReviews: stats.totalReviews,
        distribution,
      });
    } catch (err) {
      console.error("GetAverageRating error:", err);
      return SendError(res, 500, EMessage.ServerInternal, err);
    }
  }
}

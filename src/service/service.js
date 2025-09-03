import CryptoJS from "crypto-js";
import { PrismaClient } from "@prisma/client";
import { SECRETE_KEY, SECRETE_KEY_REFRESH } from "../config/globalKey.js";
import { EMessage, SMessage } from "./message.js";
import jwt from "jsonwebtoken";
import getDB from "../config/db_mydb.js";
import { ObjectId } from "mongodb";

const prisma = new PrismaClient();

// Verify Refresh Token
export const VerifyRefreshToken = async (refreshToken) => {
  return new Promise(async (resolve, reject) => {
    try {
      jwt.verify(refreshToken, SECRETE_KEY_REFRESH, async (err, decode) => {
        if (err) {
          console.error("JWT verify error:", err);
          return reject("Refresh Token Invalid");
        }

        console.log("Decoded refresh token id:", decode.id);

        // ใช้ uuid ในการหา user
        const user = await prisma.user.findUnique({
          where: { uuid: decode.id },
          select: {
            id: true,
            uuid: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            passport: true,
            addresses: true,
            loyaltyPoints: true,
          },
        });

        if (!user) {
          console.error("User not found with uuid:", decode.id);
          return reject("Error Verify Refresh Token");
        }

        const tokens = await GenerateToken(user.uuid); // ใช้ uuid
        return resolve(tokens);
      });
    } catch (error) {
      console.error("VerifyRefreshToken error:", error);
      reject(error);
    }
  });
};

// Verify Access Token
// Verify Access Token - แก้ไขให้ใช้ MongoDB
export const VerifyToken = async (token) => {
  return new Promise(async (resolve, reject) => {
    try {
      jwt.verify(token, SECRETE_KEY, async (err, decode) => {
        if (err) {
          console.error("JWT verify error:", err);
          return reject("Token Invalid");
        }
        console.log("Decoded token id:", decode.id);

        // ใช้ MongoDB แทน Prisma
        const db = await getDB();
        const usersCollection = db.collection("users");

        const user = await usersCollection.findOne(
          { _id: new ObjectId(decode.id) },
          { projection: { passwordHash: 0 } }
        );

        if (!user) {
          console.error("User not found with id:", decode.id);
          return reject("Error Verify Token");
        }

        console.log("User found:", user);
        return resolve(user);
      });
    } catch (error) {
      console.error("VerifyToken error:", error);
      reject(error);
    }
  });
};

// Generate Token
export const GenerateToken = async (userUuid) => {
  const payload = { id: userUuid };
  const payload_refresh = { id: userUuid };

  const token = jwt.sign(payload, SECRETE_KEY, { expiresIn: "3h" });
  const refreshToken = jwt.sign(payload_refresh, SECRETE_KEY_REFRESH, {
    expiresIn: "5h",
  });

  return { token, refreshToken };
};

export const FindOneOrder = async (orderID) => {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await prisma.order.findFirst({
        where: { orderID: orderID },
      });
      if (!data) {
        reject(EMessage.NotFound + "order");
      }
      resolve(data);
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
};

export const FindOneProduct = async (productID) => {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await prisma.product.findFirst({
        where: { productID: productID },
      });
      if (!data) {
        reject(EMessage.NotFound + "product");
      }
      resolve(data);
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
};

export const FindOneEmail = async (email) => {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await prisma.user.findFirst({
        where: { email: email },
      });
      if (!data) {
        reject(EMessage.NotFound + "Email");
      }
      resolve(data);
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
};

export const CheckEmail = async (email) => {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await prisma.user.findFirst({
        where: { email: email },
      });
      if (data) {
        reject(SMessage.Already);
      }
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
};

export const Encrypt = async (data) => {
  return CryptoJS.AES.encrypt(data, SECRETE_KEY).toString();
};

export const Decrypt = async (data) => {
  return CryptoJS.AES.decrypt(data, SECRETE_KEY).toString(CryptoJS.enc.Utf8);
};

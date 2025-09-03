import { EMessage } from "../service/message.js";
import { SendError } from "../service/response.js";
import { VerifyToken } from "../service/service.js";

export const auth = async (req, res, next) => {
  try {
    const authorization = req.headers['authorization'];
    if (!authorization) {
      return SendError(res, 401, EMessage.Unauthorization);
    }
    
    const token = authorization.replace("Bearer ", "");
    console.log("Token received:", token);
    
    const verify = await VerifyToken(token);
    if (!verify) {
      return SendError(res, 401, EMessage.Unauthorization);
    }
    
    console.log("User verified:", verify);
    req.user = verify;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return SendError(res, 401, EMessage.Unauthorization);
  }
};
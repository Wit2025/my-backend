export const SendSuccess = (res, message, data) => {
  res.status(200).json({ success: true, message, data });
  // 200 ok ໃຊ້ກັບ update , select , post
};
export const SendCreate = (res, message, data) => {
  res.status(201).json({ success: true, message, data });
  // 201 Create use Insert
};
export const SendError = (res, status, message, error) => {
  res.status(status).json({ success: false, message, error, data: {} });
  // ລວມ error 400 = badrequest,401 = unauthorization,404 = not found, 
  // 500 = Server Internal
};

export const creationInfo = (req) => ({
  createdBy: req.user?._id,
  updatedBy: req.user?._id,
  status: req.body.status || "active",
});
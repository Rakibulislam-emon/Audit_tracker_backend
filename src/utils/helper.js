export const createdBy = (req) => ({
  createdBy: req.user?._id,
  updatedBy: req.user?._id,
  status: req.body.status || "active",
});

// update
export const updatedBy = (req) => ({
  updatedBy: req.user?._id,
  status: req.body.status,
});


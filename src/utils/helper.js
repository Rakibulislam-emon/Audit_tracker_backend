export const createdBy = (req) => ( console.log("req from helper",req.user),{
  createdBy: req.user?._id,
  updatedBy: req.user?._id,
  status: req.body.status || "active",
});

// update
export const updatedBy = (req) => ({
  updatedBy: req.user?._id,
  status: req.body.status,
});

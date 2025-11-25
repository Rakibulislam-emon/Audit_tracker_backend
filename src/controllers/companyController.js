import Company from "../models/Company.js";
import { createdBy, updatedBy } from "../utils/helper.js";

// GET /api/companies
// export const getAllCompanies = async (req, res) => {
//   console.log("res:", req.query);

//   try {
//     const { search, group, status } = req.query;
//     console.log(group)
//     let filter = {};

//         // Status filter
//     if (status === "active") {
//       filter.isActive = true;
//     } else if (status === "inactive") {
//       filter.isActive = false;
//     }
//     const companies = await Company.find()
//       .populate("group", "name") // Only show 'name' from Group
//       .populate("createdBy", "name email")
//       .populate("updatedBy", "name email");
//     console.log(companies);
//     res.status(200).json({
//       data: companies,
//       message: "Companies fetched successfully",
//       success: true,
//       count: companies.length,
//     });
//     // res.status(200).json(companies);
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// GET /api/companies
export const getAllCompanies = async (req, res) => {
  try {
    // ধাপ ১: req.query থেকে ফিল্টার ভ্যালুগুলো নিন
    const { search, group, status } = req.query;

    // ধাপ ২: Mongoose-এর জন্য একটি ডাইনামিক কুয়েরি অবজেক্ট তৈরি করুন
    const query = {};

    // ধাপ ৩: স্ট্যাটাস এবং গ্রুপ ফিল্টার (যদি থাকে) যোগ করুন

    if (status === "active" || status === "inactive") {
      query.status = status; // সরাসরি string ভ্যালু ব্যবহার করা হচ্ছে
    }
    if (group) {
      query.group = group; // ফ্রন্টএন্ড থেকে group _id আসবে
    }

    // ধাপ ৪: সার্চ ফিল্টার যোগ করুন
    if (search) {
      const searchRegex = { $regex: search, $options: "i" }; // 'i' = case-insensitive

      // $or ব্যবহার করে একাধিক ফিল্ডে সার্চ করুন
      // এটি আপনার dynamicConfig.js-এর 'filters.search.fields' এর সাথে মিল রেখে করা
      query.$or = [
        { name: searchRegex },
        { sector: searchRegex },
        { address: searchRegex },
      ];
    }

    // ধাপ ৫: ডাইনামিক 'query' অবজেক্ট ব্যবহার করে ডেটা খুঁজুন
    const companies = await Company.find(query)
      .populate("group", "name")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ createdAt: -1 }); // নতুন আইটেমগুলো আগে দেখানোর জন্য সর্ট করা ভালো

    // console.log(companies, "from 78");
    // ধাপ ৬: ফিল্টার করা ডেটার মোট সংখ্যা গণনা করুন
    const count = await Company.countDocuments(query);

    res.status(200).json({
      data: companies,
      message: "Companies fetched successfully",
      success: true,
      count: count, // ✅ সঠিক count পাঠানো হচ্ছে
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /api/companies/:id
export const getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate("group", "name")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    res.status(200).json({
      data: company,
      message: "Company fetched successfully",
      success: true,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST /api/companies
export const createCompany = async (req, res) => {
  try {
    const { name, group, sector, address } = req.body;

    if (!name || !group) {
      return res.status(400).json({ message: "Name and group are required" });
    }

    const newCompany = new Company({
      name,
      group,
      sector,
      address,
      ...createdBy(req),
    });
    const savedCompany = await newCompany.save();

    res.status(201).json(savedCompany);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error creating company", error: error.message });
  }
};

// PUT /api/companies/:id
export const updateCompany = async (req, res) => {
  try {
    const { name, group, sector, address } = req.body;
    const companyId = req.params.id;
    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      { name, group, sector, address, ...updatedBy(req) },
      { new: true, runValidators: true }
    )
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!updatedCompany) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.status(200).json({
      data: updatedCompany,
      message: "Companies updated successfully",
      success: true,
    });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating company", error: error.message });
  }
};

// DELETE /api/companies/:id
export const deleteCompany = async (req, res) => {
  try {
    const deletedCompany = await Company.findByIdAndDelete(req.params.id);
    if (!deletedCompany) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.status(200).json({ message: "Company deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting company", error: error.message });
  }
};

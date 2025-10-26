// src/controllers/siteController.js

import Site from "../models/Site.js";
import { createdBy, updatedBy } from "../utils/helper.js";

// GET /api/sites - ফিল্টারিং, সর্টিং, পপুলেশন সহ
export const getAllSites = async (req, res) => {

    console.log("site arrived")
    try {
        // ধাপ ১: req.query থেকে ফিল্টার ভ্যালু নিন
        const { search, company, status } = req.query;
        console.log("[getAllSites] req.query:", req.query);

        // ধাপ ২: Mongoose কুয়েরি অবজেক্ট তৈরি করুন
        const query = {};

        // ধাপ ৩: স্ট্যাটাস এবং কোম্পানি ফিল্টার যোগ করুন
        if (status === "active" || status === "inactive") {
            query.status = status; // Site মডেলে 'status' আছে (commonFields থেকে)
        }
        if (company) {
            query.company = company; // ফ্রন্টএন্ড থেকে company _id আসবে
        }

        // ধাপ ৪: সার্চ ফিল্টার যোগ করুন (name এবং location ফিল্ডে)
        if (search) {
            const searchRegex = { $regex: search, $options: "i" };
            query.$or = [
                { name: searchRegex },
                { location: searchRegex },
                // আপনি চাইলে এখানে পপুলেটেড company name দিয়েও সার্চ করতে পারেন,
                // কিন্তু তার জন্য aggregation pipeline লাগবে, যা একটু জটিল।
                // আপাতত name ও location দিয়েই সার্চ সীমাবদ্ধ রাখা হলো।
            ];
        }

        console.log("[getAllSites] Final Mongoose Query:", JSON.stringify(query));

        // ধাপ ৫: কুয়েরি ব্যবহার করে ডেটা খুঁজুন এবং পপুলেট করুন
        const sites = await Site.find(query)
            .populate("company", "name") // Company-র শুধু নাম পপুলেট করুন
            .populate("createdBy", "name email") // User-এর নাম ও ইমেইল
            .populate("updatedBy", "name email") // User-এর নাম ও ইমেইল
            .sort({ createdAt: -1 }); // সর্টিং

            console.log("sites",sites)
        // ধাপ ৬: মোট সংখ্যা গণনা করুন
        const count = await Site.countDocuments(query);

        // ✅ স্ট্যান্ডার্ড রেসপন্স ফরম্যাট ব্যবহার করুন
        res.status(200).json({
            data: sites,
            count: count,
            message: "Sites fetched successfully",
            success: true,
        });

    } catch (error) {
        console.error("[getAllSites] Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// GET /api/sites/:id - Population ও রেসপন্স ফরম্যাট আপডেট
export const getSiteById = async (req, res) => {
    try {
        const { id } = req.params;
        const site = await Site.findById(id)
            .populate("company", "name")
            .populate("createdBy", "name email")
            .populate("updatedBy", "name email"); // ✅ updatedBy যোগ করা হয়েছে

        if (!site) {
            return res.status(404).json({ message: "Site not found", success: false });
        }

        // ✅ স্ট্যান্ডার্ড রেসপন্স ফরম্যাট
        res.status(200).json({
            data: site,
            message: "Site fetched successfully",
            success: true,
        });

    } catch (error) {
        console.error("[getSiteById] Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// POST /api/sites - Population ও রেসপন্স ফরম্যাট আপডেট
export const createSite = async (req, res) => {
    try {
        const { name, location, company } = req.body;

        if (!name || !company) {
            return res.status(400).json({ message: "Name and company are required", success: false });
        }

        const newSite = new Site({
            name,
            location,
            company,
            ...createdBy(req) // createdBy যোগ করা হয়েছে
        });
        let savedSite = await newSite.save();

        // ✅ Save করার পর পপুলেট করে রেসপন্স পাঠানো ভালো
        savedSite = await Site.findById(savedSite._id)
            .populate("company", "name")
            .populate("createdBy", "name email")
            .populate("updatedBy", "name email");


        // ✅ স্ট্যান্ডার্ড রেসপন্স ফরম্যাট
        res.status(201).json({
            data: savedSite,
            message: "Site created successfully",
            success: true,
        });

    } catch (error) {
        console.error("[createSite] Error:", error);
        // Duplicate key error handling (যদি name ইউনিক হতে হয়)
        if (error.code === 11000) {
             return res.status(400).json({ message: "Site name already exists", error: error.message, success: false });
        }
        res.status(400).json({ message: "Error creating site", error: error.message, success: false });
    }
};

// PUT /api/sites/:id - Population ও রেসপন্স ফরম্যাট আপডেট
export const updateSite = async (req, res) => {
    try {
        const { name, location, company } = req.body;
        const siteId = req.params.id;

        // Validation: নিশ্চিত করুন name ও company আছে
        if (!name || !company) {
             return res.status(400).json({ message: "Name and company are required", success: false });
        }

        let updatedSite = await Site.findByIdAndUpdate(
            siteId,
            {
                name,
                location,
                company,
                ...updatedBy(req) // updatedBy যোগ করা হয়েছে
            },
            { new: true, runValidators: true } // new: true আপডেট করা ডকুমেন্ট রিটার্ন করে
        );

        if (!updatedSite) {
            return res.status(404).json({ message: "Site not found", success: false });
        }

        // ✅ আপডেট করার পর পপুলেট করুন
        updatedSite = await Site.findById(updatedSite._id)
            .populate("company", "name")
            .populate("createdBy", "name email")
            .populate("updatedBy", "name email");


        // ✅ স্ট্যান্ডার্ড রেসপন্স ফরম্যাট
        res.status(200).json({
            data: updatedSite,
            message: "Site updated successfully",
            success: true,
        });

    } catch (error) {
        console.error("[updateSite] Error:", error);
         if (error.code === 11000) { // Duplicate key error
             return res.status(400).json({ message: "Site name already exists", error: error.message, success: false });
        }
        res.status(400).json({ message: "Error updating site", error: error.message, success: false });
    }
};

// DELETE /api/sites/:id - রেসপন্স ফরম্যাট আপডেট
export const deleteSite = async (req, res) => {
    try {
        const deletedSite = await Site.findByIdAndDelete(req.params.id);

        if (!deletedSite) {
            return res.status(404).json({ message: "Site not found", success: false });
        }

        // ✅ স্ট্যান্ডার্ড রেসপন্স ফরম্যাট
        res.status(200).json({
             message: "Site deleted successfully",
             success: true,
             data: deletedSite // ডিলিট হওয়া আইটেমটি পাঠানো যেতে পারে (অপশনাল)
        });

    } catch (error) {
        console.error("[deleteSite] Error:", error);
        res.status(500).json({ message: "Error deleting site", error: error.message, success: false });
    }
};
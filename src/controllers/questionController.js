// src/controllers/questionController.js

import Question from "../models/Question.js";
import Template from "../models/Template.js"; // Import Template model for template filtering
import { createdBy, updatedBy } from "../utils/helper.js"; // Ensure updatedBy is imported

// GET /api/questions - UPDATED with new filters
// GET /api/questions - UPDATED with template and site filtering
export const getAllQuestions = async (req, res) => {
  try {
    // 🎯 STEP 1: Get ALL filter parameters including template and site
    const {
      search,
      status,
      responseType,
      rule,
      checkType,
      template, // 🎯 NEW: Template filter (for future use)
      site, // 🎯 NEW: Site filter (CRITICAL FOR OBSERVATIONS)
    } = req.query;

    console.log("[getAllQuestions] req.query:", req.query);

    // 🎯 STEP 2: Create dynamic Mongoose query object
    const query = {};

    // 🎯 STEP 3: Add BASIC filters (existing code)
    if (status === "active" || status === "inactive") {
      query.status = status;
    }
    if (rule) {
      query.rule = rule;
    }
    if (checkType) {
      query.checkType = checkType;
    }
    if (responseType) {
      query.responseType = responseType;
    }

    // 🎯 STEP 4: CRITICAL - Add SITE filtering
    if (site) {
      // 🎯 NEW LOGIC: Only show questions applicable to this site
      query.$or = [
        { applicableSites: { $in: [site] } }, // Site-specific questions
        { applicableSites: { $size: 0 } }, // OR questions for all sites
        { applicableSites: { $exists: false } }, // OR questions for all sites
      ];
      console.log(`[getAllQuestions] Site filtering applied for site: ${site}`);
    }

    // 🎯 STEP 5: TEMPLATE FILTERING - We'll handle this later
    if (template) {
      console.log(`[getAllQuestions] Template filtering for: ${template}`);

      try {
        // 1. Find the template and get its question IDs
        const templateDoc = await Template.findById(template).select(
          "questions"
        );

        if (templateDoc && templateDoc.questions.length > 0) {
          // 2. Show ONLY questions that are in this template
          query._id = { $in: templateDoc.questions };
          console.log(
            `[getAllQuestions] Showing ${templateDoc.questions.length} questions from template`
          );
        } else {
          // 3. If template has no questions, return empty
          query._id = { $in: [] };
          console.log(`[getAllQuestions] Template has no questions`);
        }
      } catch (error) {
        console.error(`[getAllQuestions] Template lookup error:`, error);
        // On error, don't filter (show all questions)
      }
    }

    // 🎯 STEP 6: Add search filter (existing code - fixed for $or logic)
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };

      // Handle the $or logic correctly when we have both site filter and search
      if (query.$or) {
        // We already have $or from site filtering, so we need to nest the search
        query.$and = [
          { $or: query.$or }, // Keep the existing site filter
          {
            $or: [{ questionText: searchRegex }, { section: searchRegex }],
          },
        ];
        delete query.$or; // Remove the top-level $or since we moved it to $and
      } else {
        // No existing $or, just add search normally
        query.$or = [{ questionText: searchRegex }, { section: searchRegex }];
      }
    }

    console.log(
      "[getAllQuestions] Final Mongoose Query:",
      JSON.stringify(query)
    );

    // 🎯 STEP 7: Find data with population
    const questions = await Question.find(query)
      .populate("rule", "name ruleCode category")
      .populate("checkType", "name")
      .populate("applicableSites", "name location") // 🎯 NEW: Populate site names
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ createdAt: -1 });

    // 🎯 STEP 8: Count results
    const count = await Question.countDocuments(query);

    // Standard response
    res.status(200).json({
      data: questions,
      count: count,
      message: "Questions fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getAllQuestions] Error:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};

// GET /api/questions/:id - UPDATED population
export const getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate("rule", "name ruleCode category") // ✅ Populate new rule field
      .populate("checkType", "name") // ✅ Populate new checkType field
      // ❌ REMOVED: .populate('template', 'title')
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!question) {
      return res
        .status(404)
        .json({ message: "Question not found", success: false });
    }

    // Standard response format
    res.status(200).json({
      data: question,
      message: "Question fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getQuestionById] Error:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};

// POST /api/questions - UPDATED fields
export const createQuestion = async (req, res) => {
  try {
    // ✅ template REMOVED, rule and checkType ADDED
    const {
      section,
      questionText,
      responseType,
      severityDefault,
      weight,
      rule,
      checkType,
    } = req.body;

    // Validation
    if (!questionText || !responseType) {
      // ✅ template check REMOVED
      return res.status(400).json({
        message: "Question text and response type are required",
        success: false,
      });
    }

    const newQuestion = new Question({
      section,
      questionText,
      responseType,
      severityDefault,
      weight,
      rule: rule || null, // ✅ ADDED (optional)
      checkType: checkType || null, // ✅ ADDED (optional)
      // ❌ template field REMOVED
      ...createdBy(req),
    });

    let savedQuestion = await newQuestion.save();

    // Populate after saving
    savedQuestion = await Question.findById(savedQuestion._id)
      .populate("rule", "name ruleCode") // ✅ Populate new fields
      .populate("checkType", "name") // ✅ Populate new fields
      // ❌ REMOVED: .populate('template', 'title')
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.status(201).json({
      data: savedQuestion,
      message: "Question created successfully",
      success: true,
    });
  } catch (error) {
    console.error("[createQuestion] Error:", error);
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res.status(400).json({
      message: "Error creating question",
      error: error.message,
      success: false,
    });
  }
};

// PUT /api/questions/:id - UPDATED fields (using PATCH logic)
export const updateQuestion = async (req, res) => {
  try {
    // ✅ template REMOVED, rule and checkType ADDED
    const {
      section,
      questionText,
      responseType,
      severityDefault,
      weight,
      rule,
      checkType,
      status,
    } = req.body;
    const questionId = req.params.id;

    // Validation: Only check core fields if they are provided
    if (questionText === "") {
      // Check if trying to empty required field
      return res
        .status(400)
        .json({ message: "Question text cannot be empty", success: false });
    }
    if (responseType === "") {
      return res
        .status(400)
        .json({ message: "Response type cannot be empty", success: false });
    }

    // Build update object dynamically for PATCH
    const updateData = { ...updatedBy(req) };
    if (section !== undefined) updateData.section = section;
    if (questionText) updateData.questionText = questionText;
    if (responseType) updateData.responseType = responseType;
    if (severityDefault !== undefined)
      updateData.severityDefault = severityDefault;
    if (weight) updateData.weight = weight;
    if (rule !== undefined) updateData.rule = rule || null; // Allow setting to null
    if (checkType !== undefined) updateData.checkType = checkType || null; // Allow setting to null
    if (status) updateData.status = status;
    // ❌ template field REMOVED

    let updatedQuestion = await Question.findByIdAndUpdate(
      questionId,
      updateData, // Pass the dynamic update object
      { new: true, runValidators: true }
    );

    if (!updatedQuestion) {
      return res
        .status(404)
        .json({ message: "Question not found", success: false });
    }

    // Repopulate for response
    updatedQuestion = await Question.findById(updatedQuestion._id)
      .populate("rule", "name ruleCode") // ✅ Populate new fields
      .populate("checkType", "name") // ✅ Populate new fields
      // ❌ REMOVED: .populate('template', 'title')
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.status(200).json({
      data: updatedQuestion,
      message: "Question updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("[updateQuestion] Error:", error);
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res.status(400).json({
      message: "Error updating question",
      error: error.message,
      success: false,
    });
  }
};

// DELETE /api/questions/:id - (Added standard response)
export const deleteQuestion = async (req, res) => {
  try {
    const deletedQuestion = await Question.findByIdAndDelete(req.params.id);
    if (!deletedQuestion) {
      return res
        .status(404)
        .json({ message: "Question not found", success: false });
    }

    // TODO: Check if this question is used in any Template? (Future enhancement)

    res.status(200).json({
      message: "Question deleted successfully",
      success: true,
      data: deletedQuestion, // Optional
    });
  } catch (error) {
    console.error("[deleteQuestion] Error:", error);
    res.status(500).json({
      message: "Error deleting question",
      error: error.message,
      success: false,
    });
  }
};

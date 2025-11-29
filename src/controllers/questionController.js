// src/controllers/questionController.js

import Question from "../models/Question.js";
import Template from "../models/Template.js";
import { createdBy, updatedBy } from "../utils/helper.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

// GET /api/questions - UPDATED with template and site filtering
export const getAllQuestions = asyncHandler(async (req, res, next) => {
  // Step 1: Get ALL filter parameters including template and site
  const { search, status, responseType, rule, template, site } = req.query;

  // Step 2: Create dynamic Mongoose query object
  const query = {};

  // Step 3: Add BASIC filters
  if (status === "active" || status === "inactive") {
    query.status = status;
  }
  if (rule) {
    query.rule = rule;
  }
  if (responseType) {
    query.responseType = responseType;
  }

  // Step 4: Add SITE filtering
  if (site) {
    query.$or = [
      { applicableSites: { $in: [site] } },
      { applicableSites: { $size: 0 } },
      { applicableSites: { $exists: false } },
    ];
  }

  // Step 5: TEMPLATE FILTERING
  if (template) {
    try {
      const templateDoc = await Template.findById(template).select("questions");

      if (templateDoc && templateDoc.questions.length > 0) {
        query._id = { $in: templateDoc.questions };
      } else {
        query._id = { $in: [] };
      }
    } catch (error) {
      console.error(`[getAllQuestions] Template lookup error:`, error);
    }
  }

  // Step 6: Add search filter
  if (search) {
    const searchRegex = { $regex: search, $options: "i" };

    if (query.$or) {
      query.$and = [
        { $or: query.$or },
        {
          $or: [{ questionText: searchRegex }, { section: searchRegex }],
        },
      ];
      delete query.$or;
    } else {
      query.$or = [{ questionText: searchRegex }, { section: searchRegex }];
    }
  }

  // Step 7: Find data with population
  const questions = await Question.find(query)
    .populate("rule", "name ruleCode category")
    .populate("applicableSites", "name location")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ createdAt: -1 });

  // Step 8: Count results
  const count = await Question.countDocuments(query);

  res.status(200).json({
    data: questions,
    count: count,
    message: "Questions fetched successfully",
    success: true,
  });
});

// GET /api/questions/:id - UPDATED population
export const getQuestionById = asyncHandler(async (req, res, next) => {
  const question = await Question.findById(req.params.id)
    .populate("rule", "name ruleCode category")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!question) {
    throw new AppError("Question not found", 404);
  }

  res.status(200).json({
    data: question,
    message: "Question fetched successfully",
    success: true,
  });
});

// POST /api/questions - UPDATED fields
export const createQuestion = asyncHandler(async (req, res, next) => {
  const { section, questionText, responseType, severityDefault, weight, rule } =
    req.body;

  // Validation
  if (!questionText || !responseType) {
    throw new AppError("Question text and response type are required", 400);
  }

  const newQuestion = new Question({
    section,
    questionText,
    responseType,
    severityDefault,
    weight,
    rule: rule || null,
    ...createdBy(req),
  });

  let savedQuestion = await newQuestion.save();

  // Populate after saving
  savedQuestion = await Question.findById(savedQuestion._id)
    .populate("rule", "name ruleCode")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(201).json({
    data: savedQuestion,
    message: "Question created successfully",
    success: true,
  });
});

// PUT /api/questions/:id - UPDATED fields
export const updateQuestion = asyncHandler(async (req, res, next) => {
  const {
    section,
    questionText,
    responseType,
    severityDefault,
    weight,
    rule,
    status,
  } = req.body;
  const questionId = req.params.id;

  // Validation
  if (questionText === "") {
    throw new AppError("Question text cannot be empty", 400);
  }
  if (responseType === "") {
    throw new AppError("Response type cannot be empty", 400);
  }

  // Build update object dynamically
  const updateData = { ...updatedBy(req) };
  if (section !== undefined) updateData.section = section;
  if (questionText) updateData.questionText = questionText;
  if (responseType) updateData.responseType = responseType;
  if (severityDefault !== undefined)
    updateData.severityDefault = severityDefault;
  if (weight) updateData.weight = weight;
  if (rule !== undefined) updateData.rule = rule || null;
  if (status) updateData.status = status;

  let updatedQuestion = await Question.findByIdAndUpdate(
    questionId,
    updateData,
    { new: true, runValidators: true }
  );

  if (!updatedQuestion) {
    throw new AppError("Question not found", 404);
  }

  // Repopulate for response
  updatedQuestion = await Question.findById(updatedQuestion._id)
    .populate("rule", "name ruleCode")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(200).json({
    data: updatedQuestion,
    message: "Question updated successfully",
    success: true,
  });
});

// DELETE /api/questions/:id
export const deleteQuestion = asyncHandler(async (req, res, next) => {
  const deletedQuestion = await Question.findByIdAndDelete(req.params.id);
  if (!deletedQuestion) {
    throw new AppError("Question not found", 404);
  }

  res.status(200).json({
    message: "Question deleted successfully",
    success: true,
    data: deletedQuestion,
  });
});

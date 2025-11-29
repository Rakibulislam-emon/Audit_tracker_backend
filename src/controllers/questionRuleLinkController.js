import QuestionRuleLink from "../models/QuestionRuleLink.js";
import { createdBy, updatedBy } from "../utils/helper.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

// 1. Get all question-rule links
export const getAllQuestionRuleLinks = asyncHandler(async (req, res, next) => {
  const { question, rule, complianceLevel, page = 1, limit = 20 } = req.query;

  // Build filter object
  const filter = {};
  if (question) filter.question = question;
  if (rule) filter.rule = rule;
  if (complianceLevel) filter.complianceLevel = complianceLevel;

  const links = await QuestionRuleLink.find(filter)
    .populate("question", "questionText section")
    .populate("rule", "name standard code")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await QuestionRuleLink.countDocuments(filter);

  res.status(200).json({
    questionRuleLinks: links,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit,
    },
    message: "Question-rule links retrieved successfully",
  });
});

// 2. Get question-rule link by ID
export const getQuestionRuleLinkById = asyncHandler(async (req, res, next) => {
  const link = await QuestionRuleLink.findById(req.params.id)
    .populate("question", "questionText section type options")
    .populate("rule", "name standard code description category")
    .populate("createdBy", "name email");

  if (!link) {
    throw new AppError("Question-rule link not found", 404);
  }

  res.status(200).json({
    questionRuleLink: link,
    message: "Question-rule link retrieved successfully",
  });
});

// 3. Create new question-rule link
export const createQuestionRuleLink = asyncHandler(async (req, res, next) => {
  const { question, rule, complianceLevel, weight, reference, description } =
    req.body;

  if (!question || !rule) {
    throw new AppError("Question and rule are required", 400);
  }

  // Check if link already exists
  const existingLink = await QuestionRuleLink.findOne({ question, rule });
  if (existingLink) {
    throw new AppError("Question-rule link already exists", 400);
  }

  const newLink = new QuestionRuleLink({
    question,
    rule,
    complianceLevel: complianceLevel || "mandatory",
    weight: weight || 10,
    reference,
    description,
    ...createdBy(req),
  });

  const savedLink = await newLink.save();

  res.status(201).json({
    savedQuestionRuleLink: savedLink,
    message: "Question-rule link created successfully",
  });
});

// 4. Update question-rule link
export const updateQuestionRuleLink = asyncHandler(async (req, res, next) => {
  const { complianceLevel, weight, reference, description } = req.body;
  const linkId = req.params.id;

  const updatedLink = await QuestionRuleLink.findByIdAndUpdate(
    linkId,
    {
      complianceLevel,
      weight,
      reference,
      description,
      ...updatedBy(req),
    },
    { new: true, runValidators: true }
  );

  if (!updatedLink) {
    throw new AppError("Question-rule link not found", 404);
  }

  res.status(200).json({
    updatedQuestionRuleLink: updatedLink,
    message: "Question-rule link updated successfully",
  });
});

// 5. Delete question-rule link
export const deleteQuestionRuleLink = asyncHandler(async (req, res, next) => {
  const deletedLink = await QuestionRuleLink.findByIdAndDelete(req.params.id);

  if (!deletedLink) {
    throw new AppError("Question-rule link not found", 404);
  }

  res.status(200).json({ message: "Question-rule link deleted successfully" });
});

// 6. Get links by question
export const getLinksByQuestion = asyncHandler(async (req, res, next) => {
  const { questionId } = req.params;

  const links = await QuestionRuleLink.find({ question: questionId })
    .populate("rule", "name standard code category")
    .populate("createdBy", "name email")
    .sort({ complianceLevel: -1, weight: -1 });

  res.status(200).json({
    questionRuleLinks: links,
    message: "Question-rule links retrieved successfully for question",
  });
});

// 7. Get links by rule
export const getLinksByRule = asyncHandler(async (req, res, next) => {
  const { ruleId } = req.params;

  const links = await QuestionRuleLink.find({ rule: ruleId })
    .populate("question", "questionText section type")
    .populate("createdBy", "name email")
    .sort({ weight: -1 });

  res.status(200).json({
    questionRuleLinks: links,
    message: "Question-rule links retrieved successfully for rule",
  });
});

// 8. Bulk create question-rule links
export const bulkCreateQuestionRuleLinks = asyncHandler(
  async (req, res, next) => {
    const { links } = req.body;

    if (!links || !Array.isArray(links) || links.length === 0) {
      throw new AppError("Links array is required", 400);
    }

    // Validate each link
    for (const link of links) {
      if (!link.question || !link.rule) {
        throw new AppError("Each link must have question and rule", 400);
      }
    }

    const createdLinks = await QuestionRuleLink.insertMany(
      links.map((link) => ({
        ...link,
        ...createdBy(req),
      }))
    );

    res.status(201).json({
      questionRuleLinks: createdLinks,
      message: `${createdLinks.length} question-rule links created successfully`,
    });
  }
);

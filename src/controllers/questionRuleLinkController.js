import QuestionRuleLink from "../models/QuestionRuleLink.js";
import { createdBy, updatedBy } from "../utils/helper.js";

// ১. Get all question-rule links
export const getAllQuestionRuleLinks = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ২. Get question-rule link by ID
export const getQuestionRuleLinkById = async (req, res) => {
  try {
    const link = await QuestionRuleLink.findById(req.params.id)
      .populate("question", "questionText section type options")
      .populate("rule", "name standard code description category")
      .populate("createdBy", "name email");

    if (!link) {
      return res.status(404).json({ message: "Question-rule link not found" });
    }

    res.status(200).json({
      questionRuleLink: link,
      message: "Question-rule link retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ৩. Create new question-rule link
export const createQuestionRuleLink = async (req, res) => {
  try {
    const { question, rule, complianceLevel, weight, reference, description } =
      req.body;

    if (!question || !rule) {
      return res.status(400).json({
        message: "Question and rule are required",
      });
    }

    // Check if link already exists
    const existingLink = await QuestionRuleLink.findOne({ question, rule });
    if (existingLink) {
      return res.status(400).json({
        message: "Question-rule link already exists",
      });
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
  } catch (error) {
    res.status(400).json({ message: "Error creating question-rule link" });
  }
};

// ৪. Update question-rule link
export const updateQuestionRuleLink = async (req, res) => {
  try {
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
      return res.status(404).json({ message: "Question-rule link not found" });
    }

    res.status(200).json({
      updatedQuestionRuleLink: updatedLink,
      message: "Question-rule link updated successfully",
    });
  } catch (error) {
    res.status(400).json({ message: "Error updating question-rule link" });
  }
};

// ৫. Delete question-rule link
export const deleteQuestionRuleLink = async (req, res) => {
  try {
    const deletedLink = await QuestionRuleLink.findByIdAndDelete(req.params.id);

    if (!deletedLink) {
      return res.status(404).json({ message: "Question-rule link not found" });
    }

    res
      .status(200)
      .json({ message: "Question-rule link deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting question-rule link" });
  }
};

// ৬. Get links by question
export const getLinksByQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    const links = await QuestionRuleLink.find({ question: questionId })
      .populate("rule", "name standard code category")
      .populate("createdBy", "name email")
      .sort({ complianceLevel: -1, weight: -1 });

    res.status(200).json({
      questionRuleLinks: links,
      message: "Question-rule links retrieved successfully for question",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ৭. Get links by rule
export const getLinksByRule = async (req, res) => {
  try {
    const { ruleId } = req.params;

    const links = await QuestionRuleLink.find({ rule: ruleId })
      .populate("question", "questionText section type")
      .populate("createdBy", "name email")
      .sort({ weight: -1 });

    res.status(200).json({
      questionRuleLinks: links,
      message: "Question-rule links retrieved successfully for rule",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ৮. Bulk create question-rule links
export const bulkCreateQuestionRuleLinks = async (req, res) => {
  try {
    const { links } = req.body;

    if (!links || !Array.isArray(links) || links.length === 0) {
      return res.status(400).json({ message: "Links array is required" });
    }

    // Validate each link
    for (const link of links) {
      if (!link.question || !link.rule) {
        return res.status(400).json({
          message: "Each link must have question and rule",
        });
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
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error creating question-rule links in bulk" });
  }
};

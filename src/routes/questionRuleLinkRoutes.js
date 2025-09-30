import { Router } from "express";
import * as questionRuleLinkController from "../controllers/questionRuleLinkController.js";

const router = Router();

// Basic CRUD routes
router.get("/", questionRuleLinkController.getAllQuestionRuleLinks);
router.get("/:id", questionRuleLinkController.getQuestionRuleLinkById);
router.post("/", questionRuleLinkController.createQuestionRuleLink);
router.put("/:id", questionRuleLinkController.updateQuestionRuleLink);
router.delete("/:id", questionRuleLinkController.deleteQuestionRuleLink);

// Special routes
router.get("/question/:questionId", questionRuleLinkController.getLinksByQuestion);
router.get("/rule/:ruleId", questionRuleLinkController.getLinksByRule);
router.post("/bulk", questionRuleLinkController.bulkCreateQuestionRuleLinks);

export default router;

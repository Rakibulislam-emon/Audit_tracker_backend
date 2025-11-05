// src/controllers/questionController.js

import Question from '../models/Question.js';
import { createdBy, updatedBy } from '../utils/helper.js'; // Ensure updatedBy is imported

// GET /api/questions - UPDATED with new filters
export const getAllQuestions = async (req, res) => {
    try {
        // Step 1: Get filter values (template REMOVED, rule and checkType ADDED)
        const { search, status, responseType, rule, checkType } = req.query;
        console.log("[getAllQuestions] req.query:", req.query);

        // Step 2: Create dynamic Mongoose query object
        const query = {};

        // Step 3: Add filters
        if (status === "active" || status === "inactive") {
            query.status = status; // From commonFields
        }
        if (rule) { // ✅ ADDED filter by rule
            query.rule = rule;
        }
        if (checkType) { // ✅ ADDED filter by checkType
            query.checkType = checkType;
        }
        if (responseType) {
             query.responseType = responseType; // Filter by response type
        }

        // Step 4: Add search filter (questionText, section)
        if (search) {
            const searchRegex = { $regex: search, $options: "i" };
            query.$or = [
                { questionText: searchRegex },
                { section: searchRegex },
            ];
        }

        console.log("[getAllQuestions] Final Mongoose Query:", JSON.stringify(query));

        // Step 5: Find data, populate new fields
        const questions = await Question.find(query)
            .populate('rule', 'name ruleCode category') // ✅ Populate new rule field
            .populate('checkType', 'name') // ✅ Populate new checkType field
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort({ createdAt: -1 });

        // Step 6: Count total matching documents
        const count = await Question.countDocuments(query);

        // Use standard response format
        res.status(200).json({
            data: questions,
            count: count,
            message: "Questions fetched successfully",
            success: true,
        });

    } catch (error) {
        console.error("[getAllQuestions] Error:", error);
        res.status(500).json({ message: 'Server error', error: error.message, success: false });
    }
};

// GET /api/questions/:id - UPDATED population
export const getQuestionById = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id)
            .populate('rule', 'name ruleCode category') // ✅ Populate new rule field
            .populate('checkType', 'name') // ✅ Populate new checkType field
            // ❌ REMOVED: .populate('template', 'title')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!question) {
            return res.status(404).json({ message: 'Question not found', success: false });
        }
        
        // Standard response format
        res.status(200).json({
            data: question,
            message: "Question fetched successfully",
            success: true
        });
    } catch (error) {
        console.error("[getQuestionById] Error:", error);
        res.status(500).json({ message: 'Server error', error: error.message, success: false });
    }
};

// POST /api/questions - UPDATED fields
export const createQuestion = async (req, res) => {
    try {
        // ✅ template REMOVED, rule and checkType ADDED
        const { section, questionText, responseType, severityDefault, weight, rule, checkType } = req.body;

        // Validation
        if (!questionText || !responseType) { // ✅ template check REMOVED
            return res.status(400).json({ message: 'Question text and response type are required', success: false });
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
            ...createdBy(req)
        });

        let savedQuestion = await newQuestion.save();

        // Populate after saving
        savedQuestion = await Question.findById(savedQuestion._id)
            .populate('rule', 'name ruleCode') // ✅ Populate new fields
            .populate('checkType', 'name') // ✅ Populate new fields
            // ❌ REMOVED: .populate('template', 'title')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');
            
        res.status(201).json({ 
            data: savedQuestion, 
            message: 'Question created successfully',
            success: true
        });
    } catch (error) {
        console.error("[createQuestion] Error:", error);
        if (error.name === 'ValidationError') return res.status(400).json({ message: error.message, error: error.errors, success: false });
        res.status(400).json({ message: 'Error creating question', error: error.message, success: false });
    }
};

// PUT /api/questions/:id - UPDATED fields (using PATCH logic)
export const updateQuestion = async (req, res) => {
    try {
        // ✅ template REMOVED, rule and checkType ADDED
        const { section, questionText, responseType, severityDefault, weight, rule, checkType, status } = req.body;
        const questionId = req.params.id;

        // Validation: Only check core fields if they are provided
        if (questionText === '') { // Check if trying to empty required field
            return res.status(400).json({ message: 'Question text cannot be empty', success: false });
        }
         if (responseType === '') {
            return res.status(400).json({ message: 'Response type cannot be empty', success: false });
        }
        
        // Build update object dynamically for PATCH
        const updateData = { ...updatedBy(req) };
        if (section !== undefined) updateData.section = section;
        if (questionText) updateData.questionText = questionText;
        if (responseType) updateData.responseType = responseType;
        if (severityDefault !== undefined) updateData.severityDefault = severityDefault;
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
            return res.status(404).json({ message: 'Question not found', success: false });
        }

        // Repopulate for response
        updatedQuestion = await Question.findById(updatedQuestion._id)
            .populate('rule', 'name ruleCode') // ✅ Populate new fields
            .populate('checkType', 'name') // ✅ Populate new fields
            // ❌ REMOVED: .populate('template', 'title')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        res.status(200).json({ 
            data: updatedQuestion, 
            message: 'Question updated successfully',
            success: true
        });
    } catch (error) {
        console.error("[updateQuestion] Error:", error);
        if (error.name === 'ValidationError') return res.status(400).json({ message: error.message, error: error.errors, success: false });
        res.status(400).json({ message: 'Error updating question', error: error.message, success: false });
    }
};

// DELETE /api/questions/:id - (Added standard response)
export const deleteQuestion = async (req, res) => {
    try {
        const deletedQuestion = await Question.findByIdAndDelete(req.params.id);
        if (!deletedQuestion) {
            return res.status(404).json({ message: 'Question not found', success: false });
        }
        
        // TODO: Check if this question is used in any Template? (Future enhancement)

        res.status(200).json({
             message: 'Question deleted successfully',
             success: true,
             data: deletedQuestion // Optional
        });
    } catch (error) {
        console.error("[deleteQuestion] Error:", error);
        res.status(500).json({ message: 'Error deleting question', error: error.message, success: false });
    }
};
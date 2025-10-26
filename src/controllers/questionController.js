// src/controllers/questionController.js

import Question from '../models/Question.js';
import { createdBy, updatedBy } from '../utils/helper.js'; // Ensure updatedBy is imported

// GET /api/questions - With filtering, sorting, population
export const getAllQuestions = async (req, res) => {
    try {
        // Step 1: Get filter values from req.query
        const { search, template, status, responseType } = req.query; // Added responseType filter
        console.log("[getAllQuestions] req.query:", req.query);

        // Step 2: Create dynamic Mongoose query object
        const query = {};

        // Step 3: Add status, template, and responseType filters
        if (status === "active" || status === "inactive") {
            query.status = status; // From commonFields
        }
        if (template) {
            query.template = template; // Template _id from frontend filter
        }
        if (responseType) {
             query.responseType = responseType; // Filter by response type
        }

        // Step 4: Add search filter (searches in 'questionText', potentially 'section')
        if (search) {
            const searchRegex = { $regex: search, $options: "i" };
            query.$or = [
                { questionText: searchRegex },
                { section: searchRegex }, // Include section in search if desired
            ];
        }

        console.log("[getAllQuestions] Final Mongoose Query:", JSON.stringify(query));

        // Step 5: Find data, populate relationships, and sort
        const questions = await Question.find(query)
            .populate('template', 'title') // Populate template title
            .populate('createdBy', 'name email') // Populate creator
            .populate('updatedBy', 'name email') // Populate updater
            .sort({ createdAt: -1 }); // Sort by creation date

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
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// GET /api/questions/:id - Update population and response format
export const getQuestionById = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id)
            .populate('template', 'title')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email'); // Populate updater

        if (!question) {
            return res.status(404).json({ message: 'Question not found', success: false });
        }

        // Standard response format
        res.status(200).json({
            data: question,
            message: "Question fetched successfully",
            success: true,
        });

    } catch (error) {
        console.error("[getQuestionById] Error:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// POST /api/questions - Update population and response format
export const createQuestion = async (req, res) => {
    try {
        const { section, questionText, responseType, severityDefault, weight, template } = req.body;

        // Validation (Required fields from schema)
        if (!questionText || !responseType || !template) {
            return res.status(400).json({ message: 'Question text, response type, and template are required', success: false });
        }

        const newQuestion = new Question({
            section,
            questionText,
            responseType,
            severityDefault,
            weight, // Has default in schema
            template,
            ...createdBy(req) // Add createdBy
        });

        let savedQuestion = await newQuestion.save();

        // Populate after saving
        savedQuestion = await Question.findById(savedQuestion._id)
            .populate('template', 'title')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');


        // Standard response format
        res.status(201).json({
            data: savedQuestion,
            message: 'Question created successfully',
            success: true
        });

    } catch (error) {
        console.error("[createQuestion] Error:", error);
        // Add more specific error handling if needed (e.g., validation errors)
        res.status(400).json({ message: 'Error creating question', error: error.message, success: false });
    }
};

// PUT /api/questions/:id - Update population and response format
export const updateQuestion = async (req, res) => {
    try {
        const { section, questionText, responseType, severityDefault, weight, template } = req.body;
        const questionId = req.params.id;

         // Validation
        if (!questionText || !responseType || !template) {
            return res.status(400).json({ message: 'Question text, response type, and template are required', success: false });
        }

        let updatedQuestion = await Question.findByIdAndUpdate(
            questionId,
            {
                section,
                questionText,
                responseType,
                severityDefault,
                weight,
                template,
                ...updatedBy(req) // Add updatedBy
            },
            { new: true, runValidators: true }
        );

        if (!updatedQuestion) {
            return res.status(404).json({ message: 'Question not found', success: false });
        }

        // Populate after update
        updatedQuestion = await Question.findById(updatedQuestion._id)
            .populate('template', 'title')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        // Standard response format
        res.status(200).json({
            data: updatedQuestion,
            message: 'Question updated successfully',
            success: true
        });

    } catch (error) {
        console.error("[updateQuestion] Error:", error);
        res.status(400).json({ message: 'Error updating question', error: error.message, success: false });
    }
};

// DELETE /api/questions/:id - Update response format
export const deleteQuestion = async (req, res) => {
    try {
        const deletedQuestion = await Question.findByIdAndDelete(req.params.id);
        if (!deletedQuestion) {
            return res.status(404).json({ message: 'Question not found', success: false });
        }

        // Standard response format
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
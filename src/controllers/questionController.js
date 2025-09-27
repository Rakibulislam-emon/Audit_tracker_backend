// src/controllers/questionController.js

import Question from '../models/Question.js';
import { createdBy, updatedBy } from '../utils/helper.js';

export const getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find()
      .populate('template', 'title')
      .populate('createdBy', 'name email');
    res.status(200).json({ questions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('template', 'title')
      .populate('createdBy', 'name email');
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.status(200).json({ question });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createQuestion = async (req, res) => {
  try {
    const { section, questionText, responseType, severityDefault, weight, template } = req.body;

    if (!questionText || !responseType || !template) {
      return res.status(400).json({ message: 'Question text, response type, and template are required' });
    }

    const newQuestion = new Question({
      section,
      questionText,
      responseType,
      severityDefault,
      weight,
      template,
        ...createdBy(req)
    });

    const savedQuestion = await newQuestion.save();
    res.status(201).json({ savedQuestion, message: 'Question created successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error creating question', error: error.message });
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const { section, questionText, responseType, severityDefault, weight, template } = req.body;
    const questionId = req.params.id;

    const updatedQuestion = await Question.findByIdAndUpdate(
      questionId,
      { section, questionText, responseType, severityDefault, weight, template ,...updatedBy(req)},
      { new: true, runValidators: true }
    );

    if (!updatedQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.status(200).json({ updatedQuestion, message: 'Question updated successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error updating question', error: error.message });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const deletedQuestion = await Question.findByIdAndDelete(req.params.id);
    if (!deletedQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.status(200).json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting question', error: error.message });
  }
};
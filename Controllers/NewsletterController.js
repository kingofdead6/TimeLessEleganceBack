import express from 'express';
import NewsLetter from '../Models/newsletterModel.js';
import nodemailer from 'nodemailer';
import validator from 'validator';

const router = express.Router();

// Add NewsLetter (public)
export const CreateNewsLetter = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }
    const existing = await NewsLetter.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already subscribed' });
    }
    const newsLetter = new NewsLetter({ email });
    await newsLetter.save();
    res.status(201).json(newsLetter);
  } catch (error) {
    console.error('Error adding newsletter:', error);
    res.status(500).json({ message: error.message || 'Failed to subscribe' });
  }
};

// Get all NewsLetters (admin)
export const getNewsLetter = async (req, res) => {
  try {
    const newsLetters = await NewsLetter.find();
    res.json(newsLetters);
  } catch (error) {
    console.error('Error fetching newsletters:', error);
    res.status(500).json({ message: error.message });
  }
};

// Remove NewsLetter
export const removeNewsLetter = async (req, res) => {
  try {
    const newsLetter = await NewsLetter.findByIdAndDelete(req.params.id);
    if (!newsLetter) return res.status(404).json({ message: 'Subscription not found' });
    res.json({ message: 'Subscription deleted' });
  } catch (error) {
    console.error('Error deleting newsletter:', error);
    res.status(500).json({ message: error.message });
  }
};

// Remove Multiple NewsLetters
export const removeMultipleNewsLetter = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No subscriptions selected' });
    }
    const result = await NewsLetter.deleteMany({ _id: { $in: ids } });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'No subscriptions found' });
    }
    res.json({ message: `${result.deletedCount} subscription(s) deleted` });
  } catch (error) {
    console.error('Error deleting multiple newsletters:', error);
    res.status(500).json({ message: error.message });
  }
};

// Send custom email
export const SendEmails = async (req, res) => {
  const { emails, subject, message } = req.body;

  try {
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ message: 'At least one email is required' });
    }
    if (!subject) return res.status(400).json({ message: 'Subject is required' });
    if (!message) return res.status(400).json({ message: 'Message is required' });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: emails.join(','),
      subject,
      html: message,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Emails sent successfully' });
  } catch (error) {
    console.error('Error sending emails:', error);
    res.status(500).json({ message: error.message || 'Failed to send emails' });
  }
};

export default router;

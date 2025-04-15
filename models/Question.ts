import mongoose, { Document, Model } from 'mongoose';
import { IUser } from './User';

export interface IQuestion extends Document {
  text: string;
  techStack: string;
  createdBy: mongoose.Types.ObjectId | IUser;
  createdAt: Date;
}

const QuestionSchema = new mongoose.Schema<IQuestion>({
  text: {
    type: String,
    required: [true, 'Please provide the question text'],
  },
  techStack: {
    type: String,
    required: [true, 'Please specify the tech stack'],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Question: Model<IQuestion> = mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);

export default Question;
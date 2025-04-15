import mongoose, { Document, Model } from 'mongoose';
import { IUser } from './User';

export type InterviewStatus = 'pending' | 'in-progress' | 'completed' | 'evaluated';

export interface IInterview extends Document {
  candidate: mongoose.Types.ObjectId | IUser;
  techStack: string;
  status: InterviewStatus;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
}

const InterviewSchema = new mongoose.Schema<IInterview>({
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  techStack: {
    type: String,
    required: [true, 'Please specify the tech stack for this interview'],
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'evaluated'],
    default: 'pending',
  },
  startedAt: {
    type: Date,
  },
  endedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Interview: Model<IInterview> = mongoose.models.Interview || mongoose.model<IInterview>('Interview', InterviewSchema);

export default Interview;
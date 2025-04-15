import mongoose, { Document, Model } from 'mongoose';
import { IInterview } from './Interview';
import { IQuestion } from './Question';

export interface IResponse extends Document {
  interview: mongoose.Types.ObjectId | IInterview;
  question: mongoose.Types.ObjectId | IQuestion;
  audioPath: string;
  transcription?: string;
  score?: number;
  justification?: string;
  createdAt: Date;
}

const ResponseSchema = new mongoose.Schema<IResponse>({
  interview: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview',
    required: true,
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  audioPath: {
    type: String,
    required: true,
  },
  transcription: {
    type: String,
  },
  score: {
    type: Number,
    min: 1,
    max: 10,
  },
  justification: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Response: Model<IResponse> = mongoose.models.Response || mongoose.model<IResponse>('Response', ResponseSchema);

export default Response;
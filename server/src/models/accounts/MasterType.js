import mongoose from "mongoose";

const masterTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  // Organization association
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  // Creator reference
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  fields: [
    {
      name: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        enum: [
          "text",
          "number",
          "date",
          "email",
          "phone",
          "upload",
          "select",
          "boolean",
        ],
        default: "text",
      },
      required: {
        type: Boolean,
        default: false,
      },
      options: [String], // For select type fields
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for organization-level uniqueness
masterTypeSchema.index({ name: 1, organization: 1 }, { unique: true });

export default mongoose.model("MasterType", masterTypeSchema);
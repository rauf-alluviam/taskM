import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    seen: {
        type: Boolean,
        default: false,
    },
    timestamp:{
        type: Date,
        default: Date.now,
    },
    type: {
        type: String,
        required: false,
        default: 'general', // e.g., 'task_assigned', 'comment', etc.
    },
    data: {
        type: Object,
        required: false,
        default: {}, // extra payload for notification context
    },
});

export default mongoose.model('Notification', notificationSchema);
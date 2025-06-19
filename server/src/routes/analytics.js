import express from 'express';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get general analytics
router.get('/', protect, async (req, res) => {
  try {
    const [
      totalUsers,
      totalProjects,
      totalTasks,
      completedTasks,
      tasksThisWeek,
      projectsThisMonth
    ] = await Promise.all([
      User.countDocuments(),
      Project.countDocuments(),
      Task.countDocuments(),
      Task.countDocuments({ status: 'done' }),
      Task.countDocuments({
        createdAt: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }),
      Project.countDocuments({
        createdAt: {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      })
    ]);

    res.json({
      totalUsers,
      totalProjects,
      totalTasks,
      completedTasks,
      tasksThisWeek,
      projectsThisMonth,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
  }
});

// Get task analytics
router.get('/tasks', protect, async (req, res) => {
  try {
    const taskStats = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const priorityStats = await Task.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Tasks created over time (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const tasksOverTime = await Task.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      statusDistribution: taskStats,
      priorityDistribution: priorityStats,
      tasksOverTime
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch task analytics', error: error.message });
  }
});

// Get project analytics
router.get('/projects', protect, async (req, res) => {
  try {
    const projectStats = await Project.aggregate([
      {
        $lookup: {
          from: 'tasks',
          localField: '_id',
          foreignField: 'projectId',
          as: 'tasks'
        }
      },
      {
        $project: {
          name: 1,
          taskCount: { $size: '$tasks' },
          completedTasks: {
            $size: {
              $filter: {
                input: '$tasks',
                cond: { $eq: ['$$this.status', 'done'] }
              }
            }
          }
        }
      },
      {
        $addFields: {
          completionRate: {
            $cond: {
              if: { $gt: ['$taskCount', 0] },
              then: { $multiply: [{ $divide: ['$completedTasks', '$taskCount'] }, 100] },
              else: 0
            }
          }
        }
      }
    ]);

    res.json(projectStats);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch project analytics', error: error.message });
  }
});

export default router;

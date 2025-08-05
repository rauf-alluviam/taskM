import express from 'express';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get general analytics
router.get('/', authenticate, async (req, res) => {
  try {
    const orgId = req.user.organization?._id || req.user.organization;
    console.log('@@@@@@@@@@@@@@@@@@@@@ Main Analytics - Organization ID:', orgId);
    console.log('@@@@@@@@@@@@@@@@@@@@@ User organization object:', req.user.organization);
    console.log('@@@@@@@@@@@@@@@@@@@@@ User role:', req.user.role);
    console.log('@@@@@@@@@@@@@@@@@@@@@ Full user object keys:', Object.keys(req.user));
    console.log('@@@@@@@@@@@@@@@@@@@@@ User ID:', req.user._id);
    
    // Check if orgId is truthy
    console.log('@@@@@@@@@@@@@@@@@@@@@ orgId is truthy:', !!orgId);
    console.log('@@@@@@@@@@@@@@@@@@@@@ orgId type:', typeof orgId);
    
    let totalUsers, totalProjects, totalTasks, completedTasks, tasksThisWeek, projectsThisMonth;

    if (orgId) {
      // Organization-specific analytics
      const orgProjects = await Project.find({ organization: orgId }).select('_id');
      const projectIds = orgProjects.map(p => p._id);
      console.log('@@@@@@@@@@@@@@@@@@@@@ Found projects:', orgProjects.length);
      console.log('@@@@@@@@@@@@@@@@@@@@@ Project IDs:', projectIds);

      const orgUsers = await User.find({ organization: orgId }).select('_id');
      const userIds = orgUsers.map(u => u._id);
      console.log('@@@@@@@@@@@@@@@@@@@@@ Found users:', orgUsers.length);

      [totalUsers, totalProjects, totalTasks, completedTasks, tasksThisWeek, projectsThisMonth] = await Promise.all([
        User.countDocuments({ organization: orgId }),
        Project.countDocuments({ organization: orgId }),
        Task.countDocuments({
          projectId: { $in: projectIds }
        }),
        Task.countDocuments({
          projectId: { $in: projectIds }, 
          status: 'done'
        }),
        Task.countDocuments({
          projectId: { $in: projectIds },
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }),
        Project.countDocuments({
          organization: orgId,
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        })
      ]);
    
    } else {
      // Personal analytics (for users not in an organization)
      console.log('@@@@@@@@@@@@@@@@@@@@@ No organization found, using personal analytics');
      [totalUsers, totalProjects, totalTasks, completedTasks, tasksThisWeek, projectsThisMonth] = await Promise.all([
        Promise.resolve(1), // Just the current user
        Project.countDocuments({ createdBy: req.user._id }),
        Task.countDocuments({
          $or: [
            { createdBy: req.user._id },
            { assignedUsers: req.user._id }
          ]
        }),
        Task.countDocuments({
          $or: [
            { createdBy: req.user._id, status: 'done' },
            { assignedUsers: req.user._id, status: 'done' }
          ]
        }),
        Task.countDocuments({
          $or: [
            { createdBy: req.user._id },
            { assignedUsers: req.user._id }
          ],
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }),
        Project.countDocuments({
          createdBy: req.user._id,
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        })
      ]);
    }

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
router.get('/tasks', authenticate, async (req, res) => {
  try {
    const orgId = req.user.organization?._id || req.user.organization;
    console.log('@@@@@@@@@@@@@@@@@@@@@Organization ID:', orgId);
    let taskStats, priorityStats, tasksOverTime;

    if (orgId) {
      // Organization-specific analytics
      const orgProjects = await Project.find({ organization: orgId }).select('_id');
      const projectIds = orgProjects.map(p => p._id);

      const orgUsers = await User.find({ organization: orgId }).select('_id');
      const userIds = orgUsers.map(u => u._id);

      // Create match condition for organization tasks
      const orgTasksMatch = {
        projectId: { $in: projectIds }
      };

      taskStats = await Task.aggregate([
        { $match: orgTasksMatch },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      priorityStats = await Task.aggregate([
        { $match: orgTasksMatch },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]);

      // Tasks created over time (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      tasksOverTime = await Task.aggregate([
        { 
          $match: { 
            ...orgTasksMatch, 
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
        { $sort: { _id: 1 } }
      ]);
    } else {
      // Personal analytics (for users not in an organization)
      const personalTasksMatch = {
        $or: [
          { createdBy: req.user._id },
          { assignedUsers: req.user._id }
        ]
      };

      taskStats = await Task.aggregate([
        { $match: personalTasksMatch },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      priorityStats = await Task.aggregate([
        { $match: personalTasksMatch },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]);

      // Tasks created over time (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      tasksOverTime = await Task.aggregate([
        { 
          $match: { 
            ...personalTasksMatch, 
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
        { $sort: { _id: 1 } }
      ]);
    }

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
router.get('/projects', authenticate, async (req, res) => {
  try {
    const orgId = req.user.organization?._id || req.user.organization;
    
    let projectStats;

    if (orgId) {
      // Organization-specific project analytics
      projectStats = await Project.aggregate([
        { $match: { organization: orgId } },
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
    } else {
      // Personal project analytics (for users not in an organization)
      projectStats = await Project.aggregate([
        { $match: { createdBy: req.user._id } },
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
    }

    res.json(projectStats);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch project analytics', error: error.message });
  }
});

export default router;

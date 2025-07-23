import { User } from '../contexts/AuthContext';

interface PermissionContext {
  user: User;
  project?: {
    _id: string;
    createdBy: string;
    members?: Array<{
      user: { _id: string };
      role: string;
    }>;
    organization?: string;
    visibility?: string;
  };
  task?: {
    _id: string;
    createdBy: string;
    assignedUsers?: Array<{ _id: string }> | string[];
    projectId?: string;
  };
}

export class PermissionHelper {
  // Check if user can assign tasks to other users
  static canAssignTasks(context: PermissionContext): boolean {
    const { user, project, task } = context;

   

    // Super admins can assign tasks anywhere
    if (user.role === 'super_admin') {
      //console.log('User is super_admin, can assign tasks');
      return true;
    }

    // Organization admins can assign tasks within their organization
    if (user.role === 'org_admin' && user.organization) {
      // Org admins can assign in any project within their organization
      if (!project || project.organization === user.organization._id) {
       
        return true;
      }
      // Also for tasks without projects but within their org context
      if (!project && task && !task.projectId) {
      
        return true;
      }
    }

    // Team leads can assign tasks in various contexts
    if (user.role === 'team_lead') {
      // Team leads can assign in projects they're members of
      if (project && (
        project.createdBy === user._id || 
        project.members?.some(m => m.user._id === user._id && ['admin', 'member'].includes(m.role))
      )) {
       
        return true;
      }
      
      // Team leads can assign tasks within their organization
      if (user.organization && (!project || project.organization === user.organization._id)) {
       
        return true;
      }
      
      // Team leads can assign personal tasks
      if (!project) {
        
        return true;
      }
    }

    // Task creators can assign their own tasks
    if (task && task.createdBy === user._id) {
      
      return true;
    }

    // Project admins can assign tasks within their projects
    if (project && project.members?.some(m => 
      m.user._id === user._id && m.role === 'admin'
    )) {
      
      return true;
    }

    // Project creators can assign tasks in their projects
    if (project && project.createdBy === user._id) {
      
      return true;
    }


    return false;
  }

  // Check if user can edit a specific task
  static canEditTask(context: PermissionContext): boolean {
    const { user, project, task } = context;

    if (!task) return false;

    // Super admins can edit any task
    if (user.role === 'super_admin') {
      return true;
    }

    // Organization admins can edit tasks within their organization
    if (user.role === 'org_admin' && user.organization) {
      if (project?.organization === user.organization._id) {
        return true;
      }
    }

    // Task creators can edit their own tasks
    if (task.createdBy === user._id) {
      return true;
    }

    // Assigned users can edit tasks assigned to them
    if (task.assignedUsers) {
      const isAssigned = Array.isArray(task.assignedUsers) && 
        task.assignedUsers.some(assignedUser => 
          typeof assignedUser === 'string' 
            ? assignedUser === user._id 
            : assignedUser._id === user._id
        );
      if (isAssigned) {
        return true;
      }
    }

    // Project members can edit tasks in their projects (depending on project role)
    if (project) {
      const userMembership = project.members?.find(m => m.user._id === user._id);
      if (userMembership && ['admin', 'member'].includes(userMembership.role)) {
        return true;
      }
      
      // Project creators can edit tasks in their projects
      if (project.createdBy === user._id) {
        return true;
      }
    }

    return false;
  }

  // Check if user can create tasks in a project
  static canCreateTasks(context: PermissionContext): boolean {
    const { user, project } = context;

    // Super admins can create tasks anywhere
    if (user.role === 'super_admin') {
      return true;
    }

    // Organization admins can create tasks within their organization
    if (user.role === 'org_admin' && user.organization) {
      if (!project || project.organization === user.organization._id) {
        return true;
      }
    }

    // Team leads can create tasks
    if (user.role === 'team_lead') {
      return true;
    }

    // Members can create tasks
    if (user.role === 'member') {
      // In projects, check if they have appropriate permissions
      if (project) {
        const userMembership = project.members?.find(m => m.user._id === user._id);
        if (userMembership && ['admin', 'member'].includes(userMembership.role)) {
          return true;
        }
        
        // Project creators can create tasks
        if (project.createdBy === user._id) {
          return true;
        }
        
        // For organization-visible projects, organization members can create tasks
        if (project.visibility === 'organization' && project.organization === user.organization?._id) {
          return true;
        }
        
        // For public projects, anyone can create tasks
        if (project.visibility === 'public') {
          return true;
        }
        
        return false;
      }
      
      // Outside of projects, members can create personal tasks
      return true;
    }

    // Viewers cannot create tasks
    if (user.role === 'viewer') {
      return false;
    }

    return false;
  }

  // Check if user can view a task
  static canViewTask(context: PermissionContext): boolean {
    const { user, project, task } = context;

    if (!task) return false;

    // Super admins can view any task
    if (user.role === 'super_admin') {
      return true;
    }

    // Organization admins can view tasks within their organization
    if (user.role === 'org_admin' && user.organization) {
      if (project?.organization === user.organization._id) {
        return true;
      }
    }

    // Task creators can view their own tasks
    if (task.createdBy === user._id) {
      return true;
    }

    // Assigned users can view tasks assigned to them
    if (task.assignedUsers) {
      const isAssigned = Array.isArray(task.assignedUsers) && 
        task.assignedUsers.some(assignedUser => 
          typeof assignedUser === 'string' 
            ? assignedUser === user._id 
            : assignedUser._id === user._id
        );
      if (isAssigned) {
        return true;
      }
    }

    // Project members can view tasks in projects they have access to
    if (project) {
      const userMembership = project.members?.find(m => m.user._id === user._id);
      if (userMembership) {
        return true;
      }
      
      // Project creators can view tasks in their projects
      if (project.createdBy === user._id) {
        return true;
      }
      
      // For organization-visible projects, organization members can view tasks
      if (project.visibility === 'organization' && project.organization === user.organization?._id) {
        return true;
      }
      
      // For public projects, anyone can view tasks
      if (project.visibility === 'public') {
        return true;
      }
    }

    return false;
  }

  // Get the available users that can be assigned to a task
  static getAssignableUsers(context: PermissionContext, allUsers: User[]): User[] {
    const { user, project } = context;

  

    // First check if the user can assign tasks at all
    if (!this.canAssignTasks(context)) {
     
      return [];
    }

    // Filter users based on what the current user can assign
    let assignableUsers = allUsers;

    // Super admins can assign to anyone in their organization or globally
    if (user.role === 'super_admin') {
    
      return allUsers;
    }

    // Organization admins can assign to users in their organization
    if (user.role === 'org_admin' && user.organization) {
      assignableUsers = allUsers.filter(u => 
        u.organization?._id === user.organization?._id
      );
     
    } 
    // Team leads can assign to users in their organization
    else if (user.role === 'team_lead' && user.organization) {
      assignableUsers = allUsers.filter(u => 
        u.organization?._id === user.organization?._id
      );
     
    }
    else if (project) {
      // For project-specific tasks, limit to project members and organization members
      if (project.organization) {
        assignableUsers = allUsers.filter(u => 
          u.organization?._id === project.organization ||
          project.members?.some(m => m.user._id === u._id)
        );
        //console.log('Project with org filter applied, remaining users:', assignableUsers.length);
      } else {
        // For projects without organization, limit to project members
        assignableUsers = allUsers.filter(u => 
          project.members?.some(m => m.user._id === u._id) ||
          u._id === project.createdBy
        );
        //console.log('Project without org filter applied, remaining users:', assignableUsers.length);
      }
    } else {
      // For personal tasks, limit to organization members if user is in an organization
      if (user.organization) {
        assignableUsers = allUsers.filter(u => 
          u.organization?._id === user.organization?._id
        );
        
      } else {
        // Individual users can only assign to themselves
        assignableUsers = [user];
       // console.log('Individual user filter applied, remaining users:', assignableUsers.length);
      }
    }

    // Remove users who cannot be assigned tasks (e.g., inactive users)
    const finalUsers = assignableUsers.filter(u => {
      const isActive = !u.status || u.status === 'active'; // If no status field, assume active
      const isNotViewer = u.role !== 'viewer'; // Viewers typically shouldn't be assigned tasks
      
      //console.log(`User ${u.name}: status=${u.status || 'undefined'}, role=${u.role}, isActive=${isActive}, isNotViewer=${isNotViewer}`);
      
      return isActive && isNotViewer;
    });
    
    //console.log('Final filter applied (active & non-viewer), remaining users:', finalUsers.length);
    //console.log('Final users:', finalUsers.map(u => ({ name: u.name, role: u.role, status: u.status })));
    return finalUsers;
  }

  // Check role hierarchy for permission validation
  static hasHigherOrEqualRole(userRole: string, requiredRole: string): boolean {
    const roleHierarchy = {
      'super_admin': 5,
      'org_admin': 4,
      'team_lead': 3,
      'member': 2,
      'viewer': 1
    };

    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
    
    return userLevel >= requiredLevel;
  }
}

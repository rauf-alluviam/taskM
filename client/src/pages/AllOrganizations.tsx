import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  FolderOpen, 
  Plus, 
  Search, 
  MoreVertical,
  Edit,
  Trash2,
  Crown,
  Calendar,
  Activity
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { organizationAPI } from '../services/api';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { Link } from 'react-router-dom';

interface OrganizationData {
  _id: string;
  name: string;
  description?: string;
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  admins: Array<{
    _id: string;
    name: string;
    email: string;
  }>;
  memberCount?: number;
  teamCount?: number;
  projectCount?: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

const AllOrganizations: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [organizations, setOrganizations] = useState<OrganizationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      addNotification({
        type: 'error',
        title: 'Access Denied',
        message: 'Only super admins can view all organizations',
      });
      return;
    }
    loadOrganizations();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = () => setDropdownOpen(null);
    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const data = await organizationAPI.getAllOrganizations();
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load organizations:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to load organizations',
      });
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrganization = async (org: OrganizationData) => {
    if (!confirm(`Are you sure you want to delete "${org.name}"? This action cannot be undone and will affect all members.`)) {
      return;
    }

    try {
      await organizationAPI.deleteOrganization(org._id);
      setOrganizations(organizations.filter(o => o._id !== org._id));
      addNotification({
        type: 'success',
        title: 'Organization Deleted',
        message: `${org.name} has been deleted successfully`,
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to delete organization',
      });
    }
  };

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.owner.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Crown className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">Only super admins can view all organizations.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary-600" />
            All Organizations
            <Crown className="h-5 w-5 text-yellow-600" />
          </h1>
          <p className="text-gray-600">System-wide organization management</p>
        </div>
        <Link
          to="/organization/create"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Organization
        </Link>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Organizations</p>
              <p className="text-2xl font-bold text-gray-900">{organizations.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Organizations</p>
              <p className="text-2xl font-bold text-gray-900">
                {organizations.filter(org => org.isActive).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">
                {organizations.reduce((sum, org) => sum + (org.memberCount || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <FolderOpen className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">
                {organizations.reduce((sum, org) => sum + (org.projectCount || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Search organizations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Organizations List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Organizations ({filteredOrganizations.length})</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredOrganizations.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No organizations found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating a new organization.'}
              </p>
            </div>
          ) : (
            filteredOrganizations.map((org) => (
              <div key={org._id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {org.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{org.name}</h4>
                        <p className="text-sm text-gray-500">{org.description}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Crown className="h-4 w-4" />
                        <span>Owner: {org.owner.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{org.memberCount || 0} members</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FolderOpen className="h-4 w-4" />
                        <span>{org.projectCount || 0} projects</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Created {new Date(org.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      org.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {org.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDropdownOpen(dropdownOpen === org._id ? null : org._id);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {dropdownOpen === org._id && (
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                          <div className="py-1">
                            <Link
                              to={`/organization/${org._id}/settings`}
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={() => setDropdownOpen(null)}
                            >
                              <Edit className="mr-3 h-4 w-4" />
                              Edit
                            </Link>
                            <button
                              onClick={() => {
                                setDropdownOpen(null);
                                handleDeleteOrganization(org);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="mr-3 h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AllOrganizations;

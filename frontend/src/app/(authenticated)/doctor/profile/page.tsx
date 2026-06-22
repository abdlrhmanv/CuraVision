'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';
import { useRequireAuth } from '../../../../lib/authContext';
import { User, Mail, Phone, MapPin, Calendar, Award, FileText, Users, Activity } from 'lucide-react';

interface DoctorProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  specialization?: string;
  license_number?: string;
  hospital?: string;
  address?: string;
  bio?: string;
  years_experience?: number;
  created_at: string;
}

interface DoctorStats {
  total_scans: number;
  total_reports: number;
  total_patients: number;
  pending_reports: number;
  completed_this_month: number;
}

export default function DoctorProfilePage() {
  const { user } = useRequireAuth('DOCTOR');
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [stats, setStats] = useState<DoctorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<DoctorProfile>>({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        // In a real implementation, this would fetch from an API
        // For now, we'll use the user data and add mock profile information
        const mockProfile: DoctorProfile = {
          id: user!.id,
          full_name: user!.full_name,
          email: user!.email,
          phone: '+1 (555) 123-4567',
          specialization: 'Neurology',
          license_number: 'MD123456',
          hospital: 'City General Hospital',
          address: '123 Medical Center Dr, City, State 12345',
          bio: 'Board-certified neurologist with 8 years of experience specializing in brain imaging and neurodegenerative disorders.',
          years_experience: 8,
          created_at: '2023-06-15T00:00:00Z',
        };

        const mockStats: DoctorStats = {
          total_scans: 247,
          total_reports: 238,
          total_patients: 89,
          pending_reports: 3,
          completed_this_month: 24,
        };

        setProfile(mockProfile);
        setFormData(mockProfile);
        setStats(mockStats);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);

  const handleSave = async () => {
    try {
      // In a real implementation, this would call an API to update the profile
      setProfile(formData as DoctorProfile);
      setEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleCancel = () => {
    setFormData(profile!);
    setEditing(false);
  };

  if (loading || !profile || !stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        {!editing ? (
          <Button onClick={() => setEditing(true)}>Edit Profile</Button>
        ) : (
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={formData.full_name || ''}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-900">{profile.full_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-gray-900">{profile.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  {editing ? (
                    <input
                      type="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-gray-400 mr-2" />
                      <p className="text-gray-900">{profile.phone}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialization
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={formData.specialization || ''}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-900">{profile.specialization}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Number
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={formData.license_number || ''}
                      onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-900">{profile.license_number}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hospital
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={formData.hospital || ''}
                      onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-900">{profile.hospital}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                {editing ? (
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                ) : (
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                    <p className="text-gray-900">{profile.address}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                {editing ? (
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    value={formData.bio || ''}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-900">{profile.bio}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics and Quick Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-600">
                  <FileText className="h-4 w-4 mr-2" />
                  Total Scans
                </div>
                <span className="font-bold text-lg">{stats.total_scans}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-600">
                  <FileText className="h-4 w-4 mr-2" />
                  Reports Generated
                </div>
                <span className="font-bold text-lg">{stats.total_reports}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-600">
                  <Users className="h-4 w-4 mr-2" />
                  Total Patients
                </div>
                <span className="font-bold text-lg">{stats.total_patients}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  This Month
                </div>
                <span className="font-bold text-lg">{stats.completed_this_month}</span>
              </div>

              {stats.pending_reports > 0 && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center text-orange-600">
                    <FileText className="h-4 w-4 mr-2" />
                    Pending Reports
                  </div>
                  <Badge variant="warning">{stats.pending_reports}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Professional Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">Years of Experience</div>
                <div className="font-semibold">{profile.years_experience} years</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Member Since</div>
                <div className="font-semibold">
                  {new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long'
                  })}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">License Status</div>
                <Badge variant="success" className="mt-1">Active</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
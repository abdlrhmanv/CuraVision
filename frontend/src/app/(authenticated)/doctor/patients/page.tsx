'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';
import { useRequireAuth } from '../../../../lib/authContext';
import { patientsApi } from '../../../../lib/apiClient';
import { Search, User, FileText, Calendar, Mail, Phone } from 'lucide-react';

interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  created_at: string;
  last_scan_date?: string;
  total_scans: number;
  pending_reports: number;
}

export default function DoctorPatientsPage() {
  const { user } = useRequireAuth('DOCTOR');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        // Try to fetch from backend, but use mock data as fallback
        try {
          const response = await patientsApi.list();
          if (response.patients && response.patients.length > 0) {
            setPatients(response.patients);
            return;
          }
        } catch (apiErr) {
          console.warn('Failed to fetch patients from API, using mock data:', apiErr);
        }
        
        // Mock data for development
        setPatients([
          {
            id: 'patient-1',
            full_name: 'John Smith',
            email: 'john.smith@email.com',
            phone: '+1 (555) 123-4567',
            created_at: '2024-01-15T10:00:00Z',
            last_scan_date: '2024-03-20T14:30:00Z',
            total_scans: 3,
            pending_reports: 1,
          },
          {
            id: 'patient-2',
            full_name: 'Sarah Johnson',
            email: 'sarah.j@email.com',
            phone: '+1 (555) 987-6543',
            created_at: '2024-02-01T09:15:00Z',
            last_scan_date: '2024-03-15T11:20:00Z',
            total_scans: 2,
            pending_reports: 0,
          },
          {
            id: 'patient-3',
            full_name: 'Michael Brown',
            email: 'm.brown@email.com',
            created_at: '2024-01-20T16:45:00Z',
            last_scan_date: '2024-02-28T13:10:00Z',
            total_scans: 1,
            pending_reports: 0,
          },
        ]);
      } catch (err: any) {
        setError(err.message || 'Failed to load patients');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const filteredPatients = patients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">My Patients</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">My Patients</h1>
        <div className="text-sm text-gray-500">
          {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search patients by name or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.map((patient) => (
          <Card key={patient.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{patient.full_name}</CardTitle>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Mail className="h-3 w-3 mr-1" />
                      {patient.email}
                    </div>
                    {patient.phone && (
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Phone className="h-3 w-3 mr-1" />
                        {patient.phone}
                      </div>
                    )}
                  </div>
                </div>
                {patient.pending_reports > 0 && (
                  <Badge variant="warning" className="text-xs">
                    {patient.pending_reports} pending
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <FileText className="h-4 w-4 mr-2" />
                    Total Scans
                  </div>
                  <span className="font-medium">{patient.total_scans}</span>
                </div>

                {patient.last_scan_date && (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      Last Scan
                    </div>
                    <span className="font-medium">
                      {new Date(patient.last_scan_date).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <User className="h-4 w-4 mr-2" />
                    Patient Since
                  </div>
                  <span className="font-medium">
                    {new Date(patient.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <Button variant="outline" className="w-full text-sm">
                  View Patient Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPatients.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
            <p className="text-gray-500">
              {searchQuery ? 'Try adjusting your search terms.' : 'Patients will appear here once they upload scans.'}
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
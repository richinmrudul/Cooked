import React, { useState, useEffect } from 'react';
import { useApiClient } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  profilePhotoUrl?: string | null;
  stats: {
    totalMeals: number;
    averageRating: number;
    topRankedMeals: Array<{
      id: string;
      title: string;
      photo_url?: string;
      overall_rating: number;
      rank_position: number;
      date_made: string;
      score: number;
    }>;
  };
}

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const { authFetch } = useApiClient();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states for updating profile
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    currentPassword: '',
  });
  //  States for profile photo file upload
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null); // State for the selected file
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null); // State for current/new photo URL for preview
  const [clearProfilePhoto, setClearProfilePhoto] = useState(false); // State to explicitly clear photo

  const [submitting, setSubmitting] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);


  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        navigate('/login');
        return;
      }
      try {
        setLoading(true);
        const data = await authFetch('/user/profile');
        setProfile(data);
        setFormData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          password: '',
          currentPassword: '',
        });
        setProfilePhotoPreview(data.profilePhotoUrl || null); // Set initial preview URL from fetched data
        setClearProfilePhoto(false); // Reset clear flag on fetch
      } catch (err: any) {
        setError(err.message || 'Failed to fetch profile.');
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, authFetch, navigate]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle file selection for profile photo
  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePhotoFile(file);
      setProfilePhotoPreview(URL.createObjectURL(file)); // Show URL of new file as preview
      setClearProfilePhoto(false); // If new file selected, don't clear
    } else {
      setProfilePhotoFile(null);
      // Only clear preview if no new file selected AND we're not explicitly clearing existing
      if (!clearProfilePhoto) {
        setProfilePhotoPreview(null);
      }
    }
  };

  //  Handle clearing profile photo
  const handleClearProfilePhoto = () => {
    setProfilePhotoFile(null); // Clear any newly selected file
    setProfilePhotoPreview(null); // Clear the preview
    setClearProfilePhoto(true); // Set flag to tell backend to clear existing photo
    const photoInput = document.getElementById('profile-photo-upload') as HTMLInputElement;
    if (photoInput) photoInput.value = ''; // Clear file input field
  };


  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setUpdateError(null);

    // Prepare FormData for submission (required for file uploads)
    const formToSend = new FormData();
    formToSend.append('firstName', formData.firstName);
    formToSend.append('lastName', formData.lastName);
    formToSend.append('email', formData.email);
    if (formData.password) {
      formToSend.append('password', formData.password);
      formToSend.append('currentPassword', formData.currentPassword);
    }

    // Handle profile photo file or clear flag
    if (profilePhotoFile) {
      formToSend.append('profilePhoto', profilePhotoFile); // 'profilePhoto' matches backend upload.single
    } else if (clearProfilePhoto) {
      formToSend.append('photo_url_is_null', 'true'); // Send flag to backend
    }
    // If neither, backend will retain existing profilePhotoUrl

    try {
      // Use FormData for body
      const response = await authFetch('/user/profile', {
        method: 'PUT',
        body: formToSend,
      });

      if (user) {
          const updatedUserInContext = { ...user, firstName: response.user.first_name, lastName: response.user.last_name, email: response.user.email, profilePhotoUrl: response.user.profile_photo_url };
          localStorage.setItem('user', JSON.stringify(updatedUserInContext));
      }

      setProfile(prev => ({
        ...(prev as UserProfile),
        ...response.user,
        profilePhotoUrl: response.user.profile_photo_url
      }));
      setEditMode(false);
      alert('Profile updated successfully!');
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to update profile.');
      console.error('Error updating profile:', err);
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) {
    return <div className="app-main-content text-center">Loading profile...</div>;
  }

  if (error) {
    return <div className="app-main-content text-center text-error">Error: {error}</div>;
  }

  if (!profile) {
      return <div className="app-main-content text-center text-muted">No profile data available.</div>;
  }

  return (
    <div className="card card-lg">
      <div className="d-flex justify-content-between align-items-center mb-30">
        <h2>User Profile</h2>
        <div className="d-flex gap-10">
            <button onClick={() => setEditMode(!editMode)} className="btn btn-secondary-muted">
                {editMode ? 'Cancel Edit' : 'Edit Profile'}
            </button>
            <button onClick={logout} className="btn btn-danger">Logout</button>
        </div>
      </div>

      {!editMode ? (
        <div className="profile-display">
            <div className="profile-header d-flex align-items-center mb-30">
                <img
                    src={profile.profilePhotoUrl || 'https://via.placeholder.com/100/eeeeee/888888?text=Avatar'}
                    alt="Profile"
                    className="profile-avatar mr-20"
                />
                <div className="profile-info flex-grow-1">
                    <h3 className="profile-name mb-5">{profile.firstName} {profile.lastName}</h3>
                    <p className="profile-email text-muted mb-5">Email: {profile.email}</p>
                    <p className="profile-member-since text-muted">Member since: {new Date(profile.createdAt).toLocaleDateString()}</p>
                </div>
            </div>

            <h3 className="mb-15">Meal Stats Summary</h3>
            <div className="grid-layout grid-cols-2 grid-gap-20 mb-30">
                <div className="stat-card">
                    <p className="stat-label">Total Meals Cooked:</p>
                    <p className="stat-value">{profile.stats.totalMeals}</p>
                </div>
                <div className="stat-card">
                    <p className="stat-label">Average Rating:</p>
                    <p className="stat-value">{profile.stats.averageRating ? profile.stats.averageRating.toFixed(2) : 'N/A'}</p>
                </div>
            </div>

            <h3 className="mb-15">Your Top 5 Meals</h3>
            {profile.stats.topRankedMeals.length === 0 ? (
                <p className="text-muted text-center">No top meals ranked yet.</p>
            ) : (
                <div className="d-flex flex-column gap-15">
                    {profile.stats.topRankedMeals.map((meal) => (
                        <div key={meal.id} className="ranked-meal-item">
                            <div className="rank-indicator">{meal.rank_position}</div>
                            {meal.photo_url && <img src={meal.photo_url} alt={meal.title} className="ranked-meal-image" />}
                            <div className="ranked-meal-details">
                                <h4 className="ranked-meal-title">{meal.title}</h4>
                                <p className="ranked-meal-score-display text-muted">Score: {meal.score.toFixed(0)}</p>
                                <p className="ranked-meal-date">Made: {new Date(meal.date_made).toLocaleDateString()}</p>
                            </div>
                            <Link to={`/meals/edit/${meal.id}`} className="btn btn-warning btn-sm">Edit</Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
      ) : (
        <div className="profile-edit-form">
            <form onSubmit={handleProfileSubmit}>
                <div className="form-group grid-layout grid-cols-2 grid-gap-10">
                    <div>
                        <label htmlFor="editFirstName">First Name:</label>
                        <input type="text" id="editFirstName" name="firstName" value={formData.firstName} onChange={handleFormChange} required />
                    </div>
                    <div>
                        <label htmlFor="editLastName">Last Name:</label>
                        <input type="text" id="editLastName" name="lastName" value={formData.lastName} onChange={handleFormChange} required />
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="editEmail">Email:</label>
                    <input type="email" id="editEmail" name="email" value={formData.email} onChange={handleFormChange} required />
                </div>
                <div className="form-group">
                    <label htmlFor="editPassword">New Password (leave blank to keep current):</label>
                    <input type="password" id="editPassword" name="password" value={formData.password} onChange={handleFormChange} placeholder="Enter new password" />
                    <p className="text-muted mt-5" style={{fontSize: '0.85em'}}>Min 6 characters. Requires current password if changing.</p>
                </div>
                {formData.password && (
                    <div className="form-group">
                        <label htmlFor="currentPassword">Current Password:</label>
                        <input type="password" id="currentPassword" name="currentPassword" value={formData.currentPassword} onChange={handleFormChange} required />
                    </div>
                )}
                {/* Replaced Photo URL with File Upload */}
                <div className="form-group">
                    <label htmlFor="profile-photo-upload">Profile Photo:</label>
                    <input type="file" id="profile-photo-upload" name="profilePhoto" accept="image/*" onChange={handleProfilePhotoChange} />
                    {(profilePhotoPreview && !clearProfilePhoto) && (
                        <div className="d-flex align-items-center gap-10 mt-10">
                            <img src={profilePhotoPreview} alt="Profile Photo Preview" className="profile-avatar-preview"/>
                            <button type="button" onClick={handleClearProfilePhoto} className="btn btn-danger btn-sm">Clear Photo</button>
                        </div>
                    )}
                    {(!profilePhotoPreview && clearProfilePhoto) && (
                        <p className="text-muted mt-10" style={{fontSize: '0.85em'}}>Photo will be removed on save.</p>
                    )}
                </div>
                {updateError && <p className="text-error mb-15">{updateError}</p>}
                <div className="d-flex justify-content-end mt-20">
                    <button type="submit" disabled={submitting} className="btn btn-primary mr-10">
                        {submitting ? 'Updating...' : 'Save Changes'}
                    </button>
                    <button type="button" onClick={() => setEditMode(false)} className="btn btn-secondary-muted">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
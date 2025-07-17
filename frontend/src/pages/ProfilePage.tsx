import React, { useState, useEffect } from 'react';
import { useApiClient } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

// Updated UserProfile interface to include streak data
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
    currentStreak: number; // current streak
    longestStreak: number; // longest streak
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
  lastMealDate?: string | null; // last meal date
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
  // Correct states for profile photo file upload
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [clearProfilePhoto, setClearProfilePhoto] = useState(false);

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
        setProfilePhotoPreview(data.profilePhotoUrl || null); // Set initial preview URL
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

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePhotoFile(file);
      setProfilePhotoPreview(URL.createObjectURL(file));
      setClearProfilePhoto(false);
    } else {
      setProfilePhotoFile(null);
      if (!clearProfilePhoto) {
        setProfilePhotoPreview(null);
      }
    }
  };

  const handleClearProfilePhoto = () => {
    setProfilePhotoFile(null);
    setProfilePhotoPreview(null);
    setClearProfilePhoto(true);
    const photoInput = document.getElementById('profile-photo-upload') as HTMLInputElement;
    if (photoInput) photoInput.value = '';
  };


  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setUpdateError(null);

    const formToSend = new FormData();
    formToSend.append('firstName', formData.firstName);
    formToSend.append('lastName', formData.lastName);
    formToSend.append('email', formData.email);
    if (formData.password) {
      formToSend.append('password', formData.password);
      formToSend.append('currentPassword', formData.currentPassword);
    }

    if (profilePhotoFile) {
      formToSend.append('profilePhoto', profilePhotoFile);
    } else if (clearProfilePhoto) {
      formToSend.append('photo_url_is_null', 'true');
    }

    try {
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
    <div className="card card-lg" style={{ maxWidth: 700, margin: '40px auto' }}>
      <div className="d-flex justify-content-between align-items-center mb-30">
        <h2 style={{ fontWeight: 800, fontSize: '2rem', marginBottom: 0 }}>User Profile</h2>
        <div className="d-flex gap-10">
          <button onClick={() => setEditMode(!editMode)} className="btn btn-secondary-muted btn-sm" style={{ minWidth: 110 }}>
            {editMode ? 'Cancel Edit' : 'Edit Profile'}
          </button>
          <button onClick={logout} className="btn btn-danger btn-sm" style={{ minWidth: 90 }}>Logout</button>
        </div>
      </div>
      <hr style={{ border: 'none', borderTop: '1.5px solid #ececec', margin: '0 0 28px 0' }} />

      {!editMode ? (
        <div className="profile-display">
          <div className="d-flex flex-column align-items-center mb-30">
            <img
              src={profile.profilePhotoUrl || 'https://via.placeholder.com/120/eeeeee/888888?text=Avatar'}
              alt="Profile"
              className="profile-avatar"
              style={{ width: 120, height: 120, borderRadius: '50%', boxShadow: '0 2px 12px rgba(108,99,255,0.13)', border: '3px solid #fff', marginBottom: 18 }}
            />
            <div className="text-center">
              <h3 className="profile-name mb-5" style={{ fontWeight: 700, fontSize: '1.5em', color: '#2c3e50' }}>{profile.firstName} {profile.lastName}</h3>
              <div className="profile-email text-muted mb-2" style={{ fontSize: '1.05em' }}>Email: {profile.email}</div>
              <div className="profile-member-since text-muted" style={{ fontSize: '0.98em' }}>Member since: {new Date(profile.createdAt).toLocaleDateString()}</div>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 18, padding: '32px 18px', margin: '0 auto 32px auto', boxShadow: '0 4px 24px rgba(108,99,255,0.10)', maxWidth: 520, border: '1.5px solid #ececec' }}>
            <h3 className="mb-20 text-center" style={{ fontWeight: 800, fontSize: '1.18em', color: '#2c3e50', letterSpacing: 0.1 }}>Meal Stats Summary</h3>
            <div className="grid-layout grid-cols-2 grid-gap-20">
              <div className="stat-card" style={{ background: 'transparent', boxShadow: 'none', border: 'none', textAlign: 'center' }}>
                <div className="stat-label" style={{ color: '#2c3e50', fontWeight: 700, fontSize: '1.08em' }}>Total Meals Cooked:</div>
                <div className="stat-value" style={{ color: '#6c63ff', fontWeight: 900, fontSize: '2.1em', letterSpacing: 0.5 }}>{profile.stats.totalMeals}</div>
              </div>
              <div className="stat-card" style={{ background: 'transparent', boxShadow: 'none', border: 'none', textAlign: 'center' }}>
                <div className="stat-label" style={{ color: '#2c3e50', fontWeight: 700, fontSize: '1.08em' }}>Average Rating:</div>
                <div className="stat-value" style={{ color: '#6c63ff', fontWeight: 900, fontSize: '2.1em', letterSpacing: 0.5 }}>{profile.stats.averageRating ? profile.stats.averageRating.toFixed(2) : 'N/A'}</div>
              </div>
              <div className="stat-card" style={{ background: 'transparent', boxShadow: 'none', border: 'none', textAlign: 'center' }}>
                <div className="stat-label" style={{ color: '#2c3e50', fontWeight: 700, fontSize: '1.08em' }}>Current Streak:</div>
                <div className="stat-value" style={{ color: '#6c63ff', fontWeight: 900, fontSize: '2.1em', letterSpacing: 0.5 }}>{profile.stats.currentStreak} days</div>
              </div>
              <div className="stat-card" style={{ background: 'transparent', boxShadow: 'none', border: 'none', textAlign: 'center' }}>
                <div className="stat-label" style={{ color: '#2c3e50', fontWeight: 700, fontSize: '1.08em' }}>Longest Streak:</div>
                <div className="stat-value" style={{ color: '#6c63ff', fontWeight: 900, fontSize: '2.1em', letterSpacing: 0.5 }}>{profile.stats.longestStreak} days</div>
              </div>
            </div>
          </div>

          <h3 className="mb-15 text-center" style={{ fontWeight: 700, fontSize: '1.2em', color: '#2c3e50' }}>Your Top 5 Meals</h3>
          {profile.stats.topRankedMeals.length === 0 ? (
            <p className="text-muted text-center">No top meals ranked yet.</p>
          ) : (
            <div className="d-flex flex-column gap-15" style={{ maxWidth: 520, margin: '0 auto' }}>
              {profile.stats.topRankedMeals.map((meal) => (
                <div key={meal.id} className="ranked-meal-item" style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(108,99,255,0.07)', padding: '16px 18px', alignItems: 'center' }}>
                  <div className="rank-indicator" style={{ minWidth: 44, minHeight: 44, width: 44, height: 44, fontSize: '1.2em', fontWeight: 700, background: 'linear-gradient(135deg, #6c63ff 70%, #8e88ff 100%)', color: '#fff', boxShadow: '0 1px 4px rgba(108,99,255,0.10)' }}>{meal.rank_position}</div>
                  {meal.photo_url && <img src={meal.photo_url} alt={meal.title} className="ranked-meal-image" style={{ width: 48, height: 48, borderRadius: 10, marginLeft: 10, marginRight: 10, objectFit: 'cover', boxShadow: '0 1px 4px rgba(108,99,255,0.07)' }} />}
                  <div className="ranked-meal-details" style={{ flex: 1, minWidth: 0 }}>
                    <div className="ranked-meal-title" style={{ fontWeight: 600, fontSize: '1.05em', color: '#2c3e50', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meal.title}</div>
                    <div className="ranked-meal-date" style={{ fontSize: '0.95em', color: '#888' }}>Made: {new Date(meal.date_made).toLocaleDateString()}</div>
                  </div>
                  <Link to={`/meals/edit/${meal.id}`} className="btn btn-warning btn-sm" style={{ minWidth: 70, marginLeft: 10 }}>Edit</Link>
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
                {/* Profile Photo File Upload Input */}
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
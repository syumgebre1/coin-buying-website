import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function ForcePasswordChange({ onClose }) {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters.");
    
    setLoading(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      await updateDoc(doc(db, "users", auth.currentUser.uid), { hasChangedPassword: true });
      toast.success("Password updated successfully!");
      onClose(); // Close the modal
    } catch (error) {
      toast.error("Error updating password. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', maxWidth: '400px', width: '90%', textAlign: 'center', color: '#000' }}>
        <h2 style={{ margin: '0 0 10px 0' }}>Update Your Password</h2>
        <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>For security reasons, please change your password from the default one.</p>
        
        <form onSubmit={handleUpdate}>
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              placeholder="Enter new password"
              required 
              style={{ width: '100%', padding: '12px', paddingRight: '40px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '15px', backgroundColor: '#1a237e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

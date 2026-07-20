import React from 'react';

const AdminUsers = ({ API_BASE }) => {
  return (
    <div>
      <h3>Admin - Users</h3>
      <p>Placeholder component.</p>
      {API_BASE && <small>API: {API_BASE}</small>}
    </div>
  );
};

export default AdminUsers;

